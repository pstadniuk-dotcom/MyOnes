import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../../infra/logging/logger';
import { chatRepository } from './chat.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { type MessageFormulaPayload, type MessageFormulaIngredientPayload, InsertMessage, messages } from '@shared/schema';
import { filesRepository } from '../files/files.repository';
import { usersRepository } from '../users/users.repository';
import { wearablesService } from '../wearables/wearables.service';
import { DEFAULT_CLINICAL_DIRECTION, LAB_TREND_RULES, type ClinicalDirection } from './lab-trend-rules';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
type DbInsertMessage = typeof messages.$inferInsert;

type ExtractedLabValue = {
    testName?: string;
    value?: string | number;
    unit?: string;
    status?: string;
};

type TrendPoint = {
    reportDate: Date;
    testDateLabel: string;
    value: number;
    unit: string;
    status: string;
};

function normalizeMarkerName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseNumericLabValue(rawValue: unknown): number | null {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        return rawValue;
    }
    if (typeof rawValue !== 'string') {
        return null;
    }

    const cleaned = rawValue.replace(/,/g, '').trim();
    const numericMatch = cleaned.match(/-?\d+(\.\d+)?/);
    if (!numericMatch) {
        return null;
    }

    const parsed = Number.parseFloat(numericMatch[0]);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLabStatus(status: string): 'normal' | 'high' | 'low' | 'critical' | 'unknown' {
    const normalized = status.toLowerCase().trim();
    if (normalized === 'normal') return 'normal';
    if (normalized === 'high') return 'high';
    if (normalized === 'low') return 'low';
    if (normalized === 'critical') return 'critical';
    return 'unknown';
}

function inferClinicalDirection(markerName: string): ClinicalDirection {
    const normalized = normalizeMarkerName(markerName);

    for (const rule of LAB_TREND_RULES) {
        if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
            return rule.direction;
        }
    }

    return DEFAULT_CLINICAL_DIRECTION;
}

function classifyTrendForMarker(
    markerName: string,
    earliest: number,
    latest: number,
    earliestStatus: string,
    latestStatus: string
): 'improving' | 'declining' | 'stable' {
    const earliestStatusNorm = normalizeLabStatus(earliestStatus);
    const latestStatusNorm = normalizeLabStatus(latestStatus);

    if (latestStatusNorm === 'normal' && (earliestStatusNorm === 'high' || earliestStatusNorm === 'low' || earliestStatusNorm === 'critical')) {
        return 'improving';
    }
    if (earliestStatusNorm === 'normal' && (latestStatusNorm === 'high' || latestStatusNorm === 'low' || latestStatusNorm === 'critical')) {
        return 'declining';
    }
    if (latestStatusNorm === 'critical' && earliestStatusNorm !== 'critical') {
        return 'declining';
    }

    if (earliest === 0) {
        return 'stable';
    }

    const changeRatio = (latest - earliest) / Math.abs(earliest);
    if (Math.abs(changeRatio) < 0.05) {
        return 'stable';
    }

    const direction = inferClinicalDirection(markerName);
    if (direction === 'lower_is_better') {
        return latest < earliest ? 'improving' : 'declining';
    }
    if (direction === 'higher_is_better') {
        return latest > earliest ? 'improving' : 'declining';
    }

    if (latestStatusNorm === 'normal' && earliestStatusNorm !== 'normal') {
        return 'improving';
    }
    if (earliestStatusNorm === 'normal' && latestStatusNorm !== 'normal') {
        return 'declining';
    }

    return 'stable';
}

