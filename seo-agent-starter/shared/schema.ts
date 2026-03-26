/**
 * Database Schema — Blog Posts + Keyword Data
 *
 * Two tables:
 *   blog_posts   — stores every generated article with full SEO metadata
 *   keyword_data — DataForSEO enrichment (volume, KD, CPC per keyword)
 *   app_settings — key/value store for scheduler config
 *
 * Run `npm run db:push` after any schema changes.
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  json,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ── Blog Posts ───────────────────────────────────────────────────────────────

export const blogPosts = pgTable('blog_posts', {
  id:                varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  slug:              varchar('slug', { length: 255 }).notNull().unique(),
  title:             varchar('title', { length: 500 }).notNull(),
  metaTitle:         varchar('meta_title', { length: 70 }),
  metaDescription:   varchar('meta_description', { length: 160 }),
  excerpt:           text('excerpt'),
  content:           text('content').notNull(),
  category:          varchar('category', { length: 100 }),
  tags:              text('tags').array(),
  tier:              varchar('tier', { length: 50 }),
  primaryKeyword:    varchar('primary_keyword', { length: 255 }),
  secondaryKeywords: text('secondary_keywords').array(),
  wordCount:         integer('word_count'),
  readTimeMinutes:   integer('read_time_minutes'),
  schemaJson:        text('schema_json'),           // JSON-LD structured data (Article + FAQ + HowTo)
  internalLinks:     text('internal_links').array(), // ["/blog/slug-1", "/blog/slug-2"]
  featuredImage:     varchar('featured_image', { length: 500 }),
  isPublished:       boolean('is_published').default(true).notNull(),
  publishedAt:       timestamp('published_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
  authorName:        varchar('author_name', { length: 255 }).default('Editorial Team'),
  viewCount:         integer('view_count').default(0),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  updatedAt: true,
  viewCount: true,
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// ── Keyword Data (populated by scripts/keyword-research.cjs) ─────────────────

export const keywordData = pgTable('keyword_data', {
  keyword:     varchar('keyword', { length: 500 }).primaryKey(),
  volume:      integer('volume').notNull().default(0),
  kd:          integer('kd').notNull().default(0),
  cpc:         decimal('cpc', { precision: 8, scale: 2 }).notNull().default('0'),
  competition: varchar('competition', { length: 20 }),
  source:      varchar('source', { length: 50 }).default('dataforseo'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type KeywordData = typeof keywordData.$inferSelect;

// ── App Settings (key/value store for scheduler config, etc.) ────────────────

export const appSettings = pgTable('app_settings', {
  key:       varchar('key', { length: 255 }).primaryKey(),
  value:     json('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
