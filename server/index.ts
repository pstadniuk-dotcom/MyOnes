import "./env";
import express, { type Request, Response, NextFunction } from "express";
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

// Add CSP middleware to allow 'unsafe-eval' for development
// This must be the FIRST middleware to ensure headers are set
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; font-src 'self' data: *; img-src 'self' data: *; connect-src 'self' * ws: wss:; frame-src 'self' https://www.youtube.com;"
  );
  next();
});

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
  
  // Always reflect the origin if it's in the allowed list, otherwise allow all
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // For non-listed origins, use wildcard but don't set credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
      
      // Start wearable token refresh scheduler
      startTokenRefreshScheduler();
      
      // Start wearable data sync scheduler
      startWearableDataScheduler();
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
        setTimeout(() => {
          server.close();
          server.listen(port, host);
        }, 1000);
      } else {
        console.error("Server error:", e);
      }
    });
    
    server.on('close', () => {
      console.error('⚠️  SERVER CLOSED');
    });
    
    server.on('listening', () => {
      console.log('✅ SERVER LISTENING EVENT FIRED');
    });
    
  } catch (error) {
    console.error("FATAL SERVER ERROR:", error);
    process.exit(1);
  }
})();
