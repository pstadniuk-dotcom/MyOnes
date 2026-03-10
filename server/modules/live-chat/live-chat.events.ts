/**
 * Live Chat SSE Event Bus
 *
 * Manages Server-Sent Events connections for real-time live chat.
 * Supports per-session channels so both user widget and admin panel
 * receive instant message updates and typing indicators.
 */

import { Request, Response } from 'express';
import logger from '../../infra/logging/logger';

// ─── Types ────────────────────────────────────────────────────────

export interface LiveChatEvent {
  type: 'new_message' | 'typing' | 'stop_typing' | 'session_update' | 'session_closed' | 'escalation' | 'new_session';
  data: Record<string, any>;
}

interface SSEClient {
  id: string;
  res: Response;
  sessionId: string;
  role: 'user' | 'admin'; // who's listening
  connectedAt: number;
}

// ─── Singleton Event Bus ──────────────────────────────────────────

class LiveChatEventBus {
  private clients: Map<string, SSEClient> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Heartbeat every 30s to keep connections alive + cleanup dead ones
    this.cleanupInterval = setInterval(() => this.heartbeat(), 30000);
  }

  /**
   * Register an SSE client for a specific chat session.
   */
  addClient(req: Request, res: Response, sessionId: string, role: 'user' | 'admin'): string {
    const clientId = `${role}-${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    const client: SSEClient = {
      id: clientId,
      res,
      sessionId,
      role,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);

    // Remove on disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
    });

    logger.info(`SSE client connected: ${clientId} (${role} on session ${sessionId.slice(0, 8)}...)`);

    return clientId;
  }

  /**
   * Broadcast an event to all clients subscribed to a session.
   */
  broadcast(sessionId: string, event: LiveChatEvent, excludeRole?: 'user' | 'admin') {
    for (const [, client] of this.clients) {
      if (client.sessionId === sessionId) {
        if (excludeRole && client.role === excludeRole) continue;
        this.sendEvent(client, event);
      }
    }
  }

  /**
   * Broadcast to all admin clients (for session list updates, new chats, etc.)
   */
  broadcastToAdmins(event: LiveChatEvent) {
    for (const [, client] of this.clients) {
      if (client.role === 'admin') {
        this.sendEvent(client, event);
      }
    }
  }

  /**
   * Send a new message event to the session.
   */
  emitMessage(sessionId: string, message: any) {
    this.broadcast(sessionId, {
      type: 'new_message',
      data: message,
    });
  }

  /**
   * Send a typing indicator.
   */
  emitTyping(sessionId: string, who: 'user' | 'admin' | 'bot') {
    this.broadcast(sessionId, {
      type: 'typing',
      data: { sender: who },
    });
  }

  /**
   * Send stop-typing indicator.
   */
  emitStopTyping(sessionId: string, who: 'user' | 'admin' | 'bot') {
    this.broadcast(sessionId, {
      type: 'stop_typing',
      data: { sender: who },
    });
  }

  /**
   * Notify session was closed.
   */
  emitSessionClosed(sessionId: string, closedBy: string) {
    this.broadcast(sessionId, {
      type: 'session_closed',
      data: { closedBy },
    });
  }

  /**
   * Notify session update (status change, assignment, etc.)
   */
  emitSessionUpdate(sessionId: string, updates: Record<string, any>) {
    this.broadcast(sessionId, {
      type: 'session_update',
      data: updates,
    });
    // Also broadcast to all admins for session list refresh
    this.broadcastToAdmins({
      type: 'session_update',
      data: { sessionId, ...updates },
    });
  }

  // ─── Internal ──────────────────────────────────────────────────

  private sendEvent(client: SSEClient, event: LiveChatEvent) {
    try {
      // Send as default SSE 'message' event with {type, data} wrapper
      // Frontend listens via addEventListener('message') and checks data.type
      const payload = JSON.stringify({ type: event.type, data: event.data });
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      // Client disconnected — remove
      this.clients.delete(client.id);
    }
  }

  private heartbeat() {
    for (const [id, client] of this.clients) {
      try {
        client.res.write(`:heartbeat\n\n`);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  /** Get count of connected clients (for diagnostics) */
  getClientCount(): number {
    return this.clients.size;
  }

  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.clients.clear();
  }
}

export const liveChatEventBus = new LiveChatEventBus();
