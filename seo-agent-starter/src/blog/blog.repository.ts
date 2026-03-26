/**
 * Blog Repository — Database Access Layer
 *
 * All database read/write operations for blog posts.
 * Uses Drizzle ORM for type-safe queries.
 */

import { db } from '../db';
import { blogPosts, type InsertBlogPost, type BlogPost } from '../../shared/schema';
import { eq, desc, and, ilike, sql } from 'drizzle-orm';

export const blogRepository = {
  // ── Create ──────────────────────────────────────────────────────────────

  async create(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(data).returning();
    return post;
  },

  async bulkCreate(data: InsertBlogPost[]): Promise<BlogPost[]> {
    if (data.length === 0) return [];
    return db.insert(blogPosts).values(data).returning();
  },

  // ── Read (Public) ───────────────────────────────────────────────────────

  async getPublished(limit = 20, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  async getByCategory(category: string, limit = 20, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), eq(blogPosts.category, category)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  async getBySlug(slug: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return post ?? null;
  },

  async getRelated(slug: string, category: string | null, limit = 3): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, true),
          sql`${blogPosts.slug} != ${slug}`,
          category ? eq(blogPosts.category, category) : sql`1=1`,
        ),
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  async search(query: string, limit = 10): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), ilike(blogPosts.title, `%${query}%`)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  async countPublished(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return Number(result?.count ?? 0);
  },

  async getCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: blogPosts.category })
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), sql`${blogPosts.category} IS NOT NULL`));
    return results.map(r => r.category!).filter(Boolean);
  },

  async getAllPublishedSlugs(): Promise<string[]> {
    const rows = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return rows.map(r => r.slug);
  },

  async slugExists(slug: string): Promise<boolean> {
    const [result] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return !!result;
  },

  async incrementViews(slug: string): Promise<void> {
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.slug, slug));
  },

  // ── Update ──────────────────────────────────────────────────────────────

  async update(slug: string, data: Partial<InsertBlogPost>): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.slug, slug))
      .returning();
    return post ?? null;
  },

  async updateById(id: string, data: Partial<InsertBlogPost>): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post ?? null;
  },

  async setPublished(id: string, isPublished: boolean): Promise<BlogPost | null> {
    const [post] = await db
      .update(blogPosts)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return post ?? null;
  },

  // ── Admin ───────────────────────────────────────────────────────────────

  async getAll(limit = 50, offset = 0): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  },

  async countAll(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts);
    return Number(result?.count ?? 0);
  },

  async getById(id: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    return post ?? null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
    return result.length > 0;
  },
};
