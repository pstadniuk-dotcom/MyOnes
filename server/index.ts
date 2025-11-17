import "./env";
import express, { type Request, Response, NextFunction } from "express";
import type { ListenOptions } from "net";
import fileUpload from "express-fileupload";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startSmsReminderScheduler } from "./smsReminderScheduler";
import { startTokenRefreshScheduler } from "./tokenRefreshScheduler";
import { startWearableDataScheduler } from "./wearableDataScheduler";

const app = express();
// Trust reverse proxy (needed for secure cookies and correct protocol detection in production)
app.set('trust proxy', 1);

// CORS middleware - allow requests from Vercel frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://my-ones.vercel.app',
    'https://my-ones-210a7gjcx-pstadniuk-dotcoms-projects.vercel.app',
    'https://myones.ai',
    'https://www.myones.ai',
    'http://localhost:5000',
    'http://localhost:5173'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
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
  max: 5, // Only 5 attempts per 15 minutes
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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app, { authLimiter, aiLimiter });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: ListenOptions = {
    port,
    host: "0.0.0.0",
  };

  // Windows does not support SO_REUSEPORT, so enable reuse only where available.
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
    
    // Start SMS reminder scheduler
    startSmsReminderScheduler();
    
    // Start wearable token refresh scheduler
    startTokenRefreshScheduler();
    
    // Start wearable data sync scheduler
    startWearableDataScheduler();
  });
})();
