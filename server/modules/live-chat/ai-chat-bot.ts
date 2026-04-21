/**
 * AI Chat Bot — Conversational Support Agent
 *
 * Handles the full live chat conversation as an AI bot.
 * The bot uses conversation history to maintain context and
 * automatically escalates to a human admin when it can't help.
 *
 * Respects admin-configured AI provider/model from the app settings.
 * Supports both OpenAI and Anthropic.
 *
 * Escalation triggers:
 * - User explicitly asks for a human / real person
 * - Account-specific queries (order lookup, billing disputes)
 * - Medical/dosage advice that requires a practitioner
 * - AI determines it's stuck or can't resolve the issue
 * - Repeated user frustration signals
 */

import logger from '../../infra/logging/logger';
import { aiRuntimeSettings } from '../../infra/ai/ai-config';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// Lazy-initialized AI clients — created on first use
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Determine which AI provider/model to use for live chat.
 * Uses admin-configured settings, falling back to env defaults.
 */
function getAIConfig(): { provider: 'openai' | 'anthropic'; model: string } {
  if (aiRuntimeSettings.provider && aiRuntimeSettings.model) {
    return {
      provider: aiRuntimeSettings.provider,
      model: aiRuntimeSettings.model,
    };
  }
  // Fallback to environment
  if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
  }
  return { provider: 'openai', model: 'gpt-4o-mini' };
}

export interface ChatMessage {
  sender: string;      // 'user' | 'bot' | 'admin' | 'system'
  content: string;
  createdAt: Date | string;
}

export interface BotResponse {
  /** The bot's reply to the user */
  content: string;
  /** Whether the bot wants to escalate to a human */
  shouldEscalate: boolean;
  /** Reason for escalation (for admin context) */
  escalationReason?: string;
}

const SYSTEM_PROMPT = `You are the Ones Support Assistant — a friendly, knowledgeable support bot for Ones, a personalized supplement platform. You handle live chat conversations with users and guests.

## About Ones
- Ones creates personalized supplement formulas through AI-powered health consultations
- Users chat with an AI practitioner who designs a custom formula based on their health profile, lab results, and goals
- Supports wearable integrations: Fitbit, Oura Ring, and Whoop
- Users can upload blood work / lab results for AI analysis

## Membership & Pricing
- Membership is currently $9/month (Founding Member rate for the first 250 members — locked for life, it will never increase for them)
- After the first 250 spots fill, the price increases to the next tier. Current tiers: Founding $9/mo → Early Adopter $15/mo → Beta $19/mo → Standard (post-launch pricing)
- Membership includes: unlimited AI health consultations, lab and wearable data analysis, personalized formula recommendations, and ongoing formula updates
- Membership does NOT require purchasing supplements — members can use AI consultations and analysis without ordering
- Supplement pricing is separate and depends on the personalized formula: total daily milligrams, number of active ingredients, and ingredient sourcing quality
- Typical monthly supplement cost ranges from $100 to $200
- Users see their exact supplement price before ordering — no hidden fees
- Supplements are ordered as a 2-month supply (custom manufacturing requires this minimum for unit economics, and 2 months gives enough data to optimize the next batch)
- If you cancel membership and rejoin within 3 months, you keep your original rate; after 3 months you join at whatever tier is current
- NEVER quote specific supplement prices — each formula is unique and priced accordingly
- Free shipping on all orders
- NO REFUNDS once a formula has been manufactured — every order is custom-made per person and cannot be resold

## Key Features
- Dashboard at ones.health for managing formulas, orders, and health data
- Lab result upload and AI analysis
- Wearable data sync for biometric tracking
- Formula versioning — AI refines formulas over time based on user feedback
- Health profile questionnaire during onboarding

## Your Behavior Rules
1. Be warm, professional, and helpful. Use occasional emojis but don't overdo it.
2. Answer questions about Ones products, pricing, features, and general supplement info.
3. Keep responses concise — under 150 words. Use markdown formatting (bold, bullet points) when helpful.
4. NEVER make up specific order statuses, tracking numbers, account details, formula contents, shipping timelines, or medical diagnoses.
5. NEVER provide specific medical/dosage advice — suggest they start an AI consultation or speak with their healthcare provider.
6. If you can help, just help. Don't say "I'm just a bot" — be confident and useful.
7. When you've answered a question, naturally ask if there's anything else you can help with.
8. If you're not sure about something specific to Ones (policies, timelines, features you don't have info on), escalate rather than guessing.
9. NEVER mention GMP, third-party testing, certificates of analysis, HIPAA, or specific compliance claims unless explicitly told they're accurate — these are legal liabilities.

## ESCALATION — CRITICAL
You MUST decide on every response whether to escalate to a human agent. Set escalate=true when ANY of these apply:
- User explicitly asks for a human, real person, agent, manager, or supervisor
- User needs help with a specific order (lookup, modification, cancellation of existing order)
- User has a billing dispute, payment issue, or refund request for a specific transaction
- User is asking about their specific formula contents or requesting formula changes
- User mentions a medical condition and wants specific supplement advice
- User is frustrated, angry, or repeating themselves because they're not getting help
- User asks something you genuinely don't know about Ones specifically
- The conversation has gone 4+ exchanges without resolving the user's question

When escalating, give a warm handoff message — don't just say "transferring you." Acknowledge what they need and let them know a team member will help.

## Response Format
You MUST respond with a valid JSON object (no markdown code fence, just raw JSON):
{"content": "Your response to the user here", "escalate": false, "reason": ""}

When escalating:
{"content": "Your handoff message to the user", "escalate": true, "reason": "Brief reason for admin context"}

ALWAYS respond with valid JSON. Nothing else.`;

