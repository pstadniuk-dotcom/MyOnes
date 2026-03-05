import { useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Tag, Calendar, ChevronRight, Info } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import type { BlogPost } from '@shared/schema';

interface BlogPostResponse {
  post: BlogPost;
  related: BlogPost[];
}

function ArticleSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
      <div className="flex gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

function renderMarkdown(content: string) {
  // Simple markdown renderer — headings, bold, italic, lists, links, paragraphs
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 mb-4 text-gray-700 leading-relaxed">
          {listBuffer.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const inlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-emerald-600 hover:underline">$1</a>');
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="text-xl font-semibold text-gray-900 mt-8 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={i} className="text-3xl font-bold text-gray-900 mt-2 mb-6">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else if (line.trim()) {
      flushList();
      elements.push(
        <p key={i} className="mb-4 text-gray-700 leading-relaxed text-[17px]"
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      );
    }
    i++;
  }
  flushList();
  return elements;
}

export default function BlogArticlePage() {
  const [, params] = useRoute('/blog/:slug');
  const slug = params?.slug ?? '';

  const { data, isLoading, isError } = useQuery<BlogPostResponse>({
    queryKey: ['/api/blog', slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) throw new Error('Post not found');
      return res.json();
    },
    enabled: !!slug,
  });

  // Update page title and meta description for SEO
  useEffect(() => {
    if (!data?.post) return;
    const post = data.post;
    const title = post.metaTitle ?? post.title;
    const desc = post.metaDescription ?? post.excerpt ?? '';
    document.title = `${title} | ONES AI`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      (metaDesc as HTMLMetaElement).name = 'description';
      document.head.appendChild(metaDesc);
    }
    (metaDesc as HTMLMetaElement).content = desc;
    return () => { document.title = 'ONES AI'; };
  }, [data?.post]);

  if (isLoading) return <ArticleSkeleton />;

  if (isError || !data?.post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Article not found</h1>
        <p className="text-gray-500 mb-6">This article may have been moved or removed.</p>
        <Link href="/blog" className="text-emerald-600 hover:underline flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>
      </div>
    );
  }

  const { post, related } = data;
  const publishDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const schemaMarkup = post.schemaJson
    ? post.schemaJson
    : JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.metaDescription ?? post.excerpt,
        "author": { "@type": "Organization", "name": post.authorName ?? "ONES AI Editorial Team" },
        "datePublished": post.publishedAt,
        "dateModified": post.updatedAt,
        "publisher": { "@type": "Organization", "name": "ONES AI", "logo": { "@type": "ImageObject", "url": "https://onesai.co/logo.png" } },
      });

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-gray-700">Blog</Link>
          {post.category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-gray-700 capitalize">{post.category}</Link>
            </>
          )}
        </nav>

        {/* Category badge */}
        {post.category && (
          <Badge variant="secondary" className="mb-4 capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
            {post.category}
          </Badge>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {publishDate}
          </span>
          {post.readTimeMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTimeMinutes} min read
            </span>
          )}
          <span className="text-gray-400">{post.authorName ?? 'ONES AI Editorial Team'}</span>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                <Tag className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose-custom">
          {renderMarkdown(post.content)}
        </div>

        {/* Legal disclaimer — always shown, not dismissible */}
        <div className="mt-10 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <p>
            <strong>Educational content only.</strong> This article is for informational purposes and has not been evaluated by the FDA.
            It is not intended to diagnose, treat, cure, or prevent any disease.
            Always consult a qualified healthcare provider before starting or changing any supplement regimen.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Get your personalized formula</h3>
          <p className="text-gray-600 mb-4 text-sm">Talk to our AI health practitioner and receive a custom supplement blend based on your unique health profile.</p>
          <Link href="/" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
            Start for free
          </Link>
        </div>

        {/* Related articles */}
        {related && related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Related articles</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="block group p-4 bg-white border border-gray-100 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all">
                  {r.category && (
                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2 block">{r.category}</span>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 leading-snug line-clamp-3">{r.title}</h3>
                  {r.readTimeMinutes && (
                    <p className="text-xs text-gray-400 mt-2">{r.readTimeMinutes} min read</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link href="/blog" className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All articles
          </Link>
        </div>
      </article>
  );
}
