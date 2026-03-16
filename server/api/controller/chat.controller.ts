import { Request, Response } from 'express';
import { chatService } from '../../modules/chat/chat.service';
import { chatRepository } from '../../modules/chat/chat.repository';
import { usersRepository } from '../../modules/users/users.repository';
import { filesRepository } from '../../modules/files/files.repository';
import { filesService } from '../../modules/files/files.service';
import { formulasRepository } from '../../modules/formulas/formulas.repository';
import { systemRepository } from '../../modules/system/system.repository';
import { notificationsService } from '../../modules/notifications/notifications.service';
import { sendNotificationEmail } from '../../utils/emailService';

import { getClientIP, checkRateLimit } from '../middleware/middleware';
import { aiRuntimeSettings, normalizeModel } from '../../infra/ai/ai-config';
import { buildO1MiniPrompt, type PromptContext } from '../../utils/prompt-builder';
import { analyzeQueryIntent } from '../../utils/query-intent-analyzer';
import { extractCapsuleCountFromMessage, validateAndCorrectIngredientNames, validateAndCalculateFormula, FORMULA_LIMITS, getMaxDosageForCapsules, validateFormulaLimits, autoFitFormulaToBudget, autoExpandFormula } from '../../modules/formulas/formula-service';
import { validateFormulaSafety, safetyWarningsToStrings } from '../../modules/formulas/safety-validator';
import { filterAIOutputClaims } from '../../modules/ai/claims-filter';
import type { SafetyWarning } from '@shared/safety-types';
import { recommendDailyProtocolCapsules } from '../../modules/chat/protocol-recommendation';
import OpenAI from 'openai';
import logger from '../../infra/logging/logger';
import { logAiUsage, estimateTokenCount } from '../../modules/ai-usage/ai-usage.service';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ImageAttachment { base64: string; mimeType: string; fileName: string; }


export class ChatController {
    async streamChat(req: Request, res: Response) {
        let streamStarted = false;
        let clientDisconnected = false;
        const clientIP = getClientIP(req);

        req.on('close', () => {
            clientDisconnected = true;
            logger.info('Chat stream client disconnected; continuing server-side processing', {
                userId: req.userId,
                path: req.path
            });
        });

        // Helper function to send SSE data
        const sendSSE = (data: any) => {
            if (clientDisconnected || res.destroyed || res.writableEnded) {
                return;
            }

            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                if (typeof (res as any).flush === 'function') {
                    (res as any).flush();
                }
            } catch (error) {
                clientDisconnected = true;
                logger.warn('SSE write failed; continuing processing without client stream', {
                    userId: req.userId,
                    error: (error as Error)?.message || String(error)
                });
            }
        };

        const endStream = () => {
            if (!clientDisconnected && !res.destroyed && !res.writableEnded) {
                res.end();
            }
        };

