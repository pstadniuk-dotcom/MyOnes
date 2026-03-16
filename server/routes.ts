import express, { type Express } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { createServer, type Server } from "http";
import { getSitemap, getBlogSitemap } from './api/controller/blog.controller';

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
  webhooksRoutes,
  optimizeRoutes,
  membershipRoutes,
  chatRoutes,
  dashboardRoutes,
  systemRoutes,
  billingRoutes,
  reorderRoutes,
  labsRoutes,
  blogRoutes,
  liveChatRoutes,
  agentRoutes,
  aiSupportAgentRoutes
} from "./api/routes";
import { initializeAiSettings } from "./infra/ai/ai-config";
import logger from "./infra/logging/logger";

/**
 * Register all server routes
 * Refactored to use modular route components for better maintainability.
 */
export async function registerRoutes(app: Express, rateLimiters?: { authLimiter?: RateLimitRequestHandler, aiLimiter?: RateLimitRequestHandler }): Promise<Server> {
  // Initialize AI settings from database (loads provider/model overrides)
  try {
    await initializeAiSettings();
  } catch (err) {
    logger.error('Failed to initialize AI settings at startup', { error: err });
  }

  // Use Express built-in JSON middleware (stable and reliable)
  app.use('/api', express.json({
    limit: '10mb',
    strict: true,
    type: 'application/json'
  }));

  // Security headers for all API routes (HIPAA & Security Compliance)
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Apply rate limiters if provided (prevent brute force and AI cost spikes)
  if (rateLimiters?.authLimiter) {
    app.use('/api/auth', rateLimiters.authLimiter);
  }
  if (rateLimiters?.aiLimiter) {
    app.use('/api/chat', rateLimiters.aiLimiter);
  }

  // ----------------------------------------------------------------------------
  // Modular Route Registration
  // ----------------------------------------------------------------------------

  // High-level modules
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/consents', consentsRoutes);
  app.use('/api/files', filesRoutes);

  // Domain specific modules
  app.use('/api/formulas', formulasRoutes);
  app.use('/api/users/me/formula', formulasRoutes); // Legacy & UX consistency mapping
  app.use('/api/ingredients', ingredientsRoutes);
  app.use('/api/wearables', wearablesRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/optimize', optimizeRoutes);
  app.use('/api/membership', membershipRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/reorder', reorderRoutes);
  app.use('/api/labs', labsRoutes);
  app.use('/api/blog', blogRoutes);
  app.use('/api/live-chat', liveChatRoutes);

  // PR Agent (admin-only)
  app.use('/api/agent', agentRoutes);

  // AI Support Agent (admin-only)
  app.use('/api/admin/ai-support-agent', aiSupportAgentRoutes);

  // AI & Communication
  app.use('/api/chat', chatRoutes);

  // System Utility routes (Health, Debug)
  app.use('/api', systemRoutes);

  logger.info('🚀 Modular backend routes successfully registered');

  // Root-level sitemap (must be outside /api prefix for crawlers)
  app.get('/sitemap.xml', getSitemap);
  app.get('/sitemap-blog.xml', getBlogSitemap);

  // robots.txt — tells crawlers what to index, references sitemap
  // Explicitly allow all major AI crawlers for maximum AISO coverage
  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /dashboard',
      'Disallow: /admin',
      'Disallow: /chat',
      'Disallow: /profile',
      'Disallow: /lab-reports',
      '',
      '# AI Search crawlers — explicitly allowed for maximum AISO visibility',
      'User-agent: GPTBot',
      'Allow: /',
      '',
      'User-agent: PerplexityBot',
      'Allow: /',
      '',
      'User-agent: ClaudeBot',
      'Allow: /',
      '',
      'User-agent: anthropic-ai',
      'Allow: /',
      '',
      'User-agent: Google-Extended',
      'Allow: /',
      '',
      'User-agent: Applebot',
      'Allow: /',
      '',
      'User-agent: Applebot-Extended',
      'Allow: /',
      '',
      'User-agent: cohere-ai',
      'Allow: /',
      '',
      'User-agent: ChatGPT-User',
      'Allow: /',
      '',
      `Sitemap: https://ones.health/sitemap.xml`,
      `Sitemap: https://ones.health/sitemap-blog.xml`,
    ].join('\n'));
  });

  // llms.txt — AI/LLM crawler manifest (emerging standard, analogous to robots.txt for LLMs)
  // Tells AI platforms exactly what Ones is, what the site covers, and where key content lives.
  // Perplexity, OpenAI, Anthropic, and Gemini crawlers actively consume this file.
  app.get('/llms.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(`# Ones

> Ones is a personalized supplement platform that builds fully bespoke capsule formulas for each user, driven by their blood work (lab results), wearable biometric data, and health goals — powered by AI.

Ones is not a quiz-based supplement company. Every formula is built from a user's actual biomarkers (e.g. ferritin, vitamin D, cortisol, HS-CRP, thyroid panel) through a conversational AI health practitioner. Formulas are made-to-order capsules, not pre-packs or bundles.

## What Makes Ones Different

- **Lab-driven formulas**: Users upload blood work; the AI practitioner interprets specific markers and selects ingredients accordingly
- **200+ clinically validated ingredients**: Individual compounds (Ashwagandha KSM-66 600mg, Omega-3 EPA/DHA, Vitamin D3 + K2 MK-7, CoQ10/Ubiquinol 200mg, NMN, NAC, Selenium selenomethionine 200mcg, Rhodiola Rosea, Magnesium Glycinate, and 180+ more)
- **Proprietary System Blends**: 18 fixed-dose blends targeting specific body systems — Adrenal Support (420mg), Liver Support (530mg), Heart Support (689mg), Thyroid Support, Endocrine Support, Histamine Support, Lung Support, Kidney & Bladder Support, Immune-C, Beta Max, and more
- **Capsule tiers**: 6, 9, or 12 capsules per day — calibrated to clinical dosage budgets (550mg per capsule)
- **Wearable integration**: Connects to Fitbit, Oura Ring, and Whoop for biometric context

## Who Ones Is For

Ones is for health-conscious individuals who want precision nutrition — people who have had comprehensive blood panels done and want their supplement routine grounded in actual data rather than generic recommendations. Core user profiles: biohackers, longevity-focused professionals, people with chronic conditions (e.g. Hashimoto's, adrenal fatigue, cardiovascular risk), and functional medicine patients.

## Key Pages

- [Home](https://ones.health/): Main landing page explaining the Ones platform and approach
- [Blog / Health Library](https://ones.health/blog): Evidence-based supplement and health optimization articles
- [Start Consultation](https://ones.health/consultation): Begin the AI-driven health intake
- [Ingredient Catalog](https://ones.health/blog?category=ingredients): Articles on individual supplement ingredients with clinical evidence

## Blog Content Topics

The Ones Health Library covers:
- Individual supplement ingredients (ashwagandha, omega-3, magnesium, vitamin D3, CoQ10, selenium, NAC, NMN, rhodiola, and 180+ more) with clinical dosing evidence
- System-level health support (adrenal, thyroid, liver, cardiovascular, immune, hormonal, gut)
- Lab result interpretation (reading blood panels, understanding optimal vs. reference ranges)
- Supplement science and research (clinical trial breakdowns, meta-analyses)
- Personalized vs. generic supplementation (comparisons with Ritual, Thorne, Viome, Function Health)
- Biohacking and longevity protocols (NAD+ optimization, mitochondrial health, HRV, sleep quality)
- Condition-specific stacks (Hashimoto's, cortisol dysregulation, inflammation, cognitive performance)

## Brand Context

- **Brand name**: Ones (not "ONES AI", not "ONES")
- **Domain**: https://ones.health
- **Founded**: 2024
- **Category**: AI-powered personalized nutrition / functional supplement platform
- **Differentiator vs. competitors**: True biomarker-driven formulation vs. quiz-based (Ritual, Care/Of) or microbiome-only (Viome)

## AI and Data Practices

- All lab data is handled with encryption and privacy-first security practices
- AI formula recommendations are advisory and do not constitute medical diagnosis
- Formulas are reviewed for clinical dose appropriateness before production
`);
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