function buildLabTrendSummary(sortedReports: any[]): string {
    if (sortedReports.length < 2) {
        return '';
    }

    const markerSeries = new Map<string, { displayName: string; points: TrendPoint[] }>();

    sortedReports.forEach((report) => {
        const reportDate = report.uploadedAt ? new Date(report.uploadedAt) : new Date(0);
        const testDateLabel = report.labReportData?.testDate || reportDate.toISOString().split('T')[0];
        const markers = Array.isArray(report.labReportData?.extractedData)
            ? (report.labReportData.extractedData as ExtractedLabValue[])
            : [];

        markers.forEach((marker) => {
            if (!marker.testName) {
                return;
            }

            const numericValue = parseNumericLabValue(marker.value);
            if (numericValue === null) {
                return;
            }

            const normalizedName = normalizeMarkerName(marker.testName);
            if (!normalizedName) {
                return;
            }

            const existing = markerSeries.get(normalizedName);
            const point: TrendPoint = {
                reportDate,
                testDateLabel,
                value: numericValue,
                unit: marker.unit || '',
                status: marker.status || 'normal'
            };

            if (existing) {
                existing.points.push(point);
            } else {
                markerSeries.set(normalizedName, {
                    displayName: marker.testName,
                    points: [point]
                });
            }
        });
    });

    const trendLines: string[] = [];
    markerSeries.forEach((series) => {
        if (series.points.length < 2) {
            return;
        }

        const chronological = series.points.sort((a, b) => a.reportDate.getTime() - b.reportDate.getTime());
        const earliest = chronological[0];
        const latest = chronological[chronological.length - 1];
        const trend = classifyTrendForMarker(
            series.displayName,
            earliest.value,
            latest.value,
            earliest.status,
            latest.status
        );
        const directionEmoji = trend === 'improving' ? '✅' : trend === 'declining' ? '⚠️' : '➖';

        trendLines.push(
            `${directionEmoji} ${series.displayName}: ${earliest.value}${earliest.unit ? ` ${earliest.unit}` : ''} (${earliest.testDateLabel}) → ` +
            `${latest.value}${latest.unit ? ` ${latest.unit}` : ''} (${latest.testDateLabel}) | Trend: ${trend}`
        );
    });

    if (trendLines.length === 0) {
        return '';
    }

    return `=== 📈 LAB TRENDS ACROSS REPORTS ===\n` +
        `Review this timeline before making recommendations. Prioritize persistent declines and sustained improvements.\n\n` +
        trendLines.slice(0, 20).join('\n');
}

function normalizeMessageFormula(formula?: unknown): MessageFormulaPayload | null {
    if (!formula || typeof formula !== 'object') {
        return null;
    }

    const payload = formula as Record<string, any>;
    const normalizeIngredient = (item: any): MessageFormulaIngredientPayload => ({
        name: typeof item?.name === 'string'
            ? item.name
            : (typeof item?.ingredient === 'string' ? item.ingredient : 'Unknown Ingredient'),
        dose: typeof item?.dose === 'string'
            ? item.dose
            : (typeof item?.amount === 'number' ? `${item.amount}mg` : String(item?.dose ?? '0mg')),
        purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
    });

    return {
        bases: Array.isArray(payload.bases)
            ? payload.bases.map<MessageFormulaIngredientPayload>(normalizeIngredient)
            : [],
        additions: Array.isArray(payload.additions)
            ? payload.additions.map<MessageFormulaIngredientPayload>(normalizeIngredient)
            : [],
        totalMg: typeof payload.totalMg === 'number' ? payload.totalMg : Number(payload.totalMg) || 0,
        targetCapsules: typeof payload.targetCapsules === 'number' ? payload.targetCapsules : undefined,
        warnings: Array.isArray(payload.warnings) ? payload.warnings.map(String) : undefined,
        rationale: typeof payload.rationale === 'string' ? payload.rationale : undefined,
        disclaimers: Array.isArray(payload.disclaimers) ? payload.disclaimers.map(String) : undefined
    };
}

export class ChatService {
    async *streamAnthropic(systemPrompt: string, messages: any[], model: string, temperature: number, maxTokens: number) {
        const stream = await anthropic.messages.stream({
            model: model,
            max_tokens: maxTokens,
            messages: messages,
            system: systemPrompt,
            temperature: temperature,
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield { type: 'text' as const, content: event.delta.text };
            }
            // Capture usage from message_start (input tokens) and message_delta (output tokens)
            if (event.type === 'message_start' && (event as any).message?.usage) {
                inputTokens = (event as any).message.usage.input_tokens || 0;
            }
            if (event.type === 'message_delta' && (event as any).usage) {
                outputTokens = (event as any).usage.output_tokens || 0;
            }
        }

        // Yield usage info collected from stream events
        if (inputTokens > 0 || outputTokens > 0) {
            yield {
                type: 'usage' as const,
                content: '',
                inputTokens,
                outputTokens,
            };
        } else {
            // Fallback: try finalMessage() which accumulates the full response
            try {
                const finalMsg = await stream.finalMessage();
                if (finalMsg.usage) {
                    yield {
                        type: 'usage' as const,
                        content: '',
                        inputTokens: finalMsg.usage.input_tokens,
                        outputTokens: finalMsg.usage.output_tokens,
                    };
                }
            } catch {
                // Usage extraction is best-effort
            }
        }
    }

