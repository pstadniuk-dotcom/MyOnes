export const aiRuntimeSettings: { provider?: 'openai' | 'anthropic'; model?: string; updatedAt?: string; source?: 'override' | 'env' } = {};

export const ALLOWED_MODELS: Record<'openai' | 'anthropic', string[]> = {
    openai: [
        // GPT-5.2 series (latest)
        'gpt-5.2', 'gpt-5.2-pro',
        // GPT-5 series
        'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-pro',
        // GPT-4.1 series
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        // GPT-4o series
        'gpt-4o', 'gpt-4o-mini',
        // o-series reasoning models
        'o3', 'o3-mini', 'o3-pro', 'o4-mini'
    ],
    anthropic: [
        // Claude 4.5 (latest)
        'claude-opus-4-5-20251101', 'claude-opus-4-5',
        'claude-sonnet-4-5-20250929', 'claude-sonnet-4-5',
        'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
        // Claude 4.1 (previous)
        'claude-opus-4-1-20250805', 'claude-opus-4-1',
        // Claude 3.5 (legacy)
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022'
    ]
};

export function normalizeModel(provider: 'openai' | 'anthropic', model: string | undefined | null): string | null {
    if (!model) return null;
    let m = String(model).trim();
    // Normalize separators
    m = m.replace(/\s+/g, '-');
    // Common Anthropic aliases
    if (provider === 'anthropic') {
        const lower = m.toLowerCase();
        // Map "claude 4.5" or "sonnet 4.5" variants to the alias
        if (/claude-?4[\.-]?5(-sonnet)?(-latest)?/i.test(lower) || /sonnet-?4[\.-]?5/i.test(lower)) {
            return 'claude-sonnet-4-5';
        }
        // Map "haiku 4.5" variants
        if (/haiku-?4[\.-]?5/i.test(lower)) {
            return 'claude-haiku-4-5';
        }
        // Map "opus 4.1" variants
        if (/opus-?4[\.-]?1/i.test(lower)) {
            return 'claude-opus-4-1';
        }
        // Legacy 3.x model normalization
        if (/claude-3[\.-]?5(-sonnet)?/i.test(lower)) {
            return 'claude-3-5-sonnet-20241022';
        }
        if (/haiku.*3[\.-]?5/i.test(lower)) {
            return 'claude-3-5-haiku-20241022';
        }
    }
    // Common OpenAI aliases
    if (provider === 'openai') {
        const lower = m.toLowerCase();
        // Only normalize basic gpt5 without version suffix to gpt-5
        if (/^gpt5$|^gpt-5$|^gpt_5$/i.test(lower)) return 'gpt-5';
        // Normalize gpt4o variants
        if (/^gpt4o$|^gpt-4o$|^gpt_4o$/i.test(lower)) return 'gpt-4o';
    }
    return m;
}

export async function initializeAiSettings(storage: any) {
    try {
        const saved = await storage.getAppSetting('ai_settings');
        const val = saved?.value as any;
        if (val && (val.provider || val.model)) {
            const provider = String(val.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic';
            let model = String(val.model || (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o'));
            const normalized = normalizeModel(provider, model) || model;
            const allowed = ALLOWED_MODELS[provider] || [];
            if (!allowed.includes(normalized)) {
                const fallback = allowed[0] || model;
                console.warn(`⚠️ Persisted model '${model}' not allowed for provider '${provider}'. Falling back to '${fallback}'.`);
                model = fallback;
            } else {
                model = normalized;
            }
            aiRuntimeSettings.provider = provider;
            aiRuntimeSettings.model = model;
            aiRuntimeSettings.updatedAt = new Date().toISOString();
            aiRuntimeSettings.source = 'override';
            console.log(`🔧 Loaded persisted AI settings: ${provider} / ${model}`);
        }
    } catch (e) {
        console.warn('⚠️ Failed to load persisted AI settings, using env defaults:', (e as Error)?.message || e);
    }
}
