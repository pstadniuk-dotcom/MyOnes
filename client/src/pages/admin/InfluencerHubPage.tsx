import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

// --- Types ---

interface InfluencerStats {
  totalInfluencers: number;
  activeInfluencers: number;
  totalSignups: number;
  totalRevenueCents: number;
  avgCommission: number;
}

interface Influencer {
  id: string;
  name: string;
  handle: string | null;
  platform: string;
  status: string;
  followerCount: number | null;
  engagementRate: number | null;
  niche: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  agreementType: string | null;
  commissionPercent: number | null;
  promoCode: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  notes: string | null;
  signups: number;
  revenueCents: number;
  commissionOwedCents: number;
  createdAt: string;
}

interface ContentItem {
  id: string;
  influencerId: string;
  contentType: string;
  platform: string;
  url: string | null;
  expectedDate: string | null;
  publishedDate: string | null;
  notes: string | null;
  createdAt: string;
}

type InfluencerFormData = {
  name: string;
  handle: string;
  platform: string;
  followerCount: string;
  engagementRate: string;
  niche: string;
  email: string;
  phone: string;
  website: string;
  agreementType: string;
  commissionPercent: string;
  promoCode: string;
  contractStartDate: string;
  contractEndDate: string;
  notes: string;
};

type ContentFormData = {
  contentType: string;
  platform: string;
  url: string;
  expectedDate: string;
  notes: string;
};

// --- Helpers ---

const EMPTY_INFLUENCER_FORM: InfluencerFormData = {
  name: '',
  handle: '',
  platform: 'instagram',
  followerCount: '',
  engagementRate: '',
  niche: '',
  email: '',
  phone: '',
  website: '',
  agreementType: 'commission',
  commissionPercent: '',
  promoCode: '',
  contractStartDate: '',
  contractEndDate: '',
  notes: '',
};

const EMPTY_CONTENT_FORM: ContentFormData = {
  contentType: 'post',
  platform: 'instagram',
  url: '',
  expectedDate: '',
  notes: '',
};

