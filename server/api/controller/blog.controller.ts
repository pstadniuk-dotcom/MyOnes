import { Request, Response } from 'express';
import { blogRepository } from '../../modules/blog/blog.repository';
import { insertBlogPostSchema } from '../../../shared/schema';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const PAGE_SIZE = 20;

/** GET /api/blog */
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

    return res.json({
      posts: stripped,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[blog] listPosts error:', err);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

/** GET /api/blog/categories */
export async function getCategories(req: Request, res: Response) {
  try {
    const categories = await blogRepository.getCategories();
    return res.json({ categories });
  } catch (err: any) {
    console.error('[blog] getCategories error:', err);
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
    console.error('[blog] search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

/** GET /api/blog/:slug */
export async function getPost(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const post = await blogRepository.getBySlug(slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Background view count increment
    blogRepository.incrementViews(slug).catch(() => {});

    // Related posts
    const related = await blogRepository.getRelated(slug, post.category, 3);

    return res.json({ post, related });
  } catch (err: any) {
    console.error('[blog] getPost error:', err);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}

/** POST /api/blog — admin only */
export async function createPost(req: Request, res: Response) {
  try {
    const parsed = insertBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid post data', details: parsed.error.flatten() });
    }

    // Check slug uniqueness
    const exists = await blogRepository.slugExists(parsed.data.slug);
    if (exists) {
      return res.status(409).json({ error: `Slug "${parsed.data.slug}" already exists` });
    }

    const post = await blogRepository.create(parsed.data);
    return res.status(201).json({ post });
  } catch (err: any) {
    console.error('[blog] createPost error:', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
}

/** PUT /api/blog/:slug — admin only */
export async function updatePost(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const post = await blogRepository.update(slug, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] updatePost error:', err);
    return res.status(500).json({ error: 'Failed to update post' });
  }
}

/** POST /api/blog/bulk — admin only — bulk insert for generation pipeline */
export async function bulkCreatePosts(req: Request, res: Response) {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts array required' });
    }
    const created = await blogRepository.bulkCreate(posts);
    return res.status(201).json({ created: created.length, posts: created.map(p => p.slug) });
  } catch (err: any) {
    console.error('[blog] bulkCreate error:', err);
    return res.status(500).json({ error: 'Bulk insert failed', detail: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// ADMIN endpoints
// ─────────────────────────────────────────────────────────────

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
    console.error('[blog] adminListPosts error:', err);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

/** GET /api/blog/admin/:id — single post by id */
export async function adminGetPost(req: Request, res: Response) {
  try {
    const post = await blogRepository.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] adminGetPost error:', err);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}

/** PATCH /api/blog/admin/:id — update any field by id */
export async function adminUpdatePost(req: Request, res: Response) {
  try {
    const post = await blogRepository.updateById(req.params.id, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (err: any) {
    console.error('[blog] adminUpdatePost error:', err);
    return res.status(500).json({ error: 'Failed to update post' });
  }
}

/** PATCH /api/blog/admin/:id/publish — toggle published status */
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
    console.error('[blog] adminTogglePublish error:', err);
    return res.status(500).json({ error: 'Failed to update publish status' });
  }
}

/** DELETE /api/blog/admin/:id — delete post */
export async function adminDeletePost(req: Request, res: Response) {
  try {
    const deleted = await blogRepository.deleteById(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[blog] adminDeletePost error:', err);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

/** POST /api/blog/admin/:id/ai-revise — use AI to revise/improve article content */
export async function adminAiRevise(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const post = await blogRepository.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const systemPrompt = `You are a professional health & supplement content editor for ONES AI, a personalized supplement platform. You help improve blog articles so they are accurate, authoritative, SEO-optimized, and aligned with the ONES brand.

ONES brand guidelines:
- Evidence-based and science-forward but approachable
- Never make unsubstantiated medical claims
- Recommend consulting a healthcare provider for medical decisions
- Focus on personalization and optimization of health

The admin will give you a revision request. Return ONLY the revised article content in the same markdown format, no preamble or explanation.`;

    const userMessage = `Article Title: ${post.title}

Current Content:
${post.content}

---
Admin Revision Request: ${prompt}

Please revise the article content accordingly.`;

    let revisedContent: string;

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      revisedContent = response.content.find(c => c.type === 'text')?.text ?? '';
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
      return res.status(500).json({ error: 'No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)' });
    }

    return res.json({ revisedContent });
  } catch (err: any) {
    console.error('[blog] adminAiRevise error:', err);
    return res.status(500).json({ error: 'AI revision failed', detail: err.message });
  }
}

/** POST /api/blog/admin/generate — generate a new article with AI */
export async function adminAiGenerate(req: Request, res: Response) {
  try {
    const { title, topic, keywords, category, tone = 'informative' } = req.body;
    if (!title && !topic) {
      return res.status(400).json({ error: 'title or topic is required' });
    }

    const systemPrompt = `You are a professional health & supplement content writer for ONES AI. Write comprehensive, SEO-optimized blog articles in markdown format. Articles should be 1000-1500 words, evidence-based, engaging, and aligned with the ONES brand (personalized supplements, AI-driven health optimization).

Include:
- A compelling introduction
- 3-5 well-structured sections with H2 headers
- Practical takeaways
- A conclusion with CTA to explore ONES AI

Do NOT make unsubstantiated medical claims. Always recommend consulting a healthcare provider.`;

    const userMessage = `Write a ${tone} blog article for ONES AI.
Title: ${title || topic}
Category: ${category || 'Health & Wellness'}
Keywords to include naturally: ${keywords || title || topic}

Return a JSON object with these exact fields:
{
  "title": "...",
  "slug": "url-friendly-slug",
  "metaTitle": "SEO title under 60 chars",
  "metaDescription": "Meta description 120-155 chars",
  "excerpt": "2-3 sentence summary",
  "content": "Full markdown article content...",
  "category": "...",
  "tags": ["tag1", "tag2"],
  "primaryKeyword": "main keyword",
  "readTimeMinutes": 5,
  "authorName": "ONES AI Editorial Team"
}`;

    let raw: string;

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      raw = response.content.find(c => c.type === 'text')?.text ?? '';
    } else if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      });
      raw = response.choices[0]?.message?.content ?? '{}';
    } else {
      return res.status(500).json({ error: 'No AI provider configured' });
    }

    // Extract JSON from response (handle markdown fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned unexpected format', raw });

    const generated = JSON.parse(jsonMatch[0]);

    // Calculate word count
    generated.wordCount = generated.content
      ? generated.content.split(/\s+/).filter(Boolean).length
      : 0;

    return res.json({ generated });
  } catch (err: any) {
    console.error('[blog] adminAiGenerate error:', err);
    return res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
}
