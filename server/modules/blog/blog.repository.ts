import { db } from '../../infra/db/db';
import { blogPosts, type InsertBlogPost, type BlogPost } from '../../../shared/schema';
import { eq, desc, and, ilike, sql } from 'drizzle-orm';

export const blogRepository = {
  /** Create a new blog post */
  async create(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(data).returning();
    return post;
  },

  /** Insert many posts (bulk insert for generation pipeline) */
  async bulkCreate(data: InsertBlogPost[]): Promise<BlogPost[]> {
    if (data.length === 0) return [];
    const posts = await db.insert(blogPosts).values(data).returning();
    return posts;
  },

  /** Get all published posts, newest first */
  async getPublished(limit = 20, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  /** Get posts by category */
  async getByCategory(category: string, limit = 20, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), eq(blogPosts.category, category)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  /** Get posts by tier */
  async getByTier(tier: string, limit = 20): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), eq(blogPosts.tier, tier)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  /** Get a single post by slug */
  async getBySlug(slug: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return post ?? null;
  },

  /** Increment view count */
  async incrementViews(slug: string): Promise<void> {
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.slug, slug));
  },

  /** Get related posts by tags or category (excluding current slug) */
  async getRelated(slug: string, category: string | null, limit = 3): Promise<BlogPost[]> {
    return db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        metaTitle: blogPosts.metaTitle,
        metaDescription: blogPosts.metaDescription,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        category: blogPosts.category,
        tags: blogPosts.tags,
        tier: blogPosts.tier,
        primaryKeyword: blogPosts.primaryKeyword,
        secondaryKeywords: blogPosts.secondaryKeywords,
        wordCount: blogPosts.wordCount,
        readTimeMinutes: blogPosts.readTimeMinutes,
        schemaJson: blogPosts.schemaJson,
        internalLinks: blogPosts.internalLinks,
        featuredImage: blogPosts.featuredImage,
        isPublished: blogPosts.isPublished,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
        authorName: blogPosts.authorName,
        viewCount: blogPosts.viewCount,
      })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, true),
          sql`${blogPosts.slug} != ${slug}`,
          category ? eq(blogPosts.category, category) : sql`1=1`
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  /** Full-text search */
  async search(query: string, limit = 10): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, true),
          ilike(blogPosts.title, `%${query}%`)
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  /** Count published posts */
  async countPublished(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return Number(result?.count ?? 0);
  },

  /** Get all distinct categories */
  async getCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: blogPosts.category })
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), sql`${blogPosts.category} IS NOT NULL`));
    return results.map((r: { category: string | null }) => r.category!).filter(Boolean);
  },

  /** Get all published slugs (for internal link validation) */
  async getAllPublishedSlugs(): Promise<string[]> {
    const rows = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return rows.map(r => r.slug);
  },

  /** Check if slug already exists */
  async slugExists(slug: string): Promise<boolean> {
    const [result] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return !!result;
  },

  /** Update a post */
  async update(slug: string, data: Partial<InsertBlogPost>): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.slug, slug))
      .returning();
    return post ?? null;
  },

  /** Admin: get all posts (published + unpublished), newest first */
  async getAll(limit = 50, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  /** Admin: count all posts */
  async countAll(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts);
    return Number(result?.count ?? 0);
  },

  /** Admin: get single post by id */
  async getById(id: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    return post ?? null;
  },

  /** Admin: update post by id */
  async updateById(id: string, data: Partial<InsertBlogPost>): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post ?? null;
  },

  /** Admin: toggle publish status */
  async setPublished(id: string, isPublished: boolean): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post ?? null;
  },

  /** Admin: delete a post by id */
  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning({ id: blogPosts.id });
    return result.length > 0;
  },
};
