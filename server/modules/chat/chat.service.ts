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
import { canonicalKey } from '../labs/biomarker-aliases';

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

/**
 * Parse a YYYY-MM-DD date out of a filename like:
 *   "Lab Results 2024-11-01 Carnivore.pdf"
 * Returns null if no plausible date is found.
 */
function parseFilenameDate(name: string | null | undefined): string | null {
    if (!name) return null;
    const m = name.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
    if (!m) return null;
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) return null;
    if (ms > Date.now() + 24 * 60 * 60 * 1000) return null;
    if (ms < new Date('1980-01-01').getTime()) return null;
    return iso;
}

/**
 * Resolve the chronological date of a lab report. Prefers the lab's own testDate
 * (the date the blood draw / panel was actually performed). If testDate is
 * missing OR differs from the filename date by more than 180 days (AI mis-extraction),
 * falls back to the date parsed from the filename. uploadedAt is the last resort.
 */
function resolveReportChronoDate(report: any): Date {
    const testDateRaw = report?.labReportData?.testDate;
    const filenameDate = parseFilenameDate(report?.originalFileName);

    let extractedIso: string | null = null;
    if (typeof testDateRaw === 'string' && testDateRaw.trim().length > 0) {
        const parsed = new Date(testDateRaw);
        if (!Number.isNaN(parsed.getTime())) {
            extractedIso = testDateRaw.trim();
        }
    }

    if (extractedIso && filenameDate) {
        const diffDays = Math.abs(new Date(extractedIso).getTime() - new Date(filenameDate).getTime()) / (24 * 60 * 60 * 1000);
        if (diffDays > 180) return new Date(filenameDate); // trust filename, AI mis-extracted
        return new Date(extractedIso);
    }
    if (extractedIso) return new Date(extractedIso);
    if (filenameDate) return new Date(filenameDate);
    return report?.uploadedAt ? new Date(report.uploadedAt) : new Date(0);
}

