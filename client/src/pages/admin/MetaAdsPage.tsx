import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Upload,
  Sparkles,
  Send,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plug,
  AlertCircle,
  Rocket,
  Eye,
  Pencil,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdCopyVariant {
  primaryText: string;
  headline: string;
  description: string;
}

interface AdDraft {
  id: string;
  mimeType: string;
  variants: AdCopyVariant[];
  selectedVariant: number;
  status: 'draft' | 'ready' | 'published' | 'error';
  metaResult?: {
    campaignId: string;
    adSetId: string;
    adCreativeId: string;
    adId: string;
  };
  errorMessage?: string;
  createdAt: string;
}

interface MetaConnection {
  connected: boolean;
  userName?: string;
  adAccounts?: Array<{ id: string; name: string; accountId: string }>;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MetaAdsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- State ---
  const [dragActive, setDragActive] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [uploadMimeType, setUploadMimeType] = useState<string>('');
  const [brandContext, setBrandContext] = useState('');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<AdDraft | null>(null);
  const [editingVariant, setEditingVariant] = useState<{
    draftId: string;
    index: number;
    variant: AdCopyVariant;
  } | null>(null);

  // Campaign config state
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('OUTCOME_TRAFFIC');
  const [dailyBudget, setDailyBudget] = useState('20');
  const [targetUrl, setTargetUrl] = useState('https://ones.health');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  const [pageId, setPageId] = useState('');
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [ageMin, setAgeMin] = useState('25');
  const [ageMax, setAgeMax] = useState('55');
  const [countries, setCountries] = useState('US');

  // --- Queries ---
  const connectionQuery = useQuery<MetaConnection>({
    queryKey: ['/api/admin/meta-ads/connection'],
    staleTime: 60_000,
  });

  const draftsQuery = useQuery<AdDraft[]>({
    queryKey: ['/api/admin/meta-ads/drafts'],
    refetchInterval: 10_000,
  });

