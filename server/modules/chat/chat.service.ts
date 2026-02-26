import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { chatRepository } from './chat.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { type MessageFormulaPayload, type MessageFormulaIngredientPayload, InsertMessage, messages } from '@shared/schema';
import { filesRepository } from '../files/files.repository';
import { usersRepository } from '../users/users.repository';
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

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield { type: 'text', content: event.delta.text };
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
                formula: msg.formula || undefined
            }));
        });

        const enhancedSessions = sessions.map(session => {
            const sessionMsgs = messagesMap[session.id] || [];
            const lastMessage = sessionMsgs[sessionMsgs.length - 1];
            const hasFormula = sessionMsgs.some(msg => msg.formula);

            return {
                id: session.id,
                title: `Consultation ${new Date(session.createdAt).toLocaleDateString()}`,
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

    async getContext(userId: string) {
        const [healthProfile, labReports, activeFormula] = await Promise.all([
            usersRepository.getHealthProfile(userId).catch(() => null),
            filesRepository.getLabReportsByUser(userId),
            formulasRepository.getCurrentFormulaByUser(userId)
        ]);

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

        return { healthProfile, labDataContext, activeFormula };
    }
}

export const chatService = new ChatService();
