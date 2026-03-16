import "./env";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import fileUpload from "express-fileupload";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startSmsReminderScheduler } from "./utils/smsReminderScheduler";
import { startAutoOptimizeScheduler } from "./utils/autoOptimizeScheduler";
import { startBlogGenerationScheduler } from "./utils/blogGenerationScheduler";
import { startPrAgentScheduler } from "./utils/prAgentScheduler";
import { startAutoShipScheduler } from "./utils/autoShipScheduler";
import { startSmartReorderScheduler } from "./utils/smartReorderScheduler";
import { startAiSupportAgentScheduler } from "./utils/aiSupportAgentScheduler";
// Old wearable schedulers removed - Junction handles data sync via webhooks
import { logger } from "./infra/logging/logger";

// Catch unhandled errors so the server doesn't silently die
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

const app = express();
// Trust reverse proxy (needed for secure cookies and correct protocol detection in production)
app.set('trust proxy', 1);
// Hide Express server identity to prevent targeted attacks
app.disable('x-powered-by');

// Security headers via helmet — replaces manual header setting
// 'unsafe-eval' only in development (needed for Vite HMR and React dev tools)
// 'unsafe-inline' kept for inline styles from UI libraries
const isDevMode = process.env.NODE_ENV !== 'production';
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevMode ? " 'unsafe-eval'" : ''} https://cdn.jsdelivr.net https://accounts.google.com/gsi/client https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob: https://platform-lookaside.fbsbx.com",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com https://accounts.google.com/gsi/ https://www.facebook.com https://web.facebook.com https://graph.facebook.com https://facebook.com wss: ws:",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://accounts.google.com/ https://www.facebook.com https://web.facebook.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...(isDevMode ? ["'unsafe-eval'"] : []), "https://cdn.jsdelivr.net", "https://accounts.google.com/gsi/client", "https://connect.facebook.net","https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com/gsi/style"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://platform-lookaside.fbsbx.com", "https://maps.googleapis.com"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://accounts.google.com/gsi/", "https://www.facebook.com", "https://web.facebook.com", "https://graph.facebook.com", "https://facebook.com","https://maps.googleapis.com",  "https://maps.gstatic.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://accounts.google.com/", "https://www.facebook.com", "https://web.facebook.com"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  // Allows Google/Facebook login popups to communicate back to the app
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // HSTS in production with preload
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Hide X-Powered-By (already disabled above, but belt-and-suspenders)
  hidePoweredBy: true,
  // X-Content-Type-Options: nosniff — enabled by default
  // X-XSS-Protection — helmet disables this by default (modern browsers don't need it)
}));

// CORS middleware - SECURITY: Only allow explicit origins (no wildcard fallback)
const isProduction = process.env.NODE_ENV === 'production';
const allowedOriginsList = [
  'https://my-ones.vercel.app',
  'https://ones.health',
  'https://www.ones.health',
  'https://myones.onrender.com',
  // Local development only
  ...(!isProduction ? ['http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5000', 'http://127.0.0.1:5173'] : [])
];

// Check if origin is allowed (includes Vercel preview deployments)
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (allowedOriginsList.includes(origin)) return true;
  // Allow all Vercel preview deployments for this project
  if (origin.match(/^https:\/\/my-ones(-[a-z0-9]+)?(-pstadniuk-dotcoms-projects)?\.vercel\.app$/)) return true;
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  }
  // SECURITY: Do NOT set any CORS headers for unknown origins
  // The browser will block the request if headers are missing

  // Handle preflight
  if (req.method === 'OPTIONS') {
    if (isAllowedOrigin(origin)) {
      return res.sendStatus(200);
    }
    // Don't explicitly reject - just don't set CORS headers
    return res.sendStatus(204);
  }

  next();
});

app.use('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting configuration
const isDev = process.env.NODE_ENV !== 'production';

// General API rate limit - prevents abuse and excessive costs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 200, // Relaxed in dev, strict in prod
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter limit for authentication endpoints - prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10, // Relaxed in dev, strict in prod
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
});