  // --- Mutations ---
  const generateMutation = useMutation({
    mutationFn: async (data: { imageBase64: string; mimeType: string; brandContext?: string }) => {
      const res = await apiRequest('POST', '/api/admin/meta-ads/generate-copy', data);
      return await res.json() as { draftId: string; variants: AdCopyVariant[] };
    },
    onSuccess: (data: { draftId: string; variants: AdCopyVariant[] }) => {
      toast({ title: 'Ad copy generated!', description: `${data.variants.length} variants created` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meta-ads/drafts'] });
      setUploadPreview(null);
      setUploadBase64(null);
      setUploadMimeType('');
    },
    onError: (err: Error) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; variants?: AdCopyVariant[]; selectedVariant?: number }) =>
      apiRequest('PATCH', `/api/admin/meta-ads/drafts/${id}`, data),
    onSuccess: () => {
      toast({ title: 'Draft updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meta-ads/drafts'] });
      setEditingVariant(null);
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('DELETE', `/api/admin/meta-ads/drafts/${id}`),
    onSuccess: () => {
      toast({ title: 'Draft deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meta-ads/drafts'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: {
      draftId: string;
      adAccountId: string;
      campaignConfig: Record<string, unknown>;
    }) => {
      const res = await apiRequest('POST', '/api/admin/meta-ads/publish', data);
      return await res.json() as { campaignId: string; message: string };
    },
    onSuccess: (data: { campaignId: string; message: string }) => {
      toast({ title: 'Campaign published!', description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meta-ads/drafts'] });
      setPublishDialogOpen(false);
      setSelectedDraft(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
    },
  });

  // --- File handling ---
  const handleFile = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload JPEG, PNG, WebP, or GIF', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadPreview(result);
      setUploadBase64(result.split(',')[1]);
      setUploadMimeType(file.type);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePublish = () => {
    if (!selectedDraft || !selectedAdAccount) return;

    publishMutation.mutate({
      draftId: selectedDraft.id,
      adAccountId: selectedAdAccount,
      campaignConfig: {
        name: campaignName || `ONES Ad - ${new Date().toLocaleDateString()}`,
        objective: campaignObjective,
        dailyBudgetCents: Math.round(parseFloat(dailyBudget) * 100),
        targetUrl,
        callToAction,
        pageId,
        targeting: {
          ageMin: parseInt(ageMin),
          ageMax: parseInt(ageMax),
          genders: [0],
          countries: countries.split(',').map((c) => c.trim().toUpperCase()),
        },
      },
    });
  };

  const connection = connectionQuery.data;
  const drafts = draftsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meta Ads Bot</h1>
        <p className="text-muted-foreground">
          Upload creatives, generate AI ad copy, and publish campaigns to Meta
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Meta Connection
            </CardTitle>
            {connectionQuery.isLoading ? (
              <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Checking...</Badge>
            ) : connection?.connected ? (
              <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Connected as {connection.userName}</Badge>
            ) : (
              <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        {!connection?.connected && !connectionQuery.isLoading && (
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Setup required</p>
                <p className="mt-1">Add these to your server environment:</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  <li><code className="text-xs bg-amber-100 px-1 rounded">META_ACCESS_TOKEN</code> — Long-lived user access token</li>
                  <li><code className="text-xs bg-amber-100 px-1 rounded">META_APP_ID</code> — Meta App ID</li>
                </ul>
                <p className="mt-2">
                  <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
                    className="text-amber-700 underline inline-flex items-center gap-1">
                    Get token from Graph API Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        )}
        {connection?.adAccounts && connection.adAccounts.length > 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Available Ad Accounts:</p>
            <div className="flex flex-wrap gap-2">
              {connection.adAccounts.map((acc) => (
                <Badge key={acc.id} variant="outline">{acc.name} ({acc.accountId})</Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upload Creative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Creative
          </CardTitle>
          <CardDescription>
            Drop in your ad creative image and AI will generate primary text, headlines, and descriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('creative-upload')?.click()}
          >
            {uploadPreview ? (
              <div className="space-y-3">
                <img
                  src={uploadPreview}
                  alt="Creative preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadPreview(null);
                    setUploadBase64(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">Drop your creative image here</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF • Max 10MB</p>
              </div>
            )}
            <input
              id="creative-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Optional brand context */}
          <div>
            <Label htmlFor="brandContext" className="text-sm">Brand context (optional)</Label>
            <Textarea
              id="brandContext"
              placeholder="e.g., 'Summer promotion for energy boosters, target audience is busy professionals'"
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Generate button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!uploadBase64 || generateMutation.isPending}
            onClick={() => {
              if (uploadBase64 && uploadMimeType) {
                generateMutation.mutate({
                  imageBase64: uploadBase64,
                  mimeType: uploadMimeType,
                  brandContext: brandContext || undefined,
                });
              }
            }}
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating ad copy...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Ad Copy</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Drafts List */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ad Drafts</h2>
          {drafts.map((draft) => (
            <Card key={draft.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {draft.id.split('_').slice(0, 2).join('_')}
                    </CardTitle>
                    <StatusBadge status={draft.status} />
                  </div>
                  <div className="flex items-center gap-1">
                    {draft.status !== 'published' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDraft(draft);
                            setCampaignName(`ONES Ad - ${new Date().toLocaleDateString()}`);
                            setPublishDialogOpen(true);
                          }}
                          disabled={!connection?.connected}
                        >
                          <Rocket className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDraftMutation.mutate(draft.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {draft.status === 'published' && draft.metaResult && (
                      <a
                        href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${draft.metaResult.campaignId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> View in Meta
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {draft.variants.map((variant, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        i === draft.selectedVariant
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => {
                        updateDraftMutation.mutate({ id: draft.id, selectedVariant: i });
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={i === draft.selectedVariant ? 'default' : 'outline'} className="text-xs">
                              Variant {i + 1}
                            </Badge>
                            {i === draft.selectedVariant && (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-sm font-medium mt-2">{variant.headline}</p>
                          <p className="text-sm text-muted-foreground">{variant.primaryText}</p>
                          <p className="text-xs text-muted-foreground/70">{variant.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVariant({ draftId: draft.id, index: i, variant: { ...variant } });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {draft.errorMessage && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {draft.errorMessage}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Created {new Date(draft.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Variant Dialog */}
      <Dialog open={!!editingVariant} onOpenChange={(open) => !open && setEditingVariant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ad Copy — Variant {editingVariant ? editingVariant.index + 1 : ''}</DialogTitle>
            <DialogDescription>Adjust the AI-generated copy before publishing</DialogDescription>
          </DialogHeader>
          {editingVariant && (
            <div className="space-y-4">
              <div>
                <Label>Headline (max 40 chars)</Label>
                <Input
                  value={editingVariant.variant.headline}
                  maxLength={40}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      variant: { ...editingVariant.variant, headline: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Primary Text (max 125 chars)</Label>
                <Textarea
                  value={editingVariant.variant.primaryText}
                  maxLength={125}
                  rows={3}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      variant: { ...editingVariant.variant, primaryText: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Description (max 30 chars)</Label>
                <Input
                  value={editingVariant.variant.description}
                  maxLength={30}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      variant: { ...editingVariant.variant, description: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVariant(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editingVariant) return;
                // Get current draft variants, update the one we edited
                const draft = drafts.find((d) => d.id === editingVariant.draftId);
                if (!draft) return;
                const newVariants = [...draft.variants];
                newVariants[editingVariant.index] = editingVariant.variant;
                updateDraftMutation.mutate({ id: editingVariant.draftId, variants: newVariants });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Campaign Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish to Meta Ads</DialogTitle>
            <DialogDescription>Configure campaign settings before publishing</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Selected copy preview */}
            {selectedDraft && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Selected Ad Copy</p>
                <p className="text-sm font-semibold">{selectedDraft.variants[selectedDraft.selectedVariant]?.headline}</p>
                <p className="text-sm">{selectedDraft.variants[selectedDraft.selectedVariant]?.primaryText}</p>
              </div>
            )}

            <div>
              <Label>Campaign Name</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My ONES Campaign" />
            </div>

            <div>
              <Label>Ad Account</Label>
              <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ad account" />
                </SelectTrigger>
                <SelectContent>
                  {connection?.adAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.accountId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Campaign Objective</Label>
              <Select value={campaignObjective} onValueChange={setCampaignObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                  <SelectItem value="OUTCOME_AWARENESS">Awareness</SelectItem>
                  <SelectItem value="OUTCOME_ENGAGEMENT">Engagement</SelectItem>
                  <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                  <SelectItem value="OUTCOME_SALES">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Daily Budget ($)</Label>
              <Input type="number" min="1" step="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} />
            </div>

            <div>
              <Label>Landing Page URL</Label>
              <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://ones.health" />
            </div>

            <div>
              <Label>Facebook Page ID</Label>
              <Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Your Facebook Page ID" />
            </div>

            <div>
              <Label>Call to Action</Label>
              <Select value={callToAction} onValueChange={setCallToAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                  <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
                  <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                  <SelectItem value="GET_OFFER">Get Offer</SelectItem>
                  <SelectItem value="ORDER_NOW">Order Now</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Age</Label>
                <Input type="number" min="18" max="65" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
              </div>
              <div>
                <Label>Max Age</Label>
                <Input type="number" min="18" max="65" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Target Countries (comma-separated)</Label>
              <Input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="US, CA, GB" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending || !selectedAdAccount || !pageId}
            >
              {publishMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Publish Campaign</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="text-xs">Draft</Badge>;
    case 'ready':
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Ready</Badge>;
    case 'published':
      return <Badge className="bg-green-100 text-green-800 text-xs">Published</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
