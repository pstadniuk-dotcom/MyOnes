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

type ViewMode = 'list' | 'edit' | 'generate';

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
}

function ListView({ onEdit, onNew, onGenerate }: ListViewProps) {
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
        secondaryKeywords: '',
        metaTitle: g.metaTitle ?? '',
        metaDescription: g.metaDescription ?? '',
        featuredImage: '',
        authorName: g.authorName ?? 'ONES AI Editorial Team',
        isPublished: false,
        readTimeMinutes: String(g.readTimeMinutes ?? 5),
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
              <p className="text-xs text-gray-400">Comma-separated keywords to include naturally</p>
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

  return <ListView onEdit={handleEdit} onNew={handleNew} onGenerate={handleGenerate} />;
}