// AI chat rate limit - prevents API cost abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 200 : 50, // Relaxed in dev, strict in prod
  message: { error: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin API rate limit - auth-protected but still needs abuse prevention
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 300, // Higher than general API since admins need more headroom
  message: { error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all API routes
app.use('/api/', apiLimiter);

// Apply dedicated rate limit to admin routes
app.use('/api/admin', adminLimiter);

// Configure session middleware for OAuth state management
if (!process.env.SESSION_SECRET) {
  logger.error('FATAL: SESSION_SECRET environment variable is required. Set it before starting the server.');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutes (OAuth flow should complete quickly)
    sameSite: 'lax'
  }
}));

// Configure file upload middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false,
  tempFileDir: '/tmp/'
}));

// Request ID tracking — attach unique ID to each request for log correlation
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    const contentLength = res.getHeader("content-length");
    const meta = contentLength ? ` ~${contentLength}b` : "";
    const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms${meta}`;
    log(logLine);
  });

  next();
});

// Health check endpoint (no auth, no rate limit) for load balancers / uptime monitors
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

(async () => {
  try {
    const server = await registerRoutes(app, { authLimiter, aiLimiter });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log all server errors
      if (status >= 500) {
        logger.error('Unhandled server error', { status, message, stack: err.stack });
      }

      // Don't leak internal error details in production
      const safeMessage = (status >= 500 && process.env.NODE_ENV === 'production')
        ? 'Internal Server Error'
        : message;

      res.status(status).json({ message: safeMessage });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // Only serve static files if the build directory exists
      // (skipped when frontend is deployed separately on Vercel)
      const distPublicPath = path.resolve(import.meta.dirname ?? __dirname, "..", "dist", "public");
      if (fs.existsSync(distPublicPath)) {
        serveStatic(app);
      } else {
        log("Skipping static file serving (dist/public not found — frontend deployed separately)");
      }
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    const configuredPort = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || '0.0.0.0';

    server.listen(configuredPort, host, async () => {
      log(`serving on port ${configuredPort}`);

      // Recover any lab reports stuck in "processing" from a previous crash
      try {
        const { filesRepository } = await import('./modules/files/files.repository');
        const recovered = await filesRepository.recoverStaleProcessing();
        if (recovered > 0) {
          logger.info(`Recovered ${recovered} stale lab report(s) from interrupted processing`);
        }
      } catch (err) {
        logger.warn('Failed to recover stale processing records', { error: err });
      }

      // Start SMS reminder scheduler
      startSmsReminderScheduler();

      // Start formula review scheduler (checks subscription renewals daily at 9am UTC)
      startAutoOptimizeScheduler();

      // Start auto-ship pre-renewal scheduler (refreshes quotes 10 days before renewal at 8am UTC)
      startAutoShipScheduler();

      // Start Smart Re-Order scheduler (AI review + auto-approve + charge for members)
      startSmartReorderScheduler();

      // Start blog auto-generation scheduler (OFF by default — enabled via Admin → Blog Settings)
      startBlogGenerationScheduler();

      // Start PR Agent scheduler (OFF by default — enabled via Admin → PR Agent Settings)
      startPrAgentScheduler();

      // Start AI Support Agent scheduler (daily at 7:00 AM UTC — drafts responses for admin review)
      startAiSupportAgentScheduler();

      // Note: Wearable data sync is now handled via Junction webhooks
      // No polling schedulers needed - data is pushed to /api/webhooks/junction
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        logger.error(`Address in use on port ${configuredPort}.`);
        process.exit(1);
      } else {
        logger.error("Server error", { error: e });
      }
    });

    server.on('close', () => {
      logger.warn('Server closed');
    });

    server.on('listening', () => {
      logger.info('Server listening event fired');
    });

    // Graceful shutdown handler
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after 10 seconds if connections aren't draining
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error("FATAL SERVER ERROR", { error });
    process.exit(1);
  }
})();
