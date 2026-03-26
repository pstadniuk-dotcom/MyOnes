/**
 * Blog Controller — All HTTP request handlers
 *
 * Split into public endpoints (list, search, categories, single post, sitemap)
 * and admin endpoints (generate, revise, CRUD, auto-gen settings, scheduler run).
 *
 * CUSTOMIZE: Replace brand name, competitor list, and system prompts for your brand.
 */

import { Request, Response } from 'express';
import { blogRepository } from '../blog/blog.repository';
import { insertBlogPostSchema } from '../../shared/schema';
import { generateArticle } from '../services/blogGenerationService';
import { generateBlogImage } from '../services/blogImageService';
import {
  getBlogAutoGenSettings,
  saveBlogAutoGenSettings,
  runDailyBlogGeneration,
} from '../services/blogScheduler';
import { pingSitemapIndexers, buildSitemapXml, buildBlogSitemapXml } from '../services/sitemapService';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────
// PUBLIC endpoints
// ─────────────────────────────────────────────────────────────

/** GET /api/blog — paginated list with optional category filter */
export async function listPosts(req: Request, res: Response) {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(100, parseInt(req.query.limit as string) || PAGE_SIZE);
    const offset = page * limit;
    const category = req.query.category as string | undefined;

    const [posts, total] = await Promise.all([
      category
        ? blogRepository.getByCategory(category, limit, offset)
        : blogRepository.getPublished(limit, offset),
      blogRepository.countPublished(),
    ]);

    // Strip heavy content from list responses
    const stripped = posts.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      excerpt: p.excerpt,
      category: p.category,
      tags: p.tags,
      tier: p.tier,
      primaryKeyword: p.primaryKeyword,
      readTimeMinutes: p.readTimeMinutes,
      featuredImage: p.featuredImage,
      publishedAt: p.publishedAt,
      authorName: p.authorName,
    }));

    return res.json({ posts: stripped, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error('[blog] listPosts error', err);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

/** GET /api/blog/categories */
export async function getCategories(_req: Request, res: Response) {
  try {
    const categories = await blogRepository.getCategories();
    return res.json({ categories });
  } catch (err: any) {
    console.error('[blog] getCategories error', err);
    return res.status(500).json({ error: 'Failed to load categories' });
  }
}

/** GET /api/blog/search?q=... */
export async function searchPosts(req: Request, res: Response) {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json({ posts: [] });
  try {
    const posts = await blogRepository.search(q, 10);
    return res.json({ posts });
  } catch (err: any) {
    console.error('[blog] search error', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

/** GET /api/blog/:slug */
export async function getPost(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const post = await blogRepository.getBySlug(slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment view count in background
    blogRepository.incrementViews(slug).catch(() => {});

    const [related, validSlugs] = await Promise.all([
      blogRepository.getRelated(slug, post.category, 3),
      blogRepository.getAllPublishedSlugs(),
    ]);

    return res.json({ post, related, validSlugs });
  } catch (err: any) {
    console.error('[blog] getPost error', err);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}

/** GET /sitemap.xml — combined sitemap */
export async function getSitemap(_req: Request, res: Response) {
  try {
    const posts = await blogRepository.getPublished(1000, 0);
    const xml = buildSitemapXml(posts);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=43200');
    return res.send(xml);
  } catch (err: any) {
    console.error('[blog] getSitemap error', err);
    return res.status(500).send('<?xml version="1.0"?><urlset/>');
  }
}

/** GET /sitemap-blog.xml — blog-only sitemap with image entries */
export async function getBlogSitemap(_req: Request, res: Response) {
  try {
    const posts = await blogRepository.getPublished(1000, 0);
    const xml = buildBlogSitemapXml(posts);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=43200');
    return res.send(xml);
  } catch (err: any) {
    console.error('[blog] getBlogSitemap error', err);
    return res.status(500).send('<?xml version="1.0"?><urlset/>');
  }
}

// ─────────────────────────────────────────────────────────────
// ADMIN endpoints — require authentication middleware
// ─────────────────────────────────────────────────────────────

/** POST /api/blog — create post manually */
export async function createPost(req: Request, res: Response) {
  try {
    const parsed = insertBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid post data', details: parsed.error.flatten() });
    }
    const exists = await blogRepository.slugExists(parsed.data.slug);
    if (exists) return res.status(409).json({ error: `Slug "${parsed.data.slug}" already exists` });

    const post = await blogRepository.create(parsed.data);
    if (parsed.data.isPublished) pingSitemapIndexers().catch(() => {});
    return res.status(201).json({ post });
  } catch (err: any) {
    console.error('[blog] createPost error', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
}

/** PUT /api/blog/:slug — update post by slug */
export async function updatePost(req: Request, res: Response) {
  try {
    const post = await blogRepository.update(req.params.slug, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] updatePost error', err);
    return res.status(500).json({ error: 'Failed to update post' });
  }
}

/** POST /api/blog/bulk — bulk insert from generation pipeline */
export async function bulkCreatePosts(req: Request, res: Response) {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts array required' });
    }
    const created = await blogRepository.bulkCreate(posts);
    return res.status(201).json({ created: created.length, posts: created.map((p: any) => p.slug) });
  } catch (err: any) {
    console.error('[blog] bulkCreate error', err);
    return res.status(500).json({ error: 'Bulk insert failed', detail: err.message });
  }
}

/** GET /api/blog/admin/all — list ALL posts (includes unpublished) */
export async function adminListPosts(req: Request, res: Response) {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = page * limit;
    const [posts, total] = await Promise.all([
      blogRepository.getAll(limit, offset),
      blogRepository.countAll(),
    ]);
    return res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error('[blog] adminListPosts error', err);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

/** GET /api/blog/admin/:id */
export async function adminGetPost(req: Request, res: Response) {
  try {
    const post = await blogRepository.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] adminGetPost error', err);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}

/** PATCH /api/blog/admin/:id */
export async function adminUpdatePost(req: Request, res: Response) {
  try {
    const post = await blogRepository.updateById(req.params.id, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] adminUpdatePost error', err);
    return res.status(500).json({ error: 'Failed to update post' });
  }
}

/** PATCH /api/blog/admin/:id/publish — toggle published */
export async function adminTogglePublish(req: Request, res: Response) {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'isPublished (boolean) required' });
    }
    const post = await blogRepository.setPublished(req.params.id, isPublished);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] adminTogglePublish error', err);
    return res.status(500).json({ error: 'Failed to update publish status' });
  }
}

/** DELETE /api/blog/admin/:id */
export async function adminDeletePost(req: Request, res: Response) {
  try {
    const deleted = await blogRepository.deleteById(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[blog] adminDeletePost error', err);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

/** POST /api/blog/admin/:id/ai-revise — AI revision of existing article */
export async function adminAiRevise(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'prompt is required (min 5 chars)' });
    }

    const post = await blogRepository.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // CUSTOMIZE: Replace with your brand's editorial guidelines
    const systemPrompt = `You are a professional content editor for ${process.env.BRAND_NAME || 'our brand'}.
You help improve blog articles to be accurate, authoritative, and SEO-optimized.
Return ONLY the revised article content in markdown format, no preamble.`;

    const userMessage = `Article Title: ${post.title}\n\nCurrent Content:\n${post.content}\n\n---\nRevision Request: ${prompt}\n\nPlease revise the article content accordingly.`;

    let revisedContent: string;

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      revisedContent = response.content.find((c: any) => c.type === 'text')?.text ?? '';
    } else if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 8000,
      });
      revisedContent = response.choices[0]?.message?.content ?? '';
    } else {
      return res.status(500).json({ error: 'No AI provider configured' });
    }

    return res.json({ revisedContent });
  } catch (err: any) {
    console.error('[blog] adminAiRevise error', err);
    return res.status(500).json({ error: 'AI revision failed', detail: err.message });
  }
}

