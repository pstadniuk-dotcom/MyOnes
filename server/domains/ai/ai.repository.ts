/**
 * AI Repository
 * 
 * Encapsulates raw interactions with LLM providers (OpenAI, Anthropic).
 * Handles client initialization, tool definitions, and API calls.
 */

import OpenAI from 'openai';
import { logger } from '../../infrastructure/logging/logger';
import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    useTools?: boolean;
}

export class AiRepository {
    private openai: OpenAI;
    private domainName = "AiRepository";

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /**
     * Simple helper for retry/backoff
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    }

    /**
     * Build the Anthropic tool definition for formula creation
     */
    private buildCreateFormulaTool() {
        const approvedNames = [
            ...SYSTEM_SUPPORTS.map(b => b.name),
            ...INDIVIDUAL_INGREDIENTS.map(i => i.name)
        ];
        return {
            name: 'create_formula',
            description: 'Create a supplement formula using only approved ingredients. Use exact catalog names and mg units.',
            input_schema: {
                type: 'object',
                properties: {
                    bases: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                ingredient: { type: 'string', enum: approvedNames },
                                amount: { type: 'number', minimum: 10 },
                                unit: { type: 'string', enum: ['mg'] },
                                purpose: { type: 'string' }
                            },
                            required: ['ingredient', 'amount', 'unit']
                        }
                    },
                    additions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                ingredient: { type: 'string', enum: approvedNames },
                                amount: { type: 'number', minimum: 10 },
                                unit: { type: 'string', enum: ['mg'] },
                                purpose: { type: 'string' }
                            },
                            required: ['ingredient', 'amount', 'unit']
                        }
                    },
                    totalMg: { type: 'number', minimum: 10 },
                    rationale: { type: 'string' },
                    warnings: { type: 'array', items: { type: 'string' } },
                    disclaimers: { type: 'array', items: { type: 'string' } }
                },
                required: ['totalMg']
            }
        };
    }

    /**
     * Call OpenAI Chat Completion
     */
    async callOpenAi(
        messages: Message[],
        options: CompletionOptions = {}
    ): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: options.model || 'gpt-4o',
                messages: messages as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens || 3000,
            });
            return response.choices[0]?.message?.content || '';
        } catch (error: any) {
            logger.error(`[${this.domainName}] OpenAI API error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Call OpenAI Chat Completion with streaming
     */
    async callOpenAiStream(
        messages: Message[],
        options: CompletionOptions = {}
    ) {
        try {
            return this.openai.chat.completions.create({
                model: options.model || 'gpt-4o',
                messages: messages as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens || 3000,
                stream: true,
            });
        } catch (error: any) {
            logger.error(`[${this.domainName}] OpenAI streaming error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Call OpenAI Vision Completion
     */
    async callOpenAiVision(
        prompt: string,
        imageUrl: string,
        options: CompletionOptions = {}
    ): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: options.model || 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: options.maxTokens ?? 2000,
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            logger.error(`[${this.domainName}] OpenAI Vision Error:`, error);
            throw error;
        }
    }

    /**
     * Call Anthropic Messages API (non-streaming)
     */
    async callAnthropic(
        systemPrompt: string,
        messages: Array<{ role: 'user' | 'assistant'; content: string }>,
        options: CompletionOptions = {}
    ): Promise<{ text: string; toolJsonBlock?: string }> {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
        }

        const { model = 'claude-sonnet-4.5', temperature = 0.7, maxTokens = 3000, useTools = true } = options;
        const tools = useTools ? [this.buildCreateFormulaTool()] : undefined;

        const payload = {
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages,
            tools,
            tool_choice: useTools ? { type: 'auto' } : undefined,
        } as any;

        let lastErr: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-api-key': process.env.ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    let parsed: any = text;
                    try { parsed = JSON.parse(text || 'null'); } catch { }

                    if (res.status >= 500 || res.status === 429) {
                        lastErr = new Error(`Anthropic API HTTP ${res.status}: ${JSON.stringify(parsed)}`);
                        const backoff = 200 * Math.pow(2, attempt - 1);
                        await this.sleep(backoff);
                        continue;
                    }

                    throw new Error(`Anthropic API HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
                }

                const data = await res.json().catch(() => null);
                let text = '';
                let toolJsonBlock: string | undefined;

                if (Array.isArray(data?.content)) {
                    for (const c of data.content) {
                        if (c?.type === 'text' && typeof c.text === 'string') {
                            text += c.text;
                        } else if (c?.type === 'tool_use' && c.name === 'create_formula') {
                            try {
                                toolJsonBlock = '```json\n' + JSON.stringify(c.input ?? c.parameters ?? {}, null, 2) + '\n```';
                            } catch { }
                        }
                    }
                }

                return { text: text || '', toolJsonBlock };
            } catch (err: any) {
                lastErr = err;
                logger.error(`[${this.domainName}] Anthropic request failed (attempt ${attempt}):`, err);
                if (attempt === 3) throw err;
                const backoff = 200 * Math.pow(2, attempt - 1);
                await this.sleep(backoff);
            }
        }
        throw lastErr || new Error('Anthropic request failed');
    }

    /**
     * TRUE STREAMING Anthropic API caller
     */
    async* streamAnthropic(
        systemPrompt: string,
        messages: Array<{ role: 'user' | 'assistant'; content: string }>,
        options: CompletionOptions = {}
    ): AsyncGenerator<{ type: 'text' | 'tool_use'; content: string; toolInput?: any }, void, unknown> {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
        }

        const { model = 'claude-sonnet-4.5', temperature = 0.7, maxTokens = 3000, useTools = true } = options;
        const tools = useTools ? [this.buildCreateFormulaTool()] : undefined;

        const payload = {
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages,
            tools,
            tool_choice: useTools ? { type: 'auto' } : undefined,
            stream: true,
        } as any;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Anthropic API HTTP ${res.status}: ${text}`);
        }

        if (!res.body) {
            throw new Error('No response body from Anthropic streaming API');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentToolInput = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]' || !data) continue;

                    try {
                        const event = JSON.parse(data);

                        if (event.type === 'content_block_delta') {
                            if (event.delta?.type === 'text_delta' && event.delta?.text) {
                                yield { type: 'text', content: event.delta.text };
                            } else if (event.delta?.type === 'input_json_delta' && event.delta?.partial_json) {
                                currentToolInput += event.delta.partial_json;
                            }
                        } else if (event.type === 'content_block_stop' && currentToolInput) {
                            try {
                                const toolInput = JSON.parse(currentToolInput);
                                yield { type: 'tool_use', content: '```json\n' + JSON.stringify(toolInput, null, 2) + '\n```', toolInput };
                            } catch { }
                            currentToolInput = '';
                        }
                    } catch { }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