function buildLabTrendSummary(sortedReports: any[], hiddenMarkerSet?: Set<string>): string {
    if (sortedReports.length < 2) {
        return '';
    }

    const markerSeries = new Map<string, { displayName: string; points: TrendPoint[] }>();

    sortedReports.forEach((report) => {
        const reportDate = resolveReportChronoDate(report);
        const testDateLabel = report.labReportData?.testDate || reportDate.toISOString().split('T')[0];
        const markers = Array.isArray(report.labReportData?.extractedData)
            ? (report.labReportData.extractedData as ExtractedLabValue[])
            : [];

        markers.forEach((marker) => {
            if (!marker.testName) {
                return;
            }

            // Skip markers the user has hidden from the AI.
            if (hiddenMarkerSet && hiddenMarkerSet.size > 0 && hiddenMarkerSet.has(canonicalKey(marker.testName))) {
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

        // Pull a window long enough to show cycle-over-cycle progression. Each
        // formula cycle is ~56 days, so default to 60 days. If the active
        // formula is older than that, stretch the window up to 90 days so
        // reorder/reformulation conversations have a full cycle of context.
        // Hard floor of 14 days for users who just started.
        const activeFormula = await formulasRepository.getCurrentFormulaByUser(userId);
        const formulaAgeDays = activeFormula?.createdAt
            ? Math.floor((Date.now() - new Date(activeFormula.createdAt).getTime()) / (24 * 60 * 60 * 1000))
            : 0;
        const lookbackDays = Math.min(90, Math.max(14, formulaAgeDays + 7, 60));
        const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        logger.debug('[Chat:getContext] Fetching context', { userId, startDate, endDate, lookbackDays, formulaAgeDays });

        const [healthProfile, labReports, biometricResult, currentUser] = await Promise.all([
            usersRepository.getHealthProfile(userId).catch(() => null),
            filesRepository.getLabReportsByUser(userId),
            wearablesService.getBiometricData(userId, startDate, endDate).catch((err) => {
                logger.error('[Chat] Failed to fetch biometric data', { userId, error: err?.message || err });
                return { data: [] };
            }),
            usersRepository.getUser(userId).catch(() => undefined),
        ]);

        // Biomarker keys the user has chosen to hide from the AI. Values are already
        // stored as canonicalKey(), but we normalize again defensively.
        const hiddenMarkerSet = new Set<string>(
            (Array.isArray(currentUser?.hiddenMarkers) ? (currentUser!.hiddenMarkers as string[]) : [])
                .map(k => canonicalKey(k))
                .filter(Boolean)
        );        logger.debug('[Chat:getContext] Biometric result', {
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
                // Sort by the lab's actual testDate (most recent first), falling back to
                // uploadedAt only when testDate is missing. Prevents the AI from treating
                // batch-uploaded historical reports as "the latest" simply because they
                // were uploaded last.
                .sort((a, b) => resolveReportChronoDate(b).getTime() - resolveReportChronoDate(a).getTime());

            const labTrendSummary = buildLabTrendSummary(sortedReports, hiddenMarkerSet);

            // Stale-data guardrail: if the user's most recent lab is more than
            // 24 months old, prepend a strong instruction telling the AI not to
            // make material formula adjustments based on historical data alone.
            // This prevents the AI from confidently dosing off labs that may
            // no longer reflect the user's current physiology.
            const STALE_LAB_THRESHOLD_DAYS = 730;
            const MS_PER_DAY = 24 * 60 * 60 * 1000;
            const newestReportDate = sortedReports.length > 0 ? resolveReportChronoDate(sortedReports[0]) : null;
            const daysSinceNewest = newestReportDate
                ? Math.floor((Date.now() - newestReportDate.getTime()) / MS_PER_DAY)
                : null;
            const labsAreStale = daysSinceNewest !== null && daysSinceNewest > STALE_LAB_THRESHOLD_DAYS;
            const stalenessWarning = labsAreStale
                ? `⚠️ DATA RECENCY WARNING ⚠️\nThe user's most recent lab report is ${Math.round((daysSinceNewest as number) / 30)} months old (>${Math.round(STALE_LAB_THRESHOLD_DAYS / 30)} months). Treat all biomarker values below as HISTORICAL REFERENCE ONLY.\n- Do NOT make material formula adjustments based on these labs alone.\n- Strongly recommend the user upload fresh lab work before adjusting dosages.\n- If the user asks about a specific marker, acknowledge the data age and suggest re-testing.\n`
                : '';

            const processedReports = sortedReports.map((report, index) => {
                const data = report.labReportData!;
                const allValues = data.extractedData as any[];
                // Filter out markers the user has hidden from the AI.
                const values = hiddenMarkerSet.size > 0
                    ? allValues.filter((v: any) => !hiddenMarkerSet.has(canonicalKey(v.testName || '')))
                    : allValues;
                const uploadDateStr = new Date(report.uploadedAt || '').toLocaleDateString();
                const reportDate = resolveReportChronoDate(report);
                const reportAgeDays = Math.floor((Date.now() - reportDate.getTime()) / MS_PER_DAY);
                const isReportStale = reportAgeDays > STALE_LAB_THRESHOLD_DAYS;
                const ageSuffix = isReportStale
                    ? ` ⚠️ HISTORICAL — ${Math.round(reportAgeDays / 30)} months old`
                    : '';
                const timelineLabel = index === 0
                    ? `🆕 LATEST REPORT (most recent test date)${ageSuffix}`
                    : `📅 Previous Report${ageSuffix}`;

                const tableRows = values.map((v: any) => `  • ${v.testName}: ${v.value} ${v.unit || ''} | Status: ${v.status || 'Normal'}`).join('\n');
                const resolvedDateLabel = reportDate.toISOString().split('T')[0];
                return `${timelineLabel}\n📋 Test Date: ${resolvedDateLabel}\n📤 Uploaded: ${uploadDateStr}\nBiomarkers:\n${tableRows}`;
            });

            if (processedReports.length > 0) {
                labDataContext = [stalenessWarning, labTrendSummary, `=== 📊 LAB REPORTS ===\n\n${processedReports.join('\n\n')}`]
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
            lines.push(`Period: ${startDate} to ${endDate} (${biometricDays.length} days with data, ~${lookbackDays}-day window covering current formula cycle)\n`);

            type Bucket = { sleepScores: number[]; sleepMinutes: number[]; deepSleepMins: number[]; remSleepMins: number[]; hrvValues: number[]; restingHRs: number[]; recoveryScores: number[]; readinessScores: number[]; stepCounts: number[]; spo2Values: number[]; respiratoryRates: number[]; };
            const newBucket = (): Bucket => ({ sleepScores: [], sleepMinutes: [], deepSleepMins: [], remSleepMins: [], hrvValues: [], restingHRs: [], recoveryScores: [], readinessScores: [], stepCounts: [], spo2Values: [], respiratoryRates: [] });
            const collect = (b: Bucket, day: any) => {
                if (day.sleep?.score) b.sleepScores.push(day.sleep.score);
                if (day.sleep?.totalMinutes) b.sleepMinutes.push(day.sleep.totalMinutes);
                if (day.sleep?.deepSleepMinutes) b.deepSleepMins.push(day.sleep.deepSleepMinutes);
                if (day.sleep?.remSleepMinutes) b.remSleepMins.push(day.sleep.remSleepMinutes);
                if (day.heart?.hrvMs) b.hrvValues.push(day.heart.hrvMs);
                if (day.heart?.restingRate) b.restingHRs.push(day.heart.restingRate);
                if (day.heart?.recoveryScore) b.recoveryScores.push(day.heart.recoveryScore);
                if (day.heart?.readinessScore) b.readinessScores.push(day.heart.readinessScore);
                if (day.activity?.steps) b.stepCounts.push(day.activity.steps);
                if (day.body?.spo2) b.spo2Values.push(day.body.spo2);
                if (day.body?.respiratoryRate) b.respiratoryRates.push(day.body.respiratoryRate);
            };

            // Bucket the days into the full cycle window vs the most recent 14 days
            // so the AI can compare "how things are trending now" vs "the cycle so far".
            const cycle = newBucket();
            const recent = newBucket();
            const recentCutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
            for (const day of biometricDays) {
                collect(cycle, day);
                const dayMs = new Date(day.date).getTime();
                if (!Number.isNaN(dayMs) && dayMs >= recentCutoffMs) collect(recent, day);
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
            const compare = (cycleAvg: number | null, recentAvg: number | null, unit = '') => {
                if (cycleAvg == null || recentAvg == null) return '';
                const delta = recentAvg - cycleAvg;
                if (Math.abs(delta) < 1) return ` (last 14d ≈ cycle avg)`;
                const sign = delta > 0 ? '+' : '';
                return ` (last 14d: ${recentAvg}${unit}, ${sign}${delta} vs cycle avg)`;
            };

            lines.push(`📊 **${lookbackDays}-Day Cycle Biometric Summary** (compared to last 14 days):\n`);

            // Sleep metrics
            if (cycle.sleepScores.length > 0 || cycle.sleepMinutes.length > 0) {
                lines.push(`**Sleep:**`);
                if (cycle.sleepScores.length > 0) {
                    lines.push(`  • Cycle avg sleep score: ${avg(cycle.sleepScores)}/100 (cycle trend: ${trend(cycle.sleepScores)})${compare(avg(cycle.sleepScores), avg(recent.sleepScores))}`);
                }
                if (cycle.sleepMinutes.length > 0) {
                    const avgMins = avg(cycle.sleepMinutes)!;
                    const recentMins = avg(recent.sleepMinutes);
                    const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
                    let line = `  • Cycle avg sleep duration: ${fmt(avgMins)} (cycle trend: ${trend(cycle.sleepMinutes)})`;
                    if (recentMins != null) line += ` (last 14d: ${fmt(recentMins)})`;
                    lines.push(line);
                }
                if (cycle.deepSleepMins.length > 0) lines.push(`  • Cycle avg deep sleep: ${avg(cycle.deepSleepMins)} min${compare(avg(cycle.deepSleepMins), avg(recent.deepSleepMins), ' min')}`);
                if (cycle.remSleepMins.length > 0) lines.push(`  • Cycle avg REM sleep: ${avg(cycle.remSleepMins)} min${compare(avg(cycle.remSleepMins), avg(recent.remSleepMins), ' min')}`);
            }

            // Heart / HRV metrics
            if (cycle.hrvValues.length > 0 || cycle.restingHRs.length > 0) {
                lines.push(`\n**Heart & Recovery:**`);
                if (cycle.hrvValues.length > 0) lines.push(`  • Cycle avg HRV: ${avg(cycle.hrvValues)}ms (cycle trend: ${trend(cycle.hrvValues)})${compare(avg(cycle.hrvValues), avg(recent.hrvValues), 'ms')}`);
                if (cycle.restingHRs.length > 0) lines.push(`  • Cycle avg resting heart rate: ${avg(cycle.restingHRs)} bpm (cycle trend: ${trend(cycle.restingHRs)})${compare(avg(cycle.restingHRs), avg(recent.restingHRs), ' bpm')}`);
                if (cycle.recoveryScores.length > 0) lines.push(`  • Cycle avg recovery score: ${avg(cycle.recoveryScores)}% (cycle trend: ${trend(cycle.recoveryScores)})${compare(avg(cycle.recoveryScores), avg(recent.recoveryScores), '%')}`);
                if (cycle.readinessScores.length > 0) lines.push(`  • Cycle avg readiness score: ${avg(cycle.readinessScores)}/100${compare(avg(cycle.readinessScores), avg(recent.readinessScores))}`);
                if (cycle.respiratoryRates.length > 0) lines.push(`  • Cycle avg respiratory rate: ${avg(cycle.respiratoryRates)} brpm`);
            }

            // Activity metrics
            if (cycle.stepCounts.length > 0) {
                lines.push(`\n**Activity:**`);
                lines.push(`  • Cycle avg daily steps: ${avg(cycle.stepCounts)?.toLocaleString()} (cycle trend: ${trend(cycle.stepCounts)})${compare(avg(cycle.stepCounts), avg(recent.stepCounts), ' steps')}`);
            }

            // SpO2
            if (cycle.spo2Values.length > 0) {
                lines.push(`\n**Blood Oxygen:**`);
                lines.push(`  • Cycle avg SpO2: ${avg(cycle.spo2Values)}%`);
            }

            // Recent daily data (last 7 days for granular context)
            const recentDays = biometricDays.slice(-7);
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
