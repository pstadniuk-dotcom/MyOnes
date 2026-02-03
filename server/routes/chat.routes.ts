import { Router, type Request, type Response } from 'express';
import { chatService } from '../domains/chat/chat.service';
import { z } from 'zod';

const router = Router();

// Helper to get client IP (duplicated from routes.ts for now, or use middleware.ts if available)
function getClientIP(req: any): string {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
}

// Rate limiting store (simple in-memory for MVP)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();
function checkRateLimit(clientId: string, limit: number, windowMs: number) {
    const now = Date.now();
    const entry = rateLimitStore.get(clientId);
    if (!entry || now > entry.resetTime) {
        const resetTime = now + windowMs;
        rateLimitStore.set(clientId, { count: 1, resetTime });
        return { allowed: true, remaining: limit - 1, resetTime };
    }
    if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// Validation schemas
const streamChatSchema = z.object({
    message: z.string().min(1).max(5000),
    sessionId: z.string().optional(),
    files: z.array(z.any()).optional().default([])
});

/**
 * @route POST /api/chat/stream
 * @desc AI-powered streaming chat with context building
 */
router.post('/stream', async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    try {
        const { message, sessionId, files } = streamChatSchema.parse(req.body);
        const clientIP = getClientIP(req);

        // Rate limiting
        const rateLimit = checkRateLimit(clientIP, 10, 10 * 60 * 1000);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: 'Too many messages. Please try again later.',
                retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

        // SSE helper
        const sendSSE = (data: any) => {
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                if ((res as any).flush) (res as any).flush();
            }
        };

        // Use ChatService to handle orchestration
        await chatService.streamChat(userId, sessionId, message, files, {
            onConnected: (msg: string) => sendSSE({ type: 'connected', message: msg }),
            onThinking: (msg: string) => sendSSE({ type: 'thinking', message: msg }),
            onChunk: (content: string, index: number) => sendSSE({ type: 'chunk', content, sessionId, chunkIndex: index }),
            onProcessing: (msg: string) => sendSSE({ type: 'processing', message: msg }),
            onFormula: (formula: any) => sendSSE({ type: 'formula', formula }),
            onHealthData: (data: any) => sendSSE({ type: 'health-data', data }),
            onInfo: (msg: string) => sendSSE({ type: 'info', message: msg }),
            onComplete: (full: string) => {
                sendSSE({ type: 'complete', fullResponse: full });
                res.end();
            },
            onError: (err: any) => {
                sendSSE({ type: 'error', error: err.message || 'Stream failed' });
                res.end();
            }
        });

    } catch (error: any) {
        console.error('Chat route error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Invalid request data', details: error.errors });
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start chat stream' });
        }
    }
});

/**
 * @route GET /api/chat/sessions
 * @desc List all chat sessions for the current user
 */
router.get('/sessions', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const sessions = await chatService.listUserSessions(userId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * @route GET /api/chat/sessions/:id/messages
 * @desc List all messages for a specific session
 */
router.get('/sessions/:id/messages', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const session = await chatService.getSession(req.params.id);
        if (!session || session.userId !== userId) {
            return res.status(403).json({ error: 'Session not found or access denied' });
        }
        const messages = await chatService.listMessages(req.params.id);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * @route DELETE /api/chat/sessions/:id
 * @desc Delete a chat session and its messages
 */
router.delete('/sessions/:id', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const session = await chatService.getSession(req.params.id);
        if (!session || session.userId !== userId) {
            return res.status(403).json({ error: 'Session not found or access denied' });
        }
        await chatService.deleteSession(req.params.id);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

/**
 * @route GET /api/consultations/history
 * @desc Get consultation history for the current user
 */
router.get('/consultations/history', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const sessions = await chatService.listUserSessions(userId);
        const messagesPromises = sessions.map(session =>
            chatService.listMessages(session.id).then(messages => ({
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
        res.json({ sessions: enhancedSessions, messages: messagesMap });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch consultation history' });
    }
});

/**
 * @route GET /api/consultations/:sessionId
 * @desc Get specific consultation session with messages
 */
router.get('/consultations/:sessionId', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const sessionId = req.params.sessionId;
        const session = await chatService.getSession(sessionId);
        if (!session || session.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to session' });
        }
        const messages = await chatService.listMessages(sessionId);
        const sessionUpdatedAt = messages.length > 0
            ? messages[messages.length - 1].createdAt
            : session.createdAt;

        res.json({
            session: {
                id: session.id,
                userId: session.userId,
                status: session.status,
                createdAt: session.createdAt,
                updatedAt: sessionUpdatedAt
            },
            messages: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                sender: msg.role === 'assistant' ? 'ai' : 'user',
                timestamp: msg.createdAt,
                sessionId: msg.sessionId,
                formula: msg.formula || undefined
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch consultation session' });
    }
});

/**
 * @route DELETE /api/consultations/:sessionId
 * @desc Delete consultation session
 */
router.delete('/consultations/:sessionId', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    try {
        const sessionId = req.params.sessionId;
        const session = await chatService.getSession(sessionId);
        if (!session || session.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await chatService.deleteSession(sessionId);
        res.json({ success: true, sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete consultation' });
    }
});

export default router;
