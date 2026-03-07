import { Request, Response } from 'express';
import { blogRepository } from '../../modules/blog/blog.repository';
import { insertBlogPostSchema } from '../../../shared/schema';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  getBlogAutoGenSettings,
  saveBlogAutoGenSettings,
  runDailyBlogGeneration,
} from '../../utils/blogGenerationScheduler';
import { pingSitemapIndexers } from '../../utils/sitemapPing';

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

    // Related posts + valid slugs for internal link validation
    const [related, validSlugs] = await Promise.all([
      blogRepository.getRelated(slug, post.category, 3),
      blogRepository.getAllPublishedSlugs(),
    ]);

    return res.json({ post, related, validSlugs });
  } catch (err: any) {
    console.error('[blog] getPost error:', err);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}

/** GET /sitemap.xml — combined sitemap for blog + static pages */
export async function getSitemap(req: Request, res: Response) {
  try {
    const posts = await blogRepository.getPublished(1000, 0);
    const base = 'https://ones.health';
    const staticUrls = [
      { loc: base, priority: '1.0', changefreq: 'weekly' },
      { loc: `${base}/blog`, priority: '0.9', changefreq: 'daily' },
      { loc: `${base}/about`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${base}/science`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${base}/careers`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${base}/partnerships`, priority: '0.5', changefreq: 'monthly' },
    ];

    const urlEntries = [
      ...staticUrls.map(u =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      ),
      ...posts.map(p => {
        const lastmod = p.updatedAt
          ? new Date(p.updatedAt).toISOString().split('T')[0]
          : new Date(p.publishedAt).toISOString().split('T')[0];
        return `  <url>\n    <loc>${base}/blog/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
      }),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=43200'); // 12h cache
    return res.send(xml);
  } catch (err: any) {
    console.error('[blog] getSitemap error:', err);
    return res.status(500).send('<?xml version="1.0"?><urlset/>');
  }
}

