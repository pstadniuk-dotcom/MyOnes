import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Trash2,
  Star,
  Search,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Eye,
  Edit,
  Play,
  Video,
  Image,
  FileText,
  Users,
  Zap,
  BarChart3,
  Lightbulb,
  Target,
  BookOpen,
  Upload,
  ExternalLink,
  Maximize2,
  Copy,
  Film,
  Camera,
  Anchor,
  Shield,
  Volume2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  productName: string;
  productDescription: string | null;
  productUrls: string[] | null;
  productBenefits: string[] | null;
  targetAudience: string | null;
  adGoal: string | null;
  notes: string | null;
  status: string;
  assembledVideoUrl: string | null;
  assembledAt: string | null;
  createdAt: string;
  updatedAt: string;
  _counts?: {
    research: number;
    hooks: number;
    scripts: number;
    characters: number;
    images: number;
    videos: number;
  };
}

interface DurationPreview {
  sceneNumber: number;
  batchNumber: number;
  dialogue: string | null;
  videoDuration: number;
  estimatedTTSDuration: number;
  fits: boolean;
  suggestedSpeed: number;
  wordCount?: number;
}

interface DurationPreviewResponse {
  scenes: DurationPreview[];
  totalScenes: number;
  issueCount: number;
  issues: string[];
}

interface Research {
  id: string;
  campaignId: string;
  researchType: 'product_analysis' | 'market_research';
  status: 'generating' | 'complete' | 'failed';
  errorMessage?: string | null;
  title: string;
  content: Record<string, any>;
  createdAt: string;
}

interface Hook {
  id: string;
  campaignId: string;
  hookText: string;
  style: string;
  speakingTone: string | null;
  structureNotes: string | null;
  source: string | null;
  isFavorite: boolean;
  createdAt: string;
}

interface Script {
  id: string;
  campaignId: string;
  title: string | null;
  scriptType: string;
  status: string;
  scenes: ScriptScene[];
  rationale: string | null;
  toneNotes: string | null;
  totalDurationSeconds: number | null;
  createdAt: string;
}

interface ScriptScene {
  sceneNumber: number;
  visualDescription: string;
  dialogue: string;
  durationSeconds: number;
  cameraAngle: string;
  action: string;
}

interface Character {
  id: string;
  campaignId: string;
  name: string;
  demographics: string | null;
  styleDescription: string | null;
  settingDescription: string | null;
  personalityNotes: string | null;
  referenceImageUrl: string | null;
  referenceImageId: string | null;
  status: string;
  images: CharacterImage[];
  createdAt: string;
}

interface CharacterImage {
  id: string;
  characterId: string;
  imageType: string;
  imageUrl: string;
  status: string;
  revisionNotes: string | null;
  promptUsed: string | null;
  createdAt: string;
}

interface VideoScene {
  id: string;
  campaignId: string;
  scriptId: string;
  characterId: string;
  sceneNumber: number;
  shotType: string | null;
  prompt: string;
  dialogue: string | null;
  cameraMotion: string | null;
  cameraMotionScale: number | null;
  durationSeconds: number;
  startFrameImageId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  mergedVideoUrl: string | null;
  voiceId: string | null;
  status: string;
  negativePrompt: string | null;
  generationParams: Record<string, any> | null;
  batchNumber: number;
  createdAt: string;
}

interface BrandAsset {
  id: string;
  campaignId: string;
  name: string;
  url: string;
  assetType: string;
  description: string | null;
  tags: string[] | null;
  createdAt: string;
}

interface CampaignDetail extends Campaign {
  research: Research[];
  hooks: Hook[];
  scripts: Script[];
  characters: Character[];
  images: CharacterImage[];
  videos: VideoScene[];
  assets: BrandAsset[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOOK_STYLES = [
  'curiosity', 'problem_solution', 'storytelling', 'shock', 'social_proof',
  'authority', 'urgency', 'benefit_led', 'question', 'contrarian',
];

const IMAGE_TYPES = [
  { value: 'front_view', label: 'Front View' },
  { value: 'side_view', label: 'Side View' },
  { value: 'usage_view', label: 'Usage View' },
  { value: 'product_closeup', label: 'Product Closeup' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

const UGC_IMAGE_MODEL_OPTIONS = [
  { value: '__default', label: 'Auto (FLUX/dev)', description: 'Default with PuLID face-consistency' },
  { value: 'fal-ai/flux-pro/v1.1', label: 'FLUX Pro 1.1', description: 'Premium quality' },
  { value: 'fal-ai/seedream-3', label: 'Seedream 3', description: 'Stylized editorial' },
  { value: 'fal-ai/gpt-image-1', label: 'GPT Image 1', description: 'Strong photorealism' },
];

const UGC_VIDEO_MODEL_OPTIONS = [
  { value: '__default', label: 'Kling 2.1 Master', description: 'Current default, reliable' },
  { value: 'fal-ai/seedance/video', label: 'Seed Dance 2.0', description: 'Best human motion & expressions' },
  { value: 'fal-ai/kling-video/v3/pro/image-to-video', label: 'Kling 3.0 Pro', description: 'Cinematic quality, native audio' },
  { value: 'fal-ai/wan/v2.1/image-to-video', label: 'WAN 2.1', description: 'Smooth motion, great fidelity' },
  { value: 'fal-ai/minimax-video/image-to-video', label: 'MiniMax Hailuo', description: 'High quality, smooth motion' },
];

const PIPELINE_STAGES = ['Research', 'Hooks', 'Scripts', 'Characters', 'Video', 'Complete'];

function getPipelineStage(counts?: Campaign['_counts']): number {
  if (!counts) return 0;
  if (counts.videos > 0) return 5;
  if (counts.images > 0) return 4;
  if (counts.scripts > 0) return 3;
  if (counts.hooks > 0) return 2;
  if (counts.research > 0) return 1;
  return 0;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UgcStudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ── Campaign list ──
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/admin/ugc/campaigns'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/ugc/campaigns');
      return res.json();
    },
  });