/** POST /api/blog/admin/generate — generate a new article with AI */
export async function adminAiGenerate(req: Request, res: Response) {
  try {
    const { title, topic, keywords, category, tone = 'informative', secondaryKeywords = '' } = req.body;
    if (!title && !topic) {
      return res.status(400).json({ error: 'title or topic is required' });
    }

    const generated = await generateArticle({
      title: title || topic,
      category: category || 'Health & Wellness',
      tone,
      primaryKeyword: keywords || title || topic,
      secondaryKeywords: (secondaryKeywords || keywords || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    });

    // Generate featured image
    if (!generated.featuredImage) {
      try {
        generated.featuredImage = await generateBlogImage(generated.title, generated.slug);
      } catch (imgErr: any) {
        console.error('[blog] Image generation failed, continuing without image', imgErr.message);
        generated.featuredImage = undefined;
      }
    }

    return res.json({ generated });
  } catch (err: any) {
    console.error('[blog] adminAiGenerate error', err);
    return res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
}

/** GET /api/blog/admin/auto-gen/settings */
export async function adminGetAutoGenSettings(_req: Request, res: Response) {
  try {
    return res.json(await getBlogAutoGenSettings());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/** PATCH /api/blog/admin/auto-gen/settings */
export async function adminSaveAutoGenSettings(req: Request, res: Response) {
  try {
    return res.json(await saveBlogAutoGenSettings(req.body));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/** POST /api/blog/admin/auto-gen/run — trigger manual generation run (fire-and-forget) */
export async function adminTriggerAutoGenRun(req: Request, res: Response) {
  const overrides = req.body ?? {};
  const jobId = Date.now().toString();

  // Respond immediately — generation may take many minutes
  res.status(202).json({ message: 'Generation run started', jobId, status: 'running' });

  runDailyBlogGeneration(overrides)
    .then(result => console.log('[blog-scheduler] Manual run complete', result))
    .catch(err => console.error('[blog-scheduler] Manual run failed', err.message));
}
