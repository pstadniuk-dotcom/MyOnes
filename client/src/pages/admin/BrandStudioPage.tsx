/**
 * Brand Studio — Centralized brand identity management + AI asset generation.
 * Manages brand kit (logos, colors, assets), generates on-brand images with fal.ai
 * model selection, and provides a unified asset library.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import {
  Palette,
  Upload,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Download,
  RefreshCw,
  Eye,
  ArrowUpFromLine,
  Layers,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ── Model Options ───────────────────────────────────────────────────────────

const IMAGE_MODEL_OPTIONS = [
  { value: 'fal-ai/flux-pro/v1.1', label: 'FLUX Pro 1.1', description: 'Premium photorealism — hero shots, lifestyle, editorial' },
  { value: 'fal-ai/ideogram/v3', label: 'Ideogram v3', description: 'Best text rendering — logos, branded graphics, quotes' },
  { value: 'fal-ai/recraft-v3', label: 'Recraft v3', description: 'Illustrations, icons, ingredient art, infographics' },
  { value: 'fal-ai/nano-banana-2', label: 'Nano Banana 2', description: 'Fast and affordable — quick drafts, social media' },
  { value: 'fal-ai/seedream-3', label: 'Seedream 3', description: 'Editorial and stylized imagery' },
  { value: 'fal-ai/gpt-image-1', label: 'GPT Image 1', description: 'Strong prompt adherence and photorealism' },
  { value: 'fal-ai/flux/dev', label: 'FLUX.1 Dev', description: 'Good all-rounder, open-weight' },
];

const ASSET_CATEGORIES = [
  { value: 'social_post', label: 'Social Post' },
  { value: 'ad', label: 'Ad Creative' },
  { value: 'logo', label: 'Logo' },
  { value: 'product', label: 'Product Photo' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'hero', label: 'Hero Image' },
  { value: 'other', label: 'Other' },
];

const GENERATION_PRESETS = [
  {
    id: 'hero',
    label: 'Hero Image',
    icon: Layers,
    prompt: 'Cinematic wide hero shot for a premium health supplement brand landing page. Capsules artfully arranged with natural botanicals, soft golden-hour lighting, shallow depth of field, clean white space for text overlay.',
    model: 'fal-ai/flux-pro/v1.1',
    size: 'landscape_16_9',
    category: 'hero',
  },
  {
    id: 'social',
    label: 'Social Post',
    icon: ImageIcon,
    prompt: 'Clean social media image for a supplement brand. Vibrant but natural colors, modern minimal aesthetic, wellness theme.',
    model: 'fal-ai/flux-pro/v1.1',
    size: 'square',
    category: 'social_post',
  },
  {
    id: 'ingredient',
    label: 'Ingredient Art',
    icon: Palette,
    prompt: 'Botanical illustration of a natural supplement ingredient. Detailed, scientific accuracy, warm earth tones, clean background, editorial quality.',
    model: 'fal-ai/recraft-v3',
    size: 'square',
    category: 'illustration',
  },
  {
    id: 'ad',
    label: 'Ad Creative',
    icon: Wand2,
    prompt: 'Professional advertising creative. Premium supplement capsules with clean modern packaging, studio lighting, magazine-quality product photography.',
    model: 'fal-ai/flux-pro/v1.1',
    size: 'square',
    category: 'ad',
  },
  {
    id: 'logo-concept',
    label: 'Logo / Text Graphic',
    icon: Eye,
    prompt: 'Clean minimal brand graphic for "Ones" supplement company. Modern sans-serif typography, health and wellness theme, premium feel.',
    model: 'fal-ai/ideogram/v3',
    size: 'square',
    category: 'logo',
  },
];

// ── Types ───────────────────────────────────────────────────────────────────

interface BrandAsset {
  id: string;
  url: string;
  filename: string;
  category: string;
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

interface GeneratedAsset {
  imageUrl: string;
  modelUsed: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BrandStudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'brand-kit'>('generate');

  // Generate tab state
  const [genPrompt, setGenPrompt] = useState('');
  const [genModel, setGenModel] = useState('fal-ai/flux-pro/v1.1');
  const [genSize, setGenSize] = useState('landscape_16_9');
  const [genCategory, setGenCategory] = useState('other');
  const [genResult, setGenResult] = useState<GeneratedAsset | null>(null);

  // Upload state
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('all');

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/admin/social/brand-assets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/social/brand-assets');
      return res.json();
    },
  });
  const assets: BrandAsset[] = assetsData?.assets || [];

  const { data: profileData } = useQuery({
    queryKey: ['/api/admin/social/brand-profile'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/social/brand-profile');
      return res.json();
    },
  });
  const brandProfile: BrandStyleProfile | null = profileData?.profile || null;

  // ── Mutations ───────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: async (params: { prompt: string; modelId: string; imageSize: string }) => {
      const res = await apiRequest('POST', '/api/admin/brand-studio/generate', params);
      return res.json();
    },
    onSuccess: (data) => {
      setGenResult({ imageUrl: data.imageUrl, modelUsed: data.modelUsed });
      toast({ title: 'Image generated', description: `Using ${data.modelUsed}` });
    },
    onError: (err: any) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (params: { imageUrl: string; category: string; description: string }) => {
      const res = await apiRequest('POST', '/api/admin/brand-studio/save-generated', params);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Asset saved to library' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-assets'] });
      setGenResult(null);
    },
    onError: (err: any) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      if (uploadDescription) formData.append('description', uploadDescription);
      const res = await apiRequest('POST', '/api/admin/social/brand-assets', formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Asset uploaded' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-assets'] });
      setUploadDescription('');
    },
    onError: (err: any) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/social/brand-assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-assets'] });
      toast({ title: 'Asset deleted' });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/social/analyze-brand');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Brand style analyzed', description: 'Profile updated from your assets' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social/brand-profile'] });
    },
    onError: (err: any) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  const upscaleMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest('POST', '/api/admin/brand-studio/upscale', { imageUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setGenResult({ imageUrl: data.imageUrl, modelUsed: 'creative-upscaler' });
      toast({ title: 'Image upscaled' });
    },
    onError: (err: any) => {
      toast({ title: 'Upscale failed', description: err.message, variant: 'destructive' });
    },
  });

  const removeBgMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest('POST', '/api/admin/brand-studio/remove-background', { imageUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setGenResult({ imageUrl: data.imageUrl, modelUsed: 'background-removal' });
      toast({ title: 'Background removed' });
    },
    onError: (err: any) => {
      toast({ title: 'Background removal failed', description: err.message, variant: 'destructive' });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (!genPrompt.trim()) {
      toast({ title: 'Enter a prompt', variant: 'destructive' });
      return;
    }
    generateMutation.mutate({ prompt: genPrompt, modelId: genModel, imageSize: genSize });
  };

  const handlePreset = (preset: typeof GENERATION_PRESETS[0]) => {
    setGenPrompt(preset.prompt);
    setGenModel(preset.model);
    setGenSize(preset.size);
    setGenCategory(preset.category);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) uploadMutation.mutate(imageFile);
  }, [uploadMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const filteredAssets = filterCategory === 'all'
    ? assets
    : assets.filter((a: BrandAsset) => a.category === filterCategory);

  // ── Render ──────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'generate' as const, label: 'Generate', icon: Sparkles },
    { id: 'library' as const, label: 'Asset Library', icon: ImageIcon },
    { id: 'brand-kit' as const, label: 'Brand Kit', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Brand Studio</h1>
        <p className="text-muted-foreground mt-1">
          Generate on-brand assets, manage your brand kit, and build a consistent visual identity across all channels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Generate Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Presets */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium mb-3">Quick Presets</h3>
              <div className="flex flex-wrap gap-2">
                {GENERATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePreset(preset)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border hover:bg-accent transition-colors"
                  >
                    <preset.icon className="h-3.5 w-3.5" />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt + Config */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Prompt</label>
                <textarea
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the image you want to generate..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <select
                    value={genModel}
                    onChange={(e) => setGenModel(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {IMAGE_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {IMAGE_MODEL_OPTIONS.find(o => o.value === genModel)?.description}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Size</label>
                  <select
                    value={genSize}
                    onChange={(e) => setGenSize(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="landscape_16_9">Landscape (16:9)</option>
                    <option value="square">Square (1:1)</option>
                    <option value="portrait_9_16">Portrait (9:16)</option>
                    <option value="landscape_4_3">Landscape (4:3)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Save as</label>
                  <select
                    value={genCategory}
                    onChange={(e) => setGenCategory(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ASSET_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !genPrompt.trim()}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium mb-3">Preview</h3>
              {genResult ? (
                <div className="space-y-3">
                  <img
                    src={genResult.imageUrl}
                    alt="Generated"
                    className="w-full rounded-md border"
                  />
                  <p className="text-xs text-muted-foreground">Model: {genResult.modelUsed}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => saveMutation.mutate({
                        imageUrl: genResult.imageUrl,
                        category: genCategory,
                        description: genPrompt.substring(0, 200),
                      })}
                      disabled={saveMutation.isPending}
                      className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {saveMutation.isPending ? 'Saving...' : 'Save to Library'}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="h-8 px-3 rounded-md border text-xs hover:bg-accent flex items-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => upscaleMutation.mutate(genResult.imageUrl)}
                      disabled={upscaleMutation.isPending}
                      className="flex-1 h-8 rounded-md border text-xs hover:bg-accent flex items-center justify-center gap-1"
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      {upscaleMutation.isPending ? 'Upscaling...' : 'Upscale 2x'}
                    </button>
                    <button
                      onClick={() => removeBgMutation.mutate(genResult.imageUrl)}
                      disabled={removeBgMutation.isPending}
                      className="flex-1 h-8 rounded-md border text-xs hover:bg-accent flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {removeBgMutation.isPending ? 'Removing...' : 'Remove BG'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Select a preset or write a prompt</p>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Profile Summary */}
            {brandProfile && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium mb-2">Active Brand Style</h3>
                <p className="text-xs text-muted-foreground mb-2">{brandProfile.summary}</p>
                {brandProfile.colorPalette.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {brandProfile.colorPalette.map((color, i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Based on {brandProfile.assetCount} assets
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Asset Library Tab ────────────────────────────────────────────── */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Filters + Upload */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Categories</option>
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">
                {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
              onClick={() => document.getElementById('brand-studio-upload')?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadMutation.isPending ? 'Uploading...' : 'Drop images here or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF</p>
              <input
                id="brand-studio-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Asset Grid */}
          {assetsLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="font-medium">No assets yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload brand assets or generate new ones</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAssets.map((asset: BrandAsset) => (
                <div key={asset.id} className="group relative rounded-md border overflow-hidden bg-card">
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40"
                    >
                      <Eye className="h-4 w-4 text-white" />
                    </a>
                    <button
                      onClick={() => deleteMutation.mutate(asset.id)}
                      className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500/80"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="p-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{asset.category}</span>
                    {asset.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{asset.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Brand Kit Tab ────────────────────────────────────────────────── */}
      {activeTab === 'brand-kit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Style Profile */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Brand Style Profile</h3>
              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || assets.length === 0}
                className="h-8 px-3 rounded-md border text-xs hover:bg-accent flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {analyzeMutation.isPending ? 'Analyzing...' : assets.length === 0 ? 'Upload assets first' : 'Re-analyze'}
              </button>
            </div>

            {brandProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Summary</p>
                  <p className="text-sm text-muted-foreground">{brandProfile.summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Color Palette</p>
                  <div className="flex gap-2">
                    {brandProfile.colorPalette.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="h-10 w-10 rounded-md border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Style Description</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{brandProfile.profile}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyzed {brandProfile.assetCount} assets on {new Date(brandProfile.analyzedAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Upload brand assets and click "Re-analyze" to generate your brand style profile.
                  This profile is used to guide all AI image generation across the platform.
                </p>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-medium mb-3">How Brand Studio Works</h3>
              <div className="space-y-3">
                <Step number={1} title="Upload Brand Assets" description="Logos, product photos, existing social posts, ad creatives — anything that represents your visual identity." />
                <Step number={2} title="Analyze Brand Style" description="AI analyzes your uploads to extract colors, photography style, mood, and composition rules into a reusable profile." />
                <Step number={3} title="Generate On-Brand Assets" description="Every image generated across Social Studio, Blog, Meta Ads, and UGC Studio uses your brand profile for consistency." />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-medium mb-3">Model Guide</h3>
              <div className="space-y-2">
                {IMAGE_MODEL_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-start gap-2">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