/** GET /sitemap-blog.xml — blog-only sitemap with image:image entries for richer crawler signals */
export async function getBlogSitemap(req: Request, res: Response) {
  try {
    const posts = await blogRepository.getPublished(1000, 0);
    const base = 'https://ones.health';

    const urlEntries = posts.map(p => {
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt).toISOString().split('T')[0]
        : new Date(p.publishedAt).toISOString().split('T')[0];
      const imageEntry = p.featuredImage
        ? `\n    <image:image>\n      <image:loc>${p.featuredImage}</image:loc>\n      <image:title>${p.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</image:title>\n    </image:image>`
        : '';
      return `  <url>\n    <loc>${base}/blog/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>${imageEntry}\n  </url>`;
    }).join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      urlEntries,
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=43200');
    return res.send(xml);
  } catch (err: any) {
    console.error('[blog] getBlogSitemap error:', err);
    return res.status(500).send('<?xml version="1.0"?><urlset/>');
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
    // Notify search engines asynchronously — fire and forget
    if (parsed.data.isPublished) pingSitemapIndexers().catch(() => {});
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
    const { title, topic, keywords, category, tone = 'informative', secondaryKeywords = '' } = req.body;
    if (!title && !topic) {
      return res.status(400).json({ error: 'title or topic is required' });
    }

    const systemPrompt = `You are a senior health & supplement content strategist for Ones — a personalized supplement platform that builds custom capsule formulas from a user's lab results, wearable data, and health goals.

Ones product overview (weave this into articles naturally, not as ads):
- AI health practitioner that analyzes blood work, wearable data, and health history
- Custom capsule formulas using 200+ clinically validated ingredients
- System Blends (proprietary): Adrenal Support, Liver Support, Heart Support, Thyroid Support, Endocrine Support, Histamine Support, Lung Support, Kidney & Bladder Support, Beta Max, Immune-C, C Boost, Ligament Support, Magnesium Complex
- Individual ingredients dosed to clinical ranges: Ashwagandha (KSM-66 600mg), Omega-3 (EPA/DHA), Vitamin D3 + K2 (MK-7), Magnesium Glycinate, CoQ10/Ubiquinol (200mg), Selenium (selenomethionine 200mcg), Zinc, NAC, NMN, Rhodiola Rosea, and 180+ more
- Formulas come in 6, 9, or 12-capsule plans calibrated to capsule budgets

Brand name rule: Always call the brand "Ones" (not "ONES AI", not "ONES"). When writing comparison tables, use "Ones" as the column header.

Language: American English spelling throughout — use "personalized" not "personalised", "optimized" not "optimised", "recognized" not "recognised", "fiber" not "fibre", "defense" not "defence". No British or Australian spellings.

Writing standards:
- Minimum 1800 words, target 2000-2500 words
- Use secondary keywords as H2 subheadings where natural
- Every factual claim must reference a real study (journal + year) or a credible body like NIH, AHA, WHO
- Include a "How Ones Addresses This" or "What This Means for Your Formula" section (H2) near the end — mention 2-3 specific Ones ingredients relevant to the article topic with real clinical doses
- End with a "Key Takeaways" H2 with 4-6 bullet points
- Never make FDA-prohibited disease claims; recommend consulting a healthcare provider for medical decisions
- Tables and dosing data are encouraged — use markdown tables (| col | col |)
- Use ordered (numbered) lists for protocols; unordered for features/options
- EEAT signals: cite author expertise implicitly through specificity, cite real study details (sample size, duration, effect size where known)
- Within the article body, naturally embed 3–5 internal links using keyword-rich anchor text in standard markdown format: [descriptive keyword anchor text](/blog/relevant-slug). These must appear inline within sentences, not in a list. Use realistic slug paths based on supplement or health topic names (e.g. [clinical evidence for ashwagandha](/blog/ashwagandha-benefits-dosage-evidence), [optimal magnesium glycinate dosage](/blog/magnesium-glycinate-benefits-sleep), [vitamin D3 and K2 synergy](/blog/vitamin-d3-k2-optimal-levels-dosage), [omega-3 EPA DHA ratio guide](/blog/omega-3-fish-oil-benefits-epa-dha-ratio)). Never link to the article you are writing. Use anchor text that reads naturally in the sentence — never "click here" or bare URLs.
- When comparing ONES AI to competitors, only reference active companies: Viome (gut microbiome testing + AI recs), Thorne (practitioner-grade), Ritual (subscription multis), Function Health (lab testing). Do NOT mention Care/Of — they shut down in 2023.`;

    const skwList = secondaryKeywords || keywords || '';
    const isHowTo = /^how\s+(to|i\s)|\d+\s+ways?\s+to|step[- ]by[- ]step/i.test(title || topic || '');
    const userMessage = `Write a ${tone} SEO-optimized blog article for Ones.

Title: ${title || topic}
Category: ${category || 'Health & Wellness'}
Primary keyword: ${keywords || title || topic}
Secondary keywords to use as H2 subheadings (use at least 3): ${skwList}
Additional context: ${topic || ''}

Return a JSON object with these EXACT fields:
{
  "title": "...",
  "slug": "url-friendly-slug-max-60-chars",
  "metaTitle": "STRICT: [Pain/Number] + [Primary Keyword] + [Differentiator] | Ones. Must be 52-62 chars total. Example: 'Low Ferritin Symptoms: Why Iron Deficiency Drains Energy | Ones' (62 chars). Count before submitting.",
  "metaDescription": "STRICT: 150-160 characters. Open with primary keyword or a sharp pain/stat. End with benefit or soft CTA. Count before submitting. Example: 'Low ferritin causes fatigue, brain fog, and hair loss even without anemia. Learn the optimal iron protocol and how Ones builds it into your formula.' (157 chars)",
  "excerpt": "2-3 sentence hook paragraph — lead with the problem or a surprising stat",
  "content": "Full markdown article 1800-2500 words...",
  "category": "${category || 'Health & Wellness'}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "primaryKeyword": "exact primary keyword",
  "secondaryKeywords": ["secondary kw 1", "secondary kw 2", "secondary kw 3", "secondary kw 4"],
  "readTimeMinutes": 8,
  "authorName": "Ones Editorial Team",
  "internalLinks": ["/blog/related-slug-1", "/blog/related-slug-2"],
  "faqSchema": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]${isHowTo ? ',\n  "howToSchema": {"name": "...", "description": "...", "totalTime": "PT15M", "step": [{"@type": "HowToStep", "name": "...", "text": "..."}, ...]}' : ''}
}

For faqSchema: include 5-6 questions. Requirements:
- Use long-tail phrasing a real person would type into Google or ask Perplexity (e.g. "What is the clinical dose of KSM-66 ashwagandha for cortisol reduction?", not "What is ashwagandha?")
- Each answer must be 3-5 sentences and reference a specific study, clinical dose, or mechanism
- At least 2 answers should naturally name Ones and a specific product detail (e.g. "Ones formulas include selenomethionine at 200mcg, matching the dose used in the Gärtner 2002 Hashimoto's trial...")
- Answers must be factually accurate — never promotional without evidence${isHowTo ? '\n\nFor howToSchema: list 4-8 concrete, actionable steps. Each step name should be an imperative verb phrase (e.g. "Test your baseline ferritin levels"). Text should be 2-3 sentences expanding on the step.' : ''}

IMPORTANT: Return only the JSON object, no preamble, no markdown fences.`;

    let raw: string;

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 12000,
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
        max_tokens: 12000,
        response_format: { type: 'json_object' },
      });
      raw = response.choices[0]?.message?.content ?? '{}';
    } else {
      return res.status(500).json({ error: 'No AI provider configured' });
    }

    // Extract JSON from response (handle stray markdown fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned unexpected format', raw });

    const generated = JSON.parse(jsonMatch[0]);

    // Calculate word count from content
    generated.wordCount = generated.content
      ? generated.content.split(/\s+/).filter(Boolean).length
      : 0;

    // ── Meta title validation ────────────────────────────────────────────────
    if (generated.metaTitle) {
      if (generated.metaTitle.startsWith('STRICT:')) generated.metaTitle = `${generated.primaryKeyword ?? (title || topic)} | Ones`;
      if (!generated.metaTitle.endsWith(' | Ones')) {
        generated.metaTitle = generated.metaTitle.replace(/\s*\|\s*Ones\s*AI\s*$|\s*\|\s*ones\.health\s*$/i, '').trimEnd() + ' | Ones';
      }
      if (generated.metaTitle.length > 65) {
        const base = generated.metaTitle.replace(/ \| Ones$/, '').slice(0, 54).trimEnd();
        generated.metaTitle = `${base}... | Ones`;
      }
    } else {
      generated.metaTitle = `${generated.primaryKeyword ?? (title || topic)} | Ones`;
    }

    // ── Meta description validation ──────────────────────────────────────────
    if (generated.metaDescription) {
      if (generated.metaDescription.startsWith('STRICT:')) generated.metaDescription = '';
      if (generated.metaDescription.length > 165) {
        generated.metaDescription = generated.metaDescription.slice(0, 162).trimEnd() + '...';
      }
      if (generated.metaDescription.length < 100) {
        console.warn(`[admin-gen] metaDescription too short (${generated.metaDescription.length} chars) for: "${generated.metaTitle}"`);
      }
    }

    // Build combined schema array (Article + FAQPage + optional HowTo)
    // Mirrors the logic in blogGenerationService.ts so admin-generated articles
    // get the same rich structured data as scheduler-generated ones.
    let articleSchema: Record<string, unknown> = {};
    try {
      articleSchema = generated.schemaJson ? JSON.parse(generated.schemaJson) : {};
    } catch { articleSchema = {}; }

    articleSchema['@context'] = 'https://schema.org';
    articleSchema['@type'] = 'Article';
    articleSchema['author'] = { '@type': 'Person', '@id': 'https://ones.health/#author-editorial', name: 'Ones Editorial Team' };
    articleSchema['publisher'] = { '@type': 'Organization', '@id': 'https://ones.health/#organization', name: 'Ones' };
    articleSchema['inLanguage'] = 'en-US';
    articleSchema['isAccessibleForFree'] = true;

    const combinedSchemas: object[] = [articleSchema];

    const faqItems: Array<{question: string; answer: string}> = Array.isArray(generated.faqSchema) ? generated.faqSchema : [];
    if (faqItems.length > 0) {
      combinedSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((f: any) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }

    if (generated.howToSchema && typeof generated.howToSchema === 'object') {
      combinedSchemas.push({ '@context': 'https://schema.org', '@type': 'HowTo', ...generated.howToSchema });
    }

    generated.schemaJson = JSON.stringify(combinedSchemas);

    return res.json({ generated });
  } catch (err: any) {
    console.error('[blog] adminAiGenerate error:', err);
    return res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
}

/** GET /api/blog/admin/auto-gen/settings — get auto-generation scheduler settings */
export async function adminGetAutoGenSettings(_req: Request, res: Response) {
  try {
    const settings = await getBlogAutoGenSettings();
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/** PATCH /api/blog/admin/auto-gen/settings — update auto-generation settings */
export async function adminSaveAutoGenSettings(req: Request, res: Response) {
  try {
    const updated = await saveBlogAutoGenSettings(req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/** POST /api/blog/admin/auto-gen/run — manually trigger one generation run now (fire-and-forget) */
export async function adminTriggerAutoGenRun(req: Request, res: Response) {
  // Respond immediately — generation may take many minutes for large batches
  const overrides = req.body ?? {};
  const jobId = Date.now().toString();
  res.status(202).json({ message: 'Generation run started', jobId, status: 'running' });

  // Run in background — errors logged, not returned to client
  runDailyBlogGeneration(overrides).then((result) => {
    console.log('[blog-scheduler] Manual run complete', result);
  }).catch((err) => {
    console.error('[blog-scheduler] Manual run failed', err.message);
  });
}
