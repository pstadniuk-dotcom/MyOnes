import { Request, Response } from 'express';
import { chatService } from '../../modules/chat/chat.service';
import { chatRepository } from '../../modules/chat/chat.repository';
import { usersRepository } from '../../modules/users/users.repository';
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


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

            // Persist user message immediately so it never disappears if the user
            // navigates away while the assistant response is still streaming.
            await chatService.createMessage({
                sessionId: chatSession.id,
                role: 'user',
                content: message,
                model: null,
                formula: undefined
            });

            const { healthProfile, labDataContext, activeFormula, biometricDataContext } = await chatService.getContext(userId);

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
                currentUserMessage: message
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
                for await (const chunk of chatService.streamAnthropic(systemPrompt, msgs, model, 0.7, 4096)) {
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

                          savedFormula = await formulasRepository.createFormula(formulaData);

                          // Send first-formula-created email + in-app notification
                          try {
                            const formulaUser = await usersRepository.getUser(userId);
                            if (formulaUser) {
                              const frontendUrl = process.env.FRONTEND_URL || 'https://myones.ai';
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
                                  ? 'Your first ONES formula is ready!'
                                  : `Your ONES formula has been updated (V${nextVersion})`,
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
                    await usersRepository.updateHealthProfile(userId, healthData);
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
