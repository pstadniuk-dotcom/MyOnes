import { ChatRepository, chatRepository } from './chat.repository';
import { aiService, AiService } from '../ai';
import { healthService } from '../health';
import { formulaService } from '../formulas';
import { buildO1MiniPrompt, type PromptContext, type HealthProfile as PromptHealthProfile, type Formula as PromptFormula } from '../../prompt-builder';
import { type ChatSession, type Message, type InsertMessage } from '@shared/schema';
import {
    validateAndCorrectIngredientNames,
    validateAndCalculateFormula,
    FormulaExtractionSchema,
    getMaxDosageForCapsules
} from '../formulas/formula.utils';
import { FORMULA_LIMITS } from '../ai';

export interface ChatStreamHandlers {
    onThinking?: (message: string) => void;
    onConnected?: (message: string) => void;
    onChunk?: (content: string, chunkIndex: number) => void;
    onProcessing?: (message: string) => void;
    onFormula?: (formula: any) => void;
    onHealthData?: (data: any) => void;
    onError?: (error: any) => void;
    onComplete?: (fullResponse: string) => void;
    onInfo?: (message: string) => void;
}

export class ChatService {
    constructor(
        private repository: ChatRepository,
        private ai: AiService
    ) { }

    async getSession(id: string) {
        return this.repository.getChatSession(id);
    }

    async getOrCreateSession(userId: string, sessionId?: string) {
        if (sessionId) {
            const session = await this.repository.getChatSession(sessionId);
            if (session) return session;
        }
        return this.repository.createChatSession({ userId, status: 'active' });
    }

    async listMessages(sessionId: string) {
        return this.repository.listMessagesBySession(sessionId);
    }

    async listUserSessions(userId: string) {
        return this.repository.listChatSessionsByUser(userId);
    }

    async deleteSession(sessionId: string) {
        return this.repository.deleteChatSession(sessionId);
    }