  // ── Selected campaign detail ──
  const { data: campaign, isLoading: campaignLoading } = useQuery<CampaignDetail>({
    queryKey: ['/api/admin/ugc/campaigns', selectedCampaignId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ugc/campaigns/${selectedCampaignId}`);
      return res.json();
    },
    enabled: !!selectedCampaignId,
  });

  const invalidateCampaign = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/ugc/campaigns'] });
    if (selectedCampaignId) {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ugc/campaigns', selectedCampaignId] });
    }
  }, [queryClient, selectedCampaignId]);

  // ── Delete campaign ──
  const deleteCampaignMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/ugc/campaigns/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Campaign deleted' });
      setSelectedCampaignId(null);
      invalidateCampaign();
    },
    onError: () => toast({ title: 'Failed to delete campaign', variant: 'destructive' }),
  });

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UGC Ad Studio</h1>
          <p className="text-sm text-gray-500 mt-1">Create AI-powered UGC video ads</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCampaignId && (
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => { setSelectedCampaignId(null); setActiveTab('overview'); }}>
              ← All Campaigns
            </Button>
          )}
          <CampaignSelector
            campaigns={campaigns}
            selectedId={selectedCampaignId}
            onSelect={(id) => { setSelectedCampaignId(id); setActiveTab('overview'); }}
            onInvalidate={invalidateCampaign}
          />
        </div>
      </div>

      {/* No campaign selected → list view */}
      {!selectedCampaignId && (
        <CampaignListView
          campaigns={campaigns}
          loading={campaignsLoading}
          onSelect={(id) => { setSelectedCampaignId(id); setActiveTab('overview'); }}
          onDelete={(id) => {
            if (window.confirm('Are you sure you want to delete this campaign? It will be archived and can be recovered.')) {
              deleteCampaignMut.mutate(id);
            }
          }}
        />
      )}

      {/* Campaign selected → tabbed workflow */}
      {selectedCampaignId && campaign && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-100 border border-gray-200 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Overview</TabsTrigger>
            <TabsTrigger value="research" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Research</TabsTrigger>
            <TabsTrigger value="hooks" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Hooks</TabsTrigger>
            <TabsTrigger value="scripts" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Scripts</TabsTrigger>
            <TabsTrigger value="characters" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Characters</TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Video</TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-[#054700]/10 data-[state=active]:text-[#054700]">Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="research"><ResearchTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="hooks"><HooksTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="scripts"><ScriptsTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="characters"><CharactersTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="video"><VideoTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
          <TabsContent value="assets"><AssetsTab campaign={campaign} onInvalidate={invalidateCampaign} /></TabsContent>
        </Tabs>
      )}

      {selectedCampaignId && campaignLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#054700]" />
        </div>
      )}
    </div>
  );
}

// ─── Campaign Selector ────────────────────────────────────────────────────────

function CampaignSelector({
  campaigns, selectedId, onSelect, onInvalidate,
}: {
  campaigns: Campaign[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', adGoal: 'awareness', notes: '' });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/campaigns', form);
      return res.json();
    },
    onSuccess: (data: Campaign) => {
      toast({ title: 'Campaign created' });
      setShowCreate(false);
      setForm({ name: '', adGoal: 'awareness', notes: '' });
      onInvalidate();
      onSelect(data.id);
    },
    onError: () => toast({ title: 'Failed to create campaign', variant: 'destructive' }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-gray-200 bg-white text-gray-900 gap-2">
            {selectedId ? campaigns.find(c => c.id === selectedId)?.name || 'Campaign' : 'Select Campaign'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-white border-gray-200">
          {campaigns.map(c => (
            <DropdownMenuItem key={c.id} onClick={() => onSelect(c.id)} className="text-gray-700 focus:bg-emerald-50">
              {c.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setShowCreate(true)} className="text-[#054700] focus:bg-emerald-50">
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription className="text-gray-500">ONES product data is auto-filled. Just name your campaign and set a goal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Auto-filled ONES context card */}
            <Card className="bg-[#054700]/5 border-[#054700]/20">
              <CardContent className="p-3 text-xs text-[#054700]/70">
                <p className="font-medium text-[#054700] mb-1">ONES Custom Supplement — auto-configured</p>
                <p>AI-personalized formula with 51 ingredients, blood work analysis, wearable integration. Product info, audience, and benefits are baked in.</p>
              </CardContent>
            </Card>
            <div>
              <Label className="text-gray-600">Campaign Name *</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Summer Launch 2025" />
            </div>
            <div>
              <Label className="text-gray-600">Ad Goal</Label>
              <Select value={form.adGoal} onValueChange={v => setForm(p => ({ ...p, adGoal: v }))}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {[
                    { value: 'awareness', label: 'Brand Awareness' },
                    { value: 'conversions', label: 'Drive Conversions' },
                    { value: 'subscriptions', label: 'Drive Subscriptions' },
                    { value: 'retargeting', label: 'Retargeting' },
                    { value: 'education', label: 'Education / Explainer' },
                  ].map(g => (
                    <SelectItem key={g.value} value={g.value} className="text-gray-700">{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600">Notes (optional)</Label>
              <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any specific direction for this campaign..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-500">Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending} className="bg-[#054700] hover:bg-[#043d00] text-white">
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Campaign List View ───────────────────────────────────────────────────────

function CampaignListView({
  campaigns, loading, onSelect, onDelete,
}: {
  campaigns: Campaign[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-white border-gray-200 animate-pulse">
            <CardContent className="p-6 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Video className="h-12 w-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No campaigns yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first UGC ad campaign to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {campaigns.map(c => {
        const stage = getPipelineStage(c._counts);
        return (
          <Card key={c.id} className="bg-white border-gray-200 hover:border-gray-200 transition-colors cursor-pointer group" onClick={() => onSelect(c.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-gray-900 text-lg group-hover:text-[#054700] transition-colors">{c.name}</CardTitle>
                  <CardDescription className="text-gray-500">{c.productName}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-red-500" onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Pipeline */}
              <div className="flex gap-1">
                {PIPELINE_STAGES.map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stage ? 'bg-[#054700]' : 'bg-gray-200'}`} title={s} />
                ))}
              </div>
              <p className="text-xs text-gray-500">{PIPELINE_STAGES[stage]} stage</p>

              {/* Counts */}
              {c._counts && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {c._counts.research > 0 && <Badge variant="secondary" className="bg-gray-200 text-gray-600">{c._counts.research} research</Badge>}
                  {c._counts.hooks > 0 && <Badge variant="secondary" className="bg-gray-200 text-gray-600">{c._counts.hooks} hooks</Badge>}
                  {c._counts.scripts > 0 && <Badge variant="secondary" className="bg-gray-200 text-gray-600">{c._counts.scripts} scripts</Badge>}
                  {c._counts.characters > 0 && <Badge variant="secondary" className="bg-gray-200 text-gray-600">{c._counts.characters} characters</Badge>}
                  {c._counts.videos > 0 && <Badge variant="secondary" className="bg-gray-200 text-gray-600">{c._counts.videos} videos</Badge>}
                </div>
              )}

              <p className="text-xs text-gray-600">{formatDate(c.createdAt)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: campaign.name,
    productName: campaign.productName,
    productDescription: campaign.productDescription || '',
    targetAudience: campaign.targetAudience || '',
    adGoal: campaign.adGoal || '',
    notes: campaign.notes || '',
    productBenefits: campaign.productBenefits?.join(', ') || '',
    productUrls: campaign.productUrls?.join(', ') || '',
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/admin/ugc/campaigns/${campaign.id}`, {
        ...form,
        productBenefits: form.productBenefits ? form.productBenefits.split(',').map(s => s.trim()).filter(Boolean) : [],
        productUrls: form.productUrls ? form.productUrls.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
    },
    onSuccess: () => {
      toast({ title: 'Campaign updated' });
      setEditing(false);
      onInvalidate();
    },
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
  });

  const stage = getPipelineStage(campaign._counts);
  const approvedImages = campaign.images?.filter(i => i.status === 'approved').length || 0;

  return (
    <div className="space-y-6">
      {/* Pipeline progress */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            {PIPELINE_STAGES.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-2 w-full rounded-full ${i <= stage ? 'bg-[#054700]' : 'bg-gray-200'}`} />
                <span className={`text-xs ${i <= stage ? 'text-[#054700]' : 'text-gray-600'}`}>{s}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Research', value: campaign.research?.length || 0, icon: BookOpen, color: 'text-blue-600' },
          { label: 'Hooks', value: campaign.hooks?.length || 0, icon: Lightbulb, color: 'text-amber-500' },
          { label: 'Scripts', value: campaign.scripts?.length || 0, icon: FileText, color: 'text-purple-600' },
          { label: 'Characters', value: campaign.characters?.length || 0, icon: Users, color: 'text-pink-400' },
          { label: 'Approved Imgs', value: approvedImages, icon: Image, color: 'text-[#054700]' },
          { label: 'Video Scenes', value: campaign.videos?.length || 0, icon: Film, color: 'text-orange-600' },
        ].map(stat => (
          <Card key={stat.label} className="bg-white border-gray-200">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <QuickActionButton campaignId={campaign.id} action="product_analysis" label="Run Product Research" icon={<BarChart3 className="h-4 w-4" />} onInvalidate={onInvalidate} />
          <QuickActionButton campaignId={campaign.id} action="market_research" label="Run Market Research" icon={<Target className="h-4 w-4" />} onInvalidate={onInvalidate} />
        </CardContent>
      </Card>

      {/* Campaign details */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900 text-base">Campaign Details</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
                {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-gray-500 text-xs">Name</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label className="text-gray-500 text-xs">Product</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} /></div>
                <div><Label className="text-gray-500 text-xs">Target Audience</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} /></div>
                <div><Label className="text-gray-500 text-xs">Ad Goal</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.adGoal} onChange={e => setForm(p => ({ ...p, adGoal: e.target.value }))} /></div>
              </div>
              <div><Label className="text-gray-500 text-xs">Description</Label><Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={3} value={form.productDescription} onChange={e => setForm(p => ({ ...p, productDescription: e.target.value }))} /></div>
              <div><Label className="text-gray-500 text-xs">Benefits (comma-separated)</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.productBenefits} onChange={e => setForm(p => ({ ...p, productBenefits: e.target.value }))} /></div>
              <div><Label className="text-gray-500 text-xs">Product URLs (comma-separated)</Label><Input className="bg-white border-gray-200 text-gray-900 mt-1" value={form.productUrls} onChange={e => setForm(p => ({ ...p, productUrls: e.target.value }))} /></div>
              <div><Label className="text-gray-500 text-xs">Notes</Label><Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="text-gray-700 ml-2">{campaign.name}</span></div>
              <div><span className="text-gray-500">Product:</span> <span className="text-gray-700 ml-2">{campaign.productName}</span></div>
              <div><span className="text-gray-500">Audience:</span> <span className="text-gray-700 ml-2">{campaign.targetAudience || '—'}</span></div>
              <div><span className="text-gray-500">Goal:</span> <span className="text-gray-700 ml-2">{campaign.adGoal || '—'}</span></div>
              {campaign.productDescription && (
                <div className="md:col-span-2"><span className="text-gray-500">Description:</span> <span className="text-gray-700 ml-2">{campaign.productDescription}</span></div>
              )}
              {campaign.productBenefits && campaign.productBenefits.length > 0 && (
                <div className="md:col-span-2 flex flex-wrap gap-1.5">
                  <span className="text-gray-500 mr-1">Benefits:</span>
                  {campaign.productBenefits.map((b, i) => <Badge key={i} variant="secondary" className="bg-emerald-50 text-[#054700] text-xs">{b}</Badge>)}
                </div>
              )}
              {campaign.notes && (
                <div className="md:col-span-2"><span className="text-gray-500">Notes:</span> <span className="text-gray-600 ml-2">{campaign.notes}</span></div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionButton({ campaignId, action, label, icon, onInvalidate }: {
  campaignId: string; action: string; label: string; icon: React.ReactNode; onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/research/generate', { campaignId, researchType: action });
      return res.json();
    },
    onSuccess: () => { toast({ title: `${label} complete` }); onInvalidate(); },
    onError: () => toast({ title: `${label} failed`, variant: 'destructive' }),
  });

  return (
    <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:text-[#054700] hover:border-[#054700] gap-2" onClick={() => mut.mutate()} disabled={mut.isPending}>
      {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function ResearchTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();

  // Auto-poll campaign data while any research item is still generating
  const hasGenerating = (campaign.research || []).some(r => r.status === 'generating');
  const queryClient = useQueryClient();
  // biome-ignore lint: effect dependency is intentional
  useState(() => {
    if (!hasGenerating) return;
    const interval = setInterval(() => { onInvalidate(); }, 4000);
    return () => clearInterval(interval);
  });
  // Use a real effect for polling
  const [polling, setPolling] = useState(false);
  if (hasGenerating && !polling) {
    setPolling(true);
    const id = setInterval(() => { onInvalidate(); }, 4000);
    setTimeout(() => { clearInterval(id); setPolling(false); }, 120000); // max 2min polling
  }
  if (!hasGenerating && polling) setPolling(false);

  const generateMut = useMutation({
    mutationFn: async (researchType: 'product_analysis' | 'market_research') => {
      const res = await apiRequest('POST', '/api/admin/ugc/research/generate', { campaignId: campaign.id, researchType });
      return res.json();
    },
    onSuccess: (_, type) => {
      toast({ title: `${type === 'product_analysis' ? 'Product analysis' : 'Market research'} started — generating in background` });
      onInvalidate();
    },
    onError: () => toast({ title: 'Research generation failed', variant: 'destructive' }),
  });

  const productResearch = (campaign.research || []).filter(r => r.researchType === 'product_analysis').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const marketResearch = (campaign.research || []).filter(r => r.researchType === 'market_research').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      {/* Product Analysis */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" /> Product Analysis</h2>
            <p className="text-sm text-gray-500">AI-generated analysis of your product's strengths and positioning</p>
          </div>
          <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => generateMut.mutate('product_analysis')} disabled={generateMut.isPending}>
            {generateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Analysis
          </Button>
        </div>
        {productResearch.length === 0 ? (
          <Card className="bg-white border-gray-300 border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-gray-500">
              <BarChart3 className="h-8 w-8 mb-2" />
              <p>No product analysis yet. Click "Generate Analysis" to start.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {productResearch.map(r => (
              <ResearchResultCard key={r.id} research={r} />
            ))}
          </div>
        )}
      </section>

      {/* Market Research */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Target className="h-5 w-5 text-purple-600" /> Market Research</h2>
            <p className="text-sm text-gray-500">Customer personas, language, triggers, and objections</p>
          </div>
          <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => generateMut.mutate('market_research')} disabled={generateMut.isPending}>
            {generateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Research
          </Button>
        </div>
        {marketResearch.length === 0 ? (
          <Card className="bg-white border-gray-300 border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-gray-500">
              <Target className="h-8 w-8 mb-2" />
              <p>No market research yet. Click "Generate Research" to start.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {marketResearch.map(r => (
              <ResearchResultCard key={r.id} research={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResearchResultCard({ research }: { research: Research }) {
  const [expanded, setExpanded] = useState(true);
  const results = research.content || {};

  // Generating state
  if (research.status === 'generating') {
    return (
      <Card className="bg-white border-gray-200 border-l-4 border-l-amber-400">
        <CardContent className="p-6 flex items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{research.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">Generating with AI — this takes 15-30 seconds. You can navigate away safely.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  if (research.status === 'failed') {
    return (
      <Card className="bg-white border-gray-200 border-l-4 border-l-red-400">
        <CardContent className="p-6 flex items-center gap-4">
          <X className="h-6 w-6 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{research.title}</p>
            <p className="text-xs text-red-500 mt-0.5">{research.errorMessage || 'Generation failed'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={research.researchType === 'product_analysis' ? 'bg-blue-50 text-blue-700' : 'bg-purple-900/30 text-purple-300'}>
            {research.researchType === 'product_analysis' ? 'Product' : 'Market'}
          </Badge>
          <span className="text-xs text-gray-500">{formatDate(research.createdAt)}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {Object.entries(results).map(([key, value]) => (
            <div key={key}>
              <h4 className="text-sm font-medium text-gray-600 capitalize mb-1">{key.replace(/_/g, ' ')}</h4>
              {Array.isArray(value) ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {(value as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-500">{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : typeof value === 'object' && value !== null ? (
                <div className="bg-white rounded-lg p-3 text-sm text-gray-500">
                  {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="mb-1"><span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}:</span> <span className="text-gray-600">{Array.isArray(v) ? (v as string[]).join(', ') : String(v)}</span></div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{String(value)}</p>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: HOOKS LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

function HooksTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHook, setNewHook] = useState({ hookText: '', style: 'curiosity', tone: '' });
  const [scanForm, setScanForm] = useState({ productCategory: '', targetPlatform: 'tiktok', count: 10 });

  // Fetch hooks with filters
  const hooksQuery = useQuery<Hook[]>({
    queryKey: ['/api/admin/ugc/hooks', campaign.id, styleFilter, favOnly, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ campaignId: String(campaign.id) });
      if (styleFilter !== 'all') params.set('style', styleFilter);
      if (favOnly) params.set('favoriteOnly', 'true');
      if (searchTerm) params.set('search', searchTerm);
      const res = await apiRequest('GET', `/api/admin/ugc/hooks?${params}`);
      return res.json();
    },
  });

  const hooks = hooksQuery.data || [];

  // Auto-poll while hooks are generating
  const hasGeneratingHooks = hooks.some((h: Hook) => (h as any).source === 'ai_generating');
  if (hasGeneratingHooks) {
    setTimeout(() => { hooksQuery.refetch(); onInvalidate(); }, 4000);
  }

  const scanMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/hooks/scan', { campaignId: campaign.id, ...scanForm });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Hook scan started — generating in background' });
      setShowScanModal(false);
      hooksQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Hook scan failed', variant: 'destructive' }),
  });

  const addHookMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/hooks', { campaignId: campaign.id, ...newHook });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Hook added' });
      setShowAddForm(false);
      setNewHook({ hookText: '', style: 'curiosity', tone: '' });
      hooksQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Failed to add hook', variant: 'destructive' }),
  });

  const toggleFavMut = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      await apiRequest('PATCH', `/api/admin/ugc/hooks/${id}`, { isFavorite });
    },
    onSuccess: () => hooksQuery.refetch(),
  });

  const deleteHookMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/ugc/hooks/${id}`); },
    onSuccess: () => { toast({ title: 'Hook deleted' }); hooksQuery.refetch(); onInvalidate(); },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input className="pl-9 bg-white border-gray-200 text-gray-900" placeholder="Search hooks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="w-44 bg-white border-gray-200 text-gray-900">
            <SelectValue placeholder="All styles" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-700">All styles</SelectItem>
            {HOOK_STYLES.map(s => <SelectItem key={s} value={s} className="text-gray-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={favOnly ? 'default' : 'outline'} size="sm" className={favOnly ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'border-gray-200 text-gray-500'} onClick={() => setFavOnly(!favOnly)}>
          <Star className={`h-4 w-4 mr-1 ${favOnly ? 'fill-current' : ''}`} /> Favorites
        </Button>
        <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 gap-1" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" /> Add Hook
        </Button>
        <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => setShowScanModal(true)}>
          <Sparkles className="h-4 w-4" /> Scan for Hooks
        </Button>
      </div>

      {/* Add hook inline form */}
      {showAddForm && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4 space-y-3">
            <Textarea className="bg-white border-gray-200 text-gray-900" rows={3} placeholder="Write your hook text..." value={newHook.hookText} onChange={e => setNewHook(p => ({ ...p, hookText: e.target.value }))} />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-gray-500 text-xs">Style</Label>
                <Select value={newHook.style} onValueChange={v => setNewHook(p => ({ ...p, style: v }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {HOOK_STYLES.map(s => <SelectItem key={s} value={s} className="text-gray-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-gray-500 text-xs">Tone (optional)</Label>
                <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={newHook.tone} onChange={e => setNewHook(p => ({ ...p, tone: e.target.value }))} placeholder="e.g. playful, urgent" />
              </div>
              <Button className="bg-[#054700] hover:bg-[#043d00] text-white" onClick={() => addHookMut.mutate()} disabled={!newHook.hookText || addHookMut.isPending}>
                {addHookMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
              <Button variant="ghost" className="text-gray-500" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hooks grid */}
      {hooksQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#054700]" /></div>
      ) : hooks.length === 0 ? (
        <Card className="bg-white border-gray-300 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-gray-500">
            <Lightbulb className="h-8 w-8 mb-2" />
            <p>No hooks yet. Scan for AI-generated hooks or add one manually.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {hooks.map(hook => (
            <HookCard key={hook.id} hook={hook} onToggleFav={() => toggleFavMut.mutate({ id: hook.id, isFavorite: !hook.isFavorite })} onDelete={() => deleteHookMut.mutate(hook.id)} />
          ))}
        </div>
      )}

      {/* Scan modal */}
      <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Scan for Hooks</DialogTitle>
            <DialogDescription className="text-gray-500">AI will research viral hooks for your product category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Product Category</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={scanForm.productCategory} onChange={e => setScanForm(p => ({ ...p, productCategory: e.target.value }))} placeholder="Health supplements, vitamins" />
            </div>
            <div>
              <Label className="text-gray-600">Target Platform</Label>
              <Select value={scanForm.targetPlatform} onValueChange={v => setScanForm(p => ({ ...p, targetPlatform: v }))}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {['tiktok', 'instagram', 'youtube', 'facebook'].map(p => <SelectItem key={p} value={p} className="text-gray-700 capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600">Number of Hooks</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" type="number" min={1} max={50} value={scanForm.count} onChange={e => setScanForm(p => ({ ...p, count: parseInt(e.target.value) || 10 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowScanModal(false)} className="text-gray-500">Cancel</Button>
            <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => scanMut.mutate()} disabled={!scanForm.productCategory || scanMut.isPending}>
              {scanMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HookCard({ hook, onToggleFav, onDelete }: { hook: Hook; onToggleFav: () => void; onDelete: () => void }) {
  const [showNotes, setShowNotes] = useState(false);

  // Generating placeholder
  if ((hook as any).source === 'ai_generating') {
    return (
      <Card className="bg-white border-gray-200 border-l-4 border-l-amber-400 break-inside-avoid">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Generating hooks...</p>
            <p className="text-xs text-gray-500">AI is scanning for viral hooks. You can navigate away safely.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  if ((hook as any).source === 'ai_failed') {
    return (
      <Card className="bg-white border-gray-200 border-l-4 border-l-red-400 break-inside-avoid">
        <CardContent className="p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm text-red-600">{hook.hookText}</p>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 mt-1 h-6 px-2" onClick={onDelete}>Dismiss</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200 break-inside-avoid">
      <CardContent className="p-4 space-y-3">
        <p className="text-gray-800 text-base leading-relaxed">{hook.hookText}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-xs capitalize">{hook.style?.replace(/_/g, ' ')}</Badge>
          {hook.speakingTone && <Badge variant="secondary" className="bg-gray-200 text-gray-500 text-xs">{hook.speakingTone}</Badge>}
          {hook.source && <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">{hook.source}</Badge>}
        </div>
        {hook.structureNotes && (
          <>
            <button className="text-xs text-[#054700] hover:underline" onClick={() => setShowNotes(!showNotes)}>
              {showNotes ? 'Hide' : 'Show'} structure notes
            </button>
            {showNotes && <p className="text-xs text-gray-500 bg-white rounded p-2">{hook.structureNotes}</p>}
          </>
        )}
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleFav}>
            <Star className={`h-4 w-4 ${hook.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-600'}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════════

function ScriptsTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [genForm, setGenForm] = useState({ selectedHookIds: [] as string[], scriptType: 'ugc_testimonial', count: 1, additionalDirection: '', angleId: '' });

  const scriptsQuery = useQuery<Script[]>({
    queryKey: ['/api/admin/ugc/scripts', campaign.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ugc/scripts?campaignId=${campaign.id}`);
      return res.json();
    },
  });

  // Fetch ONES-specific script angles
  const anglesQuery = useQuery<Array<{ id: string; title: string; angle: string; scriptType: string; description: string }>>({
    queryKey: ['/api/admin/ugc/script-angles'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/ugc/script-angles');
      return res.json();
    },
  });

  const scripts = scriptsQuery.data || [];
  const hooks = campaign.hooks || [];
  const angles = anglesQuery.data || [];

  // Auto-poll while scripts are generating
  const hasGeneratingScripts = scripts.some(s => s.status === 'generating');
  if (hasGeneratingScripts) {
    setTimeout(() => { scriptsQuery.refetch(); onInvalidate(); }, 4000);
  }

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/scripts/generate', { campaignId: campaign.id, ...genForm });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Script generation started — generating in background' });
      setShowGenModal(false);
      setGenForm({ selectedHookIds: [], scriptType: 'ugc_testimonial', count: 1, additionalDirection: '', angleId: '' });
      scriptsQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Script generation failed', variant: 'destructive' }),
  });

  const updateScriptMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Script> }) => {
      await apiRequest('PATCH', `/api/admin/ugc/scripts/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Script updated' });
      scriptsQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const deleteScriptMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/ugc/scripts/${id}`); },
    onSuccess: () => {
      toast({ title: 'Script deleted' });
      setSelectedScript(null);
      scriptsQuery.refetch();
      onInvalidate();
    },
  });

  // Detail view
  if (selectedScript) {
    return <ScriptDetailView script={selectedScript} onBack={() => setSelectedScript(null)} onUpdate={(data) => updateScriptMut.mutate({ id: selectedScript.id, data })} onDelete={() => deleteScriptMut.mutate(selectedScript.id)} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{scripts.length} Script{scripts.length !== 1 ? 's' : ''}</h2>
        <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => setShowGenModal(true)}>
          <Sparkles className="h-4 w-4" /> Generate Scripts
        </Button>
      </div>

      {/* Scripts list */}
      {scriptsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#054700]" /></div>
      ) : scripts.length === 0 ? (
        <Card className="bg-white border-gray-300 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-gray-500">
            <FileText className="h-8 w-8 mb-2" />
            <p>No scripts yet. Generate scripts from your hooks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map(script => {
            // Generating state
            if (script.status === 'generating') {
              return (
                <Card key={script.id} className="bg-white border-gray-200 border-l-4 border-l-amber-400">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{script.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Generating with AI — you can navigate away safely.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            // Failed state
            if (script.status === 'failed') {
              return (
                <Card key={script.id} className="bg-white border-gray-200 border-l-4 border-l-red-400">
                  <CardContent className="p-4 flex items-center gap-3">
                    <X className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm text-red-600">{script.title}</p>
                      <Button variant="ghost" size="sm" className="text-xs text-gray-500 mt-1 h-6 px-2" onClick={() => deleteScriptMut.mutate(script.id)}>Dismiss</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return (
            <Card key={script.id} className="bg-white border-gray-200 hover:border-gray-200 cursor-pointer transition-colors" onClick={() => setSelectedScript(script)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-gray-900 font-medium">{script.title || `Script #${script.id}`}</h3>
                  <Badge
                    variant="secondary"
                    className={
                      script.status === 'approved' ? 'bg-emerald-50 text-[#054700]' :
                      script.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-gray-200 text-gray-600'
                    }
                  >
                    {script.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{script.scriptType?.replace(/_/g, ' ')}</span>
                  <span>{script.scenes?.length || 0} scenes</span>
                  {script.totalDurationSeconds && <span>{script.totalDurationSeconds}s total</span>}
                </div>
                {script.scenes?.[0]?.dialogue && (
                  <p className="text-sm text-gray-500 line-clamp-2 italic">"{script.scenes[0].dialogue}"</p>
                )}
                <p className="text-xs text-gray-600">{formatDate(script.createdAt)}</p>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Generate modal */}
      <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Scripts</DialogTitle>
            <DialogDescription className="text-gray-500">Pick an angle or let AI choose. Select hooks for inspiration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* ONES Script Angle Suggestions */}
            {angles.length > 0 && (
              <div>
                <Label className="text-gray-600 mb-2 block">Script Angle (AI suggestions for ONES)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {angles.map(angle => (
                    <div
                      key={angle.id}
                      onClick={() => setGenForm(p => ({
                        ...p,
                        angleId: p.angleId === angle.id ? '' : angle.id,
                        scriptType: p.angleId === angle.id ? p.scriptType : angle.scriptType,
                      }))}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        genForm.angleId === angle.id
                          ? 'border-[#054700] bg-[#054700]/5'
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className={`h-4 w-4 mt-0.5 flex-shrink-0 ${genForm.angleId === angle.id ? 'text-[#054700]' : 'text-gray-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{angle.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{angle.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select an angle or leave empty for AI to choose the best approach.</p>
              </div>
            )}

            {hooks.length > 0 ? (
              <div>
                <Label className="text-gray-600 mb-2 block">Select Hooks for Inspiration</Label>
                <ScrollArea className="h-48 border border-gray-200 rounded-lg p-3">
                  {hooks.map(h => (
                    <label key={h.id} className="flex items-start gap-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer px-1">
                      <Checkbox
                        checked={genForm.selectedHookIds.includes(h.id)}
                        onCheckedChange={(checked) => {
                          setGenForm(p => ({
                            ...p,
                            selectedHookIds: checked
                              ? [...p.selectedHookIds, h.id]
                              : p.selectedHookIds.filter(id => id !== h.id),
                          }));
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-gray-600 leading-snug">{h.hookText}</span>
                    </label>
                  ))}
                </ScrollArea>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hooks available. You can still generate scripts without hook inspiration.</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Script Type</Label>
                <Select value={genForm.scriptType} onValueChange={v => setGenForm(p => ({ ...p, scriptType: v }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {['ugc_testimonial', 'problem_solution', 'educational', 'unboxing', 'day_in_life', 'before_after', 'comparison', 'transformation', 'testimonial'].map(t => (
                      <SelectItem key={t} value={t} className="text-gray-700 capitalize">{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-600">Count</Label>
                <Input className="bg-white border-gray-200 text-gray-900 mt-1" type="number" min={1} max={10} value={genForm.count} onChange={e => setGenForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Additional Direction</Label>
              <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={3} value={genForm.additionalDirection} onChange={e => setGenForm(p => ({ ...p, additionalDirection: e.target.value }))} placeholder="Any specific direction for the AI..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGenModal(false)} className="text-gray-500">Cancel</Button>
            <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
              {generateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScriptDetailView({ script, onBack, onUpdate, onDelete }: {
  script: Script; onBack: () => void; onUpdate: (data: Partial<Script>) => void; onDelete: () => void;
}) {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ScriptScene>>({});

  const scenes = script.scenes || [];
  const totalDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

  const handleSaveScene = (sceneIndex: number) => {
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], ...editForm };
    onUpdate({ scenes: updatedScenes });
    setEditingScene(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={onBack}>← Back</Button>
          <h2 className="text-lg font-semibold text-gray-900">{script.title || `Script #${script.id}`}</h2>
          <Badge
            variant="secondary"
            className={
              script.status === 'approved' ? 'bg-emerald-50 text-[#054700]' :
              script.status === 'rejected' ? 'bg-red-50 text-red-600' :
              'bg-gray-200 text-gray-600'
            }
          >
            {script.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white gap-1" onClick={() => onUpdate({ status: 'approved' })}>
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="border-red-300 text-red-500 hover:bg-red-50 gap-1" onClick={() => onUpdate({ status: 'rejected' })}>
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <span className="capitalize">{script.scriptType?.replace(/_/g, ' ')}</span>
        <span>{scenes.length} scenes</span>
        <span>{totalDuration}s total duration</span>
        {script.toneNotes && <span>Tone: {script.toneNotes}</span>}
      </div>
      {script.rationale && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3 text-sm text-gray-500"><span className="text-gray-500 font-medium">Rationale:</span> {script.rationale}</CardContent>
        </Card>
      )}

      {/* Scene timeline / storyboard */}
      <div className="space-y-3">
        {scenes.map((scene, idx) => (
          <Card key={idx} className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#054700]/10 text-[#054700]">Scene {scene.sceneNumber || idx + 1}</Badge>
                  {scene.cameraAngle && <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">{scene.cameraAngle}</Badge>}
                  {scene.durationSeconds && <span className="text-xs text-gray-500">{scene.durationSeconds}s</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-[#054700]" onClick={() => { setEditingScene(idx); setEditForm(scene); }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>

              {editingScene === idx ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-500 text-xs">Dialogue</Label>
                    <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={2} value={editForm.dialogue || ''} onChange={e => setEditForm(p => ({ ...p, dialogue: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Visual Description</Label>
                    <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={2} value={editForm.visualDescription || ''} onChange={e => setEditForm(p => ({ ...p, visualDescription: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-gray-500 text-xs">Camera Angle</Label>
                      <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={editForm.cameraAngle || ''} onChange={e => setEditForm(p => ({ ...p, cameraAngle: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Action</Label>
                      <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={editForm.action || ''} onChange={e => setEditForm(p => ({ ...p, action: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Duration (s)</Label>
                      <Input className="bg-white border-gray-200 text-gray-900 mt-1" type="number" value={editForm.durationSeconds || ''} onChange={e => setEditForm(p => ({ ...p, durationSeconds: parseInt(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setEditingScene(null)}>Cancel</Button>
                    <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white" onClick={() => handleSaveScene(idx)}>Save Scene</Button>
                  </div>
                </div>
              ) : (
                <>
                  {scene.dialogue && <p className="text-gray-900 text-base mb-2 leading-relaxed">"{scene.dialogue}"</p>}
                  {scene.visualDescription && <p className="text-sm text-gray-500 mb-1"><span className="text-gray-500">Visual:</span> {scene.visualDescription}</p>}
                  {scene.action && <p className="text-sm text-gray-500"><span className="text-gray-500">Action:</span> {scene.action}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: CHARACTERS
// ═══════════════════════════════════════════════════════════════════════════════

function CharactersTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', demographics: '', styleDescription: '', settingDescription: '', personalityNotes: '' });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; demographics: string; styleDescription: string; settingDescription: string; personalityNotes: string; whyThisCharacter: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const charsQuery = useQuery<Character[]>({
    queryKey: ['/api/admin/ugc/characters', campaign.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ugc/characters?campaignId=${campaign.id}`);
      return res.json();
    },
  });

  const characters = charsQuery.data || [];

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/characters', { campaignId: campaign.id, ...createForm });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Character created' });
      setShowCreate(false);
      setCreateForm({ name: '', demographics: '', styleDescription: '', settingDescription: '', personalityNotes: '' });
      charsQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Failed to create character', variant: 'destructive' }),
  });

  const suggestMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/characters/suggest', { campaignId: campaign.id, count: 3 });
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.characters || []);
      setShowSuggestions(true);
      toast({ title: `${data.characters?.length || 0} character suggestions ready` });
    },
    onError: () => toast({ title: 'Failed to generate suggestions', variant: 'destructive' }),
  });

  const createFromSuggestion = useMutation({
    mutationFn: async (suggestion: typeof suggestions[0]) => {
      const res = await apiRequest('POST', '/api/admin/ugc/characters', {
        campaignId: campaign.id,
        name: suggestion.name,
        demographics: suggestion.demographics,
        styleDescription: suggestion.styleDescription,
        settingDescription: suggestion.settingDescription,
        personalityNotes: suggestion.personalityNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Character created from suggestion' });
      charsQuery.refetch();
      onInvalidate();
    },
    onError: () => toast({ title: 'Failed to create character', variant: 'destructive' }),
  });

  const deleteCharMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/ugc/characters/${id}`); },
    onSuccess: () => { toast({ title: 'Character deleted' }); charsQuery.refetch(); onInvalidate(); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{characters.length} Character{characters.length !== 1 ? 's' : ''}</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-[#054700] hover:border-[#054700] gap-2" onClick={() => suggestMut.mutate()} disabled={suggestMut.isPending}>
            {suggestMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Suggest Characters
          </Button>
          <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Character
          </Button>
        </div>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="bg-[#054700]/5 border-[#054700]/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#054700] text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI-Suggested Characters
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-gray-400 h-7" onClick={() => setShowSuggestions(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CardDescription className="text-[#054700]/60 text-xs">Based on your research, hooks, scripts, and target audience. Click to add.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500">{s.demographics}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#054700] hover:bg-[#043d00] text-white gap-1 shrink-0"
                    onClick={() => createFromSuggestion.mutate(s)}
                    disabled={createFromSuggestion.isPending}
                  >
                    {createFromSuggestion.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Style:</span> <span className="text-gray-600">{s.styleDescription}</span></div>
                  <div><span className="text-gray-400">Setting:</span> <span className="text-gray-600">{s.settingDescription}</span></div>
                </div>
                {s.personalityNotes && <p className="text-xs text-gray-500"><span className="text-gray-400">Personality:</span> {s.personalityNotes}</p>}
                {s.whyThisCharacter && (
                  <p className="text-xs text-[#054700]/70 bg-[#054700]/5 rounded px-2 py-1">{s.whyThisCharacter}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 h-6 px-2"
                  onClick={() => {
                    setCreateForm({
                      name: s.name,
                      demographics: s.demographics,
                      styleDescription: s.styleDescription,
                      settingDescription: s.settingDescription,
                      personalityNotes: s.personalityNotes,
                    });
                    setShowCreate(true);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" /> Edit before adding
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {charsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#054700]" /></div>
      ) : characters.length === 0 ? (
        <Card className="bg-white border-gray-300 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-gray-500">
            <Users className="h-8 w-8 mb-2" />
            <p>No characters yet. Create a character to start generating images.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {characters.map(char => (
            <CharacterCard key={char.id} character={char} campaignId={campaign.id} onDelete={() => deleteCharMut.mutate(char.id)} onInvalidate={() => { charsQuery.refetch(); onInvalidate(); }} onLightbox={setLightboxImage} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Character</DialogTitle>
            <DialogDescription className="text-gray-500">Define a UGC creator persona</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Name *</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Sarah" />
            </div>
            <div>
              <Label className="text-gray-600">Demographics</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={createForm.demographics} onChange={e => setCreateForm(p => ({ ...p, demographics: e.target.value }))} placeholder="28, female, fitness enthusiast" />
            </div>
            <div>
              <Label className="text-gray-600">Style Description</Label>
              <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={2} value={createForm.styleDescription} onChange={e => setCreateForm(p => ({ ...p, styleDescription: e.target.value }))} placeholder="Casual athleisure, minimal makeup, natural light" />
            </div>
            <div>
              <Label className="text-gray-600">Setting</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={createForm.settingDescription} onChange={e => setCreateForm(p => ({ ...p, settingDescription: e.target.value }))} placeholder="Modern kitchen, bright airy apartment" />
            </div>
            <div>
              <Label className="text-gray-600">Personality Notes</Label>
              <Textarea className="bg-white border-gray-200 text-gray-900 mt-1" rows={2} value={createForm.personalityNotes} onChange={e => setCreateForm(p => ({ ...p, personalityNotes: e.target.value }))} placeholder="Upbeat, relatable, honest about wellness journey" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-500">Cancel</Button>
            <Button className="bg-[#054700] hover:bg-[#043d00] text-white" onClick={() => createMut.mutate()} disabled={!createForm.name || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="bg-white border-gray-200 max-w-4xl p-2">
            <img src={lightboxImage} alt="Character image preview" className="w-full h-auto rounded-lg" loading="lazy" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CharacterCard({ character, campaignId, onDelete, onInvalidate, onLightbox }: {
  character: Character; campaignId: string; onDelete: () => void; onInvalidate: () => void; onLightbox: (url: string) => void;
}) {
  const { toast } = useToast();
  const [genType, setGenType] = useState<string>('front_view');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showGenForm, setShowGenForm] = useState(false);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [ugcImageModel, setUgcImageModel] = useState('__default');

  const genImageMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/images/generate', {
        characterId: character.id,
        campaignId,
        imageType: genType,
        ...(customPrompt ? { customPromptOverride: customPrompt } : {}),
        ...(ugcImageModel && ugcImageModel !== '__default' ? { imageModelId: ugcImageModel } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Image generated!' });
      setShowGenForm(false);
      setCustomPrompt('');
      onInvalidate();
    },
    onError: () => toast({ title: 'Image generation failed', variant: 'destructive' }),
  });

  const updateImageMut = useMutation({
    mutationFn: async ({ id, status, revisionNotes }: { id: string; status: string; revisionNotes?: string }) => {
      await apiRequest('PATCH', `/api/admin/ugc/images/${id}/status`, { status, revisionNotes });
    },
    onSuccess: () => { toast({ title: 'Image updated' }); onInvalidate(); },
  });

  const regenImageMut = useMutation({
    mutationFn: async ({ id, customPromptOverride }: { id: string; customPromptOverride?: string }) => {
      const res = await apiRequest('POST', `/api/admin/ugc/images/${id}/regenerate`, { customPromptOverride });
      return res.json();
    },
    onSuccess: () => { toast({ title: 'Regenerating image...' }); setRevisionId(null); setRevisionNotes(''); onInvalidate(); },
    onError: () => toast({ title: 'Regeneration failed', variant: 'destructive' }),
  });

  const setReferenceMut = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await apiRequest('POST', `/api/admin/ugc/characters/${character.id}/reference`, { imageId });
      return res.json();
    },
    onSuccess: () => { toast({ title: 'Reference face set — all new images will maintain this identity' }); onInvalidate(); },
    onError: () => toast({ title: 'Failed to set reference', variant: 'destructive' }),
  });

  const clearReferenceMut = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/admin/ugc/characters/${character.id}/reference`);
    },
    onSuccess: () => { toast({ title: 'Reference cleared — next generation creates a fresh identity' }); onInvalidate(); },
    onError: () => toast({ title: 'Failed to clear reference', variant: 'destructive' }),
  });

  const images = character.images || [];
  const hasReference = !!character.referenceImageUrl;

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-gray-900">{character.name}</CardTitle>
              {hasReference && (
                <Badge className="bg-[#054700]/10 text-[#054700] border-[#054700]/20 text-[10px] gap-1">
                  <Anchor className="h-2.5 w-2.5" /> Face Locked
                </Badge>
              )}
            </div>
            {character.demographics && <CardDescription className="text-gray-500">{character.demographics}</CardDescription>}
          </div>
          <div className="flex gap-1">
            {hasReference && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-600" title="Clear face reference" onClick={() => clearReferenceMut.mutate()} disabled={clearReferenceMut.isPending}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-500" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {character.styleDescription && <p className="text-xs text-gray-500 mt-1">{character.styleDescription}</p>}
        {character.settingDescription && <p className="text-xs text-gray-600 mt-0.5">Setting: {character.settingDescription}</p>}
        {hasReference && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-md bg-[#054700]/5 border border-[#054700]/10">
            <Shield className="h-3.5 w-3.5 text-[#054700] flex-shrink-0" />
            <p className="text-[11px] text-[#054700]">
              Identity consistency active — all new images will use PuLID to preserve this character's face across angles and scenes.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Image gallery */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map(img => (
              <div
                key={img.id}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  character.referenceImageId === img.id ? 'border-[#054700] ring-2 ring-[#054700]/20' :
                  img.status === 'approved' ? 'border-[#054700]' :
                  img.status === 'rejected' ? 'border-red-500 opacity-40' :
                  'border-gray-200'
                }`}
              >
                <img
                  src={img.imageUrl}
                  alt={`${character.name} - ${img.imageType}`}
                  className="w-full aspect-square object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => onLightbox(img.imageUrl)}
                />
                {character.referenceImageId === img.id && (
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-[#054700] text-white text-[9px] gap-0.5 px-1.5">
                      <Anchor className="h-2 w-2" /> REF
                    </Badge>
                  </div>
                )}
                <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 flex-wrap p-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#054700] hover:bg-emerald-50" onClick={() => updateImageMut.mutate({ id: img.id, status: 'approved' })} title="Approve">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateImageMut.mutate({ id: img.id, status: 'rejected' })} title="Reject">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { setRevisionId(img.id); setRevisionNotes(''); }} title="Revise">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-900 hover:bg-gray-200" onClick={() => onLightbox(img.imageUrl)} title="Preview">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  {img.status === 'approved' && character.referenceImageId !== img.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                      onClick={() => setReferenceMut.mutate(img.id)}
                      disabled={setReferenceMut.isPending}
                      title="Lock face — use this image as identity reference for all future generations"
                    >
                      <Anchor className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Badge className="absolute bottom-1 left-1 text-[10px] bg-gray-50/70 text-gray-600">{img.imageType?.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Revision notes input */}
        {revisionId && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-gray-500 text-xs">Revision Notes</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)} placeholder="Describe what to change..." />
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => regenImageMut.mutate({ id: revisionId, customPromptOverride: revisionNotes || undefined })} disabled={regenImageMut.isPending}>
              {regenImageMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setRevisionId(null)}>Cancel</Button>
          </div>
        )}

        {/* Generate image */}
        {showGenForm ? (
          <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
            {hasReference && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#054700] bg-[#054700]/5 rounded px-2 py-1">
                <Anchor className="h-3 w-3 flex-shrink-0" />
                Using PuLID face consistency — same identity, new angle
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-500 text-xs">Image Type</Label>
                <Select value={genType} onValueChange={setGenType}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {IMAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-gray-700">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Image Model</Label>
                <Select value={ugcImageModel} onValueChange={setUgcImageModel}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {UGC_IMAGE_MODEL_OPTIONS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-gray-700">
                        <span className="flex items-center gap-1.5">{m.label} <span className="text-[10px] text-gray-400">{m.description}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-500 text-xs">Custom Prompt Override (optional)</Label>
              <Input className="bg-white border-gray-200 text-gray-900 mt-1" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Override the AI prompt..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setShowGenForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white gap-1" onClick={() => genImageMut.mutate()} disabled={genImageMut.isPending}>
                {genImageMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full border-gray-200 text-gray-600 hover:text-[#054700] hover:border-[#054700] gap-2" onClick={() => setShowGenForm(true)}>
            <Image className="h-4 w-4" /> Generate Image
          </Button>
        )}

        {/* Hint: set reference after first approved image */}
        {!hasReference && images.some(i => i.status === 'approved') && (
          <p className="text-[11px] text-gray-400 text-center">
            Tip: Hover an approved image and click <Anchor className="h-3 w-3 inline" /> to lock this face for consistent multi-angle generation
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 6: VIDEO — Full Pipeline Workflow
// ═══════════════════════════════════════════════════════════════════════════════

function VideoTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const [showPromptGen, setShowPromptGen] = useState(false);
  const [promptGenForm, setPromptGenForm] = useState({ scriptId: '', characterId: '' });
  const [pipelineStatus, setPipelineStatus] = useState<{ phase: string; message: string; current?: number; total?: number } | null>(null);
  const [showAssembled, setShowAssembled] = useState(false);
  const [selectedPipelineVoice, setSelectedPipelineVoice] = useState('');
  const [ugcVideoModel, setUgcVideoModel] = useState('__default');

  // Fetch available TTS voices (ElevenLabs + OpenAI)
  const voicesQuery = useQuery<{ presets: Array<{ id: string; name: string; provider: string; description: string }>; hasElevenLabs: boolean }>({
    queryKey: ['/api/admin/ugc/voices'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/ugc/voices');
      return res.json();
    },
    staleTime: 60000,
  });
  const availableVoices = voicesQuery.data?.presets || [];
  const hasElevenLabs = voicesQuery.data?.hasElevenLabs || false;

  // Default to first ElevenLabs voice (Rachel) if available, otherwise 'nova'
  if (!selectedPipelineVoice && availableVoices.length > 0) {
    setSelectedPipelineVoice(availableVoices[0].id);
  }

  const approvedScripts = (campaign.scripts || []).filter(s => s.status === 'approved');
  const approvedCharImages = (campaign.images || []).filter(i => i.status === 'approved');
  const hasPrereqs = approvedScripts.length > 0 && approvedCharImages.length > 0;
  const imageById = new Map((campaign.images || []).map(image => [image.id, image]));

  const videos = campaign.videos || [];

  // Group by batch — deduplicate
  const batches = new Map<number, VideoScene[]>();
  const seenIds = new Set<string>();
  videos.forEach(v => {
    if (seenIds.has(v.id)) return;
    seenIds.add(v.id);
    const batch = v.batchNumber || 1;
    if (!batches.has(batch)) batches.set(batch, []);
    batches.get(batch)!.push(v);
  });

  // Compute pipeline readiness stats
  const draftCount = videos.filter(v => v.status === 'draft').length;
  const generatedCount = videos.filter(v => v.status === 'generated' && v.videoUrl).length;
  const lipSyncedCount = videos.filter(v => v.mergedVideoUrl).length;
  const needsLipSync = videos.filter(v => v.videoUrl && v.dialogue && !v.mergedVideoUrl).length;
  const failedCount = videos.filter(v => v.status === 'failed').length;
  const readyForAssembly = videos.filter(v => v.mergedVideoUrl || v.videoUrl).length;

  // Duration preview query
  const durationQuery = useQuery<DurationPreviewResponse>({
    queryKey: ['/api/admin/ugc/pipeline/preview-durations', campaign.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ugc/pipeline/preview-durations?campaignId=${campaign.id}`);
      return res.json();
    },
    enabled: videos.length > 0,
  });

  const genPromptsMut = useMutation({
    mutationFn: async () => {
      const existingGenerated = videos.filter(v => v.status === 'generated' || v.status === 'approved');
      if (existingGenerated.length > 0) {
        const ok = window.confirm(`You have ${existingGenerated.length} already-generated video(s). New prompts will replace any remaining draft scenes. Continue?`);
        if (!ok) throw new Error('cancelled');
      }
      const res = await apiRequest('POST', '/api/admin/ugc/video/generate-prompts', {
        campaignId: campaign.id,
        scriptId: promptGenForm.scriptId,
        characterId: promptGenForm.characterId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Video prompts generated!' });
      setShowPromptGen(false);
      onInvalidate();
    },
    onError: (err: any) => {
      if (err?.message === 'cancelled') return;
      toast({ title: 'Prompt generation failed', variant: 'destructive' });
    },
  });

  const genVideoMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/ugc/video/${id}/generate`, {
        ...(ugcVideoModel && ugcVideoModel !== '__default' ? { videoModelId: ugcVideoModel } : {}),
      });
      return res.json();
    },
    onSuccess: () => { toast({ title: 'Video generated' }); onInvalidate(); },
    onError: () => toast({ title: 'Video generation failed', variant: 'destructive' }),
  });

  const updateVideoMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VideoScene> }) => {
      await apiRequest('PATCH', `/api/admin/ugc/video/${id}`, data);
    },
    onSuccess: () => { toast({ title: 'Scene updated' }); onInvalidate(); },
  });

  const deleteVideoMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/ugc/video/${id}`); },
    onSuccess: () => { toast({ title: 'Scene deleted' }); onInvalidate(); },
  });

  const voiceoverMut = useMutation({
    mutationFn: async ({ id, voice }: { id: string; voice?: string }) => {
      const res = await apiRequest('POST', `/api/admin/ugc/video/${id}/voiceover`, { voice });
      return res.json();
    },
    onSuccess: () => { toast({ title: 'Lip-sync voiceover applied!' }); onInvalidate(); },
    onError: () => toast({ title: 'Voiceover generation failed', variant: 'destructive' }),
  });

  // ── Full Pipeline (SSE-based) ──
  const [pipelineRunning, setPipelineRunning] = useState(false);

  const runFullPipeline = useCallback(async () => {
    setPipelineRunning(true);
    setPipelineStatus({ phase: 'starting', message: 'Starting full pipeline...' });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      const response = await fetch('/api/admin/ugc/pipeline/full', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId: campaign.id,
          characterId: promptGenForm.characterId || undefined,
          voice: selectedPipelineVoice,
          ...(ugcVideoModel && ugcVideoModel !== '__default' ? { videoModelId: ugcVideoModel } : {}),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'phase') {
                  setPipelineStatus({ phase: data.phase, message: data.message });
                } else if (data.type === 'progress') {
                  setPipelineStatus(prev => ({
                    phase: data.phase || prev?.phase || '',
                    message: prev?.message || '',
                    current: data.current,
                    total: data.total,
                  }));
                } else if (data.type === 'assembled') {
                  toast({ title: `Video assembled! ${data.totalDuration}s, ${data.sceneCount} scenes` });
                } else if (data.type === 'complete') {
                  toast({ title: 'Full pipeline complete!' });
                } else if (data.type === 'error' || data.type === 'assembly_failed') {
                  toast({ title: data.error || 'Pipeline error', variant: 'destructive' });
                }
              } catch { /* skip parse errors */ }
            }
          }
        }
      }
    } catch (err: any) {
      toast({ title: err.message || 'Pipeline failed', variant: 'destructive' });
    } finally {
      setPipelineRunning(false);
      setPipelineStatus(null);
      onInvalidate();
    }
  }, [campaign.id, promptGenForm.characterId, selectedPipelineVoice, ugcVideoModel, onInvalidate, toast]);

  // ── Assemble only ──
  const assembleMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ugc/pipeline/assemble', { campaignId: campaign.id });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Video assembled! ${data.totalDuration}s, ${data.sceneCount} scenes` });
      onInvalidate();
    },
    onError: (err: any) => toast({ title: err.message || 'Assembly failed', variant: 'destructive' }),
  });

  if (!hasPrereqs) {
    return (
      <Card className="bg-white border-gray-300 border-dashed">
        <CardContent className="flex flex-col items-center py-16 text-gray-500">
          <Film className="h-10 w-10 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">Not ready yet</h3>
          <p className="text-sm text-center max-w-md">
            You need at least <strong className="text-[#054700]">1 approved script</strong> and{' '}
            <strong className="text-[#054700]">1 approved character image</strong> before generating video prompts.
          </p>
          <div className="flex gap-3 mt-4 text-sm">
            <span className={approvedScripts.length > 0 ? 'text-[#054700]' : 'text-red-500'}>
              {approvedScripts.length > 0 ? 'ok' : 'missing'}: {approvedScripts.length} approved script{approvedScripts.length !== 1 ? 's' : ''}
            </span>
            <span className={approvedCharImages.length > 0 ? 'text-[#054700]' : 'text-red-500'}>
              {approvedCharImages.length > 0 ? 'ok' : 'missing'}: {approvedCharImages.length} approved image{approvedCharImages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Pipeline Control Panel ── */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#054700]" /> Video Pipeline
          </CardTitle>
          <CardDescription className="text-gray-500">
            Generate videos → Lip-sync speech → Assemble final video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pipeline status indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Draft', value: draftCount, color: 'text-gray-600 bg-gray-100' },
              { label: 'Generated', value: generatedCount, color: 'text-blue-700 bg-blue-50' },
              { label: 'Needs Lip-Sync', value: needsLipSync, color: 'text-purple-700 bg-purple-50' },
              { label: 'Lip-Synced', value: lipSyncedCount, color: 'text-[#054700] bg-emerald-50' },
              { label: 'Failed', value: failedCount, color: failedCount > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-lg p-3 text-center ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Duration warnings */}
          {durationQuery.data && durationQuery.data.issueCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {durationQuery.data.issueCount} scene{durationQuery.data.issueCount !== 1 ? 's' : ''} may have dialogue too long for video duration
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                {durationQuery.data.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-1">TTS speed will be auto-adjusted to fit (up to 1.5x).</p>
            </div>
          )}

          {/* Pipeline progress */}
          {pipelineStatus && (
            <div className="bg-[#054700]/5 border border-[#054700]/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#054700]" />
                <div>
                  <p className="text-sm font-medium text-[#054700]">{pipelineStatus.message}</p>
                  {pipelineStatus.current && pipelineStatus.total && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#054700] rounded-full transition-all"
                          style={{ width: `${(pipelineStatus.current / pipelineStatus.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#054700]">{pipelineStatus.current}/{pipelineStatus.total}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pipeline action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Full Pipeline — the main button */}
            {draftCount > 0 && (
              <Button
                className="bg-[#054700] hover:bg-[#043d00] text-white gap-2"
                onClick={runFullPipeline}
                disabled={pipelineRunning}
              >
                {pipelineRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Full Pipeline ({draftCount} scenes)
              </Button>
            )}

            {/* Assemble only — when scenes are already generated */}
            {readyForAssembly > 0 && !pipelineRunning && (
              <Button
                variant="outline"
                className="border-[#054700] text-[#054700] hover:bg-[#054700]/5 gap-2"
                onClick={() => assembleMut.mutate()}
                disabled={assembleMut.isPending}
              >
                {assembleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                Assemble Final Video ({readyForAssembly} clips)
              </Button>
            )}

            {/* Generate prompts */}
            <Button variant="outline" className="border-gray-200 text-gray-600 gap-2" onClick={() => setShowPromptGen(true)}>
              <Sparkles className="h-4 w-4" /> Generate Prompts
            </Button>

            {/* Voice selector for pipeline */}
            <Select value={selectedPipelineVoice} onValueChange={setSelectedPipelineVoice}>
              <SelectTrigger className="w-48 bg-white border-gray-200 text-gray-900">
                <Volume2 className="h-3 w-3 mr-1" /><SelectValue placeholder="Select voice..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 max-h-72">
                {hasElevenLabs && <div className="px-2 py-1 text-[10px] font-medium text-purple-600 uppercase tracking-wider">ElevenLabs (HD)</div>}
                {availableVoices.filter(v => v.provider === 'elevenlabs').map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-gray-700">
                    <span className="flex items-center gap-1.5">{v.name} <span className="text-[10px] text-gray-400">{v.description}</span></span>
                  </SelectItem>
                ))}
                {hasElevenLabs && <div className="px-2 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider border-t border-gray-100 mt-1">OpenAI (Standard)</div>}
                {availableVoices.filter(v => v.provider === 'openai').map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-gray-700">{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Video model selector */}
            <Select value={ugcVideoModel} onValueChange={setUgcVideoModel}>
              <SelectTrigger className="w-48 bg-white border-gray-200 text-gray-900">
                <Film className="h-3 w-3 mr-1" /><SelectValue placeholder="Video model..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {UGC_VIDEO_MODEL_OPTIONS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-gray-700">
                    <span className="flex items-center gap-1.5">{m.label} <span className="text-[10px] text-gray-400">{m.description}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Assembled Video Preview ── */}
      {campaign.assembledVideoUrl && (
        <Card className="bg-[#054700]/5 border-[#054700]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-[#054700]" />
                <div>
                  <p className="text-sm font-medium text-[#054700]">Final Assembled Video</p>
                  {campaign.assembledAt && (
                    <p className="text-xs text-[#054700]/60">Assembled {formatDate(campaign.assembledAt)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-[#054700]/30 text-[#054700] gap-1" onClick={() => setShowAssembled(true)}>
                  <Play className="h-3.5 w-3.5" /> Watch
                </Button>
                <Button size="sm" variant="ghost" className="text-[#054700] gap-1" asChild>
                  <a href={campaign.assembledVideoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Download
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.assembledVideoUrl && (
        <Dialog open={showAssembled} onOpenChange={setShowAssembled}>
          <DialogContent className="bg-black border-none p-0 max-w-[450px] w-[90vw] [&>button]:text-white [&>button]:hover:text-gray-300 [&>button]:z-10">
            <DialogHeader className="sr-only">
              <DialogTitle>Final Assembled Video</DialogTitle>
            </DialogHeader>
            <video
              key={campaign.assembledVideoUrl}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="w-full rounded-lg"
              style={{ maxHeight: '85vh' }}
            >
              <source src={campaign.assembledVideoUrl} type="video/mp4" />
            </video>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Scene List ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{videos.length} Video Scene{videos.length !== 1 ? 's' : ''}</h2>
      </div>

      {/* Batch status overview */}
      {batches.size > 0 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(batches.entries()).map(([batchNum, scenes]) => {
            const generated = scenes.filter(s => s.status === 'generated' || s.status === 'approved').length;
            const synced = scenes.filter(s => s.mergedVideoUrl).length;
            return (
              <Badge key={batchNum} variant="secondary" className="bg-gray-200 text-gray-600">
                Batch {batchNum}: {generated}/{scenes.length} gen, {synced}/{scenes.length} synced
              </Badge>
            );
          })}
        </div>
      )}

      {videos.length === 0 ? (
        <Card className="bg-white border-gray-300 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-gray-500">
            <Video className="h-8 w-8 mb-2" />
            <p>No video scenes yet. Generate prompts from an approved script.</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(batches.entries()).map(([batchNum, scenes]) => (
          <div key={batchNum} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">Batch {batchNum}</h3>
            <div className="space-y-3">
              {scenes.sort((a, b) => a.sceneNumber - b.sceneNumber).map(scene => (
                <VideoSceneCard
                  key={scene.id}
                  scene={scene}
                  posterUrl={imageById.get(scene.startFrameImageId || '')?.imageUrl || null}
                  onGenerate={() => genVideoMut.mutate(scene.id)}
                  onUpdate={(data) => updateVideoMut.mutate({ id: scene.id, data })}
                  onDelete={() => deleteVideoMut.mutate(scene.id)}
                  onVoiceover={(voice) => voiceoverMut.mutate({ id: scene.id, voice })}
                  generating={genVideoMut.isPending}
                  voiceoverGenerating={voiceoverMut.isPending}
                  durationInfo={durationQuery.data?.scenes.find(p => p.sceneNumber === scene.sceneNumber)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Generate prompts dialog */}
      <Dialog open={showPromptGen} onOpenChange={setShowPromptGen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Video Prompts</DialogTitle>
            <DialogDescription className="text-gray-500">Select a script and character to create video prompts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Script</Label>
              <Select value={promptGenForm.scriptId} onValueChange={v => setPromptGenForm(p => ({ ...p, scriptId: v }))}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue placeholder="Select a script..." /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {approvedScripts.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-gray-700">
                      {s.title || `Script #${s.id}`} ({s.scenes?.length} scenes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600">Character</Label>
              <Select value={promptGenForm.characterId} onValueChange={v => setPromptGenForm(p => ({ ...p, characterId: v }))}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1"><SelectValue placeholder="Select a character..." /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {(campaign.characters || []).filter(c => c.images?.some(i => i.status === 'approved')).map(c => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-gray-700">
                      {c.name} ({c.images?.filter(i => i.status === 'approved').length} approved images)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPromptGen(false)} className="text-gray-500">Cancel</Button>
            <Button className="bg-[#054700] hover:bg-[#043d00] text-white gap-2" onClick={() => genPromptsMut.mutate()} disabled={!promptGenForm.scriptId || !promptGenForm.characterId || genPromptsMut.isPending}>
              {genPromptsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Prompts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoSceneCard({ scene, posterUrl, onGenerate, onUpdate, onDelete, onVoiceover, generating, voiceoverGenerating, durationInfo }: {
  scene: VideoScene; posterUrl: string | null; onGenerate: () => void; onUpdate: (data: Partial<VideoScene>) => void; onDelete: () => void; onVoiceover: (voice?: string) => void; generating: boolean; voiceoverGenerating: boolean; durationInfo?: DurationPreview;
}) {
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(scene.prompt);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(scene.voiceId || 'nova');

  const statusColor = {
    draft: 'bg-gray-200 text-gray-600',
    generating: 'bg-amber-50 text-amber-700',
    generated: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-[#054700]',
    rejected: 'bg-red-50 text-red-600',
    failed: 'bg-red-50 text-red-600',
  }[scene.status] || 'bg-gray-200 text-gray-600';

  const [showVideoModal, setShowVideoModal] = useState(false);
  const playableUrl = scene.mergedVideoUrl || scene.videoUrl;

  return (
    <>
      {playableUrl && (
        <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
          <DialogContent className="bg-black border-none p-0 max-w-[400px] w-[90vw] [&>button]:text-white [&>button]:hover:text-gray-300 [&>button]:z-10">
            <DialogHeader className="sr-only">
              <DialogTitle>Scene {scene.sceneNumber} Video</DialogTitle>
            </DialogHeader>
            <video key={playableUrl} poster={posterUrl || undefined} controls playsInline preload="auto" className="w-full rounded-lg" style={{ maxHeight: '85vh' }}>
              <source src={playableUrl} type="video/mp4" />
            </video>
            <div className="px-3 pb-3 text-xs text-gray-300">
              <a href={playableUrl} target="_blank" rel="noreferrer" className="underline">Open video directly</a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    <Card className="bg-white border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Video preview thumbnail */}
          {playableUrl ? (
            <div className="shrink-0 flex flex-col gap-1">
              <button
                type="button"
                className="w-24 h-40 rounded-lg overflow-hidden border-2 border-blue-400 bg-black cursor-pointer relative flex items-center justify-center group"
                onClick={() => setShowVideoModal(true)}
                title="Click to play video"
              >
                {posterUrl ? (
                  <img src={posterUrl} alt={`Scene ${scene.sceneNumber} poster`} className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex flex-col items-center justify-center gap-1">
                  <Play className="h-8 w-8 text-white fill-white drop-shadow-lg" />
                </div>
              </button>
              <span className={`text-[9px] text-center font-medium ${scene.mergedVideoUrl ? 'text-purple-600' : 'text-gray-400'}`}>
                {scene.mergedVideoUrl ? 'Lip-synced' : 'Silent'}
              </span>
            </div>
          ) : scene.status === 'generated' ? (
            <div className="w-20 h-36 rounded-lg shrink-0 border border-red-300 bg-red-50 flex items-center justify-center">
              <span className="text-[9px] text-red-500 text-center px-1">URL missing</span>
            </div>
          ) : null}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#054700]/10 text-[#054700]">Scene {scene.sceneNumber}</Badge>
              {scene.shotType && <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">{scene.shotType}</Badge>}
              <Badge variant="secondary" className={statusColor}>{scene.status}</Badge>
              {scene.durationSeconds && <span className="text-xs text-gray-500">{scene.durationSeconds}s</span>}
              {scene.cameraMotion && <span className="text-xs text-gray-600">Camera: {scene.cameraMotion}</span>}
            </div>

            {editing ? (
              <div className="space-y-2">
                <Textarea className="bg-white border-gray-200 text-gray-900 text-sm" rows={3} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white" onClick={() => { onUpdate({ prompt: editPrompt }); setEditing(false); }}>Save</Button>
                  <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => { setEditing(false); setEditPrompt(scene.prompt); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">{scene.prompt}</p>
            )}

            {scene.dialogue && (
              <div>
                <p className="text-sm text-gray-500 italic">"{scene.dialogue}"</p>
                {/* Duration fit indicator */}
                {durationInfo && !durationInfo.fits && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    ~{durationInfo.estimatedTTSDuration}s speech for {durationInfo.videoDuration}s video (will speed up to {durationInfo.suggestedSpeed}x)
                  </p>
                )}
              </div>
            )}

            {/* Voiceover controls — show for generated scenes with dialogue that aren't lip-synced */}
            {scene.videoUrl && scene.dialogue && !scene.mergedVideoUrl && (
              <div className="flex items-center gap-2 mt-1">
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="w-28 h-7 text-xs bg-white border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                      <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white gap-1 h-7 text-xs" onClick={() => onVoiceover(selectedVoice)} disabled={voiceoverGenerating}>
                  {voiceoverGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                  Lip-Sync
                </Button>
              </div>
            )}
            {scene.mergedVideoUrl && (
              <Badge className="bg-purple-50 text-purple-700 text-xs w-fit"><Volume2 className="h-3 w-3 mr-1" /> Lip-synced</Badge>
            )}

            {showSettings && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 bg-white rounded p-2">
                {scene.negativePrompt && <span>Neg: {scene.negativePrompt}</span>}
                {scene.generationParams?.cfg_scale && <span>CFG: {scene.generationParams.cfg_scale}</span>}
                {scene.generationParams?.resolution && <span>Res: {scene.generationParams.resolution}</span>}
                {scene.cameraMotionScale && <span>Scale: {scene.cameraMotionScale}</span>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            {(scene.status === 'draft' || scene.status === 'failed') && (
              <Button size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white gap-1" onClick={onGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                {scene.status === 'failed' ? 'Retry' : 'Generate'}
              </Button>
            )}
            {scene.status === 'generated' && (
              <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 gap-1" onClick={onGenerate} disabled={generating}>
                <RefreshCw className="h-3 w-3" /> Redo
              </Button>
            )}
            {scene.status === 'generating' && (
              <Badge className="bg-amber-50 text-amber-700 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Generating...</Badge>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-[#054700]" onClick={() => setEditing(!editing)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600" onClick={() => setShowSettings(!showSettings)}>
              <Zap className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-red-500" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 7: ASSETS
// ═══════════════════════════════════════════════════════════════════════════════

function AssetsTab({ campaign, onInvalidate }: { campaign: CampaignDetail; onInvalidate: () => void }) {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const assetsQuery = useQuery<BrandAsset[]>({
    queryKey: ['/api/admin/ugc/brand-assets', campaign.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ugc/brand-assets?campaignId=${campaign.id}`);
      return res.json();
    },
  });

  const assets = assetsQuery.data || [];

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignId', campaign.id);
      formData.append('assetType', 'product_photo');
      formData.append('name', file.name);
      const res = await fetch('/api/admin/ugc/brand-assets/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Upload failed' })); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Image uploaded' });
      assetsQuery.refetch();
      onInvalidate();
    },
    onError: (err: Error) => toast({ title: err.message || 'Upload failed', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/ugc/brand-assets/${id}`); },
    onSuccess: () => { toast({ title: 'Asset deleted' }); assetsQuery.refetch(); onInvalidate(); },
  });

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        uploadMut.mutate(file);
      } else {
        toast({ title: `${file.name} is not an image`, variant: 'destructive' });
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{assets.length} Brand Asset{assets.length !== 1 ? 's' : ''}</h2>
      </div>

      {/* Upload dropzone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive ? 'border-[#054700] bg-[#054700]/5' : 'border-gray-200 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        {uploadMut.isPending ? (
          <div className="flex flex-col items-center text-[#054700]">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <Upload className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Drop images here or click to upload</p>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, GIF — max 10MB each</p>
          </div>
        )}
      </div>

      {/* Assets grid */}
      {assetsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#054700]" /></div>
      ) : assets.length === 0 ? (
        <Card className="bg-white border-gray-300 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-gray-500">
            <Camera className="h-8 w-8 mb-2" />
            <p>Upload photos of the ONES container, labels, lifestyle shots, etc.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map(asset => (
            <Card key={asset.id} className="bg-white border-gray-200 group">
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50">
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-900 hover:bg-gray-100" onClick={() => window.open(asset.url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteMut.mutate(asset.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3 space-y-1">
                <p className="text-sm text-gray-900 font-medium truncate">{asset.name}</p>
                <Badge variant="secondary" className="bg-gray-200 text-gray-500 text-xs capitalize">{asset.assetType?.replace(/_/g, ' ')}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
