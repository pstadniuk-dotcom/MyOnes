import { Request, Response } from 'express';
import { chatService } from '../../modules/chat/chat.service';
import { chatRepository } from '../../modules/chat/chat.repository';
import { usersRepository } from '../../modules/users/users.repository';
import { formulasRepository } from '../../modules/formulas/formulas.repository';
import { storage } from '../../storage';
import { getClientIP, checkRateLimit } from '../middleware/middleware';
import { aiRuntimeSettings, normalizeModel } from '../../infra/ai/ai-config';
import { buildO1MiniPrompt, type PromptContext } from '../../utils/prompt-builder';
import { analyzeQueryIntent } from '../../utils/query-intent-analyzer';
import { extractCapsuleCountFromMessage, validateAndCorrectIngredientNames, validateAndCalculateFormula, FORMULA_LIMITS, getMaxDosageForCapsules, validateFormulaLimits } from '../../modules/formulas/formula-service';
import OpenAI from 'openai';
import logger from '../../infra/logging/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class ChatController {
    async streamChat(req: Request, res: Response) {
        let streamStarted = false;
        const clientIP = getClientIP(req);

        // Helper function to send SSE data
        const sendSSE = (data: any) => {
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                if (typeof (res as any).flush === 'function') {
                    (res as any).flush();
                }
            }
        };

        const endStream = () => {
            if (!res.destroyed) {
                res.end();
            }
        };

        try {
            const rateLimit = checkRateLimit(clientIP, 10, 10 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            const { message, sessionId } = req.body;
            const userId = req.userId!;

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ error: 'Valid message is required' });
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            streamStarted = true;
            sendSSE({ type: 'connected', message: 'Stream established' });

            let chatSession;
            if (sessionId) {
                chatSession = await chatRepository.getChatSession(sessionId);
            }
            if (!chatSession) {
                chatSession = await chatRepository.createChatSession({ userId, status: 'active' });
            }

            const { healthProfile, labDataContext, activeFormula } = await chatService.getContext(userId);

            const aiProvider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic';
            let model = aiRuntimeSettings.model || process.env.AI_MODEL || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o');
            model = normalizeModel(aiProvider, model) || model;

            sendSSE({ type: 'thinking', message: 'Analyzing your health data...' });

            // Analyze query intent to determine scope
            const queryIntent = await analyzeQueryIntent(message);

            const previousMessages = await chatRepository.listMessagesBySession(chatSession.id);
            const promptContext: PromptContext = {
                healthProfile: healthProfile as any,
                activeFormula: activeFormula as any,
                labDataContext: labDataContext || undefined,
                recentMessages: previousMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                queryIntent,
                currentUserMessage: message
            };

            const fullSystemPrompt = buildO1MiniPrompt(promptContext);
            const conversationHistory: any[] = [
                { role: 'system', content: fullSystemPrompt },
                ...promptContext.recentMessages!,
                { role: 'user', content: message }
            ];

            let fullResponse = '';
            let chunkCount = 0;

            if (aiProvider === 'anthropic') {
                const systemPrompt = fullSystemPrompt;
                const msgs = conversationHistory.slice(1);
                for await (const chunk of chatService.streamAnthropic(systemPrompt, msgs, model, 0.7, 3000)) {
                    if (chunk.type === 'text') {
                        fullResponse += chunk.content;
                        chunkCount++;
                        sendSSE({ type: 'chunk', content: chunk.content, sessionId: chatSession.id, chunkIndex: chunkCount });
                    }
                }
            } else {
                const stream = await openai.chat.completions.create({
                    model: model,
                    messages: conversationHistory,
                    stream: true,
                    max_completion_tokens: 3000,
                    temperature: 0.7
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        chunkCount++;
                        sendSSE({ type: 'chunk', content, sessionId: chatSession.id, chunkIndex: chunkCount });
                    }
                }
            }

            // Extraction logic...
            let validatedFormula: any = null;
            let savedFormula: any = null;

            const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                sendSSE({ type: 'processing', message: 'Formula detected! Validating recommendations...' });
                try {
                    const jsonData = JSON.parse(jsonMatch[1]);
                    const capsuleCountFromMessage = extractCapsuleCountFromMessage(message);
                    if (capsuleCountFromMessage) jsonData.targetCapsules = capsuleCountFromMessage;

                    const validation = validateAndCorrectIngredientNames(jsonData);
                    validatedFormula = validation.correctedFormula;
                    if (validation.warnings.length > 0) {
                        validation.warnings.forEach(warning => {
                            sendSSE({ type: 'info', message: warning });
                        });
                    }

                    const calcResult = validateAndCalculateFormula(validatedFormula);
                    validatedFormula.totalMg = calcResult.calculatedTotalMg;

                    const targetCaps = validatedFormula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
                    const maxWithTolerance = getMaxDosageForCapsules(targetCaps) + FORMULA_LIMITS.DOSAGE_TOLERANCE;
                    if (validatedFormula.totalMg > maxWithTolerance) {
                        sendSSE({ type: 'info', message: 'Note: Formula was slightly over budget and has been auto-trimmed.' });
                    }

                    const finalChecks = validateFormulaLimits(validatedFormula);
                    if (finalChecks.valid) {
                        // Save the formula to database
                        sendSSE({ type: 'processing', message: 'Finalizing your personalized formula...' });

                        // Get current formula to determine next version number
                        const currentFormula = await formulasRepository.getCurrentFormulaByUser(userId);
                        const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

                        const formulaData = {
                            userId,
                            bases: validatedFormula.bases,
                            additions: validatedFormula.additions,
                            totalMg: validatedFormula.totalMg,
                            rationale: validatedFormula.rationale,
                            warnings: validatedFormula.warnings || [],
                            disclaimers: validatedFormula.disclaimers || [],
                            version: nextVersion,
                            targetCapsules: validatedFormula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT,
                            chatSessionId: chatSession.id,
                        };

                        savedFormula = await formulasRepository.createFormula(formulaData);
                        logger.info(`Formula v${nextVersion} saved successfully for user ${userId}`);
                    } else {
                        const errorMessage = finalChecks.errors.join(', ');
                        sendSSE({ type: 'formula_error', error: `Formula validation failed: ${errorMessage}` });
                        fullResponse += `\n\n⚠️ **Formula Error**: Validation failed - ${errorMessage}`;
                    }
                } catch (err: any) {
                    logger.error('Formula extraction error', err);
                    const errorMessage = err.message || 'An error occurred during formula extraction.';
                    sendSSE({ type: 'formula_error', error: errorMessage });
                    fullResponse += `\n\n⚠️ **Formula Error**: ${errorMessage}`;
                }
            } else {
                // If no JSON match, check if AI claimed to create a formula
                const responseLC = fullResponse.toLowerCase();
                const claimsFormulaCreation = (
                    responseLC.includes("here's your formula") ||
                    responseLC.includes("here is your formula") ||
                    responseLC.includes("i've created") ||
                    responseLC.includes("i have created") ||
                    responseLC.includes("this formula includes")
                ) && !responseLC.includes("i'll create") && !responseLC.includes("i will create");

                if (claimsFormulaCreation) {
                    const errorMessage = '⚠️ Formula described but not created. Please reply with "create my formula now" to generate it.';
                    sendSSE({ type: 'formula_error', error: errorMessage });
                    fullResponse += `\n\n⚠️ **Formula Error**: ${errorMessage}`;
                    logger.warn('AI claimed formula creation but no JSON block found');
                }
            }

            // Extract capsule recommendation from response if present
            let capsuleRecommendation = null;
            try {
                const capsuleRecMatch = fullResponse.match(/```capsule-recommendation\s*({[\s\S]*?})\s*```/);
                if (capsuleRecMatch) {
                    capsuleRecommendation = JSON.parse(capsuleRecMatch[1]);
                    logger.info('📊 Extracted capsule recommendation:', capsuleRecommendation);

                    // Send capsule recommendation to client via SSE
                    sendSSE({
                        type: 'capsule_recommendation',
                        data: capsuleRecommendation,
                        sessionId: chatSession.id
                    });

                    // Remove the capsule-recommendation block from fullResponse before displaying
                    fullResponse = fullResponse.replace(/```capsule-recommendation\s*{[\s\S]*?}\s*```\s*/g, '').trim();
                }
            } catch (e) {
                logger.info('No valid capsule recommendation found in response:', e);
            }

            // Health Data Update logic...
            let healthDataUpdated = false;
            const healthDataMatch = fullResponse.match(/```health-data\s*({[\s\S]*?})\s*```/);
            if (healthDataMatch) {
                try {
                    const healthData = JSON.parse(healthDataMatch[1]);
                    await storage.updateHealthProfile(userId, healthData);
                    healthDataUpdated = true;
                    logger.info('Health profile automatically updated from AI conversation');

                    // Remove the health-data block from fullResponse before saving
                    fullResponse = fullResponse.replace(/```health-data\s*{[\s\S]*?}\s*```\s*/g, '').trim();
                } catch (err) {
                    logger.error('Health data update error', err);
                }
            }

            // CRITICAL: Strip ALL remaining code blocks from response before showing to user
            fullResponse = fullResponse.replace(/```[\s\S]*?```/g, '').trim();
            fullResponse = fullResponse.replace(/`{1,3}/g, '').trim();

            // Send health data update notification if applicable
            if (healthDataUpdated) {
                sendSSE({
                    type: 'health_data_updated',
                    message: "✓ We've updated your health profile based on the information you provided.",
                    sessionId: chatSession.id
                });
            }

            // Transform formula for frontend display (convert ingredient/amount to name/dose format)
            let formulaForDisplay = null;
            let savedFormulaId = null;

            // Check if a formula was saved
            if (savedFormula) {
                savedFormulaId = savedFormula.id;
                const savedBases = savedFormula.bases ?? [];
                const savedAdditions = savedFormula.additions ?? [];

                formulaForDisplay = {
                    bases: savedBases.map((b: any) => ({
                        name: b.ingredient || b.name,
                        dose: typeof b.amount === 'number' ? `${b.amount}mg` : (b.dose || `${b.amount}mg`),
                        purpose: b.purpose
                    })),
                    additions: savedAdditions.map((a: any) => ({
                        name: a.ingredient || a.name,
                        dose: typeof a.amount === 'number' ? `${a.amount}mg` : (a.dose || `${a.amount}mg`),
                        purpose: a.purpose
                    })),
                    totalMg: savedFormula.totalMg,
                    warnings: savedFormula.warnings || [],
                    rationale: savedFormula.rationale,
                    disclaimers: savedFormula.disclaimers || []
                };
            }

            // Send completion event with transformed formula for frontend
            sendSSE({
                type: 'complete',
                formula: formulaForDisplay,
                sessionId: chatSession.id,
                formulaId: savedFormulaId,
                responseLength: fullResponse.length,
                chunkCount
            });

            // Save messages
            await chatService.createMessage({
                sessionId: chatSession.id,
                role: 'user',
                content: message,
                model: null,
                formula: undefined
            });

            let cleanResponse = fullResponse;
            cleanResponse = cleanResponse.trim();

            await chatService.createMessage({
                sessionId: chatSession.id,
                role: 'assistant',
                content: cleanResponse,
                model: model,
                formula: formulaForDisplay || undefined
            });

            endStream();

        } catch (error) {
            logger.error('Chat stream error:', error);
            if (!streamStarted) {
                res.status(500).json({ error: 'Failed to process chat' });
            } else {
                sendSSE({ type: 'error', error: 'Internal server error during streaming' });
                endStream();
            }
        }
    }

    async getHistory(req: Request, res: Response) {
        try {
            const data = await chatService.getConsultationHistory(req.userId!);
            res.json(data);
        } catch (error) {
            logger.error('Get history error:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    }

    async getSession(req: Request, res: Response) {
        try {
            const data = await chatService.getConsultationSession(req.userId!, req.params.sessionId);
            res.json(data);
        } catch (error) {
            logger.error('Get session error:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async deleteConsultation(req: Request, res: Response) {
        try {
            const sessionId = await chatService.deleteConsultation(req.userId!, req.params.sessionId);
            res.json({ success: true, sessionId });
        } catch (error) {
            logger.error('Delete consultation error:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async listSessions(req: Request, res: Response) {
        try {
            const sessions = await chatService.listSessions(req.userId!);
            res.json(sessions);
        } catch (error) {
            logger.error('List sessions error:', error);
            res.status(500).json({ error: 'Failed to list sessions' });
        }
    }

    async createSession(req: Request, res: Response) {
        try {
            const session = await chatService.createSession(req.userId!);
            res.json(session);
        } catch (error) {
            logger.error('Create session error:', error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    }
}

export const chatController = new ChatController();
