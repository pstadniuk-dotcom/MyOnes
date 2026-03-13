require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');

const p = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
CREATE TABLE IF NOT EXISTS blog_posts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),
  excerpt TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  tier VARCHAR(50),
  primary_keyword VARCHAR(255),
  secondary_keywords TEXT[],
  word_count INTEGER,
  read_time_minutes INTEGER,
  schema_json TEXT,
  internal_links TEXT[],
  featured_image VARCHAR(500),
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  author_name VARCHAR(255) DEFAULT 'Ones Editorial Team',
  view_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts (category);
CREATE INDEX IF NOT EXISTS blog_posts_tier_idx ON blog_posts (tier);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (is_published, published_at DESC);
`;

p.query(sql)
  .then(() => {
    console.log('✅ blog_posts table created successfully');
    p.end();
  })
  .catch(e => {
    console.error('❌', e.message);
    p.end();
  });
