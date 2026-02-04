import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { chatRepository } from './chat.repository';
import { storage } from '../../storage';
import { formulasRepository } from '../formulas/formulas.repository';

import {
    extractCapsuleCountFromMessage,
    getMaxDosageForCapsules,
    validateAndCalculateFormula,
    validateAndCorrectIngredientNames,
    validateFormulaLimits,
    FORMULA_LIMITS
} from '../formulas/formula-service';
import { aiRuntimeSettings, normalizeModel } from '../../infra/ai/ai-config';
import { buildO1MiniPrompt, type PromptContext } from '../../utils/prompt-builder';
import { logger } from '../../infra/logging/logger';
import { type MessageFormulaPayload, type MessageFormulaIngredientPayload } from '@shared/schema';
import { filesRepository } from '../files/files.repository';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
        targetCapsules: typeof payload.targetCapsules === 'number' ? payload.targetCapsules : undefined
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

    async createMessage(userId: string, sessionId: string, role: string, content: string, formula?: any) {
        const normalizedFormula = normalizeMessageFormula(formula);
        return await chatRepository.createMessage({
            sessionId,
            role,
            content,
            formula: normalizedFormula
        });
    }

    async getContext(userId: string) {
        const [healthProfile, labReports, activeFormula] = await Promise.all([
            storage.getHealthProfile(userId).catch(() => null),
            filesRepository.getLabReportsByUser(userId),
            formulasRepository.getCurrentFormulaByUser(userId)
        ]);

        let labDataContext = '';
        if (labReports.length > 0) {
            const sortedReports = labReports
                .filter(report => report.labReportData?.analysisStatus === 'completed' && report.labReportData?.extractedData)
                .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());

            const processedReports = sortedReports.map((report, index) => {
                const data = report.labReportData!;
                const values = data.extractedData as any[];
                const uploadDateStr = new Date(report.uploadedAt || '').toLocaleDateString();
                const timelineLabel = index === 0 ? '🆕 LATEST REPORT' : `📅 Previous Report`;

                const tableRows = values.map((v: any) => `  • ${v.testName}: ${v.value} ${v.unit || ''} | Status: ${v.status || 'Normal'}`).join('\n');
                return `${timelineLabel}\n📋 Test Date: ${data.testDate || 'unknown'}\n📤 Uploaded: ${uploadDateStr}\nBiomarkers:\n${tableRows}`;
            });

            if (processedReports.length > 0) {
                labDataContext = `=== 📊 LAB REPORTS ===\n\n${processedReports.join('\n\n')}`;
            }
        }

        return { healthProfile, labDataContext, activeFormula };
    }
}

export const chatService = new ChatService();
