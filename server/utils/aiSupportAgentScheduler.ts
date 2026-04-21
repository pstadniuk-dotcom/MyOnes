/**
 * AI Support Agent Scheduler
 *
 * Runs every morning at 7:00 AM UTC (configurable).
 * Scans for:
 *  1. Open/in-progress support tickets needing a staff response
 *  2. Live chat sessions in "waiting" status (escalated to human)
 *
 * For each, uses AI to:
 *  - Summarize the customer's issue
 *  - Draft a professional response
 *  - Store the draft for admin review
 *
 * Admin reviews and sends (or edits/dismisses) from the AI Support Agent dashboard.
 */

import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { db } from '../infra/db/db';
import {
  supportTickets,
  supportTicketResponses,
  liveChatSessions,
  liveChatMessages,
  aiSupportDrafts,
  users,
} from '@shared/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { aiRuntimeSettings } from '../infra/ai/ai-config';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// ─── AI Client Helpers ────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

function getAIConfig(): { provider: 'openai' | 'anthropic'; model: string } {
  if (aiRuntimeSettings.provider && aiRuntimeSettings.model) {
    return { provider: aiRuntimeSettings.provider, model: aiRuntimeSettings.model };
  }
  if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
  }
  return { provider: 'openai', model: 'gpt-4o-mini' };
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SUPPORT_AGENT_SYSTEM_PROMPT = `You are a professional customer support agent for ONES AI, a personalized supplement platform.

Your role is to draft helpful, empathetic, and accurate responses to customer support inquiries. The admin team will review your drafts before sending them.

Guidelines:
- Be warm and professional, using the customer's name when available
- Address the specific issue they raised
- If the question is about supplements, formulas, or health topics, provide general guidance but note that specific medical advice should come from their practitioner
- For order/billing/account issues, acknowledge the concern and outline next steps
- For technical issues, provide troubleshooting steps
- Keep responses concise but thorough (150-300 words ideal)
- Do NOT make up specific order numbers, dates, or account details — use placeholders like [ORDER_NUMBER] if needed
- End with a clear next step or question to the customer
- Sign off as "The ONES Support Team"

You will receive the conversation history and must provide TWO things in your response as valid JSON:
{
  "summary": "A brief 1-2 sentence summary of the customer's issue for the admin's quick review",
  "draftResponse": "The full draft response to send to the customer"
}

Respond ONLY with the JSON object, no other text.`;

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Find support tickets that need an AI-drafted response.
 * Criteria: status is open or in_progress, AND no pending AI draft exists for it.
 */
