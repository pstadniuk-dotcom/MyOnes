import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Globe,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Save,
  ExternalLink,
  Settings,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { useLocation } from 'wouter';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  tier: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[] | null;
  wordCount: number | null;
  readTimeMinutes: number | null;
  schemaJson: string | null;
  featuredImage: string | null;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  authorName: string | null;
  viewCount: number | null;
}

type ViewMode = 'list' | 'edit' | 'generate' | 'bulk' | 'settings';

const CATEGORIES = [
  'Health & Wellness',
  'Nutrition',
  'Supplements',
  'Lab Testing',
  'Wearables & Biometrics',
  'Sleep',
  'Hormones',
  'Mental Performance',
  'Athletic Performance',
  'Longevity',
  'Gut Health',
  'Weight Management',
  'Immune Health',
];

const TONES = ['informative', 'educational', 'authoritative', 'conversational', 'motivational'];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
}

function wordCount(text: string): number {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function estimateReadTime(wc: number): number {
  return Math.max(1, Math.round(wc / 200));
}

// ──────────────────────────────────────────────────────────────
// Post Form State
// ──────────────────────────────────────────────────────────────

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;           // comma-separated
  primaryKeyword: string;
  secondaryKeywords: string; // comma-separated
  metaTitle: string;
  metaDescription: string;
  featuredImage: string;
  authorName: string;
  isPublished: boolean;
  readTimeMinutes: string;
}

const emptyForm = (): PostForm => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  tags: '',
  primaryKeyword: '',
  secondaryKeywords: '',
  metaTitle: '',
  metaDescription: '',
  featuredImage: '',
  authorName: 'ONES AI Editorial Team',
  isPublished: false,
  readTimeMinutes: '5',
});

function postToForm(p: BlogPost): PostForm {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? '',
    content: p.content,
    category: p.category ?? '',
    tags: (p.tags ?? []).join(', '),
    primaryKeyword: p.primaryKeyword ?? '',
    secondaryKeywords: (p.secondaryKeywords ?? []).join(', '),
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    featuredImage: p.featuredImage ?? '',
    authorName: p.authorName ?? 'ONES AI Editorial Team',
    isPublished: p.isPublished,
    readTimeMinutes: String(p.readTimeMinutes ?? 5),
  };
}

function formToPayload(f: PostForm) {
  const wc = wordCount(f.content);
  return {
    title: f.title.trim(),
    slug: f.slug.trim(),
    excerpt: f.excerpt.trim() || null,
    content: f.content,
    category: f.category || null,
    tags: f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    primaryKeyword: f.primaryKeyword.trim() || null,
    secondaryKeywords: f.secondaryKeywords
      ? f.secondaryKeywords.split(',').map(t => t.trim()).filter(Boolean)
      : null,
    metaTitle: f.metaTitle.trim() || null,
    metaDescription: f.metaDescription.trim() || null,
    featuredImage: f.featuredImage.trim() || null,
    authorName: f.authorName.trim() || 'ONES AI Editorial Team',
    isPublished: f.isPublished,
    wordCount: wc,
    readTimeMinutes: parseInt(f.readTimeMinutes) || estimateReadTime(wc),
  };
}

// ──────────────────────────────────────────────────────────────
// List View
// ──────────────────────────────────────────────────────────────

interface ListViewProps {
  onEdit: (post: BlogPost) => void;
  onNew: () => void;
  onGenerate: () => void;
  onBulk: () => void;
  onSettings: () => void;
}