        try {
            const rateLimit = checkRateLimit(clientIP, 40, 10 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            const { message, sessionId, files, editMessageId } = req.body;
            const userId = req.userId!;
            const attachedFileIds: string[] = Array.isArray(files)
                ? files.map((f: any) => f.id).filter(Boolean)
                : [];

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ error: 'Valid message is required' });
            }

            // ── SECURITY: Message length limit (prevent cost inflation & context overflow)
            const MAX_MESSAGE_LENGTH = 10000;
            if (message.length > MAX_MESSAGE_LENGTH) {
                return res.status(400).json({
                    error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
                });
            }

            // ── SECURITY: Per-user rate limiting (prevents abuse from users with multiple IPs)
            const userRateLimit = checkRateLimit(`user:${userId}`, 40, 10 * 60 * 1000);
            if (!userRateLimit.allowed) {
                return res.status(429).json({
                    error: 'You\'re sending messages too quickly. Please wait a moment.',
                    retryAfter: Math.ceil((userRateLimit.resetTime - Date.now()) / 1000)
                });
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

            // Handle message editing: delete this message and all subsequent ones before adding the new version
            if (editMessageId && chatSession) {
                logger.info('Trunkating session for message edit', { sessionId: chatSession.id, editMessageId });
                await chatRepository.deleteMessagesAfterId(chatSession.id, editMessageId);
            }

            // Persist user message immediately so it never disappears if the user
            // navigates away while the assistant response is still streaming.
            await chatService.createMessage({
                sessionId: chatSession.id,
                role: 'user',
                content: message,
                model: null,
                formula: undefined
            });

            // If user just uploaded files, wait for their background analysis to finish
            // so the AI can see the extracted biomarkers in this same turn.
            let uploadedFileSummary = '';
            const imageAttachments: ImageAttachment[] = [];

            if (attachedFileIds.length > 0) {
                // ── Determine file types to set appropriate wait time ──
                // PDFs need OCR + structuring (up to 3 min); images are faster.
                const fileRecordsPrefetch = await Promise.all(
                    attachedFileIds.map(id => filesRepository.getFileUpload(id))
                );
                const hasPdf = fileRecordsPrefetch.some(f => f?.mimeType === 'application/pdf');
                const hasImages = fileRecordsPrefetch.some(f => f?.mimeType?.startsWith('image/'));
                const maxWaitMs = hasPdf ? 180_000 : 30_000; // 3 min for PDFs, 30s for images

                sendSSE({
                    type: 'thinking_step',
                    step: 'analyze_files',
                    status: 'active',
                    detail: hasPdf ? 'Reading your document…' : `Analyzing ${attachedFileIds.length} file${attachedFileIds.length > 1 ? 's' : ''}…`
                });

                // ── Smart wait: poll analysis status with live SSE progress ──
                const POLL_MS = 2000;
                const deadline = Date.now() + maxWaitMs;
                let lastProgressDetail = '';

                // For images: download for vision while we wait (non-blocking prep)
                if (hasImages) {
                    for (const rec of fileRecordsPrefetch) {
                        if (!rec || !rec.mimeType?.startsWith('image/')) continue;
                        try {
                            const downloaded = await filesService.downloadFile(rec.id, userId);
                            if (downloaded?.buffer) {
                                imageAttachments.push({
                                    base64: downloaded.buffer.toString('base64'),
                                    mimeType: downloaded.mimeType,
                                    fileName: rec.originalFileName || 'image'
                                });
                            }
                        } catch (imgErr) {
                            logger.warn('Failed to download image for vision', { fileId: rec.id, error: (imgErr as Error)?.message });
                        }
                    }
                }

                // Poll until all files are analyzed (or timeout)
                while (Date.now() < deadline) {
                    const statuses = await Promise.all(
                        attachedFileIds.map(async (id) => {
                            const file = await filesRepository.getFileUpload(id);
                            if (!file) return { done: true, progress: '' };
                            const s = String((file.labReportData as any)?.analysisStatus || '').toLowerCase();
                            const detail = (file.labReportData as any)?.progressDetail
                                || (file.labReportData as any)?.progressStep
                                || '';
                            return { done: s === 'completed' || s === 'error', progress: detail };
                        })
                    );

                    if (statuses.every(s => s.done)) break;

                    // Surface real-time progress from the analysis pipeline
                    const currentProgress = statuses.find(s => s.progress)?.progress || '';
                    if (currentProgress && currentProgress !== lastProgressDetail) {
                        lastProgressDetail = currentProgress;
                        sendSSE({
                            type: 'thinking_step',
                            step: 'analyze_files',
                            status: 'active',
                            detail: currentProgress
                        });
                    }

                    await new Promise(r => setTimeout(r, POLL_MS));
                }

                // ── Build per-file context for the AI ──
                const fileSummaries: string[] = [];
                let analysisStillRunning = false;

                for (const fid of attachedFileIds) {
                    const file = await filesRepository.getFileUpload(fid);
                    if (!file) continue;

                    const mime = (file.mimeType || '').toLowerCase();
                    const isImage = mime.startsWith('image/');
                    const status = String((file.labReportData as any)?.analysisStatus || 'unknown');
                    const extracted = (file.labReportData as any)?.extractedData;
                    const markerCount = Array.isArray(extracted) ? extracted.length : 0;

                    if (status === 'completed' && markerCount > 0) {
                        const markers = extracted.map((v: any) =>
                            `  • ${v.testName}: ${v.value} ${v.unit || ''} (${v.status || 'Normal'})`
                        ).join('\n');
                        fileSummaries.push(`📄 ${file.originalFileName}: ${markerCount} biomarkers extracted\n${markers}`);
                    } else if (status === 'processing') {
                        analysisStillRunning = true;
                    } else if (!isImage) {
                        fileSummaries.push(`📄 ${file.originalFileName}: Could not extract structured data from this file.`);
                    }
                }

                // Text context for extracted lab data
                if (fileSummaries.length > 0) {
                    uploadedFileSummary = `\n\n[SYSTEM: The user uploaded files in this message. Extracted lab data follows:\n${fileSummaries.join('\n\n')}]`;
                }

                // If analysis is still running (timed out), tell the AI
                if (analysisStillRunning) {
                    uploadedFileSummary += '\n\n[SYSTEM: One or more uploaded files are still being analyzed. Acknowledge receipt and let the user know you will have the full results shortly. Do NOT ask them to manually type or re-enter any values.]';
                }

                // For images: instruct AI to interpret them visually
                if (imageAttachments.length > 0) {
                    const imageNote = `\n\n[SYSTEM: The user has attached ${imageAttachments.length} image(s) to this message. Look at each image carefully and determine what it shows — it could be lab results, supplement labels, medication bottles, food logs, symptoms, or anything else. Describe what you see, assess its relevance to their health goals, and incorporate useful information into your recommendations. Do NOT assume all uploads are lab results.]`;
                    uploadedFileSummary = (uploadedFileSummary || '') + imageNote;
                }

                // IMPORTANT: Never let the AI ask users to type lab values
                uploadedFileSummary += '\n\n[SYSTEM: CRITICAL — NEVER ask the user to manually type, re-enter, or dictate lab values or biomarker numbers from their files. All data extraction is automated. If the data is not yet available, tell them it is being processed and you will review it once ready.]';

                sendSSE({
                    type: 'thinking_step',
                    step: 'analyze_files',
                    status: 'done',
                    detail: analysisStillRunning ? 'Files received — analysis in progress' : `${attachedFileIds.length} file${attachedFileIds.length > 1 ? 's' : ''} analyzed`
                });
            }

            const { healthProfile, labDataContext, activeFormula, biometricDataContext } = await chatService.getContext(userId);

            // --- Membership status for AI gating ---
            const currentUser = await usersRepository.getUser(userId);
            const isActiveMember = !!(currentUser?.membershipTier && !currentUser?.membershipCancelledAt);
            // Check if user has ever placed an order (first consultation is always free/full-power)
            const userOrders = await usersRepository.listOrdersByUser(userId);
            const hasOrderedFormula = userOrders.length > 0;

            // --- Stepped thinking progress ---
            const contextParts: string[] = [];
            if (healthProfile) contextParts.push('health profile');
            if (labDataContext) contextParts.push(`${labDataContext.split('\n').length} biomarkers`);
            if (activeFormula) contextParts.push('active formula');
            if (biometricDataContext) contextParts.push('wearable data');
            sendSSE({
                type: 'thinking_step',
                step: 'review_data',
                status: 'done',
                detail: contextParts.length > 0 ? contextParts.join(', ') : 'No prior data on file'
            });

            const aiProvider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic';
            let model = aiRuntimeSettings.model || process.env.AI_MODEL || (aiProvider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o');
            model = normalizeModel(aiProvider, model) || model;

            // Analyze query intent to determine scope
            const queryIntent = await analyzeQueryIntent(message);
            sendSSE({
                type: 'thinking_step',
                step: 'understand_query',
                status: 'done',
                detail: queryIntent?.scope || 'General consultation'
            });

            const previousMessages = await chatRepository.listMessagesBySession(chatSession.id);
            const promptContext: PromptContext = {
                healthProfile: healthProfile as any,
                activeFormula: activeFormula as any,
                labDataContext: labDataContext || undefined,
                biometricDataContext: biometricDataContext || undefined,
                recentMessages: previousMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                queryIntent,
                currentUserMessage: message,
                isActiveMember,
                hasOrderedFormula,
            };

            const fullSystemPrompt = buildO1MiniPrompt(promptContext);
            sendSSE({
                type: 'thinking_step',
                step: 'build_context',
                status: 'done',
                detail: 'Safety guidelines and ingredient catalog'
            });
            sendSSE({
                type: 'thinking_step',
                step: 'generate',
                status: 'active',
                detail: 'Generating response'
            });
            // ── SECURITY: Sanitize user message before sending to AI
            // Strip code fences that could confuse downstream formula/health-data extraction
            // Strip control characters and null bytes
            const sanitizedMessage = message
                .replace(/```[\s\S]*?```/g, '[code block removed]')  // Remove code fence blocks
                .replace(/`{3,}/g, '')                                // Remove orphan triple backticks
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars (keep \n, \r, \t)
                .trim();

            // Append uploaded-file summary so the AI sees what was just uploaded
            const userMessageText = uploadedFileSummary
                ? sanitizedMessage + uploadedFileSummary
                : sanitizedMessage;

            // Build multimodal user message content if images are attached
            let userContent: any;
            if (imageAttachments.length > 0 && aiProvider === 'anthropic') {
                // Anthropic vision format: array of content blocks
                const contentBlocks: any[] = [];
                for (const img of imageAttachments) {
                    contentBlocks.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: img.mimeType,
                            data: img.base64
                        }
                    });
                }
                contentBlocks.push({ type: 'text', text: userMessageText });
                userContent = contentBlocks;
            } else if (imageAttachments.length > 0) {
                // OpenAI vision format: array of content parts
                const contentParts: any[] = [];
                for (const img of imageAttachments) {
                    contentParts.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${img.mimeType};base64,${img.base64}`,
                            detail: 'high'
                        }
                    });
                }
                contentParts.push({ type: 'text', text: userMessageText });
                userContent = contentParts;
            } else {
                userContent = userMessageText;
            }

            const conversationHistory: any[] = [
                { role: 'system', content: fullSystemPrompt },
                ...promptContext.recentMessages!,
                { role: 'user', content: userContent }
            ];

            let fullResponse = '';
            let chunkCount = 0;
            const aiCallStart = Date.now();
            let promptTokensActual = 0;
            let completionTokensActual = 0;

            if (aiProvider === 'anthropic') {
                const systemPrompt = fullSystemPrompt;
                const msgs = conversationHistory.slice(1);
                for await (const chunk of chatService.streamAnthropic(systemPrompt, msgs, model, 0.7, 4096)) {
                    if (chunk.type === 'text') {
                        fullResponse += chunk.content;
                        chunkCount++;
                        sendSSE({ type: 'chunk', content: chunk.content, sessionId: chatSession.id, chunkIndex: chunkCount });
                    } else if (chunk.type === 'usage') {
                        promptTokensActual = (chunk as any).inputTokens || 0;
                        completionTokensActual = (chunk as any).outputTokens || 0;
                    }
                }
            } else {
                const stream = await openai.chat.completions.create({
                    model: model,
                    messages: conversationHistory,
                    stream: true,
                    stream_options: { include_usage: true },
                    max_completion_tokens: 4096,
                    temperature: 0.7
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        chunkCount++;
                        sendSSE({ type: 'chunk', content, sessionId: chatSession.id, chunkIndex: chunkCount });
                    }
                    // Capture usage from the final chunk (OpenAI sends it in the last event)
                    if (chunk.usage) {
                        promptTokensActual = chunk.usage.prompt_tokens || 0;
                        completionTokensActual = chunk.usage.completion_tokens || 0;
                    }
                }
            }

            // Log AI usage (non-blocking)
            const aiCallDuration = Date.now() - aiCallStart;
            const promptInput = conversationHistory.map(m => m.content || '').join(' ');
            logAiUsage({
                userId,
                provider: aiProvider,
                model,
                feature: 'chat',
                promptTokens: promptTokensActual || estimateTokenCount(promptInput),
                completionTokens: completionTokensActual || estimateTokenCount(fullResponse),
                durationMs: aiCallDuration,
                sessionId: chatSession.id,
            });

            // Extraction logic...
            let validatedFormula: any = null;
            let savedFormula: any = null;

            const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/i);
            if (jsonMatch) {
                // ── HARD MEMBERSHIP GATE (safety net) ──────────────────────
                // Even if the AI produces a formula JSON, non-members who already
                // purchased once should NOT get a new formula saved.
                if (!isActiveMember && hasOrderedFormula) {
                    sendSSE({ type: 'info', message: 'Formula optimization requires an active ONES membership.' });
                    // Skip formula processing entirely — let the text response stand
                } else {
                sendSSE({ type: 'processing', message: 'Formula detected! Validating recommendations...' });
                try {
                    let jsonData: any;
                    try {
                        jsonData = JSON.parse(jsonMatch[1]);
                    } catch (jsonParseErr) {
                        // Code fence extraction failed to parse — try parsing full response as JSON fallback
                        logger.warn('JSON.parse failed on code fence content, attempting full response parse', {
                            userId,
                            error: jsonParseErr instanceof Error ? jsonParseErr.message : String(jsonParseErr),
                        });
                        try {
                            jsonData = JSON.parse(fullResponse);
                        } catch (fullParseErr) {
                            logger.error('JSON parse failed for both code fence and full response — skipping formula card', {
                                userId,
                                codeFenceError: jsonParseErr instanceof Error ? jsonParseErr.message : String(jsonParseErr),
                                fullResponseError: fullParseErr instanceof Error ? fullParseErr.message : String(fullParseErr),
                            });
                            // Don't crash — the user just doesn't get a formula card
                            throw new Error('Unable to parse formula JSON from AI response');
                        }
                    }
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
                    const baseBudget = getMaxDosageForCapsules(targetCaps);
                    const maxWithTolerance = Math.floor(baseBudget * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));
                    if (validatedFormula.totalMg > maxWithTolerance) {
                        sendSSE({ type: 'info', message: 'Note: Formula was slightly over budget and has been auto-trimmed.' });
                    }

                    const budgetFit = autoFitFormulaToBudget(validatedFormula);
                    if (budgetFit.adjusted && budgetFit.message) {
                        sendSSE({ type: 'info', message: budgetFit.message });
                    }

                    const expansion = autoExpandFormula(validatedFormula);
                    if (expansion.expanded) {
                        sendSSE({
                            type: 'info',
                            message: `Added ${expansion.addedIngredients.length} clinically compatible ingredient${expansion.addedIngredients.length === 1 ? '' : 's'} to meet minimum protocol depth.`
                        });
                    }

                    const finalChecks = validateFormulaLimits(validatedFormula);
                    if (budgetFit.fitsBudget && finalChecks.valid) {
                        // Save the formula to database
                        sendSSE({ type: 'processing', message: 'Finalizing your personalized formula...' });

                        // Get current formula to determine next version number
                        const currentFormula = await formulasRepository.getCurrentFormulaByUser(userId);
                        const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

                        // ── COMPREHENSIVE SAFETY VALIDATION ─────────────────
                        // Run the new severity-aware safety validator that covers:
                        // drug interactions, pregnancy/nursing, allergies, organ flags
                        const userMedications: string[] = (healthProfile as any)?.medications || [];
                        const userConditions: string[] = (healthProfile as any)?.conditions || [];
                        const userAllergies: string[] = (healthProfile as any)?.allergies || [];

                        // Detect pregnancy/nursing from conditions list
                        const conditionsLower = userConditions.map(c => c.toLowerCase());
                        const isPregnant = conditionsLower.some(c =>
                          c.includes('pregnant') || c.includes('pregnancy') || c.includes('expecting')
                        );
                        const isNursing = conditionsLower.some(c =>
                          c.includes('nursing') || c.includes('breastfeeding') || c.includes('lactating')
                        );

                        const safetyResult = validateFormulaSafety({
                          formula: validatedFormula,
                          userMedications,
                          userConditions,
                          userAllergies,
                          isPregnant,
                          isNursing,
                        });

                        // HARD BLOCK: If critical safety issues found, do NOT save formula
                        if (!safetyResult.safe) {
                          const blockedMsg = safetyResult.blockedReasons.join('\n\n');
                          logger.warn('Formula BLOCKED by safety validator', {
                            userId,
                            blockedReasons: safetyResult.blockedReasons,
                            criticalWarnings: safetyResult.warnings.filter(w => w.severity === 'critical'),
                          });

                          // Audit log: formula blocked
                          try {
                            await systemRepository.createSafetyAuditLog({
                              userId,
                              action: 'formula_blocked',
                              severity: 'critical',
                              details: {
                                warnings: safetyResult.warnings,
                                blockedReasons: safetyResult.blockedReasons,
                                medications: userMedications,
                                conditions: userConditions,
                                allergies: userAllergies,
                                ingredients: [...(validatedFormula.bases || []), ...(validatedFormula.additions || [])].map((i: any) => i.ingredient),
                              },
                              ipAddress: getClientIP(req),
                            });
                          } catch (auditErr) {
                            logger.error('Failed to write safety audit log', auditErr);
                          }

                          sendSSE({
                            type: 'safety_block',
                            error: `Formula cannot be created due to safety concerns:\n\n${blockedMsg}`,
                            warnings: safetyResult.warnings,
                            blockedReasons: safetyResult.blockedReasons,
                          });
                          fullResponse += `\n\n🚫 **Formula Blocked**: ${blockedMsg}`;
                        } else {
                          // Formula is safe to save — merge AI warnings with structured safety warnings
                          const aiWarnings: string[] = validatedFormula.warnings || [];
                          const structuredWarningStrings = safetyWarningsToStrings(safetyResult.warnings);

                          // Deduplicate: only add server-side warnings not already covered by AI
                          const mergedWarnings = [...aiWarnings];
                          for (const sw of structuredWarningStrings) {
                              const swLower = sw.toLowerCase();
                              const alreadyCovered = aiWarnings.some(aw => {
                                  const awLower = aw.toLowerCase();
                                  const keywords = swLower.split(/\s+/).filter(w => w.length > 4);
                                  const matchCount = keywords.filter(k => awLower.includes(k)).length;
                                  return matchCount >= 3;
                              });
                              if (!alreadyCovered) {
                                  mergedWarnings.push(sw);
                              }
                          }

                          const formulaData = {
                              userId,
                              bases: validatedFormula.bases,
                              additions: validatedFormula.additions,
                              totalMg: validatedFormula.totalMg,
                              rationale: validatedFormula.rationale,
                              warnings: mergedWarnings,
                              disclaimers: validatedFormula.disclaimers || [],
                              version: nextVersion,
                              targetCapsules: validatedFormula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT,
                              chatSessionId: chatSession.id,
                              // Store structured safety data for acknowledgment tracking
                              safetyValidation: {
                                requiresAcknowledgment: safetyResult.requiresAcknowledgment,
                                warnings: safetyResult.warnings,
                              },
                          };

                          // SAFETY NET: Retry formula save once on transient DB failure
                          try {
                            savedFormula = await formulasRepository.createFormula(formulaData);
                          } catch (firstSaveErr) {
                            logger.warn('Formula save attempt 1 failed, retrying...', {
                              userId,
                              chatSessionId: chatSession.id,
                              error: firstSaveErr instanceof Error ? firstSaveErr.message : String(firstSaveErr),
                            });
                            // Wait briefly then retry once
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            try {
                              savedFormula = await formulasRepository.createFormula(formulaData);
                              logger.info('Formula save succeeded on retry', { userId });
                            } catch (retrySaveErr) {
                              // Both attempts failed — log full formula data for manual recovery
                              logger.error('CRITICAL: Formula save failed after retry — formula data lost', {
                                userId,
                                chatSessionId: chatSession.id,
                                formulaData: JSON.stringify(formulaData),
                                error: retrySaveErr instanceof Error ? retrySaveErr.message : String(retrySaveErr),
                              });
                              sendSSE({ type: 'formula_error', error: 'Formula was generated but could not be saved. Our team has been notified and will recover it.' });
                              // Re-throw so the outer catch handles the response properly
                              throw retrySaveErr;
                            }
                          }

                          // Send first-formula-created email + in-app notification
                          try {
                            const formulaUser = await usersRepository.getUser(userId);
                            if (formulaUser) {
                              const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
                              const ingredientCount = (savedFormula.bases?.length || 0) + (savedFormula.additions?.length || 0);

                              await notificationsService.create({
                                userId,
                                type: 'formula_update',
                                title: `Formula V${nextVersion} Created`,
                                content: `Your AI practitioner created a personalized formula with ${ingredientCount} ingredients (${savedFormula.totalMg}mg total).`,
                                formulaId: savedFormula.id,
                                metadata: {
                                  actionUrl: '/dashboard/formula',
                                  icon: 'sparkles',
                                  priority: 'high'
                                }
                              });

                              if (await notificationsService.shouldSendEmail(userId, 'consultation')) {
                                await sendNotificationEmail({
                                to: formulaUser.email,
                                subject: nextVersion === 1
                                  ? 'Your first Ones formula is ready!'
                                  : `Your Ones formula has been updated (V${nextVersion})`,
                                title: nextVersion === 1 ? 'Your Formula Is Ready' : 'Formula Updated',
                                type: 'formula_update',
                                content: `
                                  <p>Hi ${formulaUser.name?.split(' ')[0] || 'there'},</p>
                                  <p>${nextVersion === 1
                                    ? 'Your AI practitioner has designed your first personalized supplement formula!'
                                    : `Your formula has been updated to version ${nextVersion}.`
                                  }</p>
                                  <p><strong>${ingredientCount} ingredients</strong> totalling <strong>${savedFormula.totalMg}mg</strong> across <strong>${savedFormula.targetCapsules} capsules</strong>.</p>
                                  <p>Review your formula, check the ingredient breakdown, and order when you're ready.</p>
                                `,
                                actionUrl: `${frontendUrl}/dashboard/formula`,
                                actionText: 'View Your Formula',
                              });
                              }
                            }
                          } catch (notifErr) {
                            logger.warn('Failed to send formula creation notification', { userId, error: notifErr });
                          }

                          logger.info(`Formula v${nextVersion} saved successfully for user ${userId}`, {
                            safetyWarningCount: safetyResult.warnings.length,
                            requiresAcknowledgment: safetyResult.requiresAcknowledgment,
                            severities: {
                              serious: safetyResult.warnings.filter(w => w.severity === 'serious').length,
                              informational: safetyResult.warnings.filter(w => w.severity === 'informational').length,
                            },
                          });

                          // Lab value verification: warn if formula references biomarkers not in lab data
                          if (labDataContext && validatedFormula.rationale) {
                            try {
                              const biomarkerPatterns = /\b(ApoB|LDL-P|omega-3 index|HbA1c|fasting glucose|ferritin|vitamin D|25-OH|TSH|free T[34]|homocysteine|hs-CRP|CRP|triglycerides|HDL|LDL|total cholesterol|iron|B12|folate|magnesium RBC|zinc|cortisol|testosterone|DHEA|insulin)\b/gi;
                              const rationale = String(validatedFormula.rationale || '');
                              const referencedBiomarkers = new Set<string>();
                              let biomarkerMatch: RegExpExecArray | null;
                              while ((biomarkerMatch = biomarkerPatterns.exec(rationale)) !== null) {
                                referencedBiomarkers.add(biomarkerMatch[1].toLowerCase());
                              }
                              if (referencedBiomarkers.size > 0) {
                                const labDataLower = labDataContext.toLowerCase();
                                const missingFromLab = [...referencedBiomarkers].filter(b => !labDataLower.includes(b));
                                if (missingFromLab.length > 0) {
                                  logger.warn('Formula rationale references biomarkers not found in lab data', {
                                    userId,
                                    formulaId: savedFormula.id,
                                    missingBiomarkers: missingFromLab,
                                    referencedBiomarkers: [...referencedBiomarkers],
                                  });
                                }
                              }
                            } catch (labCheckErr) {
                              // Non-critical — don't block formula
                              logger.debug('Lab value verification check failed', { userId, error: labCheckErr });
                            }
                          }

                          // Sync auto-ship price if user has an active auto-ship
                          try {
                            const { formulasService } = await import('../../modules/formulas/formulas.service');
                            await formulasService.syncAutoShipIfActive(userId, savedFormula.id, nextVersion);
                          } catch (autoShipErr) {
                            logger.warn('Auto-ship sync failed after AI formula creation', { userId, error: autoShipErr });
                          }

                          // Send safety warnings to client via SSE for real-time display
                          if (safetyResult.warnings.length > 0) {
                            sendSSE({
                              type: 'safety_warnings',
                              warnings: safetyResult.warnings,
                              requiresAcknowledgment: safetyResult.requiresAcknowledgment,
                            });

                            // Audit log: interaction warnings generated
                            try {
                              const highestSeverity = safetyResult.warnings.some(w => w.severity === 'serious') ? 'serious' : 'informational';
                              await systemRepository.createSafetyAuditLog({
                                userId,
                                formulaId: savedFormula.id,
                                action: 'interaction_warning',
                                severity: highestSeverity,
                                details: {
                                  warnings: safetyResult.warnings,
                                  medications: userMedications,
                                  conditions: userConditions,
                                  allergies: userAllergies,
                                  ingredients: [...(validatedFormula.bases || []), ...(validatedFormula.additions || [])].map((i: any) => i.ingredient),
                                },
                                ipAddress: getClientIP(req),
                              });
                            } catch (auditErr) {
                              logger.error('Failed to write safety audit log', auditErr);
                            }
                          }
                        }
                    } else {
                        const errorMessage = budgetFit.fitsBudget
                            ? finalChecks.errors.join(', ')
                            : `Unable to fit formula within ${targetCaps}-capsule budget (${budgetFit.newTotalMg}/${budgetFit.maxAllowedMg}mg) after dose-floor trimming. Please reduce ingredient count or increase capsule count.`;
                        sendSSE({ type: 'formula_error', error: `Formula validation failed: ${errorMessage}` });
                        fullResponse += `\n\n⚠️ **Formula Error**: Validation failed - ${errorMessage}`;
                    }
                } catch (err: any) {
                    logger.error('Formula extraction error', err);
                    const errorMessage = err.message || 'An error occurred during formula extraction.';
                    sendSSE({ type: 'formula_error', error: errorMessage });
                    fullResponse += `\n\n⚠️ **Formula Error**: ${errorMessage}`;
                }
                } // end else (membership gate)
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
            let capsuleRecommendationForPersistence: 6 | 9 | 12 | null = null;
            let capsuleDecisionTokenForPersistence: string | null = null;
            try {
                const capsuleRecMatch = fullResponse.match(/```capsule-recommendation\s*({[\s\S]*?})\s*```/);
                if (capsuleRecMatch) {
                    capsuleRecommendation = JSON.parse(capsuleRecMatch[1]);
                    logger.info('📊 Extracted capsule recommendation:', capsuleRecommendation);

                    const protocolDecision = recommendDailyProtocolCapsules(labDataContext, healthProfile as any);
                    capsuleRecommendation.recommendedCapsules = protocolDecision.recommendedCapsules;
                    capsuleRecommendation.reasoning = protocolDecision.summary;
                    const existingPriorities = Array.isArray(capsuleRecommendation.priorities)
                        ? capsuleRecommendation.priorities.filter((value: unknown) => typeof value === 'string')
                        : [];
                    capsuleRecommendation.priorities = Array.from(new Set<string>([
                        ...existingPriorities,
                        ...protocolDecision.signals,
                    ])).slice(0, 6);

                    const encodedDecision = encodeURIComponent(JSON.stringify({
                        recommendedCapsules: protocolDecision.recommendedCapsules,
                        summary: protocolDecision.summary,
                        signals: protocolDecision.signals,
                        confidence: protocolDecision.confidence,
                    }));
                    capsuleDecisionTokenForPersistence = `[[CAPSULE_DECISION:${encodedDecision}]]`;

                    logger.info('Protocol recommendation decision', {
                        userId,
                        recommendedCapsules: protocolDecision.recommendedCapsules,
                        confidence: protocolDecision.confidence,
                        metrics: protocolDecision.metrics,
                        signals: protocolDecision.signals,
                    });

                    const parsedRecommendation = Number(capsuleRecommendation?.recommendedCapsules);
                    if (parsedRecommendation === 6 || parsedRecommendation === 9 || parsedRecommendation === 12) {
                        capsuleRecommendationForPersistence = parsedRecommendation as 6 | 9 | 12;
                    }

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

                    // ── SECURITY: Validate health-data fields before writing to DB
                    // Only allow known safe fields; prevent arbitrary data injection
                    const ALLOWED_HEALTH_FIELDS = new Set([
                        'age', 'sex', 'weightLbs', 'heightCm',
                        'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate',
                        'sleepHoursPerNight', 'exerciseDaysPerWeek', 'stressLevel',
                        'smokingStatus', 'alcoholDrinksPerWeek',
                        'conditions', 'medications', 'allergies', 'healthGoals'
                    ]);

                    const validatedHealthData: Record<string, any> = {};
                    for (const [key, value] of Object.entries(healthData)) {
                        if (!ALLOWED_HEALTH_FIELDS.has(key)) {
                            logger.warn(`Health-data block contained disallowed field: ${key}`, { userId });
                            continue;
                        }
                        validatedHealthData[key] = value;
                    }

                    // ── SECURITY: Prevent clearing safety-critical fields via AI
                    // Empty arrays for medications/allergies/conditions could bypass safety checks
                    const SAFETY_ARRAY_FIELDS = ['medications', 'allergies', 'conditions'] as const;
                    for (const field of SAFETY_ARRAY_FIELDS) {
                        if (field in validatedHealthData) {
                            const val = validatedHealthData[field];
                            if (Array.isArray(val) && val.length === 0) {
                                // Don't allow AI to clear safety-critical fields — only UI can do that
                                delete validatedHealthData[field];
                                logger.warn(`Blocked AI from clearing safety field: ${field}`, { userId });
                            } else if (Array.isArray(val)) {
                                // Validate array items are strings and not absurdly long
                                validatedHealthData[field] = val
                                    .filter((item: unknown) => typeof item === 'string' && item.length <= 200)
                                    .slice(0, 50); // Cap at 50 items max
                            }
                        }
                    }

                    // Validate numeric fields are reasonable
                    const NUMERIC_BOUNDS: Record<string, { min: number; max: number }> = {
                        age: { min: 1, max: 120 },
                        weightLbs: { min: 50, max: 800 },
                        heightCm: { min: 60, max: 275 },
                        bloodPressureSystolic: { min: 60, max: 300 },
                        bloodPressureDiastolic: { min: 30, max: 200 },
                        restingHeartRate: { min: 25, max: 220 },
                        sleepHoursPerNight: { min: 0, max: 24 },
                        exerciseDaysPerWeek: { min: 0, max: 7 },
                        stressLevel: { min: 1, max: 10 },
                        alcoholDrinksPerWeek: { min: 0, max: 100 },
                    };
                    for (const [field, bounds] of Object.entries(NUMERIC_BOUNDS)) {
                        if (field in validatedHealthData) {
                            const num = Number(validatedHealthData[field]);
                            if (!Number.isFinite(num) || num < bounds.min || num > bounds.max) {
                                delete validatedHealthData[field];
                                logger.warn(`Health-data numeric field out of bounds: ${field}=${validatedHealthData[field]}`, { userId });
                            } else {
                                validatedHealthData[field] = Math.round(num);
                            }
                        }
                    }

                    if (Object.keys(validatedHealthData).length > 0) {
                        await usersRepository.updateHealthProfile(userId, validatedHealthData);
                        healthDataUpdated = true;
                        logger.info('Health profile automatically updated from AI conversation', {
                            userId,
                            fieldsUpdated: Object.keys(validatedHealthData)
                        });
                    }

                    // Remove the health-data block from fullResponse before saving
                    fullResponse = fullResponse.replace(/```health-data\s*{[\s\S]*?}\s*```\s*/g, '').trim();
                } catch (err) {
                    logger.error('Health data update error', err);
                }
            }

            // ── FALLBACK: AI claimed it sent capsule options but didn't include the block ──
            // When the AI text says "select your preferred capsule count" (or similar)
            // but no capsule-recommendation code block was found, generate one server-side.
            if (!capsuleRecommendation) {
                const responseLC = fullResponse.toLowerCase();
                const claimsSentCapsuleOptions = (
                    // AI explicitly says it sent options
                    responseLC.includes('sent you personalized options') ||
                    responseLC.includes("i've sent you personalized") ||
                    responseLC.includes("here are your options") ||
                    // AI tells user to select capsules (many variations)
                    responseLC.includes('select your preferred') ||
                    responseLC.includes('select your capsule count') ||
                    responseLC.includes('select your capsule') ||
                    responseLC.includes('choose your capsule count') ||
                    responseLC.includes('choose your capsule') ||
                    responseLC.includes('pick your capsule') ||
                    // AI says to go ahead and select/choose
                    /(?:select|choose|pick).{0,20}capsule/i.test(fullResponse) ||
                    // AI says "when you're ready" to build formula (implies selector should be shown)
                    (responseLC.includes('capsule count') && responseLC.includes('ready')) ||
                    (responseLC.includes('capsule count') && responseLC.includes('go ahead'))
                );

                if (claimsSentCapsuleOptions) {
                    try {
                        const protocolDecision = recommendDailyProtocolCapsules(
                            labDataContext,
                            healthProfile as any
                        );

                        capsuleRecommendation = {
                            recommendedCapsules: protocolDecision.recommendedCapsules,
                            reasoning: protocolDecision.summary,
                            priorities: protocolDecision.signals.slice(0, 6),
                        };

                        const encodedDecision = encodeURIComponent(JSON.stringify({
                            recommendedCapsules: protocolDecision.recommendedCapsules,
                            summary: protocolDecision.summary,
                            signals: protocolDecision.signals,
                            confidence: protocolDecision.confidence,
                        }));
                        capsuleDecisionTokenForPersistence = `[[CAPSULE_DECISION:${encodedDecision}]]`;

                        const parsedRec = Number(capsuleRecommendation.recommendedCapsules);
                        if (parsedRec === 6 || parsedRec === 9 || parsedRec === 12) {
                            capsuleRecommendationForPersistence = parsedRec as 6 | 9 | 12;
                        }

                        sendSSE({
                            type: 'capsule_recommendation',
                            data: capsuleRecommendation,
                            sessionId: chatSession.id
                        });

                        logger.info('Capsule recommendation generated via server-side fallback (AI claimed to send but omitted block)', {
                            userId,
                            recommendedCapsules: protocolDecision.recommendedCapsules,
                            confidence: protocolDecision.confidence,
                        });
                    } catch (fallbackErr) {
                        logger.error('Capsule recommendation fallback failed', fallbackErr);
                    }
                }
            }

            // CRITICAL: Strip ALL remaining code blocks from response before showing to user
            fullResponse = fullResponse.replace(/```[\s\S]*?```/g, '').trim();
            fullResponse = fullResponse.replace(/`{1,3}/g, '').trim();

            // ── CLAIMS FIREWALL: deterministic medical claims filter ──────
            const claimsResult = filterAIOutputClaims(fullResponse);
            if (claimsResult.hasViolations) {
              fullResponse = claimsResult.filteredText;
              logger.info('Claims filter applied to AI output', {
                userId,
                sessionId: chatSession.id,
                violationCount: claimsResult.violations.length,
                categories: [...new Set(claimsResult.violations.map(v => v.category))],
              });

              // Audit log claims filter activations
              if (claimsResult.violations.some(v => v.severity === 'critical')) {
                try {
                  await systemRepository.createSafetyAuditLog({
                    userId,
                    action: 'claims_filter_triggered',
                    severity: 'serious',
                    details: {
                      warnings: claimsResult.violations.map(v => ({
                        category: v.category,
                        severity: v.severity as any,
                        message: v.matchedPhrase,
                      })),
                    },
                    ipAddress: getClientIP(req),
                  });
                } catch (auditErr) {
                  logger.error('Failed to write claims filter audit log', auditErr);
                }
              }
            }

            // Normalize dosing schedule emojis — the AI inconsistently drops 🌅 🌙 ☀️
            // Strip any existing emoji at start of line first, then re-apply consistently
            fullResponse = fullResponse.replace(/^[🌅☀️🌙\s]*\*{0,2}(Morning)\*{0,2}(.+)$/gm, '🌅 **$1**$2');
            fullResponse = fullResponse.replace(/^[🌅☀️🌙\s]*\*{0,2}(Midday)\*{0,2}(.+)$/gm, '☀️ **$1**$2');
            fullResponse = fullResponse.replace(/^[🌅☀️🌙\s]*\*{0,2}(Evening)\*{0,2}(.+)$/gm, '🌙 **$1**$2');

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

            // Save messages to DB FIRST so they're always persisted before client
            // receives the complete event (prevents messages disappearing if user
            // navigates away immediately after receiving the response)
            let cleanResponse = fullResponse;
            cleanResponse = cleanResponse.trim();

            if (capsuleRecommendationForPersistence) {
                cleanResponse += `\n\n[[CAPSULE_RECOMMENDATION:${capsuleRecommendationForPersistence}]]`;
            }
            if (capsuleDecisionTokenForPersistence) {
                cleanResponse += `\n${capsuleDecisionTokenForPersistence}`;
            }

            await chatService.createMessage({
                sessionId: chatSession.id,
                role: 'assistant',
                content: cleanResponse,
                model: model,
                formula: formulaForDisplay || undefined
            });

            // Now send completion event — messages are already in DB at this point
            sendSSE({
                type: 'complete',
                formula: formulaForDisplay,
                sessionId: chatSession.id,
                formulaId: savedFormulaId,
                responseLength: fullResponse.length,
                chunkCount
            });

            endStream();

        } catch (error) {
            logger.error('Chat stream error:', error);
            if (!streamStarted) {
                res.status(500).json({ error: 'Failed to process chat' });
            } else {
                if (!clientDisconnected) {
                    sendSSE({ type: 'error', error: 'Internal server error during streaming' });
                }
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

    async renameConsultation(req: Request, res: Response) {
        try {
            const { title } = req.body;
            if (!title || typeof title !== 'string' || title.trim().length === 0) {
                return res.status(400).json({ error: 'Title is required' });
            }
            const session = await chatService.renameConsultation(req.userId!, req.params.sessionId, title.trim());
            res.json({ success: true, session });
        } catch (error) {
            logger.error('Rename consultation error:', error);
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
