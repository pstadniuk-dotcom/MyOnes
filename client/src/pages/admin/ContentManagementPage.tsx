import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { useState } from 'react';
import {
  HelpCircle, BookOpen, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, GripVertical,
  AlertTriangle,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
}

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  isPublished: boolean;
  viewCount: number;
  displayOrder: number;
  createdAt: string;
}

type EditMode = 'list' | 'create' | 'edit';

const FAQ_CATEGORIES = ['general', 'supplements', 'ordering', 'shipping', 'billing', 'account', 'safety', 'ingredients'];
const ARTICLE_CATEGORIES = ['getting-started', 'supplements', 'account', 'billing', 'integrations', 'privacy', 'troubleshooting'];

function FaqManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<EditMode>('list');
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ category: 'general', question: '', answer: '', isPublished: true, displayOrder: 0 });

  const { data: items, isLoading } = useQuery<FaqItem[]>({
    queryKey: ['/api/admin/faq'],
    queryFn: async () => { const res = await apiRequest('GET', '/api/admin/faq'); return res.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/faq', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faq'] });
      setMode('list');
      resetForm();
      toast({ title: 'FAQ Created' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create FAQ', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await apiRequest('PATCH', `/api/admin/faq/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faq'] });
      setMode('list');
      setEditingItem(null);
      resetForm();
      toast({ title: 'FAQ Updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update FAQ', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/faq/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faq'] });
      toast({ title: 'FAQ Deleted' });
    },
  });

  const resetForm = () => setForm({ category: 'general', question: '', answer: '', isPublished: true, displayOrder: 0 });

  const startEdit = (item: FaqItem) => {
    setEditingItem(item);
    setForm({ category: item.category, question: item.question, answer: item.answer, isPublished: item.isPublished, displayOrder: item.displayOrder });
    setMode('edit');
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  }

  if (mode !== 'list') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New FAQ Item' : 'Edit FAQ Item'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Question</Label>
            <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter the FAQ question..." />
          </div>
          <div>
            <Label>Answer</Label>
            <Textarea rows={6} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Enter the answer..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
            <Label>Published</Label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (mode === 'create') createMutation.mutate(form);
                else if (editingItem) updateMutation.mutate({ id: editingItem.id, data: form });
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !form.question.trim() || !form.answer.trim()}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setMode('list'); setEditingItem(null); resetForm(); }}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{items?.length || 0} FAQ items</p>
        <Button onClick={() => { resetForm(); setMode('create'); }}>
          <Plus className="h-4 w-4 mr-2" /> Add FAQ
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Question</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(items || []).map((item, idx) => (
            <TableRow key={item.id}>
              <TableCell className="text-slate-400">{item.displayOrder || idx + 1}</TableCell>
              <TableCell className="max-w-md">
                <p className="font-medium truncate">{item.question}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{item.answer.slice(0, 80)}...</p>
              </TableCell>
              <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
              <TableCell>
                {item.isPublished ? (
                  <Badge className="bg-emerald-100 text-emerald-700"><Eye className="h-3 w-3 mr-1" /> Published</Badge>
                ) : (
                  <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" /> Draft</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this FAQ item.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(!items || items.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                No FAQ items yet. Click "Add FAQ" to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function HelpArticleManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<EditMode>('list');
  const [editingItem, setEditingItem] = useState<HelpArticle | null>(null);
  const [form, setForm] = useState({ category: 'getting-started', title: '', content: '', isPublished: true, displayOrder: 0 });

  const { data: articles, isLoading } = useQuery<HelpArticle[]>({
    queryKey: ['/api/admin/help-articles'],
    queryFn: async () => { const res = await apiRequest('GET', '/api/admin/help-articles'); return res.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/help-articles', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-articles'] });
      setMode('list');
      resetForm();
      toast({ title: 'Article Created' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create article', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await apiRequest('PATCH', `/api/admin/help-articles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-articles'] });
      setMode('list');
      setEditingItem(null);
      resetForm();
      toast({ title: 'Article Updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update article', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/help-articles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-articles'] });
      toast({ title: 'Article Deleted' });
    },
  });

  const resetForm = () => setForm({ category: 'getting-started', title: '', content: '', isPublished: true, displayOrder: 0 });

  const startEdit = (article: HelpArticle) => {
    setEditingItem(article);
    setForm({ category: article.category, title: article.title, content: article.content, isPublished: article.isPublished, displayOrder: article.displayOrder });
    setMode('edit');
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  }

  if (mode !== 'list') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New Help Article' : 'Edit Help Article'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title..." />
          </div>
          <div>
            <Label>Content (Markdown)</Label>
            <Textarea rows={12} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Article content in Markdown..." />
            <p className="text-xs text-slate-400 mt-1">{form.content.split(/\s+/).filter(Boolean).length} words</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
            <Label>Published</Label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (mode === 'create') createMutation.mutate(form);
                else if (editingItem) updateMutation.mutate({ id: editingItem.id, data: form });
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !form.title.trim() || !form.content.trim()}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setMode('list'); setEditingItem(null); resetForm(); }}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{articles?.length || 0} help articles</p>
        <Button onClick={() => { resetForm(); setMode('create'); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Article
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(articles || []).map((article, idx) => (
            <TableRow key={article.id}>
              <TableCell className="text-slate-400">{article.displayOrder || idx + 1}</TableCell>
              <TableCell>
                <p className="font-medium">{article.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{article.content.slice(0, 60)}...</p>
              </TableCell>
              <TableCell><Badge variant="outline">{article.category}</Badge></TableCell>
              <TableCell>{article.viewCount}</TableCell>
              <TableCell>
                {article.isPublished ? (
                  <Badge className="bg-emerald-100 text-emerald-700"><Eye className="h-3 w-3 mr-1" /> Published</Badge>
                ) : (
                  <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" /> Draft</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(article)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this help article.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(article.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(!articles || articles.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                No help articles yet. Click "Add Article" to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ContentManagementPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-500" />
          Content Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage FAQ items and Help Center articles
        </p>
      </div>

      <Tabs defaultValue="faq">
        <TabsList>
          <TabsTrigger value="faq" className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" /> FAQ Items
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> Help Articles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4">
          <FaqManager />
        </TabsContent>

        <TabsContent value="help" className="mt-4">
          <HelpArticleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
