import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Separator } from '@/shared/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  Calendar,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Hash,
  Clock,
  Lightbulb,
  MessageCircle,
  Target,
  Image as ImageIcon,
  TrendingUp,
  Download,
  RefreshCw,
  Type,
  Palette,
  Eye,
  Megaphone,
  Users,
  PenTool,
  LayoutGrid,
  Wand2,
  Upload,
  Trash2,
  FolderOpen,
  Scan,
  Palette as PaletteIcon,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandAsset {
  id: string;
  url: string;
  filename: string;
  category: 'social_post' | 'ad' | 'logo' | 'product' | 'lifestyle' | 'other';
  description?: string;
  uploadedAt: string;
}

interface BrandStyleProfile {
  profile: string;
  summary: string;
  colorPalette: string[];
  analyzedAt: string;
  assetCount: number;
}

interface ImageOverlay {
  headline: string;
  subheadline: string;
  ctaText: string;
  colorScheme: string;
  visualConcept: string;
}

interface GeneratedPost {
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  hookLine: string;
  callToAction: string;
  bestPostTime: string;
  engagementTip: string;
  imageOverlay: ImageOverlay;
  imageUrl?: string;
}

interface ContentIdea {
  day: string;
  platform: string;
  contentType: string;
  title: string;
  description: string;
  angle: string;
  targetAudience: string;
  suggestedVisual: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { value: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'from-sky-400 to-blue-500' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-700' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-500 to-indigo-600' },
  { value: 'tiktok', label: 'TikTok', icon: TrendingUp, color: 'from-gray-900 to-gray-800' },
  { value: 'threads', label: 'Threads', icon: MessageCircle, color: 'from-gray-700 to-gray-900' },
] as const;

const CONTENT_TYPES = [
  { value: 'educational', label: 'Educational', desc: 'Teach your audience something', icon: Lightbulb },
  { value: 'promotional', label: 'Promotional', desc: 'Drive signups or sales', icon: Megaphone },
  { value: 'engagement', label: 'Engagement', desc: 'Spark conversation', icon: MessageCircle },
  { value: 'trending', label: 'Trending', desc: 'Ride a current trend', icon: TrendingUp },
  { value: 'testimonial', label: 'Testimonial', desc: 'Social proof story', icon: Users },
  { value: 'behind-the-scenes', label: 'Behind the Scenes', desc: 'Build authenticity', icon: Eye },
] as const;

const TONES = [
  { value: 'informative and engaging', label: 'Informative & Engaging' },
  { value: 'casual and fun', label: 'Casual & Fun' },
  { value: 'authoritative and data-driven', label: 'Authoritative & Data-Driven' },
  { value: 'inspirational', label: 'Inspirational & Motivating' },
  { value: 'conversational', label: 'Conversational & Friendly' },
] as const;

// ── Utility Components ────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </Button>
  );
}

function platformColor(p: string) {
  const colors: Record<string, string> = {
    instagram: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white',
    twitter: 'bg-sky-500 text-white',
    linkedin: 'bg-blue-700 text-white',
    facebook: 'bg-blue-600 text-white',
    tiktok: 'bg-gray-900 text-white',
    threads: 'bg-gray-800 text-white',
  };
  return colors[p] || 'bg-gray-500 text-white';
}

