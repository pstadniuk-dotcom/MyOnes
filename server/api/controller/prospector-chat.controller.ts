/**
 * Prospector Chat Controller — SSE endpoint for the conversational
 * outreach agent. Streams Claude tool-use events to the admin UI.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { runConversationalAgent, type AgentEvent, type ChatMessage } from '../../modules/agent/conversational-agent';
import logger from '../../infra/logging/logger';

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * POST /api/agent/chat — SSE streaming
 *
 * Request body: { messages: [{role,content}, ...] }
 *
 * Response: text/event-stream of events:
 *   event: text_delta      data: {"delta":"..."}
 *   event: tool_use        data: {"id":"...","name":"...","input":{...}}
 *   event: tool_result     data: {"id":"...","name":"...","ok":true,"summary":"...","data":{...}}
 *   event: message_start   data: {}
 *   event: message_stop    data: {}
 *   event: done            data: {"prospectsSaved":N,"iterations":N}
 *   event: error           data: {"message":"..."}
 */
export async function prospectorChatStream(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const messages: ChatMessage[] = parsed.data.messages;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders?.();

  const send = (event: AgentEvent) => {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      logger.warn('[prospector-chat] write failed', { err });
    }
  };

  // Heartbeat to keep connection alive across proxies
  const hb = setInterval(() => {
    if (res.writableEnded) return;
    try { res.write(`: ping\n\n`); } catch { /* noop */ }
  }, 15_000);

  // Abort if client disconnects
  const abort = new AbortController();
  req.on('close', () => abort.abort());

  try {
    await runConversationalAgent(messages, send, abort.signal);
  } catch (err: any) {
    logger.error('[prospector-chat] agent threw', { error: err.message });
    send({ type: 'error', message: err.message || 'agent failed' });
  } finally {
    clearInterval(hb);
    if (!res.writableEnded) res.end();
  }
}
