import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/shared/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import {
  Watch,
  Activity,
  Heart,
  CheckCircle2,
  XCircle,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  Plus,
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface WearableConnection {
  id: string;
  userId: string;
  provider: string;
  providerName: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  lastSyncedAt: string | null;
  source: 'junction';
  logo?: string;
}

// Priority providers for ONES - Activity focused
// Junction API provides logos at: https://storage.googleapis.com/vital-assets/{slug}.png
const PRIORITY_PROVIDERS = [
  { slug: 'garmin', name: 'Garmin', priority: 1, description: 'Fitness watches & GPS', logo: 'https://storage.googleapis.com/vital-assets/garmin.png' },
  { slug: 'google_fit', name: 'Google Fit', priority: 2, description: 'Android health platform', logo: 'https://storage.googleapis.com/vital-assets/googlefit.png' },
  { slug: 'fitbit', name: 'Fitbit', priority: 3, description: 'Activity trackers', logo: 'https://storage.googleapis.com/vital-assets/fitbit.png' },
  { slug: 'oura', name: 'Oura Ring', priority: 4, description: 'Sleep & recovery tracking', logo: 'https://storage.googleapis.com/vital-assets/oura.png' },
  { slug: 'whoop_v2', name: 'WHOOP', priority: 5, description: 'Strain & recovery coach', logo: 'https://storage.googleapis.com/vital-assets/whoop.png' },
  { slug: 'peloton', name: 'Peloton', priority: 6, description: 'Connected fitness', logo: 'https://storage.googleapis.com/vital-assets/peloton.png' },
  { slug: 'freestyle_libre', name: 'Freestyle Libre', priority: 7, description: 'Continuous glucose monitoring', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgNDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDQ4OGEiIHJ4PSI0Ii8+PHRleHQgeD0iNTAiIHk9IjI2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWJib3R0PC90ZXh0Pjwvc3ZnPg==' },
];

const PROVIDER_COLORS: Record<string, { color: string; bgColor: string }> = {
  garmin: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  google_fit: { color: 'text-green-600', bgColor: 'bg-green-50' },
  fitbit: { color: 'text-[#00B0B9]', bgColor: 'bg-[#00B0B9]/10' },
  oura: { color: 'text-[#0B0F1C]', bgColor: 'bg-slate-100' },
  whoop_v2: { color: 'text-black', bgColor: 'bg-yellow-50' },
  whoop: { color: 'text-black', bgColor: 'bg-yellow-50' },
  peloton: { color: 'text-red-600', bgColor: 'bg-red-50' },
  freestyle_libre: { color: 'text-blue-500', bgColor: 'bg-blue-50' },
};

function ProviderLogo({ provider, logo, size = 'md' }: { provider: string; logo?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  // Try provider logo from Junction API
  const logoUrl = logo || `https://storage.googleapis.com/vital-assets/${provider}.png`;

  if (imgError) {
    return <Watch className={`${sizeClasses[size]} text-muted-foreground`} />;
  }

  return (
    <img
      src={logoUrl}
      alt={`${provider} logo`}
      className={`${sizeClasses[size]} object-contain rounded-md`}
      onError={() => setImgError(true)}
    />
  );
}

export default function WearablesPage() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch connected devices
  const { data: connections = [], isLoading } = useQuery<WearableConnection[]>({
    queryKey: ['/api/wearables/connections'],
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest('POST', `/api/wearables/disconnect/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/connections'] });
      toast({
        title: 'Device disconnected',
        description: 'Your wearable device has been disconnected successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect device. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/wearables/sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/connections'] });
      toast({
        title: 'Sync initiated',
        description: 'Your wearable data is being synced.',
      });
    },
    onError: () => {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle connect - opens Junction Link widget
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await apiRequest('GET', '/api/wearables/connect');

      if (res.status === 401) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to connect your wearable.',
          variant: 'destructive',
        });
        window.location.href = '/login?next=/dashboard/wearables';
        return;
      }

      const data = await res.json();
      if (data?.linkUrl) {
        // Redirect to Junction Link widget
        window.location.href = data.linkUrl;
      } else {
        toast({
          title: 'Connection error',
          description: data?.error || 'Failed to start the connection flow.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Connect error', err);
      toast({
        title: 'Network error',
        description: 'Could not reach the server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 sm:px-0">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B4332]">Wearable Devices</h1>
          <p className="text-sm sm:text-base text-[#52796F] mt-2">
            Connect your fitness trackers to personalize your supplement formula based on your activity, sleep, and recovery data.
          </p>
        </div>

        {/* Buttons - Full width on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          {connections.length > 0 && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="w-full sm:w-auto border-[#1B4332] text-[#1B4332]"
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Data
            </Button>
          )}
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full sm:w-auto bg-[#1B4332] hover:bg-[#1B4332]/90"
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Connect Device
          </Button>
        </div>
      </div>

      {/* Connected Devices */}
      {connections.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => {
            const colors = PROVIDER_COLORS[connection.provider] || { color: 'text-gray-600', bgColor: 'bg-gray-100' };

            return (
              <Card key={connection.id} className="relative overflow-hidden bg-[#FAF7F2] border-[#52796F]/20">
                <div className={`absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 ${colors.bgColor} rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 opacity-20`} />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2 sm:p-3 rounded-lg ${colors.bgColor}`}>
                      <ProviderLogo provider={connection.provider} logo={connection.logo} size="md" />
                    </div>
                    <Badge
                      variant={connection.status === 'connected' ? 'default' : connection.status === 'error' ? 'destructive' : 'secondary'}
                      className="gap-1 text-xs whitespace-nowrap bg-[#1B4332]"
                    >
                      {connection.status === 'connected' ? (
                        <><CheckCircle2 className="h-3 w-3" /> Connected</>
                      ) : connection.status === 'error' ? (
                        <><XCircle className="h-3 w-3" /> Error</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Disconnected</>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg text-[#1B4332]">{connection.providerName}</CardTitle>
                  <CardDescription className="text-[#52796F]">
                    Syncing activity, sleep & recovery data
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#52796F]">Connected</span>
                      <span className="font-medium text-[#1B4332]">
                        {new Date(connection.connectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {connection.lastSyncedAt && (
                      <div className="flex justify-between">
                        <span className="text-[#52796F]">Last synced</span>
                        <span className="font-medium text-[#1B4332]">
                          {new Date(connection.lastSyncedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={disconnectMutation.isPending}
                    size="sm"
                  >
                    {disconnectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed bg-[#FAF7F2] border-[#52796F]/30">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <div className="h-12 w-12 rounded-full bg-[#1B4332]/10 flex items-center justify-center mb-4">
              <Watch className="h-6 w-6 text-[#1B4332]" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#1B4332]">No devices connected</h3>
            <p className="text-[#52796F] text-center text-sm sm:text-base max-w-md mb-4">
              Connect your wearable device to get personalized supplement recommendations based on your activity, sleep, and recovery data.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full sm:w-auto bg-[#1B4332] hover:bg-[#1B4332]/90"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Connect Your First Device
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Priority Providers */}
      <Card className="bg-[#FAF7F2] border-[#52796F]/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#1B4332]">
            <Sparkles className="h-5 w-5 text-[#1B4332]" />
            Featured Integrations
          </CardTitle>
          <CardDescription className="text-[#52796F]">
            Connect your favorite fitness tracker to unlock personalized supplement recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PRIORITY_PROVIDERS.map((provider) => {
              const colors = PROVIDER_COLORS[provider.slug] || { color: 'text-gray-600', bgColor: 'bg-gray-100' };
              const isConnected = connections.some(c => c.provider === provider.slug || c.provider === provider.slug.replace('_v2', ''));

              return (
                <div
                  key={provider.slug}
                  className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all ${isConnected
                    ? 'border-green-500 bg-green-50/50'
                    : 'border-transparent bg-white/50 hover:bg-white hover:border-[#1B4332]/20'
                    }`}
                >
                  <div className={`p-2 rounded-lg ${colors.bgColor} flex-shrink-0`}>
                    <ProviderLogo provider={provider.slug} logo={provider.logo} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate text-[#1B4332]">{provider.name}</span>
                      {isConnected && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-[#52796F] truncate">{provider.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#52796F] mt-4">
            Click "Connect Device" above to link any of these providers. Historical data (up to 180 days) will be automatically imported for AI analysis.
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      {connections.length > 0 && (
        <Card className="bg-[#FAF7F2] border-[#52796F]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1B4332]">How It Works</CardTitle>
            <CardDescription className="text-[#52796F]">
              Your connected devices help us optimize your supplement formula
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-[#1B4332]">1</span>
                  </div>
                  <h4 className="font-medium text-[#1B4332]">Data Collection</h4>
                </div>
                <p className="text-sm text-[#52796F] pl-10">
                  We securely sync your sleep, activity, and recovery metrics daily
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-[#1B4332]">2</span>
                  </div>
                  <h4 className="font-medium text-[#1B4332]">AI Analysis</h4>
                </div>
                <p className="text-sm text-[#52796F] pl-10">
                  Our AI identifies trends and patterns in your biometric data
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-[#1B4332]">3</span>
                  </div>
                  <h4 className="font-medium text-[#1B4332]">Personalization</h4>
                </div>
                <p className="text-sm text-[#52796F] pl-10">
                  Your formula is automatically adjusted based on your body's needs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