function contentTypeBadge(t: string) {
  const colors: Record<string, string> = {
    educational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    promotional: 'bg-amber-50 text-amber-700 border-amber-200',
    engagement: 'bg-blue-50 text-blue-700 border-blue-200',
    trending: 'bg-rose-50 text-rose-700 border-rose-200',
    testimonial: 'bg-purple-50 text-purple-700 border-purple-200',
    'behind-the-scenes': 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return colors[t] || 'bg-gray-50 text-gray-700 border-gray-200';
}

// ── Image Preview with Text Overlay ───────────────────────────────────────────

function ImageCreativePreview({
  imageUrl,
  overlay,
  platform,
  isGenerating,
  onGenerate,
}: {
  imageUrl?: string;
  overlay: ImageOverlay;
  platform: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const aspectRatio = platform === 'tiktok' ? 'aspect-[9/16]' : platform === 'twitter' || platform === 'linkedin' || platform === 'facebook' ? 'aspect-video' : 'aspect-square';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> Image Creative
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          {isGenerating ? 'Generating...' : imageUrl ? 'Regenerate' : 'Generate Image'}
        </Button>
      </div>

      <div className={cn('relative rounded-xl overflow-hidden bg-gray-900', aspectRatio, 'max-h-[420px]')}>
        {/* Background: image or placeholder */}
        {imageUrl ? (
          <img src={imageUrl} alt="Generated creative" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Click "Generate Image" to create the visual</p>
            </div>
          </div>
        )}

        {/* Overlay text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5">
          <div className="space-y-1.5">
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
              {overlay.headline}
            </h3>
            <p className="text-white/90 text-sm leading-snug drop-shadow-md">
              {overlay.subheadline}
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-white text-gray-900 text-xs font-semibold rounded-full">
              {overlay.ctaText}
            </span>
          </div>
        </div>
      </div>

      {/* Creative details */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Palette className="h-3 w-3" /> {overlay.colorScheme}
        </span>
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
            <Download className="h-3 w-3" /> Download
          </a>
        )}
      </div>
    </div>
  );
}

// ── Single Post Result Card ──────────────────────────────────────────────────