    async getConsultationHistory(userId: string) {
        const sessions = await chatRepository.listChatSessionsByUser(userId);

        const messagesPromises = sessions.map(session =>
            chatRepository.listMessagesBySession(session.id).then(messages => ({
                sessionId: session.id,
                messages
            }))
        );

        const sessionMessages = await Promise.all(messagesPromises);
        const messagesMap: Record<string, any[]> = {};

        sessionMessages.forEach(({ sessionId, messages }) => {
            messagesMap[sessionId] = messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                sender: msg.role === 'assistant' ? 'ai' : 'user',
                timestamp: msg.createdAt,
                sessionId: msg.sessionId,
                fileAttachment: Array.isArray(msg.attachments) && msg.attachments.length > 0 ? msg.attachments[0] : undefined,
                fileAttachments: Array.isArray(msg.attachments) ? msg.attachments : undefined,
                formula: msg.formula || undefined
            }));
        });

        const enhancedSessions = sessions.map(session => {
            const sessionMsgs = messagesMap[session.id] || [];
            const lastMessage = sessionMsgs[sessionMsgs.length - 1];
            const hasFormula = sessionMsgs.some(msg => msg.formula);

            return {
                id: session.id,
                title: session.title || `Consultation ${new Date(session.createdAt).toLocaleDateString()}`,
                lastMessage: lastMessage?.content?.substring(0, 100) + '...' || 'New consultation',
                timestamp: session.createdAt,
                messageCount: sessionMsgs.length,
                hasFormula,
                status: session.status
            };
        });

        enhancedSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return {
            sessions: enhancedSessions,
            messages: messagesMap
        };
    }

    async getConsultationSession(userId: string, sessionId: string) {
        const session = await chatRepository.getChatSession(sessionId);

        if (!session || session.userId !== userId) {
            throw new Error('Session not found');
        }

        const messages = await chatRepository.listMessagesBySession(sessionId);
        return {
            session,
            messages: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                sender: msg.role === 'assistant' ? 'ai' : 'user',
                timestamp: msg.createdAt,
                sessionId: msg.sessionId,
                fileAttachment: Array.isArray(msg.attachments) && msg.attachments.length > 0 ? msg.attachments[0] : undefined,
                fileAttachments: Array.isArray(msg.attachments) ? msg.attachments : undefined,
                formula: msg.formula || undefined
            }))
        };
    }

    async deleteConsultation(userId: string, sessionId: string) {
        const session = await chatRepository.getChatSession(sessionId);

        if (!session || session.userId !== userId) {
            throw new Error('Session not found');
        }

        await chatRepository.deleteChatSession(sessionId);
        return sessionId;
    }

    async renameConsultation(userId: string, sessionId: string, title: string) {
        const session = await chatRepository.getChatSession(sessionId);

        if (!session || session.userId !== userId) {
            throw new Error('Session not found');
        }

        const updated = await chatRepository.renameChatSession(sessionId, title);
        return updated;
    }

    async listSessions(userId: string) {
        return await chatRepository.listChatSessionsByUser(userId);
    }

    async getSessionDetails(userId: string, sessionId: string) {
        const session = await chatRepository.getChatSession(sessionId);
        if (!session || session.userId !== userId) {
            throw new Error('Session not found');
        }
        const messages = await chatRepository.listMessagesBySession(sessionId);
        return { session, messages };
    }

    async createSession(userId: string) {
        return await chatRepository.createChatSession({ userId, status: 'active' });
    }

    async deleteSession(userId: string, sessionId: string) {
        const session = await chatRepository.getChatSession(sessionId);
        if (!session || session.userId !== userId) {
            throw new Error('Session not found');
        }
        await chatRepository.deleteChatSession(sessionId);
    }

    async createMessage(insertMessage: InsertMessage) {
        const rawFormula = normalizeMessageFormula(insertMessage.formula);
        const normalizedMessage: InsertMessage = {
            ...insertMessage,
            formula: (rawFormula ?? null) as InsertMessage['formula']
        };
        const dbPayload = normalizedMessage as DbInsertMessage;
        return await chatRepository.createMessage(dbPayload);

    }

    /**
     * Poll the database until every file in `fileIds` has finished analysis
     * (status is 'completed' or 'error') or until `timeoutMs` elapses.
     */
    async waitForFileAnalysis(fileIds: string[], timeoutMs = 30_000): Promise<void> {
        if (fileIds.length === 0) return;

        const POLL_INTERVAL = 1500;           // check every 1.5 s
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const statuses = await Promise.all(
                fileIds.map(async (id) => {
                    const file = await filesRepository.getFileUpload(id);
                    if (!file) return 'completed';           // deleted / not found — skip
                    const s = String((file.labReportData as any)?.analysisStatus || '').toLowerCase();
                    return s === 'completed' || s === 'error' ? 'done' : 'pending';
                })
            );

            if (statuses.every((s) => s !== 'pending')) return;   // all done

            await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        }
        // Timeout reached — proceed with whatever data is available
    }

    async getContext(userId: string) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        logger.debug('[Chat:getContext] Fetching context', { userId, startDate, endDate });

        const [healthProfile, labReports, activeFormula, biometricResult] = await Promise.all([
            usersRepository.getHealthProfile(userId).catch(() => null),
            filesRepository.getLabReportsByUser(userId),
            formulasRepository.getCurrentFormulaByUser(userId),
            wearablesService.getBiometricData(userId, startDate, endDate).catch((err) => {
                logger.error('[Chat] Failed to fetch biometric data', { userId, error: err?.message || err });
                return { data: [] };
            })
        ]);

        logger.debug('[Chat:getContext] Biometric result', {
            dataLength: biometricResult?.data?.length ?? 0,
            hasData: (biometricResult?.data?.length ?? 0) > 0,
        });

        let labDataContext = '';
        if (labReports.length > 0) {
            const sortedReports = labReports
                .filter((report) => {
                    const status = String(report.labReportData?.analysisStatus || '').toLowerCase();
                    const extracted = report.labReportData?.extractedData;
                    const hasExtractedMarkers = Array.isArray(extracted) && extracted.length > 0;

                    // Use any report that already has extracted markers, even if a
                    // background re-analysis currently marks it as "processing".
                    // This prevents false "NO LAB DATA UPLOADED" prompts.
                    return hasExtractedMarkers && status !== 'error';
                })
                .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());

            const labTrendSummary = buildLabTrendSummary(sortedReports);

            const processedReports = sortedReports.map((report, index) => {
                const data = report.labReportData!;
                const values = data.extractedData as any[];
                const uploadDateStr = new Date(report.uploadedAt || '').toLocaleDateString();
                const timelineLabel = index === 0 ? '🆕 LATEST REPORT' : `📅 Previous Report`;

                const tableRows = values.map((v: any) => `  • ${v.testName}: ${v.value} ${v.unit || ''} | Status: ${v.status || 'Normal'}`).join('\n');
                return `${timelineLabel}\n📋 Test Date: ${data.testDate || 'unknown'}\n📤 Uploaded: ${uploadDateStr}\nBiomarkers:\n${tableRows}`;
            });

            if (processedReports.length > 0) {
                labDataContext = [labTrendSummary, `=== 📊 LAB REPORTS ===\n\n${processedReports.join('\n\n')}`]
                    .filter(Boolean)
                    .join('\n\n');
            }
        }

        // Build biometric (wearable) data context
        let biometricDataContext = '';
        const biometricDays = biometricResult?.data || [];
        if (biometricDays.length > 0) {
            const lines: string[] = [];
            lines.push(`Data source: Wearable device(s) via Junction`);
            lines.push(`Period: ${startDate} to ${endDate} (${biometricDays.length} days with data)\n`);

            // Compute averages for summary
            const sleepScores: number[] = [];
            const sleepMinutes: number[] = [];
            const deepSleepMins: number[] = [];
            const remSleepMins: number[] = [];
            const hrvValues: number[] = [];
            const restingHRs: number[] = [];
            const recoveryScores: number[] = [];
            const stepCounts: number[] = [];
            const spo2Values: number[] = [];

            for (const day of biometricDays) {
                if (day.sleep?.score) sleepScores.push(day.sleep.score);
                if (day.sleep?.totalMinutes) sleepMinutes.push(day.sleep.totalMinutes);
                if (day.sleep?.deepSleepMinutes) deepSleepMins.push(day.sleep.deepSleepMinutes);
                if (day.sleep?.remSleepMinutes) remSleepMins.push(day.sleep.remSleepMinutes);
                if (day.heart?.hrvMs) hrvValues.push(day.heart.hrvMs);
                if (day.heart?.restingRate) restingHRs.push(day.heart.restingRate);
                if (day.heart?.recoveryScore) recoveryScores.push(day.heart.recoveryScore);
                if (day.activity?.steps) stepCounts.push(day.activity.steps);
                if (day.body?.spo2) spo2Values.push(day.body.spo2);
            }

            const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
            const trend = (arr: number[]) => {
                if (arr.length < 4) return 'insufficient data';
                const half = Math.floor(arr.length / 2);
                const firstHalf = avg(arr.slice(0, half))!;
                const secondHalf = avg(arr.slice(half))!;
                const diff = ((secondHalf - firstHalf) / firstHalf) * 100;
                if (diff > 5) return 'improving ↑';
                if (diff < -5) return 'declining ↓';
                return 'stable →';
            };

            lines.push(`📊 **14-Day Biometric Summary:**\n`);

            // Sleep metrics
            if (sleepScores.length > 0 || sleepMinutes.length > 0) {
                lines.push(`**Sleep:**`);
                if (sleepScores.length > 0) lines.push(`  • Average sleep score: ${avg(sleepScores)}/100 (trend: ${trend(sleepScores)})`);
                if (sleepMinutes.length > 0) {
                    const avgMins = avg(sleepMinutes)!;
                    lines.push(`  • Average sleep duration: ${Math.floor(avgMins / 60)}h ${avgMins % 60}m (trend: ${trend(sleepMinutes)})`);
                }
                if (deepSleepMins.length > 0) lines.push(`  • Average deep sleep: ${avg(deepSleepMins)} min`);
                if (remSleepMins.length > 0) lines.push(`  • Average REM sleep: ${avg(remSleepMins)} min`);
            }

            // Heart / HRV metrics
            if (hrvValues.length > 0 || restingHRs.length > 0) {
                lines.push(`\n**Heart & Recovery:**`);
                if (hrvValues.length > 0) lines.push(`  • Average HRV: ${avg(hrvValues)}ms (trend: ${trend(hrvValues)})`);
                if (restingHRs.length > 0) lines.push(`  • Average resting heart rate: ${avg(restingHRs)} bpm (trend: ${trend(restingHRs)})`);
                if (recoveryScores.length > 0) lines.push(`  • Average recovery score: ${avg(recoveryScores)}% (trend: ${trend(recoveryScores)})`);
            }

            // Activity metrics
            if (stepCounts.length > 0) {
                lines.push(`\n**Activity:**`);
                lines.push(`  • Average daily steps: ${avg(stepCounts)?.toLocaleString()} (trend: ${trend(stepCounts)})`);
            }

            // SpO2
            if (spo2Values.length > 0) {
                lines.push(`\n**Blood Oxygen:**`);
                lines.push(`  • Average SpO2: ${avg(spo2Values)}%`);
            }

            // Recent daily data (last 5 days for context)
            const recentDays = biometricDays.slice(-5);
            if (recentDays.length > 0) {
                lines.push(`\n📅 **Recent Daily Data (most recent ${recentDays.length} days):**`);
                for (const day of recentDays) {
                    const parts: string[] = [`${day.date}:`];
                    if (day.sleep?.score) parts.push(`Sleep ${day.sleep.score}/100`);
                    if (day.sleep?.totalMinutes) parts.push(`${Math.floor(day.sleep.totalMinutes / 60)}h${day.sleep.totalMinutes % 60}m sleep`);
                    if (day.heart?.hrvMs) parts.push(`HRV ${day.heart.hrvMs}ms`);
                    if (day.heart?.restingRate) parts.push(`RHR ${day.heart.restingRate}bpm`);
                    if (day.activity?.steps) parts.push(`${day.activity.steps.toLocaleString()} steps`);
                    if (day.heart?.recoveryScore) parts.push(`Recovery ${day.heart.recoveryScore}%`);
                    lines.push(`  ${parts.join(' | ')}`);
                }
            }

            biometricDataContext = lines.join('\n');
        }

        return { healthProfile, labDataContext, activeFormula, biometricDataContext };
    }
}

export const chatService = new ChatService();
