/**
 * AI Service
 * 
 * High-level service for AI operations.
 * Handles model normalization, prompt assembly, and coordinates with AiRepository.
 */

import { AiRepository, type Message, type CompletionOptions } from './ai.repository';

// Re-export types for convenience
export { type Message, type CompletionOptions };

// SECURITY: Immutable formula limits
export const FORMULA_LIMITS = {
    CAPSULE_CAPACITY_MG: 550,
    VALID_CAPSULE_COUNTS: [6, 9, 12, 15] as const,
    DEFAULT_CAPSULE_COUNT: 9,
    DOSAGE_TOLERANCE: 50,
    BUDGET_TOLERANCE_PERCENT: 0.05,
    MIN_INGREDIENT_DOSE: 10,
    MIN_INGREDIENT_COUNT: 8,
    MAX_INGREDIENT_COUNT: 50,
} as const;

export const ALLOWED_MODELS: Record<'openai' | 'anthropic', string[]> = {
    openai: [
        'gpt-5.2', 'gpt-5.2-pro',
        'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-pro',
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        'gpt-4o', 'gpt-4o-mini',
        'o3', 'o3-mini', 'o3-pro', 'o4-mini'
    ],
    anthropic: [
        'claude-opus-4-5-20251101', 'claude-opus-4-5',
        'claude-sonnet-4-5-20250929', 'claude-sonnet-4-5',
        'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
        'claude-opus-4-1-20250805', 'claude-opus-4-1',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022'
    ]
};

export class AiService {
    private domainName = "AiService";

    constructor(private repository: AiRepository) { }

    /**
     * Normalize model names across providers
     */
    normalizeModel(provider: 'openai' | 'anthropic', model: string | undefined | null): string | null {
        if (!model) return null;
        let m = String(model).trim();
        m = m.replace(/\s+/g, '-');

        if (provider === 'anthropic') {
            const lower = m.toLowerCase();
            if (/claude-?4[\.-]?5(-sonnet)?(-latest)?/i.test(lower) || /sonnet-?4[\.-]?5/i.test(lower)) {
                return 'claude-sonnet-4-5';
            }
            if (/haiku-?4[\.-]?5/i.test(lower)) {
                return 'claude-haiku-4-5';
            }
            if (/opus-?4[\.-]?1/i.test(lower)) {
                return 'claude-opus-4-1';
            }
            if (/claude-3[\.-]?5(-sonnet)?/i.test(lower)) {
                return 'claude-3-5-sonnet-20241022';
            }
            if (/haiku.*3[\.-]?5/i.test(lower)) {
                return 'claude-3-5-haiku-20241022';
            }
        }

        if (provider === 'openai') {
            const lower = m.toLowerCase();
            if (/^gpt5$|^gpt-5$|^gpt_5$/i.test(lower)) return 'gpt-5';
            if (/^gpt4o$|^gpt-4o$|^gpt_4o$/i.test(lower)) return 'gpt-4o';
        }

        return m;
    }

    /**
     * Get a simple completion from OpenAI
     */
    async getChatCompletion(messages: Message[], options: CompletionOptions = {}): Promise<string> {
        return this.repository.callOpenAi(messages, options);
    }

    /**
     * Stream a completion from OpenAI
     */
    async streamOpenAi(messages: Message[], options: CompletionOptions = {}) {
        return this.repository.callOpenAiStream(messages, options);
    }

    /**
     * Get a vision-based completion from OpenAI
     */
    async getVisionCompletion(prompt: string, imageUrl: string, options: CompletionOptions = {}): Promise<string> {
        return this.repository.callOpenAiVision(prompt, imageUrl, options);
    }

    /**
     * Get a completion from Anthropic
     */
    async getAnthropicCompletion(
        systemPrompt: string,
        messages: Array<{ role: 'user' | 'assistant'; content: string }>,
        options: CompletionOptions = {}
    ): Promise<{ text: string; toolJsonBlock?: string }> {
        return this.repository.callAnthropic(systemPrompt, messages, options);
    }

    /**
     * Stream a completion from Anthropic
     */
    streamAnthropicCompletion(
        systemPrompt: string,
        messages: Array<{ role: 'user' | 'assistant'; content: string }>,
        options: CompletionOptions = {}
    ) {
        return this.repository.streamAnthropic(systemPrompt, messages, options);
    }
}
