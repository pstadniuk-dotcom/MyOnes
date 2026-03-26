/**
 * Server Entry Point — Express app with blog API + scheduler
 *
 * Run: npx tsx src/server.ts
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import blogRoutes from './routes/blog.routes';
import { startBlogGenerationScheduler } from './services/blogScheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/blog', blogRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  SEO Agent API running on http://localhost:${PORT}`);
  console.log(`   Blog API:     http://localhost:${PORT}/api/blog`);
  console.log(`   Health:       http://localhost:${PORT}/health`);
  console.log(`   Sitemap:      http://localhost:${PORT}/api/blog/sitemap.xml\n`);

  // Start the daily auto-generation scheduler
  startBlogGenerationScheduler();
});

export default app;