async function findTicketsNeedingDrafts() {
  // Get IDs of tickets that already have a pending draft
  const existingDrafts = await db
    .select({ sourceId: aiSupportDrafts.sourceId })
    .from(aiSupportDrafts)
    .where(and(
      eq(aiSupportDrafts.source, 'ticket'),
      eq(aiSupportDrafts.status, 'pending'),
    ));
  const draftedTicketIds = existingDrafts.map(d => d.sourceId);

  // Find open/in_progress tickets without a pending draft
  const tickets = await db
    .select({
      ticket: supportTickets,
      userName: users.name,
      userEmail: users.email,
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(and(
      or(
        eq(supportTickets.status, 'open'),
        eq(supportTickets.status, 'in_progress'),
      ),
      draftedTicketIds.length > 0
        ? sql`${supportTickets.id} NOT IN (${sql.join(draftedTicketIds.map(id => sql`${id}`), sql`, `)})`
        : sql`1=1`,
    ))
    .orderBy(desc(supportTickets.createdAt));

  return tickets;
}

/**
 * Find escalated live chat sessions (waiting for human) that need a draft.
 * Filters out trivial chats where the user never actually asked a question
 * (e.g., bot greeted them but user never responded).
 */
async function findChatsNeedingDrafts() {
  const existingDrafts = await db
    .select({ sourceId: aiSupportDrafts.sourceId })
    .from(aiSupportDrafts)
    .where(and(
      eq(aiSupportDrafts.source, 'live_chat'),
      eq(aiSupportDrafts.status, 'pending'),
    ));
  const draftedChatIds = existingDrafts.map(d => d.sourceId);

  const chats = await db
    .select({
      session: liveChatSessions,
      userName: users.name,
      userEmail: users.email,
    })
    .from(liveChatSessions)
    .leftJoin(users, eq(liveChatSessions.userId, users.id))
    .where(and(
      eq(liveChatSessions.status, 'waiting'),
      draftedChatIds.length > 0
        ? sql`${liveChatSessions.id} NOT IN (${sql.join(draftedChatIds.map(id => sql`${id}`), sql`, `)})`
        : sql`1=1`,
    ))
    .orderBy(desc(liveChatSessions.lastMessageAt));

  // Filter out chats where the customer never sent a meaningful message.
  // A "meaningful" chat must have at least 1 user message with 5+ characters
  // (excludes chats that are just bot greetings with no customer reply).
  const filteredChats = [];
  for (const chat of chats) {
    const userMessages = await db
      .select({ content: liveChatMessages.content })
      .from(liveChatMessages)
      .where(and(
        eq(liveChatMessages.sessionId, chat.session.id),
        eq(liveChatMessages.sender, 'user'),
      ));

    const hasMeaningfulMessage = userMessages.some(
      m => m.content && m.content.trim().length >= 5
    );

    if (hasMeaningfulMessage) {
      filteredChats.push(chat);
    } else {
      logger.info(`AI Support Agent: Skipping chat ${chat.session.id} — no meaningful user messages`);
    }
  }

  return filteredChats;
}

/**
 * Get the conversation thread for a support ticket.
 */
async function getTicketConversation(ticketId: string): Promise<string> {
  const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  const responses = await db
    .select()
    .from(supportTicketResponses)
    .where(eq(supportTicketResponses.ticketId, ticketId))
    .orderBy(supportTicketResponses.createdAt);

  if (!ticket[0]) return '';

  let conversation = `Subject: ${ticket[0].subject}\nCategory: ${ticket[0].category}\nPriority: ${ticket[0].priority}\n\n`;
  conversation += `Customer's initial message:\n${ticket[0].description}\n\n`;

  for (const r of responses) {
    const role = r.isStaff ? 'Staff' : 'Customer';
    conversation += `${role}: ${r.message}\n\n`;
  }

  return conversation;
}

/**
 * Get the conversation thread for a live chat session.
 */
async function getChatConversation(sessionId: string): Promise<string> {
  const messages = await db
    .select()
    .from(liveChatMessages)
    .where(eq(liveChatMessages.sessionId, sessionId))
    .orderBy(liveChatMessages.createdAt);

  let conversation = '';
  for (const m of messages) {
    const role = m.sender === 'user' ? 'Customer' : m.sender === 'bot' ? 'AI Bot' : 'Staff';
    conversation += `${role}: ${m.content}\n\n`;
  }

  return conversation;
}

/**
 * Call the AI to generate a draft response.
 */
async function generateDraft(
  conversation: string,
  context: { customerName?: string; subject?: string; source: 'ticket' | 'live_chat' }
): Promise<{ summary: string; draftResponse: string; model: string } | null> {
  const config = getAIConfig();

  const userPrompt = `Source: ${context.source === 'ticket' ? 'Support Ticket' : 'Live Chat (escalated to human)'}
${context.subject ? `Subject: ${context.subject}` : ''}
${context.customerName ? `Customer name: ${context.customerName}` : 'Customer name: Unknown'}

--- Conversation History ---
${conversation}
--- End of Conversation ---

Please analyze this conversation and provide a JSON response with "summary" and "draftResponse" fields.`;

  try {
    let rawResponse = '';

    if (config.provider === 'openai') {
      const ai = getOpenAIClient();
      const completion = await ai.chat.completions.create({
        model: config.model,
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SUPPORT_AGENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });
      rawResponse = completion.choices?.[0]?.message?.content?.trim() || '';
    } else {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 1000,
        system: SUPPORT_AGENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const textBlock = response.content?.find((block: any) => block.type === 'text') as any;
      rawResponse = textBlock?.text?.trim() || '';
    }

    // Parse the JSON response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('AI Support Agent: Could not parse JSON from AI response', { rawResponse: rawResponse.substring(0, 200) });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.summary || !parsed.draftResponse) {
      logger.warn('AI Support Agent: Missing fields in AI response', { parsed });
      return null;
    }

    return {
      summary: parsed.summary,
      draftResponse: parsed.draftResponse,
      model: config.model,
    };
  } catch (error) {
    logger.error('AI Support Agent: Error generating draft', { error, source: context.source });
    return null;
  }
}

/**
 * Main scan & draft function — called by the scheduler.
 */
export async function runAiSupportAgent(): Promise<{ ticketDrafts: number; chatDrafts: number; errors: number }> {
  logger.info('🤖 AI Support Agent: Starting morning scan...');
  let ticketDrafts = 0;
  let chatDrafts = 0;
  let errors = 0;

  // 1. Process support tickets
  try {
    const tickets = await findTicketsNeedingDrafts();
    logger.info(`AI Support Agent: Found ${tickets.length} tickets needing drafts`);

    for (const { ticket, userName, userEmail } of tickets) {
      try {
        const conversation = await getTicketConversation(ticket.id);
        if (!conversation.trim()) continue;

        const draft = await generateDraft(conversation, {
          customerName: userName || userEmail || undefined,
          subject: ticket.subject,
          source: 'ticket',
        });

        if (draft) {
          await db.insert(aiSupportDrafts).values({
            source: 'ticket',
            sourceId: ticket.id,
            userId: ticket.userId,
            summary: draft.summary,
            draftResponse: draft.draftResponse,
            model: draft.model,
            status: 'pending',
            metadata: {
              subject: ticket.subject,
              category: ticket.category,
              priority: ticket.priority,
              lastCustomerMessage: conversation.split('\n').filter(l => l.startsWith('Customer:')).pop()?.replace('Customer: ', '') || undefined,
            },
          });
          ticketDrafts++;
          logger.info(`AI Support Agent: Created draft for ticket ${ticket.id}`);
        }
      } catch (err) {
        errors++;
        logger.error(`AI Support Agent: Error processing ticket ${ticket.id}`, { error: err });
      }
    }
  } catch (err) {
    logger.error('AI Support Agent: Error fetching tickets', { error: err });
    errors++;
  }

  // 2. Process escalated live chats
  try {
    const chats = await findChatsNeedingDrafts();
    logger.info(`AI Support Agent: Found ${chats.length} escalated chats needing drafts`);

    for (const { session, userName, userEmail } of chats) {
      try {
        const conversation = await getChatConversation(session.id);
        if (!conversation.trim()) continue;

        const customerName = userName || session.guestName || userEmail || session.guestEmail || undefined;

        const draft = await generateDraft(conversation, {
          customerName,
          subject: session.subject || undefined,
          source: 'live_chat',
        });

        if (draft) {
          await db.insert(aiSupportDrafts).values({
            source: 'live_chat',
            sourceId: session.id,
            userId: session.userId || undefined,
            summary: draft.summary,
            draftResponse: draft.draftResponse,
            model: draft.model,
            status: 'pending',
            metadata: {
              subject: session.subject || undefined,
              guestEmail: session.guestEmail || undefined,
              guestName: session.guestName || undefined,
              messageCount: (await db.select({ count: sql<number>`count(*)` }).from(liveChatMessages).where(eq(liveChatMessages.sessionId, session.id)))[0]?.count || 0,
              lastCustomerMessage: conversation.split('\n').filter(l => l.startsWith('Customer:')).pop()?.replace('Customer: ', '') || undefined,
            },
          });
          chatDrafts++;
          logger.info(`AI Support Agent: Created draft for chat ${session.id}`);
        }
      } catch (err) {
        errors++;
        logger.error(`AI Support Agent: Error processing chat ${session.id}`, { error: err });
      }
    }
  } catch (err) {
    logger.error('AI Support Agent: Error fetching chats', { error: err });
    errors++;
  }

  logger.info(`🤖 AI Support Agent: Completed. Tickets: ${ticketDrafts}, Chats: ${chatDrafts}, Errors: ${errors}`);
  return { ticketDrafts, chatDrafts, errors };
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startAiSupportAgentScheduler() {
  // Check if AI keys are available
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    logger.warn('AI Support Agent: No AI API keys configured — scheduler disabled');
    return;
  }

  // Run daily at 7:00 AM UTC (roughly 2-3 AM EST, ready for morning review)
  cron.schedule('0 7 * * *', async () => {
    try {
      await runAiSupportAgent();
    } catch (error) {
      logger.error('AI Support Agent: Scheduler error', { error });
    }
  });

  logger.info('🤖 AI Support Agent scheduler started (daily at 7:00 AM UTC)');

  // Also check on startup: if no drafts were created today, run immediately.
  // This handles cases where the server wasn't running at 7 AM UTC (restart, deploy, etc.)
  setTimeout(async () => {
    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const todaysDrafts = await db
        .select({ id: aiSupportDrafts.id })
        .from(aiSupportDrafts)
        .where(sql`${aiSupportDrafts.createdAt} >= ${todayStart.toISOString()}`)
        .limit(1);

      if (todaysDrafts.length === 0) {
        logger.info('🤖 AI Support Agent: No drafts created today — running startup scan');
        await runAiSupportAgent();
      } else {
        logger.info('🤖 AI Support Agent: Drafts already exist for today — skipping startup scan');
      }
    } catch (error) {
      logger.error('AI Support Agent: Startup check error', { error });
    }
  }, 15_000); // Wait 15 seconds after boot for DB connections to stabilize
}
