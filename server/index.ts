import "./env";
import express, { type Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startSmsReminderScheduler } from "./smsReminderScheduler";
// Old wearable schedulers removed - Junction handles data sync via webhooks
import { logger } from "./logger";

const app = express();
// Trust reverse proxy (needed for secure cookies and correct protocol detection in production)
app.set('trust proxy', 1);

// Content Security Policy - Security hardened
// 'unsafe-eval' only in development (needed for Vite HMR and React dev tools)
// 'unsafe-inline' kept for inline styles from UI libraries
const isDevMode = process.env.NODE_ENV !== 'production';
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevMode ? " 'unsafe-eval'" : ''} https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com wss: ws:",
  "frame-src 'self' https://www.youtube.com https://youtube.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS middleware - SECURITY: Only allow explicit origins (no wildcard fallback)
const isProduction = process.env.NODE_ENV === 'production';
const allowedOriginsList = [
  'https://my-ones.vercel.app',
  'https://myones.ai',
  'https://www.myones.ai',
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting configuration
// General API rate limit - prevents abuse and excessive costs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter limit for authentication endpoints - prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes (balanced security vs usability)
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
});

// AI chat rate limit - prevents API cost abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour per IP
  message: { error: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all API routes
app.use('/api/', apiLimiter);

// Configure session middleware for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || 'wearable-oauth-secret-change-in-production',
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

(async () => {
  try {
    const server = await registerRoutes(app, { authLimiter, aiLimiter });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || '0.0.0.0';
    server.listen(port, host, () => {
      log(`serving on port ${port}`);
      
      // Start SMS reminder scheduler
      startSmsReminderScheduler();
      
      // Note: Wearable data sync is now handled via Junction webhooks
      // No polling schedulers needed - data is pushed to /api/webhooks/junction
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        logger.error('Address in use, retrying...');
        setTimeout(() => {
          server.close();
          server.listen(port, host);
        }, 1000);
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
    
  } catch (error) {
    logger.error("FATAL SERVER ERROR", { error });
    process.exit(1);
  }
})();