function ListView({ onEdit, onNew, onGenerate, onBulk, onSettings }: ListViewProps) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ posts: BlogPost[]; total: number; pages: number }>({
    queryKey: ['/api/blog/admin/all', page],
    queryFn: () =>
      apiRequest('GET', `/api/blog/admin/all?limit=50&page=${page}`).then(r => r.json()),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      apiRequest('PATCH', `/api/blog/admin/${id}/publish`, { isPublished }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/all'] });
      toast({ title: 'Status updated' });
    },
    onError: () => toast({ title: 'Failed to update status', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/blog/admin/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/all'] });
      toast({ title: 'Post deleted' });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: 'Failed to delete post', variant: 'destructive' }),
  });

  const allPosts = data?.posts ?? [];
  const filtered =
    filter === 'published'
      ? allPosts.filter(p => p.isPublished)
      : filter === 'drafts'
      ? allPosts.filter(p => !p.isPublished)
      : allPosts;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin Panel
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#054700]" />
              Blog Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {data?.total ?? 0} articles total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSettings} className="gap-2">
              <Settings className="w-4 h-4" /> Auto-Generate
            </Button>
            <Button variant="outline" onClick={onBulk} className="gap-2">
              <Sparkles className="w-4 h-4" /> Bulk Generate
            </Button>
            <Button variant="outline" onClick={onGenerate} className="gap-2">
              <Wand2 className="w-4 h-4" /> Generate with AI
            </Button>
            <Button onClick={onNew} className="bg-[#054700] hover:bg-[#043d00] text-white gap-2">
              <Plus className="w-4 h-4" /> New Article
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex gap-1">
        {(['all', 'published', 'drafts'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#054700] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              {f === 'all'
                ? allPosts.length
                : f === 'published'
                ? allPosts.filter(p => p.isPublished).length
                : allPosts.filter(p => !p.isPublished).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-[#054700]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No articles yet</p>
                <Button className="mt-4 bg-[#054700] text-white" onClick={onNew}>
                  Create your first article
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(post => (
                    <TableRow key={post.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">/{post.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.category ? (
                          <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            togglePublishMutation.mutate({ id: post.id, isPublished: !post.isPublished })
                          }
                          className="flex items-center gap-1.5"
                          title={post.isPublished ? 'Click to unpublish' : 'Click to publish'}
                        >
                          {post.isPublished ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer gap-1">
                              <Globe className="w-3 h-3" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 hover:bg-gray-100 cursor-pointer gap-1">
                              <EyeOff className="w-3 h-3" /> Draft
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(post.viewCount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(post.updatedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Preview"
                            onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit"
                            onClick={() => onEdit(post)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            onClick={() => setDeleteTarget(post)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {data?.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data?.pages ?? 1) - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Generate View — AI article generation
// ──────────────────────────────────────────────────────────────

interface GenerateViewProps {
  onBack: () => void;
  onGenerated: (form: PostForm) => void;
}

function GenerateView({ onBack, onGenerated }: GenerateViewProps) {
  const { toast } = useToast();
  const [genForm, setGenForm] = useState({
    title: '',
    topic: '',
    keywords: '',
    secondaryKeywords: '',
    category: '',
    tone: 'informative',
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/blog/admin/generate', genForm).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }
      const g = data.generated;
      const form: PostForm = {
        title: g.title ?? '',
        slug: g.slug ?? slugify(g.title ?? ''),
        excerpt: g.excerpt ?? '',
        content: g.content ?? '',
        category: g.category ?? genForm.category,
        tags: Array.isArray(g.tags) ? g.tags.join(', ') : '',
        primaryKeyword: g.primaryKeyword ?? '',
        secondaryKeywords: Array.isArray(g.secondaryKeywords) ? g.secondaryKeywords.join(', ') : (genForm.secondaryKeywords || ''),
        metaTitle: g.metaTitle ?? '',
        metaDescription: g.metaDescription ?? '',
        featuredImage: '',
        authorName: g.authorName ?? 'ONES AI Editorial Team',
        isPublished: false,
        readTimeMinutes: String(g.readTimeMinutes ?? 8),
      };
      onGenerated(form);
    },
    onError: () => toast({ title: 'Generation failed', variant: 'destructive' }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Posts
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-[#054700]" />
          Generate Article with AI
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe the article you want — the AI will write a full draft. Review and edit before publishing.
        </p>
      </div>

      <div className="p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label>Article Title</Label>
              <Input
                placeholder="e.g. How Magnesium Affects Sleep Quality"
                value={genForm.title}
                onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
              />
              <p className="text-xs text-gray-400">
                Be specific — the more detail, the better the output
              </p>
            </div>

            <div className="space-y-2">
              <Label>Additional Context / Topic Notes</Label>
              <Textarea
                placeholder="e.g. Focus on magnesium glycinate vs other forms, include dosing info, mention that ONES AI incorporates magnesium in personalized formulas"
                rows={3}
                value={genForm.topic}
                onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={genForm.category}
                  onValueChange={v => setGenForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={genForm.tone}
                  onValueChange={v => setGenForm(f => ({ ...f, tone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Keywords</Label>
              <Input
                placeholder="e.g. magnesium for sleep, magnesium supplement benefits"
                value={genForm.keywords}
                onChange={e => setGenForm(f => ({ ...f, keywords: e.target.value }))}
              />
              <p className="text-xs text-gray-400">Primary keyword — appears in title, H1, and meta</p>
            </div>

            <div className="space-y-2">
              <Label>Secondary Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
              <Input
                placeholder="e.g. magnesium glycinate benefits, best magnesium for anxiety, magnesium dosage adults"
                value={genForm.secondaryKeywords}
                onChange={e => setGenForm(f => ({ ...f, secondaryKeywords: e.target.value }))}
              />
              <p className="text-xs text-gray-400">Used as H2 subheadings — drives long-tail ranking</p>
            </div>

            <Button
              className="w-full bg-[#054700] hover:bg-[#043d00] text-white gap-2"
              disabled={!genForm.title.trim() || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating article...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Article
                </>
              )}
            </Button>
            {generateMutation.isPending && (
              <p className="text-xs text-center text-gray-400">
                This usually takes 15–30 seconds. The full article will open in edit mode for review.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Edit View — create or edit a post
// ──────────────────────────────────────────────────────────────

interface EditViewProps {
  post: BlogPost | null;         // null = new post
  initialForm?: PostForm;        // pre-filled from AI generation
  onBack: () => void;
  onSaved: () => void;
}

function EditView({ post, initialForm, onBack, onSaved }: EditViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PostForm>(initialForm ?? (post ? postToForm(post) : emptyForm()));
  const [slugLocked, setSlugLocked] = useState(!!post);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiRevising, setAiRevising] = useState(false);

  // Auto-generate slug from title (only when slug is not manually locked)
  useEffect(() => {
    if (!slugLocked && form.title) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugLocked]);

  const wc = wordCount(form.content);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (post) {
        return apiRequest('PATCH', `/api/blog/admin/${post.id}`, payload).then(r => r.json());
      } else {
        return apiRequest('POST', '/api/blog', payload).then(r => r.json());
      }
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/all'] });
      toast({ title: post ? 'Article saved' : 'Article created' });
      onSaved();
    },
    onError: (err: any) =>
      toast({ title: err.message || 'Save failed', variant: 'destructive' }),
  });

  const handleAiRevise = async () => {
    if (!post) {
      toast({ title: 'Save the article first before using AI revision', variant: 'destructive' });
      return;
    }
    if (!aiPrompt.trim()) {
      toast({ title: 'Enter a revision prompt', variant: 'destructive' });
      return;
    }
    setAiRevising(true);
    setAiResult('');
    try {
      const res = await apiRequest('POST', `/api/blog/admin/${post.id}/ai-revise`, {
        prompt: aiPrompt.trim(),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResult(data.revisedContent ?? '');
    } catch (err: any) {
      toast({ title: err.message || 'AI revision failed', variant: 'destructive' });
    } finally {
      setAiRevising(false);
    }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    setForm(f => ({ ...f, content: aiResult }));
    setAiResult('');
    setAiPrompt('');
    toast({ title: 'Content updated from AI revision' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> All Articles
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {post ? 'Edit Article' : 'New Article'}
            </h1>
            {post && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last updated {format(new Date(post.updatedAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="publish-switch"
                checked={form.isPublished}
                onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))}
              />
              <Label htmlFor="publish-switch" className="text-sm cursor-pointer">
                {form.isPublished ? (
                  <span className="text-green-700 font-medium flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Published
                  </span>
                ) : (
                  <span className="text-gray-500 flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" /> Draft
                  </span>
                )}
              </Label>
            </div>
            {post && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview
              </Button>
            )}
            <Button
              className="bg-[#054700] hover:bg-[#043d00] text-white gap-2"
              disabled={saveMutation.isPending || !form.title || !form.content}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {post ? 'Save Changes' : 'Create Article'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl">
        <Tabs defaultValue="content">
          <TabsList className="mb-6">
            <TabsTrigger value="content">Main Content</TabsTrigger>
            <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
            <TabsTrigger value="ai">AI Assist</TabsTrigger>
          </TabsList>

          {/* ── CONTENT TAB ── */}
          <TabsContent value="content">
            <div className="space-y-5">
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Article title"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="text-lg font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Slug (URL)</Label>
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setSlugLocked(l => !l)}
                      >
                        {slugLocked ? 'Unlock to edit' : 'Lock slug'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">/blog/</span>
                      <Input
                        value={form.slug}
                        disabled={slugLocked}
                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                        className={slugLocked ? 'bg-gray-50 text-gray-500' : ''}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={form.category}
                        onValueChange={v => setForm(f => ({ ...f, category: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input
                        value={form.authorName}
                        onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Excerpt</Label>
                    <Textarea
                      placeholder="2–3 sentence summary shown in cards and search results..."
                      rows={2}
                      value={form.excerpt}
                      onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Content * <span className="text-gray-400 font-normal">(Markdown)</span></Label>
                      <span className="text-xs text-gray-400">
                        {wc.toLocaleString()} words · ~{estimateReadTime(wc)} min read
                      </span>
                    </div>
                    <Textarea
                      placeholder="Write your article content in Markdown format..."
                      rows={28}
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      className="font-mono text-sm leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SEO TAB ── */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>SEO & Metadata</CardTitle>
                <CardDescription>Optimize how this article appears in search results.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Title</Label>
                    <span className={`text-xs ${form.metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.metaTitle.length}/60
                    </span>
                  </div>
                  <Input
                    placeholder="SEO title (under 60 chars)"
                    value={form.metaTitle}
                    onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className={`text-xs ${form.metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    placeholder="Meta description (120–155 chars ideal)"
                    rows={2}
                    value={form.metaDescription}
                    onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Keyword</Label>
                    <Input
                      placeholder="Main target keyword"
                      value={form.primaryKeyword}
                      onChange={e => setForm(f => ({ ...f, primaryKeyword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Est. Read Time (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.readTimeMinutes}
                      onChange={e => setForm(f => ({ ...f, readTimeMinutes: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secondary Keywords</Label>
                  <Input
                    placeholder="keyword1, keyword2, keyword3"
                    value={form.secondaryKeywords}
                    onChange={e => setForm(f => ({ ...f, secondaryKeywords: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400">Comma-separated</p>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400">Comma-separated</p>
                </div>

                <div className="space-y-2">
                  <Label>Featured Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={form.featuredImage}
                    onChange={e => setForm(f => ({ ...f, featuredImage: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI ASSIST TAB ── */}
          <TabsContent value="ai">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#054700]" />
                    AI Content Revision
                  </CardTitle>
                  <CardDescription>
                    {post
                      ? 'Describe what you want the AI to change or improve. The current article content will be revised based on your instructions.'
                      : 'Save the article first to enable AI revision.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!post && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      Create and save the article first, then come back here to use AI revision.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Revision Prompt</Label>
                    <Textarea
                      placeholder={`Examples:\n• "Add a section about magnesium dosing for athletes"\n• "Rewrite the intro to be more engaging and hook the reader in the first sentence"\n• "Add citations and make the tone more clinical"\n• "Shorten to 1000 words and make it more conversational"`}
                      rows={5}
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      disabled={!post}
                    />
                  </div>

                  <Button
                    className="bg-[#054700] hover:bg-[#043d00] text-white gap-2"
                    disabled={!post || !aiPrompt.trim() || aiRevising}
                    onClick={handleAiRevise}
                  >
                    {aiRevising ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Revising with AI...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" /> Revise Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* AI Result Preview */}
              {aiResult && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2 text-green-800">
                        <Sparkles className="w-4 h-4" /> AI Revised Content
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAiResult('')}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-700 hover:bg-green-800 text-white"
                          onClick={applyAiResult}
                        >
                          Apply to Content
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Review the AI revision below. Click "Apply to Content" to replace the current article, or discard to keep the original.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 border rounded-md p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {aiResult}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Bulk Generate View
// ──────────────────────────────────────────────────────────────

interface BulkJob {
  title: string;
  status: 'pending' | 'running' | 'done' | 'error';
  slug?: string;
  error?: string;
}

function BulkGenerateView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [titlesText, setTitlesText] = useState('');
  const [category, setCategory] = useState('Supplements');
  const [tone, setTone] = useState('informative');
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);

  const titles = titlesText
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);

  const startBatch = async () => {
    if (!titles.length) return;
    const queue: BulkJob[] = titles.map(title => ({ title, status: 'pending' }));
    setJobs(queue);
    setRunning(true);

    for (let i = 0; i < queue.length; i++) {
      setCurrentIdx(i);
      setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: 'running' } : j));

      try {
        const genRes = await apiRequest('POST', '/api/blog/admin/generate', {
          title: queue[i].title, category, tone,
        }).then(r => r.json());

        if (genRes.error || !genRes.generated) throw new Error(genRes.error ?? 'Generation failed');

        const g = genRes.generated;
        const payload = {
          title: g.title ?? queue[i].title,
          slug: g.slug ?? slugify(g.title ?? queue[i].title),
          excerpt: g.excerpt ?? null,
          content: g.content ?? '',
          category: g.category ?? category,
          tags: Array.isArray(g.tags) ? g.tags : [],
          primaryKeyword: g.primaryKeyword ?? null,
          secondaryKeywords: Array.isArray(g.secondaryKeywords) ? g.secondaryKeywords : [],
          metaTitle: g.metaTitle ?? null,
          metaDescription: g.metaDescription ?? null,
          featuredImage: null,
          authorName: 'ONES AI Editorial Team',
          isPublished: false,
          wordCount: g.wordCount ?? 0,
          readTimeMinutes: g.readTimeMinutes ?? 8,
        };

        const saveRes = await apiRequest('POST', '/api/blog', payload).then(r => r.json());
        const slug = saveRes.post?.slug ?? payload.slug;

        setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: 'done', slug } : j));
      } catch (err: any) {
        setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: 'error', error: err.message } : j));
      }

      // Small delay between requests to avoid rate limiting
      if (i < queue.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    setRunning(false);
    setCurrentIdx(-1);
    queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/all'] });
    // Use queue (local loop var) instead of stale jobs state
    toast({ title: `Batch complete — ${queue.filter(j => j.status === 'done').length} articles saved as drafts` });
  };

  const done = jobs.filter(j => j.status === 'done').length;
  const errors = jobs.filter(j => j.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4" disabled={running}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Posts
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#054700]" />
          Bulk Generate Articles
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste one article title per line. Each will be generated by AI and saved as a draft.
        </p>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {!running && jobs.length === 0 && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Article Titles <span className="text-gray-400 font-normal">(one per line)</span></Label>
                <Textarea
                  placeholder={`Vitamin K2 Benefits: Bones, Heart, and Arterial Health\nBerberine vs Metformin: What the Research Shows\nZinc Deficiency: Signs, Symptoms, and the Right Supplement Form\nCollagen Peptides: What the Science Says\nCreatine for Cognitive Performance: Beyond the Gym`}
                  rows={12}
                  value={titlesText}
                  onChange={e => setTitlesText(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">{titles.length} article{titles.length !== 1 ? 's' : ''} queued · ~{titles.length * 30}s estimated</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full bg-[#054700] hover:bg-[#043d00] text-white gap-2"
                disabled={titles.length === 0}
                onClick={startBatch}
              >
                <Sparkles className="w-4 h-4" /> Generate {titles.length} Article{titles.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        )}

        {jobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Batch Progress</span>
                {!running && (
                  <span className="text-sm font-normal text-gray-500">
                    {done} done · {errors} errors · {jobs.length - done - errors} remaining
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {jobs.map((job, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-5 flex-shrink-0 text-center">
                      {job.status === 'pending' && <span className="text-gray-300 text-sm">·</span>}
                      {job.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-[#054700]" />}
                      {job.status === 'done' && <span className="text-emerald-600 text-base">✓</span>}
                      {job.status === 'error' && <span className="text-red-500 text-base">✗</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        job.status === 'done' ? 'text-gray-700' :
                        job.status === 'error' ? 'text-red-600' :
                        job.status === 'running' ? 'text-[#054700] font-medium' : 'text-gray-400'
                      }`}>{job.title}</p>
                      {job.error && <p className="text-xs text-red-400 mt-0.5">{job.error}</p>}
                    </div>
                    {job.status === 'done' && job.slug && (
                      <a href={`/blog/${job.slug}`} target="_blank" rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex-shrink-0">
                        Preview
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!running && jobs.length > 0 && (
          <Button variant="outline" onClick={() => { setJobs([]); setTitlesText(''); }} className="w-full">
            Start new batch
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Auto-Generate Settings View
// ──────────────────────────────────────────────────────────────

interface AutoGenSettings {
  enabled: boolean;
  articlesPerDay: number;
  autoPublish: boolean;
  tiers: string[];
}

const ALL_TIERS = ['pillar', 'system', 'ingredient', 'comparison', 'symptom', 'lab', 'lifestyle'];

function AutoGenSettingsView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutoGenSettings>({
    enabled: false,
    articlesPerDay: 20,
    autoPublish: true,
    tiers: ALL_TIERS,
  });
  const [runLog, setRunLog] = useState<string[]>([]);
  const [runStats, setRunStats] = useState<{ generated: number; failed: number; skipped: number } | null>(null);

  const { isLoading: loadingSettings, data: remoteSettings } = useQuery<AutoGenSettings>({
    queryKey: ['/api/blog/admin/auto-gen/settings'],
    queryFn: () => apiRequest('GET', '/api/blog/admin/auto-gen/settings').then(r => r.json()),
  });

  useEffect(() => {
    if (remoteSettings) setSettings(remoteSettings);
  }, [remoteSettings]);

  const saveMutation = useMutation({
    mutationFn: (s: AutoGenSettings) =>
      apiRequest('PATCH', '/api/blog/admin/auto-gen/settings', s).then(r => r.json()),
    onSuccess: () => toast({ title: 'Settings saved' }),
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const runMutation = useMutation({
    mutationFn: (overrides: Partial<AutoGenSettings>) =>
      apiRequest('POST', '/api/blog/admin/auto-gen/run', overrides).then(r => r.json()),
    onSuccess: (data) => {
      // Server responds immediately (202) — run is in background
      setRunLog([`✓ Job ${data.jobId} started — articles will appear in the blog list as they complete.`]);
      setRunStats(null);
      toast({ title: 'Generation started', description: 'Check the blog list in a few minutes.' });
    },
    onError: (e: any) => toast({ title: 'Run failed', description: e.message, variant: 'destructive' }),
  });

  const set = (patch: Partial<AutoGenSettings>) => setSettings(s => ({ ...s, ...patch }));
  const toggleTier = (tier: string) =>
    set({ tiers: settings.tiers.includes(tier) ? settings.tiers.filter(t => t !== tier) : [...settings.tiers, tier] });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Posts
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#054700]" />
          Auto-Generate Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Runs daily at 02:00 UTC. Skips topics already published. Publishes automatically if enabled.
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {/* Master toggle */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Enable Daily Auto-Generation</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  When ON, the server generates articles each night automatically.
                  <span className="ml-1 font-medium text-amber-600">Currently {settings.enabled ? 'ON — articles will be generated tonight' : 'OFF — nothing will run'}.</span>
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={v => set({ enabled: v })}
                className="data-[state=checked]:bg-[#054700]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Config */}
        <Card>
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label>Articles per day <span className="text-gray-400 font-normal">(runs at 02:00 UTC)</span></Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={settings.articlesPerDay}
                onChange={e => set({ articlesPerDay: Number(e.target.value) })}
                className="w-32"
              />
              <p className="text-xs text-gray-400">
                API cost estimate: ~${(settings.articlesPerDay * 0.30).toFixed(2)}/day · ~${(settings.articlesPerDay * 0.30 * 30).toFixed(0)}/month
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Auto-publish</p>
                <p className="text-sm text-gray-500">Publish immediately on generation (vs. save as draft for review)</p>
              </div>
              <Switch
                checked={settings.autoPublish}
                onCheckedChange={v => set({ autoPublish: v })}
                className="data-[state=checked]:bg-[#054700]"
              />
            </div>

            <div className="space-y-2">
              <Label>Content tiers to generate</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_TIERS.map(tier => (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      settings.tiers.includes(tier)
                        ? 'bg-[#054700] text-white border-[#054700]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Only selected tiers will be drawn from the topic cluster library</p>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex gap-3">
          <Button
            className="bg-[#054700] hover:bg-[#043d00] text-white gap-2"
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending || loadingSettings}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate({ articlesPerDay: settings.articlesPerDay, autoPublish: settings.autoPublish, tiers: settings.tiers })}
          >
            {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {runMutation.isPending ? 'Starting…' : 'Run Now (test)'}
          </Button>
        </div>

        {/* Run log */}
        {runLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Background Job Started
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-gray-50 rounded p-3">
                {runLog.map((line, i) => (
                  <p key={i} className={`text-xs font-mono leading-5 ${
                    line.startsWith('✗') ? 'text-red-500' :
                    line.startsWith('✓') ? 'text-emerald-600' : 'text-gray-500'
                  }`}>{line}</p>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Articles publish as they finish. Refresh the blog list in a few minutes to see them.
                Server logs show real-time progress.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>SEO Note:</strong> Google’s Helpful Content guidelines flag thin AI content farms.
              Keep <strong>auto-publish OFF</strong> initially and review a sample batch before enabling.
              500–5,000 high-quality articles outperform 100,000 thin ones for YMYL health searches.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Page — orchestrates views
// ──────────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [generatedForm, setGeneratedForm] = useState<PostForm | undefined>(undefined);

  const handleEdit = useCallback((post: BlogPost) => {
    setEditPost(post);
    setGeneratedForm(undefined);
    setView('edit');
  }, []);

  const handleNew = useCallback(() => {
    setEditPost(null);
    setGeneratedForm(undefined);
    setView('edit');
  }, []);

  const handleGenerate = useCallback(() => {
    setView('generate');
  }, []);

  const handleBulk = useCallback(() => {
    setView('bulk');
  }, []);

  const handleSettings = useCallback(() => {
    setView('settings');
  }, []);

  const handleGenerated = useCallback((form: PostForm) => {
    setEditPost(null);
    setGeneratedForm(form);
    setView('edit');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setEditPost(null);
    setGeneratedForm(undefined);
  }, []);

  if (view === 'settings') {
    return <AutoGenSettingsView onBack={handleBack} />;
  }

  if (view === 'bulk') {
    return <BulkGenerateView onBack={handleBack} />;
  }

  if (view === 'generate') {
    return <GenerateView onBack={handleBack} onGenerated={handleGenerated} />;
  }

  if (view === 'edit') {
    return (
      <EditView
        post={editPost}
        initialForm={generatedForm}
        onBack={handleBack}
        onSaved={handleBack}
      />
    );
  }

  return <ListView onEdit={handleEdit} onNew={handleNew} onGenerate={handleGenerate} onBulk={handleBulk} onSettings={handleSettings} />;
}
