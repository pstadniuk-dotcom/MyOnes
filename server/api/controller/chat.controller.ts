import { Request, Response } from 'express';
import { chatService } from '../../modules/chat/chat.service';
import { chatRepository } from '../../modules/chat/chat.repository';
import { usersRepository } from '../../modules/users/users.repository';
import { storage } from '../../storage';
import { getClientIP, checkRateLimit } from '../middleware/middleware';
import { aiRuntimeSettings, normalizeModel } from '../../infra/ai/ai-config';
import { buildO1MiniPrompt, type PromptContext } from '../../utils/prompt-builder';
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

            const previousMessages = await chatRepository.listMessagesBySession(chatSession.id);
            const promptContext: PromptContext = {
                healthProfile: healthProfile as any,
                activeFormula: activeFormula as any,
                labDataContext: labDataContext || undefined,
                recentMessages: previousMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
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
            const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                sendSSE({ type: 'processing', message: 'Formula detected! Validating recommendations...' });
                try {
                    const jsonData = JSON.parse(jsonMatch[1]);
                    const capsuleCountFromMessage = extractCapsuleCountFromMessage(message);
                    if (capsuleCountFromMessage) jsonData.targetCapsules = capsuleCountFromMessage;

                    const validation = validateAndCorrectIngredientNames(jsonData);
                    let validatedFormula = validation.correctedFormula;
                    if (validation.warnings.length > 0) {
                        sendSSE({ type: 'info', message: `✓ Auto-corrected ${validation.warnings.length} ingredient name(s)` });
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
                        sendSSE({ type: 'formula_extracted', formula: validatedFormula });
                    } else {
                        sendSSE({ type: 'error', error: `Formula validation failed: ${finalChecks.errors.join(', ')}` });
                    }
                } catch (err) {
                    logger.error('Formula extraction error', err);
                }
            }

            // Health Data Update logic...
            const healthDataMatch = fullResponse.match(/```health-data\s*([\s\S]*?)\s*```/);
            if (healthDataMatch) {
                try {
                    const healthData = JSON.parse(healthDataMatch[1]);
                    await storage.updateHealthProfile(userId, healthData);
                    sendSSE({ type: 'health_data_updated', data: healthData });
                } catch (err) {
                    logger.error('Health data update error', err);
                }
            }

            // Save messages
            await chatService.createMessage(userId, chatSession.id, 'user', message);

            let cleanResponse = fullResponse.replace(/```json[\s\S]*?```/g, '');
            cleanResponse = cleanResponse.replace(/```health-data[\s\S]*?```/g, '');
            cleanResponse = cleanResponse.replace(/```capsule-recommendation[\s\S]*?```/g, '');
            cleanResponse = cleanResponse.trim();

            await chatService.createMessage(userId, chatSession.id, 'assistant', cleanResponse);

            sendSSE({ type: 'done', sessionId: chatSession.id });
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