/**
 * Generate a bot response using conversation history.
 * Uses the admin-configured AI provider (OpenAI or Anthropic).
 */
export async function generateBotResponse(
  conversationHistory: ChatMessage[],
  latestUserMessage: string,
): Promise<BotResponse> {
  const config = getAIConfig();
  const apiKey = config.provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.warn(`AI chat bot called without ${config.provider.toUpperCase()} API key — auto-escalating`);
    return {
      content: `Thanks for reaching out! 👋 Let me connect you with a member of our support team who can help you directly. They'll be with you shortly!`,
      shouldEscalate: true,
      escalationReason: `No ${config.provider} API key configured`,
    };
  }

  try {
    logger.info(`AI chat bot using: ${config.provider} / ${config.model}`);

    // Build conversation messages
    const recentHistory = conversationHistory.slice(-20);
    let raw: string | null = null;

    if (config.provider === 'anthropic') {
      raw = await callAnthropic(config.model, recentHistory, latestUserMessage);
    } else {
      raw = await callOpenAI(config.model, recentHistory, latestUserMessage);
    }

    logger.info(`AI chat bot raw response: ${raw?.substring(0, 300)}`);
    if (!raw) {
      throw new Error('Empty AI response');
    }

    // Parse JSON response
    return parseAIResponse(raw);
  } catch (error: any) {
    const errMsg = error?.message || error?.error?.message || String(error);
    const errStatus = error?.status || error?.statusCode || 'unknown';
    logger.error(`AI chat bot response failed: ${errMsg} (status: ${errStatus})`, { provider: config.provider, model: config.model });

    // On error, give a friendly fallback and escalate
    return {
      content: `I apologize, but I'm having a bit of trouble right now. Let me connect you with our support team who can help you directly! 🙏`,
      shouldEscalate: true,
      escalationReason: `AI response error (${config.provider}/${config.model}) — auto-escalated`,
    };
  }
}

/**
 * Call OpenAI API for chat completion.
 */
