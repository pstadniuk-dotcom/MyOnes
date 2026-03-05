import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
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

export default function BlogPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] ?? '');
  const categoryParam = params.get('category') ?? '';
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
        <div className="border-b border-[#c9c3bb] bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
              <Link href="/blog">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${!categoryParam ? 'bg-[#054700] text-white' : 'text-[#054700] hover:bg-[#054700]/10'}`}>
                  All
                </span>
              </Link>
              {categoriesData.categories.map(cat => (
                <Link key={cat} href={`/blog?category=${encodeURIComponent(cat)}`}>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors cursor-pointer ${categoryParam === cat ? 'bg-[#054700] text-white' : 'text-[#054700] hover:bg-[#054700]/10'}`}>
                    {cat}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts grid */}
      <section className="py-16 bg-white">
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
                  <div className="h-full bg-[#ede8e2] rounded-2xl p-8 hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-blog-${post.slug}`}>
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
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-[#054700]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-[#5a6623]">Page {page + 1} of {totalPages}</span>
              <Button
                variant="ghost" size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
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
            <Link href="/">
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
