import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Calendar, ArrowRight, BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  readTimeMinutes?: number | null;
  publishedAt: string;
  authorName?: string | null;
  featuredImage?: string | null;
}

interface BlogListResponse {
  posts: PostSummary[];
  total: number;
  page: number;
  pages: number;
}

function PostCardSkeleton() {
  return (
    <div className="bg-[#ede8e2] rounded-2xl p-8 space-y-3">
      <Skeleton className="h-4 w-32 bg-[#c9c3bb]" />
      <Skeleton className="h-6 w-full bg-[#c9c3bb]" />
      <Skeleton className="h-6 w-3/4 bg-[#c9c3bb]" />
      <Skeleton className="h-4 w-full bg-[#c9c3bb]" />
      <Skeleton className="h-4 w-5/6 bg-[#c9c3bb]" />
    </div>
  );
}

const PAGE_SIZE = 21;

function CategoryFilterBar({ categories, activeCategory }: { categories: string[]; activeCategory: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkArrows, { passive: true });
    window.addEventListener('resize', checkArrows);
    return () => {
      el.removeEventListener('scroll', checkArrows);
      window.removeEventListener('resize', checkArrows);
    };
  }, [checkArrows, categories]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  return (
    <div className="border-b border-[#c9c3bb] bg-white">
      <div className="container mx-auto px-6 max-w-6xl relative">
        {/* Left arrow */}
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md border border-[#c9c3bb] text-[#054700] hover:bg-[#054700]/10 transition-colors"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-2 py-3 overflow-x-auto cat-scroll-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          <style>{`.cat-scroll-hide::-webkit-scrollbar { display: none; }`}</style>
          <Link href="/blog">
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${!activeCategory ? 'bg-[#054700] text-white' : 'text-[#054700] hover:bg-[#054700]/10'}`}>
                All
              </span>
            </Link>
            {categories.map(cat => (
              <Link key={cat} href={`/blog?category=${encodeURIComponent(cat)}`}>
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors cursor-pointer ${activeCategory === cat ? 'bg-[#054700] text-white' : 'text-[#054700] hover:bg-[#054700]/10'}`}>
                  {cat}
                </span>
              </Link>
            ))}
        </div>

        {/* Right arrow */}
        {showRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md border border-[#c9c3bb] text-[#054700] hover:bg-[#054700]/10 transition-colors"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BlogPage() {
  const [location] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const categoryParam = params.get('category') ?? '';
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listRef = useRef<HTMLElement>(null);

  // Page-level SEO meta
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Supplement Science & Health Optimization Blog | Ones';

    const setMeta = (sel: string, name: string, content: string) => {
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(name.includes(':') ? 'property' : 'name', name);
      el.content = content;
      return el;
    };
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
      el.href = href;
      return el;
    };

    const desc = 'Evidence-based articles on supplements, longevity, lab optimization, and personalized health from the Ones editorial team.';
    const descEl = setMeta('meta[name="description"]', 'description', desc);
    // Canonical always points to /blog (not /blog?category=...) to avoid duplicate content
    const canonicalHref = categoryParam
      ? `https://ones.health/blog?category=${encodeURIComponent(categoryParam)}`
      : 'https://ones.health/blog';
    const canonicalEl = setLink('canonical', canonicalHref);
    const ogTitle = setMeta('meta[property="og:title"]', 'og:title', categoryParam ? `${categoryParam} Articles | Ones Blog` : 'Supplement Science & Health Blog | Ones');
    const ogDesc = setMeta('meta[property="og:description"]', 'og:description', desc);
    const ogUrl = setMeta('meta[property="og:url"]', 'og:url', 'https://ones.health/blog');
    const ogImage = setMeta('meta[property="og:image"]', 'og:image', 'https://ones.health/og-blog.jpg');
    const ogType = setMeta('meta[property="og:type"]', 'og:type', 'website');
    const ogLocale = setMeta('meta[property="og:locale"]', 'og:locale', 'en_US');
    const twCard = setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image');
    const twSite = setMeta('meta[name="twitter:site"]', 'twitter:site', '@ones_health');
    const twTitle = setMeta('meta[name="twitter:title"]', 'twitter:title', categoryParam ? `${categoryParam} Articles | Ones` : 'Supplement Science & Health Blog | Ones');

    return () => {
      document.title = prevTitle;
      [descEl, ogTitle, ogDesc, ogUrl, ogImage, ogType, ogLocale, twCard, twSite, twTitle].forEach(el => el?.remove());
      canonicalEl?.remove();
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when category changes
  useEffect(() => { setPage(0); }, [categoryParam]);

  const listUrl = categoryParam
    ? `/api/blog?page=${page}&limit=${PAGE_SIZE}&category=${encodeURIComponent(categoryParam)}`
    : `/api/blog?page=${page}&limit=${PAGE_SIZE}`;

  const { data, isLoading } = useQuery<BlogListResponse>({
    queryKey: ['/api/blog', page, categoryParam],
    queryFn: async () => {
      const res = await fetch(listUrl);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<{ categories: string[] }>({
    queryKey: ['/api/blog/categories'],
    queryFn: async () => {
      const res = await fetch('/api/blog/categories');
      return res.json();
    },
  });

  const { data: searchData } = useQuery<{ posts: PostSummary[] }>({
    queryKey: ['/api/blog/search', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/blog/search?q=${encodeURIComponent(debouncedSearch)}`);
      return res.json();
    },
    enabled: debouncedSearch.length > 1,
  });

  const displayPosts = debouncedSearch.length > 1 ? (searchData?.posts ?? []) : (data?.posts ?? []);
  const totalPages = data?.pages ?? 1;

  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Insights
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#054700] mb-6" data-testid="heading-blog-hero">
              Health & Wellness Blog
            </h1>
            <p className="text-xl text-[#5a6623] max-w-2xl mx-auto" data-testid="text-blog-description">
              Evidence-based insights on personalized nutrition, supplement science, and optimizing your health.
            </p>

            {/* Search bar */}
            <div className="relative max-w-md mx-auto mt-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6623]" />
              <input
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#c9c3bb] bg-white text-[#2d3b1e] placeholder:text-[#8a9a7a] focus:outline-none focus:ring-2 focus:ring-[#054700]/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category filters */}
      {categoriesData && categoriesData.categories.length > 0 && (
        <CategoryFilterBar categories={categoriesData.categories} activeCategory={categoryParam} />
      )}

      {/* Posts grid */}
      <section ref={listRef} className="py-16 bg-white scroll-mt-24">
        <div className="container mx-auto px-6 max-w-6xl">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen className="w-10 h-10 text-[#5a6623] mx-auto mb-4" />
              <p className="text-[#5a6623]">No articles found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPosts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="h-full bg-[#ede8e2] rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-blog-${post.slug}`}>
                    {post.featuredImage && (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-44 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-8">
                    {post.category && (
                      <span className="text-xs font-semibold text-[#D4A574] uppercase tracking-wide mb-3 block">{post.category}</span>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[#5a6623] mb-3">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      {post.readTimeMinutes && <><span>•</span><span>{post.readTimeMinutes} min</span></>}
                    </div>
                    <h3 className="text-xl font-medium text-[#054700] mb-2 group-hover:text-[#054700]/80 leading-snug">{post.title}</h3>
                    {post.excerpt && <p className="text-[#5a6623] text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>}
                    <span className="inline-flex items-center text-[#054700] text-sm font-medium mt-4 gap-1">
                      Read more <ArrowRight className="w-4 h-4" />
                    </span>
                    </div>{/* /p-8 */}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !debouncedSearch && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  setPage(p => Math.max(0, p - 1));
                  setTimeout(() => {
                    listRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
                disabled={page === 0}
                className="text-[#054700]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-[#5a6623]">Page {page + 1} of {totalPages}</span>
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  setPage(p => Math.min(totalPages - 1, p + 1));
                  setTimeout(() => {
                    listRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
                disabled={page >= totalPages - 1}
                className="text-[#054700]"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-light text-[#054700] mb-4">
              Get your personalized formula
            </h2>
            <p className="text-[#5a6623] mb-8">
              Our AI health practitioner builds a custom supplement blend based on your unique biomarkers and goals.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-[#054700] hover:bg-[#054700]/90" data-testid="button-subscribe-blog">
                Start for free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <FooterV2 />
    </div>
  );
}