async function callOpenAI(
  model: string,
  history: ChatMessage[],
  latestMessage: string,
): Promise<string> {
  const ai = getOpenAIClient();

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of history) {
    if (msg.sender === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.sender === 'bot' || msg.sender === 'system') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  // Add latest user message if not already in history
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.content !== latestMessage || lastMsg.sender !== 'user') {
    messages.push({ role: 'user', content: latestMessage });
  }

  const completion = await ai.chat.completions.create({
    model,
    max_tokens: 500,
    temperature: 0.7,
    messages,
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Call Anthropic API for chat completion.
 */
async function callAnthropic(
  model: string,
  history: ChatMessage[],
  latestMessage: string,
): Promise<string> {
  const client = getAnthropicClient();

  const rawMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of history) {
    if (msg.sender === 'user') {
      rawMessages.push({ role: 'user', content: msg.content });
    } else if (msg.sender === 'bot' || msg.sender === 'system') {
      rawMessages.push({ role: 'assistant', content: msg.content });
    }
  }

  // Add latest user message if not already in history
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.content !== latestMessage || lastMsg.sender !== 'user') {
    rawMessages.push({ role: 'user', content: latestMessage });
  }

  // Anthropic requires messages to start with 'user' and alternate roles.
  // Merge consecutive same-role messages and ensure it starts with 'user'.
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of rawMessages) {
    const prev = messages[messages.length - 1];
    if (prev && prev.role === msg.role) {
      // Merge consecutive same-role messages
      prev.content += '\n' + msg.content;
    } else {
      messages.push({ ...msg });
    }
  }

  // Ensure first message is from 'user'
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: latestMessage });
  }

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  // Extract text from Anthropic response
  const textBlock = response.content?.find((block) => block.type === 'text');
  return (textBlock as any)?.text?.trim() || '';
}

/**
 * Parse the AI's JSON response, with fallback handling for non-JSON responses.
 */
function parseAIResponse(raw: string): BotResponse {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    return {
      content: parsed.content || raw,
      shouldEscalate: !!parsed.escalate,
      escalationReason: parsed.reason || undefined,
    };
  } catch {
    // AI didn't return valid JSON — try to extract from markdown code fence
  }

  // Try extracting JSON from code fence
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return {
        content: parsed.content || raw,
        shouldEscalate: !!parsed.escalate,
        escalationReason: parsed.reason || undefined,
      };
    } catch {
      // Still not valid JSON
    }
  }

  // Try finding JSON object in the response
  const braceMatch = raw.match(/\{[\s\S]*"content"[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      return {
        content: parsed.content || raw,
        shouldEscalate: !!parsed.escalate,
        escalationReason: parsed.reason || undefined,
      };
    } catch {
      // Give up on JSON parsing
    }
  }

  // Fallback: treat the raw response as content, check for escalation keywords
  const escalationSignals = [
    'connect you with',
    'transfer you',
    'team member',
    'human agent',
    'let me get someone',
    'escalat',
  ];
  const hasEscalation = escalationSignals.some(s => raw.toLowerCase().includes(s));

  return {
    content: raw,
    shouldEscalate: hasEscalation,
    escalationReason: hasEscalation ? 'AI self-escalated in free-text response' : undefined,
  };
}

/**
 * Quick check if user message is an explicit request for a human.
 * Used as a fast-path before calling the AI.
 */
export function isExplicitHumanRequest(message: string): boolean {
  const lc = message.toLowerCase().trim();
  const humanPhrases = [
    'talk to a human',
    'talk to a person',
    'talk to someone',
    'speak to a human',
    'speak to a person',
    'speak to someone',
    'real person',
    'real human',
    'live agent',
    'human agent',
    'speak to an agent',
    'talk to an agent',
    'transfer me',
    'connect me to',
    'i want a human',
    'i need a human',
    'let me talk to',
    'can i speak to',
    'get me a person',
    'not a bot',
    'stop bot',
    'agent please',
    'human please',
    'representative',
    'supervisor',
    'manager please',
  ];
  return humanPhrases.some(phrase => lc.includes(phrase));
}