    async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string, formula?: any, model?: string) {
        const insertMessage: any = {
            sessionId,
            role,
            content,
        };
        if (formula) insertMessage.formula = formula;
        if (model) insertMessage.model = model;

        return this.repository.createMessage(insertMessage as any);
    }

    private normalizePromptHealthProfile(profile?: any): PromptHealthProfile | undefined {
        if (!profile) return undefined;
        return {
            id: profile.id,
            userId: profile.userId,
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            weightLbs: profile.weightLbs,
            bloodPressureSystolic: profile.bloodPressureSystolic,
            bloodPressureDiastolic: profile.bloodPressureDiastolic,
            restingHeartRate: profile.restingHeartRate,
            sleepHoursPerNight: profile.sleepHoursPerNight,
            exerciseDaysPerWeek: profile.exerciseDaysPerWeek,
            stressLevel: profile.stressLevel,
            smokingStatus: profile.smokingStatus,
            alcoholDrinksPerWeek: profile.alcoholDrinksPerWeek,
            conditions: profile.conditions || [],
            medications: profile.medications || [],
            allergies: profile.allergies || [],
            updatedAt: profile.updatedAt
        };
    }

    private normalizePromptFormula(formula?: any): PromptFormula | undefined {
        if (!formula) return undefined;
        return {
            id: formula.id,
            userId: formula.userId,
            version: formula.version,
            name: formula.name,
            bases: formula.bases || [],
            additions: formula.additions || [],
            totalMg: formula.totalMg,
            targetCapsules: formula.targetCapsules,
            createdAt: formula.createdAt
        };
    }

    async buildContext(userId: string, sessionId: string): Promise<string> {
        const healthProfile = await healthService.getHealthProfile(userId);
        const labReports = await healthService.listLabAnalysesByUser(userId);
        const activeFormula = await formulaService.getCurrentFormulaByUser(userId);
        const previousMessages = await this.repository.listMessagesBySession(sessionId);
        const recentMessages = previousMessages.slice(-10);

        let labDataContext = '';
        if (labReports.length > 0) {
            const sortedReports = labReports
                .filter(report => report.labReportData?.analysisStatus === 'completed' && report.labReportData?.extractedData)
                .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());

            const processedReports = sortedReports.map((report, index) => {
                const data = report.labReportData!;
                const values = data.extractedData as any[];
                const timelineLabel = index === 0 ? '🆕 LATEST REPORT' : `📅 Previous Report`;
                const tableRows = values.map(v => `  • ${v.testName}: ${v.value} ${v.unit || ''} | Status: ${v.status || 'normal'}`).join('\n');
                return `${timelineLabel}\n📋 Test Date: ${data.testDate || 'unknown'}\n${tableRows}`;
            });
            if (processedReports.length > 0) labDataContext = processedReports.join('\n\n');
        }

        const promptContext: PromptContext = {
            healthProfile: this.normalizePromptHealthProfile(healthProfile),
            activeFormula: this.normalizePromptFormula(activeFormula),
            labDataContext: labDataContext || undefined,
            recentMessages: recentMessages.map(m => ({ role: m.role, content: m.content }))
        };

        return buildO1MiniPrompt(promptContext);
    }

    async streamChat(
        userId: string,
        sessionId: string | undefined,
        message: string,
        files: any[],
        handlers: ChatStreamHandlers
    ) {
        const chatSession = await this.getOrCreateSession(userId, sessionId);
        const systemPrompt = await this.buildContext(userId, chatSession.id);

        handlers.onConnected?.('Stream established');
        handlers.onThinking?.('Analyzing your health data...');

        let messageWithFileContext = message;
        if (files && files.length > 0) {
            const fileNames = files.map((f: any) => f.name).join(', ');
            messageWithFileContext = `[User has attached files: ${fileNames}] ${message}`;
        }

        await this.saveMessage(chatSession.id, 'user', messageWithFileContext);

        try {
            const previousMessages = (await this.repository.listMessagesBySession(chatSession.id)).slice(-10);
            const conversationHistory = [
                { role: 'system' as const, content: systemPrompt },
                ...previousMessages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }))
            ];

            const aiProvider = (process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic';
            const aiModel = process.env.AI_MODEL || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o');

            let fullResponse = '';
            let chunkCount = 0;

            if (aiProvider === 'anthropic') {
                const msgs = conversationHistory.slice(1).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
                for await (const chunk of this.ai.streamAnthropicCompletion(systemPrompt, msgs, { model: aiModel })) {
                    if (chunk.type === 'text') {
                        fullResponse += chunk.content;
                        chunkCount++;
                        handlers.onChunk?.(chunk.content, chunkCount);
                    }
                }
            } else {
                const stream = await this.ai.streamOpenAi(conversationHistory as any, { model: aiModel });
                for await (const chunk of (stream as any)) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        chunkCount++;
                        handlers.onChunk?.(content, chunkCount);
                    }
                }
            }

            let finalFormula: any = null;
            if (fullResponse.includes('```json')) {
                handlers.onProcessing?.('Analyzing AI recommendations...');
                const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    try {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        const validated = FormulaExtractionSchema.parse(jsonData);

                        // Apply corrections
                        const correctionResult = validateAndCorrectIngredientNames(validated);
                        if (correctionResult.warnings.length > 0) {
                            handlers.onInfo?.(`Auto-corrected ${correctionResult.warnings.length} ingredient names`);
                        }

                        // Calculate totalMg
                        const calculation = validateAndCalculateFormula(correctionResult.correctedFormula);
                        finalFormula = correctionResult.correctedFormula;
                        finalFormula.totalMg = calculation.calculatedTotalMg;

                        handlers.onFormula?.(finalFormula);
                    } catch (e) {
                        console.error('Formula processing error:', e);
                    }
                }
            }

            if (fullResponse.includes('```health-data')) {
                const healthMatch = fullResponse.match(/```health-data\s*([\s\S]*?)\s*```/);
                if (healthMatch) {
                    try {
                        const healthData = JSON.parse(healthMatch[1]);
                        handlers.onHealthData?.(healthData);
                    } catch (e) {
                        console.error('Health data JSON parse error');
                    }
                }
            }

            await this.saveMessage(chatSession.id, 'assistant', fullResponse, finalFormula, aiModel);
            handlers.onComplete?.(fullResponse);
            return { sessionId: chatSession.id, fullResponse };

        } catch (error) {
            console.error('Stream chat error:', error);
            handlers.onError?.(error);
            throw error;
        }
    }

    async getAllUserMessages(limit: number, startDate: Date, endDate: Date) {
        return this.repository.getAllUserMessages(limit, startDate, endDate);
    }

    async getAllConversations(limit: number, offset: number, startDate?: Date, endDate?: Date) {
        return this.repository.getAllConversations(limit, offset, startDate, endDate);
    }

    async getConversationDetails(sessionId: string) {
        return this.repository.getConversationDetails(sessionId);
    }

    async getLatestConversationInsights() {
        return this.repository.getLatestConversationInsights();
    }

    async saveConversationInsights(insights: any) {
        return this.repository.saveConversationInsights(insights);
    }
}

export const chatService = new ChatService(chatRepository, aiService);
