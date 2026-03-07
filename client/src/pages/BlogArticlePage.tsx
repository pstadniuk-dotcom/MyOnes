import { useEffect, useState, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Tag, Calendar, ChevronRight, Info, FlaskConical, ArrowRight, List } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import type { BlogPost } from '@shared/schema';

interface BlogPostResponse {
  post: BlogPost;
  related: BlogPost[];
  validSlugs?: string[];
}

// ─── Heading extractor for Table of Contents ───────────────────────────────────
interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = [];
  for (const line of content.split('\n')) {
    const m2 = line.match(/^## (.+)/);
    const m3 = line.match(/^### (.+)/);
    if (m2) {
      const text = m2[1].trim();
      headings.push({ id: slugify(text), text, level: 2 });
    } else if (m3) {
      const text = m3[1].trim();
      headings.push({ id: slugify(text), text, level: 3 });
    }
  }
  return headings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Table of Contents component ───────────────────────────────────────────────
function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>('');

  // Track which heading is currently in view via IntersectionObserver
  useEffect(() => {
    const ids = headings.map(h => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0.1 }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null; // Don't show for short articles

  return (
    <nav className="mb-10 rounded-xl border border-gray-200 bg-gray-50/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-100/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <List className="w-4 h-4 text-gray-400" />
          Table of Contents
        </span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <ol className="px-5 pb-4 space-y-1">
          {headings.filter(h => h.level === 2).map((heading, idx) => {
            const subHeadings = headings.filter(
              (h, hi) => h.level === 3 && hi > headings.indexOf(heading) &&
                (headings.findIndex((h2, h2i) => h2.level === 2 && h2i > headings.indexOf(heading)) === -1 ||
                 hi < headings.findIndex((h2, h2i) => h2.level === 2 && h2i > headings.indexOf(heading)))
            );
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`block py-1.5 text-sm transition-colors ${
                    activeId === heading.id
                      ? 'text-emerald-700 font-medium'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <span className="text-gray-300 mr-2 text-xs">{idx + 1}.</span>
                  {heading.text}
                </a>
                {subHeadings.length > 0 && (
                  <ol className="ml-5 space-y-0.5">
                    {subHeadings.map(sub => (
                      <li key={sub.id}>
                        <a
                          href={`#${sub.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(sub.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`block py-1 text-xs transition-colors ${
                            activeId === sub.id
                              ? 'text-emerald-700 font-medium'
                              : 'text-gray-500 hover:text-emerald-600'
                          }`}
                        >
                          {sub.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

// ─── Ingredient awareness: map article tags/category → relevant ONES ingredients ───
interface OnesIngredient {
  name: string;
  dose: string;
  benefit: string;
}

const TAG_TO_INGREDIENTS: Record<string, OnesIngredient[]> = {
  'liver health':    [{ name: 'Liver Support Blend', dose: '530 mg', benefit: 'Milk thistle, TUDCA & NAC for hepatic protection' }, { name: 'Beta Max', dose: '650 mg', benefit: 'Lipid & carbohydrate metabolism' }],
  'milk thistle':    [{ name: 'Liver Support Blend', dose: '530 mg', benefit: 'Milk thistle, TUDCA, NAC — your core liver stack' }],
  'TUDCA':           [{ name: 'Liver Support Blend', dose: '530 mg', benefit: 'Tauroursodeoxycholic acid for bile flow & cell protection' }],
  'NAC':             [{ name: 'Liver Support Blend', dose: '530 mg', benefit: 'N-Acetyl Cysteine — glutathione precursor & detox support' }],
  'liver detox':     [{ name: 'Liver Support Blend', dose: '530 mg', benefit: 'Hepatic detoxification & bile production support' }],
  'NAD+':            [{ name: 'NMN / NAD+ Precursor', dose: '250–500 mg', benefit: 'Cellular energy & longevity via sirtuin activation' }],
  'ashwagandha':     [{ name: 'Ashwagandha (KSM-66)', dose: '600 mg', benefit: 'Clinically proven cortisol reduction & stress resilience' }],
  'adaptogens':      [{ name: 'Ashwagandha (KSM-66)', dose: '600 mg', benefit: '27% cortisol reduction in clinical trials' }, { name: 'Rhodiola Rosea', dose: '300 mg', benefit: 'Mental fatigue & HPA axis regulation' }],
  'cortisol':        [{ name: 'Adrenal Support Blend', dose: '420 mg', benefit: 'Adrenal gland function + cortisol regulation complex' }, { name: 'Ashwagandha (KSM-66)', dose: '600 mg', benefit: '27% cortisol reduction in clinical trials' }],
  'adrenal':         [{ name: 'Adrenal Support Blend', dose: '420 mg', benefit: 'Adrenal gland function + stress response' }],
  'stress':          [{ name: 'Adrenal Support Blend', dose: '420 mg', benefit: 'Adrenal complex for HPA axis regulation' }, { name: 'Ashwagandha (KSM-66)', dose: '600 mg', benefit: 'Evidence-based cortisol & anxiety reduction' }],
  'heart':           [{ name: 'Heart Support Blend', dose: '689 mg', benefit: 'Magnesium, L-carnitine & L-taurine for cardiac function' }, { name: 'CoQ10 / Ubiquinol', dose: '200 mg', benefit: 'Mitochondrial energy for myocardial efficiency' }],
  'CoQ10':           [{ name: 'CoQ10 / Ubiquinol', dose: '200 mg', benefit: 'Ubiquinol form for optimal absorption & bioavailability' }],
  'ubiquinol':       [{ name: 'CoQ10 / Ubiquinol', dose: '200 mg', benefit: 'Active form — 8× more bioavailable than standard CoQ10' }],
  'omega-3':         [{ name: 'Omega-3 (EPA/DHA)', dose: '1,000–2,000 mg', benefit: 'Triglyceride-lowering, anti-inflammatory, cognitive support' }],
  'EPA':             [{ name: 'Omega-3 (EPA/DHA)', dose: '1,000 mg EPA equiv.', benefit: 'Cardiovascular & anti-inflammatory profile' }],
  'DHA':             [{ name: 'Omega-3 (EPA/DHA)', dose: '500 mg DHA equiv.', benefit: 'Brain structure, cognition & neuroinflammation' }],
  'fish oil':        [{ name: 'Omega-3 (EPA/DHA)', dose: '1,000–2,000 mg', benefit: 'Molecularly distilled, third-party tested for purity' }],
  'vitamin D':       [{ name: 'Vitamin D3 + K2 (MK-7)', dose: '2,000–5,000 IU D3 + 90 mcg K2', benefit: 'Optimal calcium guidance & immune modulation' }],
  'vitamin D3':      [{ name: 'Vitamin D3 + K2 (MK-7)', dose: '2,000–5,000 IU D3 + 90 mcg K2', benefit: 'Cholecalciferol + menaquinone for synergistic effect' }],
  'K2':              [{ name: 'Vitamin D3 + K2 (MK-7)', dose: '90 mcg MK-7', benefit: 'Directs calcium to bones, away from arteries' }],
  'magnesium':       [{ name: 'Magnesium Glycinate Complex', dose: '300–400 mg elem.', benefit: '7-form blend — highest bioavailability, sleep & nerve support' }],
  'thyroid':         [{ name: 'Selenium (Selenomethionine)', dose: '200 mcg', benefit: 'T4→T3 conversion & thyroid peroxidase activity' }, { name: 'Iodine (potassium iodide)', dose: '150–300 mcg', benefit: 'Essential cofactor for thyroid hormone synthesis' }],
  'hypothyroid':     [{ name: 'Selenium (Selenomethionine)', dose: '200 mcg', benefit: 'Clinical evidence in Hashimoto\'s autoimmune modulation' }],
  'Hashimotos':      [{ name: 'Selenium (Selenomethionine)', dose: '200 mcg', benefit: 'Reduces TPO antibody titers in RCT evidence' }, { name: 'Vitamin D3 + K2 (MK-7)', dose: '2,000-5,000 IU', benefit: 'Immune modulation in autoimmune thyroid disease' }],
  'selenium':        [{ name: 'Selenium (Selenomethionine)', dose: '200 mcg', benefit: 'Organic form for maximum absorption & thyroid enzymes' }],
  'iodine':          [{ name: 'Iodine (potassium iodide)', dose: '150–300 mcg', benefit: 'Calibrated to your labs — not a one-size dose' }],
};

const CATEGORY_FALLBACK: Record<string, OnesIngredient[]> = {
  'system-supports':  [{ name: 'Targeted System Blends', dose: 'Custom', benefit: 'Proprietary blends built around your specific system needs' }],
  'ingredients':      [{ name: 'Individual Ingredients', dose: 'Evidence-based', benefit: 'Dosed to clinical ranges, not arbitrary RDAs' }],
  'comparisons':      [{ name: 'Personalized Formula', dose: 'Your biology only', benefit: 'No pre-packs — every formula is built from scratch for you' }],
  'science':          [{ name: 'Biomarker-Driven Formula', dose: 'Lab-calibrated', benefit: 'Your bloodwork drives every ingredient and dose' }],
};

function getRelevantIngredients(tags: string[] | null, category: string | null): OnesIngredient[] {
  const found: OnesIngredient[] = [];
  const seen = new Set<string>();
  if (tags) {
    for (const tag of tags) {
      const matches = TAG_TO_INGREDIENTS[tag] ?? [];
      for (const ing of matches) {
        if (!seen.has(ing.name)) { seen.add(ing.name); found.push(ing); }
        if (found.length >= 3) break;
      }
      if (found.length >= 3) break;
    }
  }
  if (found.length === 0 && category) {
    (CATEGORY_FALLBACK[category] ?? []).forEach(ing => found.push(ing));
  }
  return found.slice(0, 3);
}

// ─── Ingredient-aware CTA ─────────────────────────────────────────────────────
function IngredientCTA({ post }: { post: BlogPost }) {
  const ingredients = getRelevantIngredients(post.tags, post.category);

  return (
    <div className="mt-16 rounded-2xl overflow-hidden border border-emerald-100">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-[#054700] to-[#1a6b00] px-6 py-5 flex items-center gap-3">
        <FlaskConical className="w-5 h-5 text-emerald-300 flex-shrink-0" />
        <div>
          <p className="text-white font-semibold text-base">These ingredients can go in your formula</p>
          <p className="text-emerald-200 text-sm mt-0.5">ONES AI builds a personalized capsule stack from your labs, goals, and health profile.</p>
        </div>
      </div>

      {/* Ingredient chips */}
      {ingredients.length > 0 && (
        <div className="bg-white px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Relevant ingredients in the ONES catalog</p>
          <div className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{ing.name}</span>
                  <span className="text-gray-400 text-sm mx-2">·</span>
                  <span className="text-emerald-700 text-sm font-medium">{ing.dose}</span>
                  <p className="text-gray-500 text-xs mt-0.5">{ing.benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA foot */}
      <div className="bg-emerald-50 px-6 py-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-gray-800 font-medium text-sm">Ready to see what belongs in yours?</p>
          <p className="text-gray-500 text-xs mt-0.5">Takes ~5 minutes. Our AI practitioner reviews your labs and goals.</p>
        </div>
        <Link href="/consultation">
          <span className="inline-flex items-center gap-2 bg-[#054700] hover:bg-[#043d00] text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap cursor-pointer">
            Build my formula <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    </div>
  );
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

function renderMarkdown(content: string, validSlugSet?: Set<string>) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;
  let ulBuffer: string[] = [];
  let olBuffer: string[] = [];

  const inlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_match, label, href) => {
        // For internal /blog/ links, strip dead links that point to unpublished slugs
        if (href.startsWith('/blog/') && validSlugSet && validSlugSet.size > 0) {
          const slug = href.replace(/^\/blog\//, '');
          if (!validSlugSet.has(slug)) {
            // Render as plain text, not a link
            return `<strong>${label}</strong>`;
          }
        }
        return `<a href="${href}" class="text-emerald-600 font-medium hover:underline">${label}</a>`;
      });
  };

  // Parse a markdown table cell — strip leading/trailing whitespace
  const parseTableCells = (row: string) =>
    row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  const isTableRow = (line: string) => /^\|.+\|/.test(line.trim());
  const isSeparatorRow = (line: string) => /^\|[\s|:-]+\|$/.test(line.trim());

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1.5 mb-4 text-gray-700 leading-relaxed">
          {ulBuffer.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ul>
      );
      ulBuffer = [];
    }
  };

  const flushOl = () => {
    if (olBuffer.length > 0) {
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1.5 mb-4 text-gray-700 leading-relaxed">
          {olBuffer.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ol>
      );
      olBuffer = [];
    }
  };

  const flushLists = () => { flushUl(); flushOl(); };

  const renderTable = (headerCells: string[], bodyRows: string[][]): JSX.Element => {
    // Detect if first data column is "Ones" / "ONES" / "ONES AI" — give it green header
    const onesColIndex = headerCells.findIndex(
      h => /^ones(\s+ai)?$/i.test(h.trim())
    );

    const cellClass = (colIdx: number, isHeader = false) => {
      const isOnes = colIdx === onesColIndex;
      if (isHeader) {
        if (colIdx === 0) return 'py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
        if (isOnes) return 'py-3 px-4 text-center bg-[#054700] text-[#ede8e2] rounded-t-xl font-semibold';
        return 'py-3 px-4 text-center font-semibold text-[#054700]';
      }
      if (colIdx === 0) return 'py-3.5 px-4 text-sm font-medium text-gray-700';
      if (isOnes) return 'py-3.5 px-4 text-center text-sm bg-[#054700]/5';
      return 'py-3.5 px-4 text-center text-sm text-gray-600';
    };

    // Render cell value — convert ✅/❌/✗/✓ and text combos
    const renderCellVal = (val: string) => {
      if (val === '✅' || val === '✓') return <span className="text-emerald-600 text-base font-bold">✓</span>;
      if (val === '❌' || val === '✗' || val === '✗') return <span className="text-red-400 text-base font-bold">✗</span>;
      // Mixed like "✅ Full" or "❌ None"
      const cleaned = val
        .replace(/✅/g, '<span class="text-emerald-600 font-bold">✓</span>')
        .replace(/❌/g, '<span class="text-red-400 font-bold">✗</span>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <span dangerouslySetInnerHTML={{ __html: cleaned }} />;
    };

    return (
      <div key={`table-${i}`} className="my-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {headerCells.map((h, ci) => (
                <th key={ci} className={cellClass(ci, true)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-[#ede8e2]/30' : 'bg-white'}>
                {row.map((cell, ci) => (
                  <td key={ci} className={cellClass(ci)}>
                    {renderCellVal(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── Table block ─────────────────────────────────────────────────────────
    if (isTableRow(line)) {
      flushLists();
      const headerCells = parseTableCells(line);
      i++;
      // Skip separator row
      if (i < lines.length && isSeparatorRow(lines[i])) i++;
      const bodyRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        bodyRows.push(parseTableCells(lines[i]));
        i++;
      }
      elements.push(renderTable(headerCells, bodyRows));
      continue;
    }

    // ── Headings ────────────────────────────────────────────────────────────
    if (line.startsWith('### ')) {
      flushLists();
      const h3Text = line.slice(4);
      elements.push(<h3 key={i} id={slugify(h3Text)} className="text-xl font-semibold text-gray-900 mt-8 mb-3 scroll-mt-20">{h3Text}</h3>);
    } else if (line.startsWith('## ')) {
      flushLists();
      const headingText = line.slice(3);
      // article-key-takeaways: Speakable schema cssSelector targets this class
      const isKeyTakeaways = /key\s+takeaway/i.test(headingText);
      elements.push(
        <h2 key={i} id={slugify(headingText)} className={`text-2xl font-bold text-gray-900 mt-10 mb-4 scroll-mt-20${isKeyTakeaways ? ' article-key-takeaways' : ''}`}>
          {headingText}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushLists();
      elements.push(<h1 key={i} className="text-3xl font-bold text-gray-900 mt-2 mb-6">{line.slice(2)}</h1>);

    // ── Unordered list ───────────────────────────────────────────────────────
    } else if (/^[-*] /.test(line)) {
      flushOl();
      ulBuffer.push(line.slice(2));

    // ── Ordered list ─────────────────────────────────────────────────────────
    } else if (/^\d+\. /.test(line)) {
      flushUl();
      olBuffer.push(line.replace(/^\d+\. /, ''));

    // ── Blank line ───────────────────────────────────────────────────────────
    } else if (line.trim() === '') {
      flushLists();

    // ── Paragraph ────────────────────────────────────────────────────────────
    } else if (line.trim()) {
      flushLists();
      elements.push(
        <p key={i} className="mb-4 text-gray-700 leading-relaxed text-[17px]"
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      );
    }
    i++;
  }
  flushLists();
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

  // Inject all SEO meta tags, OG tags, JSON-LD structured data
  useEffect(() => {
    if (!data?.post) return;
    const post = data.post;
    const title = post.metaTitle ?? post.title;
    const desc = post.metaDescription ?? post.excerpt ?? '';
    const canonicalUrl = `https://ones.health/blog/${post.slug}`;
    const image = post.featuredImage ?? 'https://ones.health/ones-logo-light.svg';
    const author = post.authorName ?? 'Ones Editorial Team';

    // Helper to upsert a <meta> tag
    const setMeta = (sel: string, attr: string, value: string) => {
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr.split('=')[0].replace('[', '').replace(']', ''), attr.split('"')[1]);
        document.head.appendChild(el);
      }
      el.content = value;
      return el;
    };

    // Helper to upsert a <link> tag
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
      el.href = href;
      return el;
    };

    // Helper to inject a JSON-LD script
    const injectJsonLd = (id: string, data: object) => {
      let el = document.getElementById(id) as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data);
      return el;
    };

    // Title
    const prevTitle = document.title;
    document.title = `${title} | Ones`;

    // Standard meta
    const descEl = setMeta('meta[name="description"]', 'name="description"', desc);
    const robotsEl = setMeta('meta[name="robots"]', 'name="robots"', 'index, follow');

    // Canonical
    const canonicalEl = setLink('canonical', canonicalUrl);

    // Open Graph
    const ogTitle = setMeta('meta[property="og:title"]', 'property="og:title"', title);
    const ogDesc = setMeta('meta[property="og:description"]', 'property="og:description"', desc);
    const ogUrl = setMeta('meta[property="og:url"]', 'property="og:url"', canonicalUrl);
    const ogImage = setMeta('meta[property="og:image"]', 'property="og:image"', image);
    const ogType = setMeta('meta[property="og:type"]', 'property="og:type"', 'article');
    const ogSite = setMeta('meta[property="og:site_name"]', 'property="og:site_name"', 'Ones');
    const ogLocale = setMeta('meta[property="og:locale"]', 'property="og:locale"', 'en_US');
    const ogImgW = setMeta('meta[property="og:image:width"]', 'property="og:image:width"', '1200');
    const ogImgH = setMeta('meta[property="og:image:height"]', 'property="og:image:height"', '630');

    // Twitter Card
    const twCard = setMeta('meta[name="twitter:card"]', 'name="twitter:card"', 'summary_large_image');
    const twTitle = setMeta('meta[name="twitter:title"]', 'name="twitter:title"', title);
    const twDesc = setMeta('meta[name="twitter:description"]', 'name="twitter:description"', desc);
    const twImage = setMeta('meta[name="twitter:image"]', 'name="twitter:image"', image);
    const twSite = setMeta('meta[name="twitter:site"]', 'name="twitter:site"', '@ones_health');

    // Article + FAQ JSON-LD — schemaJson may be a single object or [Article, FAQPage] array
    let parsedSchema: any = null;
    let faqLd: HTMLScriptElement | null = null;
    try {
      parsedSchema = post.schemaJson ? JSON.parse(post.schemaJson) : null;
    } catch { parsedSchema = null; }

    const schemas = Array.isArray(parsedSchema) ? parsedSchema : (parsedSchema ? [parsedSchema] : []);
    const articleSchemaObj = schemas.find((s: any) => s['@type'] === 'Article') ?? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: desc,
      image: image,
      // Link to global Person + Organization entities defined in index.html
      author: {
        '@type': 'Person',
        '@id': 'https://ones.health/#author-editorial',
        name: author,
      },
      publisher: {
        '@type': 'Organization',
        '@id': 'https://ones.health/#organization',
        name: 'Ones',
        logo: { '@type': 'ImageObject', url: 'https://ones.health/ones-logo-light.svg' },
      },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      keywords: post.tags?.join(', ') ?? '',
      // Explicitly declare article section for AI topic classification
      articleSection: post.category ?? 'Health & Wellness',
      inLanguage: 'en-US',
      isAccessibleForFree: true,
    };
    if (!articleSchemaObj['@context']) articleSchemaObj['@context'] = 'https://schema.org';
    // Ensure @id references are consistently set if schema came from DB
    if (!articleSchemaObj.author?.['@id']) {
      articleSchemaObj.author = { '@type': 'Person', '@id': 'https://ones.health/#author-editorial', name: author };
    }
    if (!articleSchemaObj.publisher?.['@id']) {
      articleSchemaObj.publisher = { '@type': 'Organization', '@id': 'https://ones.health/#organization', name: 'Ones' };
    }
    const articleLd = injectJsonLd('ld-article', articleSchemaObj);

    const faqSchemaObj = schemas.find((s: any) => s['@type'] === 'FAQPage');
    if (faqSchemaObj) {
      if (!faqSchemaObj['@context']) faqSchemaObj['@context'] = 'https://schema.org';
      faqLd = injectJsonLd('ld-faq', faqSchemaObj);
    }

    // HowTo JSON-LD — present when AI generated a howToSchema for step-format articles
    const howToSchemaObj = schemas.find((s: any) => s['@type'] === 'HowTo');
    let howToLd: HTMLScriptElement | null = null;
    if (howToSchemaObj) {
      if (!howToSchemaObj['@context']) howToSchemaObj['@context'] = 'https://schema.org';
      howToLd = injectJsonLd('ld-howto', howToSchemaObj);
    }

    // Speakable schema — marks headline + intro paragraph for AI voice assistants and
    // AI Overviews. These CSS selectors map to article elements rendered on this page.
    const speakableLd = injectJsonLd('ld-speakable', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': canonicalUrl,
      'speakable': {
        '@type': 'SpeakableSpecification',
        'cssSelector': [
          '.article-headline',
          '.article-excerpt',
          '.article-key-takeaways',
        ],
      },
      'url': canonicalUrl,
    });

    // BreadcrumbList JSON-LD
    const breadcrumbItems: object[] = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ones.health/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://ones.health/blog' },
    ];
    if (post.category) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: post.category,
        item: `https://ones.health/blog?category=${encodeURIComponent(post.category)}`,
      });
      breadcrumbItems.push({ '@type': 'ListItem', position: 4, name: post.title, item: canonicalUrl });
    } else {
      breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl });
    }
    const breadcrumbLd = injectJsonLd('ld-breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    });

    return () => {
      document.title = prevTitle;
      [descEl, robotsEl, ogTitle, ogDesc, ogUrl, ogImage, ogType, ogSite, ogLocale, ogImgW, ogImgH,
        twCard, twTitle, twDesc, twImage, twSite].forEach(el => el?.remove());
      canonicalEl?.remove();
      articleLd?.remove();
      faqLd?.remove();
      howToLd?.remove();
      speakableLd?.remove();
      breadcrumbLd?.remove();
    };
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

  const { post, related, validSlugs } = data;
  const publishDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Extract headings for Table of Contents
  const tocHeadings = useMemo(() => extractHeadings(post.content), [post.content]);

  // Build a set of valid internal slugs for link filtering
  const validSlugSet = useMemo(() => new Set(validSlugs ?? []), [validSlugs]);

  // Extract FAQ items from schemaJson for visible accordion
  const faqItems: Array<{question: string; answer: string}> = (() => {
    try {
      const parsed = post.schemaJson ? JSON.parse(post.schemaJson) : null;
      const schemas = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      const faqPage = schemas.find((s: any) => s['@type'] === 'FAQPage');
      return faqPage?.mainEntity?.map((q: any) => ({
        question: q.name ?? q.question ?? '',
        answer: q.acceptedAnswer?.text ?? q.answer ?? '',
      })) ?? [];
    } catch { return []; }
  })();

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

        {/* Title — article-headline class is referenced by Speakable schema cssSelector */}
        <h1 className="article-headline text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
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
          <span className="text-gray-400">{post.authorName ?? 'Ones Editorial Team'}</span>
        </div>

        {/* Excerpt lead paragraph — article-excerpt class is referenced by Speakable schema */}
        {post.excerpt && (
          <p className="article-excerpt text-lg text-gray-600 leading-relaxed mb-6 font-light italic border-l-4 border-emerald-200 pl-4">
            {post.excerpt}
          </p>
        )}

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

        {/* Hero image */}
        {post.featuredImage && (
          <div className="mb-10 rounded-2xl overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.metaTitle ?? post.title}
              className="w-full h-64 sm:h-80 object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Table of Contents */}
        <TableOfContents headings={tocHeadings} />

        {/* Content */}
        <div className="prose-custom">
          {renderMarkdown(post.content, validSlugSet)}
        </div>

        {/* FAQ Accordion — rendered from FAQPage schema, boosts featured snippet eligibility */}
        {faqItems.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {faqItems.map((faq, idx) => (
                <details key={idx} className="group bg-white">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50 transition-colors list-none">
                    <span>{faq.question}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-5 pb-4 pt-1 text-gray-600 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Further Reading — internal links from DB, filtered to only published slugs */}
        {(() => {
          const filteredLinks = (post.internalLinks ?? []).filter((href: string) => {
            const slug = href.replace(/^\/blog\//, '');
            return validSlugSet.size === 0 || validSlugSet.has(slug);
          });
          if (filteredLinks.length === 0) return null;
          return (
            <div className="mt-10 p-5 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Further Reading</p>
              <ul className="space-y-2">
                {filteredLinks.map((href: string) => {
                  const label = href.replace('/blog/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <li key={href}>
                      <Link href={href} className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 hover:underline transition-colors">
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        {/* Legal disclaimer — always shown, not dismissible */}
        <div className="mt-10 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <p>
            <strong>Educational content only.</strong> This article is for informational purposes and has not been evaluated by the FDA.
            It is not intended to diagnose, treat, cure, or prevent any disease.
            Always consult a qualified healthcare provider before starting or changing any supplement regimen.
          </p>
        </div>

        {/* Ingredient-aware CTA — replaces generic box */}
        <IngredientCTA post={post} />

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
