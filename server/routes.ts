
import type { Express } from "express";
import { createServer, type Server } from "http";
// import { setupAuth } from "./auth";
// import { setupWebhooks, registerWebhookRoutes } from "./domains/commerce/webhooks";
import {
  authRoutes,
  userRoutes,
  notificationRoutes,
  adminRoutes,
  supportRoutes,
  consentsRoutes,
  filesRoutes,
  formulasRoutes,
  ingredientsRoutes,
  wearablesRoutes,
  optimizeRoutes,
  chatRoutes,
  dashboardRoutes
} from "./routes/index"; // Import all routes from index barrel
import { RateLimitRequestHandler } from "express-rate-limit";

export async function registerRoutes(app: Express, rateLimiters: { authLimiter?: RateLimitRequestHandler; aiLimiter?: RateLimitRequestHandler }): Promise<Server> {
  // Setup authentication (session, passport, etc)
  // setupAuth(app);

  if (rateLimiters?.authLimiter) {
    app.use('/api/auth/signup', rateLimiters.authLimiter);
    app.use('/api/auth/login', rateLimiters.authLimiter);
  }

  // Setup Commerce Webhooks (Stripe)
  // Register webhook routes separately if needed, or mount via registerWebhookRoutes
  // Depending on implementation, it might attach to /api/webhooks
  // Assuming registerWebhookRoutes handles app.post('/api/webhooks/stripe', ...)
  // const stripeWebhookHandler = await setupWebhooks(app);
  // Or if setupWebhooks returns void and just sets up context

  // Register API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/consents", consentsRoutes);
  app.use("/api/files", filesRoutes);
  app.use("/api/formulas", formulasRoutes);
  app.use("/api/ingredients", ingredientsRoutes);
  app.use("/api/wearables", wearablesRoutes);
  app.use("/api/optimize", optimizeRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Basic health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