const STATUS_STYLES: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-100 text-gray-700',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'Twitter',
  podcast: 'Podcast',
  other: 'Other',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  story: 'Story',
  reel: 'Reel',
  video: 'Video',
  podcast_mention: 'Podcast Mention',
  blog: 'Blog',
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatNumber = (n: number | null | undefined) => {
  if (n == null) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

// --- Component ---

export default function InfluencerHubPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Dialogs
  const [formDialog, setFormDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InfluencerFormData>(EMPTY_INFLUENCER_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Expanded row / content
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contentFormOpen, setContentFormOpen] = useState(false);
  const [contentFormData, setContentFormData] = useState<ContentFormData>(EMPTY_CONTENT_FORM);

  // --- Queries ---

  const { data: stats, isLoading: statsLoading } = useQuery<InfluencerStats>({
    queryKey: ['/api/admin/influencers/stats'],
  });

  const { data: influencers, isLoading: influencersLoading } = useQuery<Influencer[]>({
    queryKey: ['/api/admin/influencers'],
  });

  const { data: contentItems, isLoading: contentLoading } = useQuery<ContentItem[]>({
    queryKey: ['/api/admin/influencers', expandedId, 'content'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/influencers/${expandedId}/content`);
      return res.json();
    },
    enabled: !!expandedId,
  });

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (data: InfluencerFormData) => {
      const payload = buildPayload(data);
      const res = await apiRequest('POST', '/api/admin/influencers', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencers'] });
      closeFormDialog();
      toast({ title: 'Influencer added' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add influencer', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InfluencerFormData }) => {
      const payload = buildPayload(data);
      const res = await apiRequest('PATCH', `/api/admin/influencers/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencers'] });
      closeFormDialog();
      toast({ title: 'Influencer updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update influencer', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/influencers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencers'] });
      setDeleteConfirmId(null);
      if (expandedId === deleteConfirmId) setExpandedId(null);
      toast({ title: 'Influencer deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete influencer', description: err.message, variant: 'destructive' });
    },
  });

  const addContentMutation = useMutation({
    mutationFn: async ({ influencerId, data }: { influencerId: string; data: ContentFormData }) => {
      const payload = {
        contentType: data.contentType,
        platform: data.platform,
        url: data.url || null,
        expectedDate: data.expectedDate || null,
        notes: data.notes || null,
      };
      const res = await apiRequest('POST', `/api/admin/influencers/${influencerId}/content`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencers', expandedId, 'content'] });
      setContentFormOpen(false);
      setContentFormData(EMPTY_CONTENT_FORM);
      toast({ title: 'Content item added' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add content', description: err.message, variant: 'destructive' });
    },
  });

  // --- Helpers ---

  function buildPayload(data: InfluencerFormData) {
    return {
      name: data.name,
      handle: data.handle || null,
      platform: data.platform,
      followerCount: data.followerCount ? parseInt(data.followerCount, 10) : null,
      engagementRate: data.engagementRate ? parseFloat(data.engagementRate) : null,
      niche: data.niche || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      agreementType: data.agreementType || null,
      commissionPercent: data.commissionPercent ? parseFloat(data.commissionPercent) : null,
      promoCode: data.promoCode || null,
      contractStartDate: data.contractStartDate || null,
      contractEndDate: data.contractEndDate || null,
      notes: data.notes || null,
    };
  }

  function openCreateDialog() {
    setEditingId(null);
    setFormData(EMPTY_INFLUENCER_FORM);
    setFormDialog(true);
  }

  function openEditDialog(inf: Influencer) {
    setEditingId(inf.id);
    setFormData({
      name: inf.name,
      handle: inf.handle || '',
      platform: inf.platform,
      followerCount: inf.followerCount != null ? String(inf.followerCount) : '',
      engagementRate: inf.engagementRate != null ? String(inf.engagementRate) : '',
      niche: inf.niche || '',
      email: inf.email || '',
      phone: inf.phone || '',
      website: inf.website || '',
      agreementType: inf.agreementType || 'commission',
      commissionPercent: inf.commissionPercent != null ? String(inf.commissionPercent) : '',
      promoCode: inf.promoCode || '',
      contractStartDate: inf.contractStartDate || '',
      contractEndDate: inf.contractEndDate || '',
      notes: inf.notes || '',
    });
    setFormDialog(true);
  }

  function closeFormDialog() {
    setFormDialog(false);
    setEditingId(null);
    setFormData(EMPTY_INFLUENCER_FORM);
  }

  function handleFormSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function toggleRow(id: string) {
    setExpandedId(expandedId === id ? null : id);
    setContentFormOpen(false);
    setContentFormData(EMPTY_CONTENT_FORM);
  }

  const updateField = (field: keyof InfluencerFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const updateContentField = (field: keyof ContentFormData, value: string) =>
    setContentFormData((prev) => ({ ...prev, [field]: value }));

  // Filter influencers
  const filtered = (influencers || []).filter((inf) => {
    if (statusFilter !== 'all' && inf.status !== statusFilter) return false;
    if (platformFilter !== 'all' && inf.platform !== platformFilter) return false;
    return true;
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // --- Loading state ---

  if (statsLoading || influencersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Star className="h-5 w-5" style={{ color: '#054700' }} /> Influencer Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage influencer partnerships, track content, and monitor performance.
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog} style={{ backgroundColor: '#054700' }} className="hover:opacity-90 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Influencer
        </Button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Total Influencers
            </p>
            <p className="text-2xl font-semibold mt-1">{stats?.totalInfluencers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Active
            </p>
            <p className="text-2xl font-semibold mt-1">{stats?.activeInfluencers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Total Signups
            </p>
            <p className="text-2xl font-semibold mt-1">{stats?.totalSignups ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Total Revenue
            </p>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(stats?.totalRevenueCents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Avg Commission
            </p>
            <p className="text-2xl font-semibold mt-1">{stats?.avgCommission ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Influencer Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-base">Influencers</CardTitle>
              <CardDescription>
                {filtered.length} influencer{filtered.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' || platformFilter !== 'all' ? ' (filtered)' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Eng. Rate</TableHead>
                <TableHead>Promo Code</TableHead>
                <TableHead className="text-right">Signups</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Commission Owed</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    {influencers && influencers.length > 0
                      ? 'No influencers match the current filters.'
                      : 'No influencers yet. Add your first influencer to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inf) => (
                  <>
                    <TableRow
                      key={inf.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleRow(inf.id)}
                    >
                      <TableCell className="pr-0">
                        {expandedId === inf.id ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{inf.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {inf.handle ? `@${inf.handle}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{PLATFORM_LABELS[inf.platform] || inf.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[inf.status] || 'bg-gray-100 text-gray-700'}>
                          {inf.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(inf.followerCount)}</TableCell>
                      <TableCell className="text-right">
                        {inf.engagementRate != null ? `${inf.engagementRate}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {inf.promoCode ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{inf.promoCode}</code>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">{inf.signups}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inf.revenueCents)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inf.commissionOwedCents)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(inf)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(inf.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Content Tracking */}
                    {expandedId === inf.id && (
                      <TableRow key={`${inf.id}-content`}>
                        <TableCell colSpan={12} className="bg-gray-50 p-0">
                          <div className="p-6 space-y-4">
                            {/* Influencer details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {inf.email && (
                                <div>
                                  <span className="text-gray-500">Email:</span>{' '}
                                  <span className="font-medium">{inf.email}</span>
                                </div>
                              )}
                              {inf.phone && (
                                <div>
                                  <span className="text-gray-500">Phone:</span>{' '}
                                  <span className="font-medium">{inf.phone}</span>
                                </div>
                              )}
                              {inf.niche && (
                                <div>
                                  <span className="text-gray-500">Niche:</span>{' '}
                                  <span className="font-medium">{inf.niche}</span>
                                </div>
                              )}
                              {inf.agreementType && (
                                <div>
                                  <span className="text-gray-500">Agreement:</span>{' '}
                                  <Badge variant="outline" className="ml-1">{inf.agreementType}</Badge>
                                </div>
                              )}
                              {inf.commissionPercent != null && (
                                <div>
                                  <span className="text-gray-500">Commission:</span>{' '}
                                  <span className="font-medium">{inf.commissionPercent}%</span>
                                </div>
                              )}
                              {inf.contractStartDate && (
                                <div>
                                  <span className="text-gray-500">Start:</span>{' '}
                                  <span className="font-medium">{inf.contractStartDate}</span>
                                </div>
                              )}
                              {inf.contractEndDate && (
                                <div>
                                  <span className="text-gray-500">End:</span>{' '}
                                  <span className="font-medium">{inf.contractEndDate}</span>
                                </div>
                              )}
                              {inf.website && (
                                <div>
                                  <span className="text-gray-500">Website:</span>{' '}
                                  <a
                                    href={inf.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium underline inline-flex items-center gap-1"
                                    style={{ color: '#054700' }}
                                  >
                                    Link <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                            {inf.notes && (
                              <p className="text-sm text-gray-600 italic">Notes: {inf.notes}</p>
                            )}

                            {/* Content Tracking */}
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">Content Tracking</h3>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setContentFormData(EMPTY_CONTENT_FORM);
                                    setContentFormOpen(true);
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Content
                                </Button>
                              </div>

                              {contentFormOpen && (
                                <div className="border rounded-lg p-4 mb-4 bg-white space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                      <Label className="text-xs">Content Type</Label>
                                      <Select
                                        value={contentFormData.contentType}
                                        onValueChange={(v) => updateContentField('contentType', v)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="post">Post</SelectItem>
                                          <SelectItem value="story">Story</SelectItem>
                                          <SelectItem value="reel">Reel</SelectItem>
                                          <SelectItem value="video">Video</SelectItem>
                                          <SelectItem value="podcast_mention">Podcast Mention</SelectItem>
                                          <SelectItem value="blog">Blog</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Platform</Label>
                                      <Select
                                        value={contentFormData.platform}
                                        onValueChange={(v) => updateContentField('platform', v)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="instagram">Instagram</SelectItem>
                                          <SelectItem value="tiktok">TikTok</SelectItem>
                                          <SelectItem value="youtube">YouTube</SelectItem>
                                          <SelectItem value="twitter">Twitter</SelectItem>
                                          <SelectItem value="podcast">Podcast</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Expected Date</Label>
                                      <Input
                                        type="date"
                                        value={contentFormData.expectedDate}
                                        onChange={(e) => updateContentField('expectedDate', e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-xs">URL</Label>
                                      <Input
                                        value={contentFormData.url}
                                        onChange={(e) => updateContentField('url', e.target.value)}
                                        placeholder="https://..."
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Notes</Label>
                                      <Input
                                        value={contentFormData.notes}
                                        onChange={(e) => updateContentField('notes', e.target.value)}
                                        placeholder="Optional notes"
                                        className="mt-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setContentFormOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        addContentMutation.mutate({
                                          influencerId: inf.id,
                                          data: contentFormData,
                                        })
                                      }
                                      disabled={addContentMutation.isPending}
                                      style={{ backgroundColor: '#054700' }}
                                      className="text-white hover:opacity-90"
                                    >
                                      {addContentMutation.isPending ? 'Saving...' : 'Save Content'}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {contentLoading ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-8 w-full" />
                                  <Skeleton className="h-8 w-full" />
                                </div>
                              ) : !contentItems || contentItems.length === 0 ? (
                                <p className="text-sm text-gray-500 py-4 text-center">
                                  No content items tracked yet.
                                </p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Platform</TableHead>
                                      <TableHead>URL</TableHead>
                                      <TableHead>Expected Date</TableHead>
                                      <TableHead>Published</TableHead>
                                      <TableHead>Notes</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {contentItems.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          <Badge variant="outline">
                                            {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {PLATFORM_LABELS[item.platform] || item.platform}
                                        </TableCell>
                                        <TableCell>
                                          {item.url ? (
                                            <a
                                              href={item.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm underline inline-flex items-center gap-1"
                                              style={{ color: '#054700' }}
                                            >
                                              View <ExternalLink className="h-3 w-3" />
                                            </a>
                                          ) : (
                                            '-'
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {item.expectedDate || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {item.publishedDate || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                          {item.notes || '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Influencer Dialog */}
      <Dialog open={formDialog} onOpenChange={(open) => { if (!open) closeFormDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Influencer' : 'Add Influencer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Handle</Label>
                <Input
                  value={formData.handle}
                  onChange={(e) => updateField('handle', e.target.value)}
                  placeholder="@username"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform</Label>
                <Select value={formData.platform} onValueChange={(v) => updateField('platform', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niche</Label>
                <Input
                  value={formData.niche}
                  onChange={(e) => updateField('niche', e.target.value)}
                  placeholder="e.g. fitness, wellness"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Follower Count</Label>
                <Input
                  type="number"
                  value={formData.followerCount}
                  onChange={(e) => updateField('followerCount', e.target.value)}
                  placeholder="e.g. 50000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Engagement Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.engagementRate}
                  onChange={(e) => updateField('engagementRate', e.target.value)}
                  placeholder="e.g. 3.5"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contact@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 555-0123"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Agreement Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agreement Type</Label>
                  <Select
                    value={formData.agreementType}
                    onValueChange={(v) => updateField('agreementType', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat_fee">Flat Fee</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="gifting">Gifting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commission %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.commissionPercent}
                    onChange={(e) => updateField('commissionPercent', e.target.value)}
                    placeholder="e.g. 15"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Promo Code</Label>
              <Input
                value={formData.promoCode}
                onChange={(e) => updateField('promoCode', e.target.value)}
                placeholder="e.g. INFLUENCER20"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Start Date</Label>
                <Input
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => updateField('contractStartDate', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contract End Date</Label>
                <Input
                  type="date"
                  value={formData.contractEndDate}
                  onChange={(e) => updateField('contractEndDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Internal notes..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFormDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={!formData.name || isMutating}
              style={{ backgroundColor: '#054700' }}
              className="text-white hover:opacity-90"
            >
              {isMutating
                ? editingId
                  ? 'Saving...'
                  : 'Adding...'
                : editingId
                  ? 'Save Changes'
                  : 'Add Influencer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Influencer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            Are you sure you want to delete this influencer? This action cannot be undone and will remove all associated content tracking data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