function PostResultCard({
  post,
  index,
  onGenerateImage,
  isGeneratingImage,
}: {
  post: GeneratedPost;
  index: number;
  onGenerateImage: (index: number) => void;
  isGeneratingImage: boolean;
}) {
  const normalizeTag = (h: string) => `#${h.replace(/^#+/, '')}`;
  const fullText = post.caption + (post.hashtags?.length ? '\n\n' + post.hashtags.map(normalizeTag).join(' ') : '');

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Image Creative */}
        <div className="p-5 bg-gray-50/50 border-b lg:border-b-0 lg:border-r">
          <ImageCreativePreview
            imageUrl={post.imageUrl}
            overlay={post.imageOverlay}
            platform={post.platform}
            isGenerating={isGeneratingImage}
            onGenerate={() => onGenerateImage(index)}
          />
        </div>

        {/* Right: Copy */}
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px] px-2 py-0.5', platformColor(post.platform))}>
                {post.platform}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', contentTypeBadge(post.contentType))}>
                {post.contentType}
              </Badge>
            </div>
            <CopyButton text={fullText} label="Copy All" />
          </div>

          {/* Hook Line */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hook</span>
            </div>
            <p className="text-sm font-semibold leading-snug">{post.hookLine}</p>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Caption</span>
              </div>
              <CopyButton text={post.caption} />
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed bg-white border rounded-lg p-3 max-h-[180px] overflow-y-auto">
              {post.caption}
            </div>
          </div>

          {/* Hashtags */}
          {post.hashtags?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hashtags</span>
                </div>
                <CopyButton text={post.hashtags.map(h => `#${h.replace(/^#+/, '')}`).join(' ')} />
              </div>
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map((tag, i) => (
                  <span key={i} className="text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Call to Action</span>
            </div>
            <p className="text-sm">{post.callToAction}</p>
          </div>

          <Separator />

          {/* Meta row */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.bestPostTime}
            </span>
            <span className="flex items-center gap-1 text-right max-w-[200px]">
              <Lightbulb className="h-3 w-3 shrink-0" /> {post.engagementTip}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Content Calendar Idea Card ──────────────────────────────────────────────

function IdeaCard({ idea, index }: { idea: ContentIdea; index: number }) {
  return (
    <div className="flex gap-4 items-start">
      {/* Day marker */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
          {index + 1}
        </div>
        {/* connector line (not on last) */}
        <div className="w-px h-full bg-gray-200 mt-1" />
      </div>

      <Card className="flex-1 mb-3">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{idea.day}</span>
            <div className="flex gap-1.5">
              <Badge className={cn('text-[10px] px-2 py-0.5', platformColor(idea.platform))}>
                {idea.platform}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', contentTypeBadge(idea.contentType))}>
                {idea.contentType}
              </Badge>
            </div>
          </div>
          <h4 className="font-semibold text-sm">{idea.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-500 block mb-0.5">Angle</span>
              <span className="text-gray-700">{idea.angle}</span>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-500 block mb-0.5">Audience</span>
              <span className="text-gray-700">{idea.targetAudience}</span>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-500 block mb-0.5">Visual</span>
              <span className="text-gray-700">{idea.suggestedVisual}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SocialPostsPage() {
  const { toast } = useToast();

  // Generator state
  const [platform, setPlatform] = useState<string>('instagram');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('informative and engaging');
  const [contentType, setContentType] = useState('educational');
  const [postCount, setPostCount] = useState(3);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  // Image generation tracking per post index
  const [generatingImageIdx, setGeneratingImageIdx] = useState<number | null>(null);

  // Calendar state
  const [daysAhead, setDaysAhead] = useState(7);
  const [weekTheme, setWeekTheme] = useState('');
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  // Brand Kit state
  const [uploadCategory, setUploadCategory] = useState<string>('social_post');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  // ── Brand Kit Queries ─────────────────────────────────────────────────────

  const brandAssetsQuery = useQuery<{ success: boolean; assets: BrandAsset[] }>({
    queryKey: ['/api/admin/social/brand-assets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/social/brand-assets');
      return res.json();
    },
  });

  const brandProfileQuery = useQuery<{ success: boolean; profile: BrandStyleProfile | null }>({
    queryKey: ['/api/admin/social/brand-profile'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/social/brand-profile');
      return res.json();
    },
  });

  const uploadAssetMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      if (uploadDescription) formData.append('description', uploadDescription);
      const res = await fetch(buildApiUrl('/api/admin/social/brand-assets'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-assets'] });
      setUploadDescription('');
      toast({ title: 'Asset uploaded', description: 'Your brand reference has been saved.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/social/brand-assets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-assets'] });
      toast({ title: 'Asset removed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const analyzeBrandMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/social/analyze-brand');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-profile'] });
      if (data.success && data.profile) {
        toast({ title: 'Brand style analyzed!', description: data.profile.summary || 'Profile saved.' });
      } else {
        toast({ title: 'Analysis completed', description: 'Brand style profile saved.' });
      }
    },
    onError: (err: Error) => {
      const msg = err.message;
      const friendly = msg.includes('429') || msg.includes('quota')
        ? 'AI provider quota exceeded — check your billing or switch providers in AI Settings.'
        : msg.includes('401') || msg.includes('auth')
        ? 'AI provider authentication failed — check your API keys in environment.'
        : msg;
      toast({ title: 'Analysis failed', description: friendly, variant: 'destructive' });
    },
  });

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(file => uploadAssetMutation.mutate(file));
  }, [uploadAssetMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadAssetMutation.mutate(file));
    e.target.value = '';
  }, [uploadAssetMutation]);

  const brandAssets = brandAssetsQuery.data?.assets ?? [];
  const brandProfile = brandProfileQuery.data?.profile ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/social/generate-posts', {
        platform,
        topic: topic || undefined,
        tone,
        count: postCount,
        includeHashtags,
        contentType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.posts) {
        setGeneratedPosts(data.posts);
        toast({ title: `${data.posts.length} posts generated`, description: 'Click "Generate Image" on any post to create the visual.' });
      }
    },
    onError: (err: Error) => {
      const msg = err.message;
      const friendly = msg.includes('429') || msg.includes('quota')
        ? 'AI provider quota exceeded — check billing or switch providers in AI Settings.'
        : msg;
      toast({ title: 'Generation failed', description: friendly, variant: 'destructive' });
    },
  });

  const imageMutation = useMutation({
    mutationFn: async ({ index }: { index: number }) => {
      const post = generatedPosts[index];
      const res = await apiRequest('POST', '/api/admin/social/generate-image', {
        visualConcept: post.imageOverlay.visualConcept,
        platform: post.platform,
      });
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (data.imageUrl) {
        setGeneratedPosts(prev => {
          const updated = [...prev];
          updated[vars.index] = { ...updated[vars.index], imageUrl: data.imageUrl };
          return updated;
        });
        toast({ title: 'Image generated!' });
      }
    },
    onError: (err: Error) => {
      const msg = err.message;
      const friendly = msg.includes('FAL_KEY')
        ? 'FAL_KEY not set — add it to your environment to enable image generation.'
        : msg.includes('429') || msg.includes('quota')
        ? 'Image generation quota exceeded — check your fal.ai billing.'
        : msg;
      toast({ title: 'Image generation failed', description: friendly, variant: 'destructive' });
    },
    onSettled: () => setGeneratingImageIdx(null),
  });

  const handleGenerateImage = (index: number) => {
    setGeneratingImageIdx(index);
    imageMutation.mutate({ index });
  };

  const ideasMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/social/generate-ideas', { daysAhead });
      return res.json();
    },
    onSuccess: (data) => {
      setWeekTheme(data.weekTheme || '');
      setIdeas(data.ideas || []);
      toast({ title: `${(data.ideas || []).length}-day content plan ready` });
    },
    onError: (err: Error) => {
      const msg = err.message;
      const friendly = msg.includes('429') || msg.includes('quota')
        ? 'AI provider quota exceeded — check billing or switch providers in AI Settings.'
        : msg;
      toast({ title: 'Generation failed', description: friendly, variant: 'destructive' });
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Social Content Studio</h1>
        <p className="text-muted-foreground mt-1">
          Generate AI-crafted social posts with images, headlines, and platform-optimized copy.
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="create" className="gap-1.5 data-[state=active]:bg-white">
            <PenTool className="h-4 w-4" />
            Create Post
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 data-[state=active]:bg-white">
            <LayoutGrid className="h-4 w-4" />
            Content Calendar
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5 data-[state=active]:bg-white">
            <PaletteIcon className="h-4 w-4" />
            Brand Kit
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ CREATE POST TAB ═══════════════ */}
        <TabsContent value="create" className="space-y-6 mt-0">

          {/* Step 1: Platform Selection */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              1. Choose Platform
            </Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                const isSelected = platform === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium',
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-lg scale-[1.02]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Content Type */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              2. Content Type
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {CONTENT_TYPES.map(ct => {
                const Icon = ct.icon;
                const isSelected = contentType === ct.value;
                return (
                  <button
                    key={ct.value}
                    onClick={() => setContentType(ct.value)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-emerald-600' : 'text-gray-400')} />
                    <span className={cn('text-xs font-semibold', isSelected ? 'text-emerald-700' : 'text-gray-700')}>{ct.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{ct.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                3. Configure & Generate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Topic or Theme</Label>
                  <Input
                    placeholder="e.g. sleep optimization, ashwagandha for stress, lab testing explained..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-[10px] text-muted-foreground">Leave empty for AI to pick a trending topic</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Posts</Label>
                  <Select value={String(postCount)} onValueChange={v => setPostCount(Number(v))}>
                    <SelectTrigger className="h-10 w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer h-10 px-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={e => setIncludeHashtags(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  Hashtags
                </label>

                <div className="flex-1" />

                <Button
                  size="lg"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="gap-2 px-6 bg-gray-900 hover:bg-gray-800"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generateMutation.isPending ? 'Generating...' : 'Generate Posts'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {generateMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="font-medium">Crafting your {selectedPlatform.label} posts...</p>
              <p className="text-sm">AI is writing copy, headlines, and creative briefs</p>
            </div>
          )}

          {generatedPosts.length > 0 && !generateMutation.isPending && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{generatedPosts.length} Post{generatedPosts.length > 1 ? 's' : ''} Generated</h2>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => generateMutation.mutate()}>
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate All
                </Button>
              </div>
              {generatedPosts.map((post, i) => (
                <PostResultCard
                  key={i}
                  post={post}
                  index={i}
                  onGenerateImage={handleGenerateImage}
                  isGeneratingImage={generatingImageIdx === i}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ CONTENT CALENDAR TAB ═══════════════ */}
        <TabsContent value="calendar" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Content Calendar Generator
              </CardTitle>
              <CardDescription>
                Generate a multi-day content plan with daily ideas across platforms — ready to execute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Plan Duration</Label>
                  <Select value={String(daysAhead)} onValueChange={v => setDaysAhead(Number(v))}>
                    <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10, 14].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="lg"
                  onClick={() => ideasMutation.mutate()}
                  disabled={ideasMutation.isPending}
                  className="gap-2 bg-gray-900 hover:bg-gray-800"
                >
                  {ideasMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {ideasMutation.isPending ? 'Planning...' : 'Generate Calendar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {ideasMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="font-medium">Building your content calendar...</p>
              <p className="text-sm">AI is planning {daysAhead} days of strategic content</p>
            </div>
          )}

          {ideas.length > 0 && !ideasMutation.isPending && (
            <div className="space-y-4">
              {weekTheme && (
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Lightbulb className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Week Theme</span>
                      <p className="font-semibold text-amber-900">{weekTheme}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div>
                {ideas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} index={i} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ BRAND KIT TAB ═══════════════ */}
        <TabsContent value="brand" className="space-y-6 mt-0">

          {/* Brand Style Profile Card */}
          {brandProfile && (
            <Card className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <Scan className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Active Brand Style</span>
                      <p className="font-semibold text-violet-900">{brandProfile.summary}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Analyzed {brandProfile.assetCount} asset{brandProfile.assetCount === 1 ? '' : 's'} ·{' '}
                    {new Date(brandProfile.analyzedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Color Palette */}
                {brandProfile.colorPalette.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-violet-700">Palette:</span>
                    <div className="flex gap-1.5">
                      {brandProfile.colorPalette.map((color, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-lg border border-white shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Full profile text */}
                <div className="bg-white/60 rounded-lg p-3 text-sm text-violet-800 leading-relaxed">
                  {brandProfile.profile}
                </div>

                <p className="text-[10px] text-violet-600">
                  This style profile is automatically applied to every generated social image.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                Upload Brand References
              </CardTitle>
              <CardDescription>
                Upload your existing social posts, ads, product photos, or logo. The AI will analyze these to match your brand style in generated images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category + Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_post">Social Post</SelectItem>
                      <SelectItem value="ad">Ad / Paid Creative</SelectItem>
                      <SelectItem value="logo">Logo / Branding</SelectItem>
                      <SelectItem value="product">Product Photo</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle / Mood</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Description (optional)</Label>
                  <Input
                    placeholder="e.g. Instagram carousel about sleep, product hero shot..."
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                  isDragging
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50',
                  uploadAssetMutation.isPending && 'opacity-50 pointer-events-none'
                )}
                onClick={() => document.getElementById('brand-file-input')?.click()}
              >
                <input
                  id="brand-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {uploadAssetMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm font-medium">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Drop images here or click to browse</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · Max 10MB each</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Asset Grid */}
          {brandAssets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-gray-500" />
                  Brand Assets ({brandAssets.length})
                </h2>
                <Button
                  onClick={() => analyzeBrandMutation.mutate()}
                  disabled={analyzeBrandMutation.isPending}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                >
                  {analyzeBrandMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4" />
                  )}
                  {analyzeBrandMutation.isPending ? 'Analyzing...' : brandProfile ? 'Re-analyze Brand Style' : 'Analyze Brand Style'}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {brandAssets.map(asset => (
                  <div key={asset.id} className="group relative rounded-xl border overflow-hidden bg-gray-50">
                    <div className="aspect-square">
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => deleteAssetMutation.mutate(asset.id)}
                        disabled={deleteAssetMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                    {/* Info bar */}
                    <div className="p-2 border-t bg-white">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {asset.category.replace('_', ' ')}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground truncate">{asset.filename}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {brandAssets.length === 0 && !brandAssetsQuery.isLoading && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="font-semibold text-gray-600 mb-1">No brand assets yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Upload your existing social posts, ads, product photos, or logo above.
                  The AI will analyze them to create a brand style profile that guides image generation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {brandAssetsQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
