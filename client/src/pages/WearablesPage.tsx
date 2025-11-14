import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Watch, Activity, Heart, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import fitbitIcon from '@assets/Fitbit_app_icon_1763160710769.png';
import ouraIcon from '@assets/ŌURA_idZ5mfVnXd_2_1763160796894.jpeg';
import whoopIcon from '@assets/WHOOP_idNTL3Ndjp_1_1763160952445.png';

interface WearableConnection {
  id: string;
  userId: string;
  provider: 'fitbit' | 'oura' | 'whoop' | 'apple';
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  lastSyncedAt: string | null;
  providerUserId: string | null;
}

// Real company logos as inline SVG components (used as fallback)
const WhoopLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor">W</text>
  </svg>
);

const OuraLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <rect x="8" y="2" width="8" height="2" fill="currentColor"/>
  </svg>
);

// Optional image paths (served from client/public). We try several extensions in order.
const PROVIDER_IMAGES: Record<'fitbit' | 'oura' | 'whoop' | 'apple', string[] | null> = {
  fitbit: [fitbitIcon],
  oura: [ouraIcon],
  whoop: [whoopIcon],
  apple: null,
};

function ProviderLogo({
  provider,
  Inline,
  name,
}: {
  provider: 'fitbit' | 'oura' | 'whoop' | 'apple';
  Inline: React.ComponentType;
  name: string;
}) {
  const [idx, setIdx] = useState(0);
  const candidates = PROVIDER_IMAGES[provider];
  const src = candidates?.[idx];
  if (!src) return <Inline />;
  return (
    <img
      src={src}
      alt={`${name} logo`}
      className="h-6 w-6 object-contain rounded-md"
      onError={() => {
        // advance to next candidate, or fall back to inline
        setIdx((i) => i + 1);
      }}
      loading="lazy"
      decoding="async"
    />
  );
}

const FitbitLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <circle cx="6" cy="12" r="1.5"/>
    <circle cx="9" cy="9" r="1.8"/>
    <circle cx="9" cy="15" r="1.8"/>
    <circle cx="12" cy="6" r="2"/>
    <circle cx="12" cy="12" r="2.2"/>
    <circle cx="12" cy="18" r="2"/>
    <circle cx="15" cy="9" r="1.8"/>
    <circle cx="15" cy="15" r="1.8"/>
    <circle cx="18" cy="12" r="1.5"/>
  </svg>
);

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const PROVIDER_INFO = {
  fitbit: {
    name: 'Fitbit',
    description: 'Track steps, heart rate, sleep, and daily activity',
    logo: FitbitLogo,
    color: 'text-[#00B0B9]',
    bgColor: 'bg-[#00B0B9]/10',
  },
  oura: {
    name: 'Oura Ring',
    description: 'Monitor sleep quality, HRV, and recovery metrics',
    logo: OuraLogo,
    color: 'text-[#0B0F1C]',
    bgColor: 'bg-slate-100',
  },
  whoop: {
    name: 'WHOOP',
    description: 'Analyze strain, recovery, and sleep performance',
    logo: WhoopLogo,
    color: 'text-[#000000]',
    bgColor: 'bg-slate-100',
  },
  apple: {
    name: 'Apple Watch',
    description: 'Sync health data from Apple Health and Apple Watch',
    logo: AppleLogo,
    color: 'text-slate-800',
    bgColor: 'bg-slate-100',
  },
};

export default function WearablesPage() {
  const { toast } = useToast();

  const { data: connections = [], isLoading } = useQuery<WearableConnection[]>({
    queryKey: ['/api/wearables/connections'],
  });

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

  const handleConnect = (provider: 'fitbit' | 'oura' | 'whoop' | 'apple') => {
    if (provider === 'apple') {
      toast({
        title: 'Coming Soon',
        description: 'Apple Watch integration will be available soon!',
      });
      return;
    }
    window.location.href = `/api/wearables/connect/${provider}`;
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  const getConnectionStatus = (provider: 'fitbit' | 'oura' | 'whoop' | 'apple') => {
    return connections.find((conn) => conn.provider === provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wearable Devices</h1>
        <p className="text-muted-foreground mt-2">
          Connect your fitness trackers to personalize your supplement formula based on your activity, sleep, and recovery data.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(PROVIDER_INFO) as Array<'fitbit' | 'oura' | 'whoop' | 'apple'>).map((provider) => {
          const info = PROVIDER_INFO[provider];
          const connection = getConnectionStatus(provider);
          const Logo = info.logo;

          return (
            <Card key={provider} className="relative overflow-hidden" data-testid={`card-wearable-${provider}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${info.bgColor} rounded-full -mr-16 -mt-16 opacity-20`} />
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${info.bgColor}`}>
                    <div className={info.color}>
                      <ProviderLogo provider={provider} Inline={Logo} name={info.name} />
                    </div>
                  </div>
                  {connection && (
                    <Badge 
                      variant={connection.status === 'connected' ? 'default' : connection.status === 'error' ? 'destructive' : 'secondary'}
                      className="gap-1" 
                      data-testid={`badge-status-${provider}`}
                    >
                      {connection.status === 'connected' ? (
                        <><CheckCircle2 className="h-3 w-3" /> Connected</>
                      ) : connection.status === 'error' ? (
                        <><XCircle className="h-3 w-3" /> Error</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Disconnected</>
                      )}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{info.name}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {connection ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {connection.status === 'connected' ? 'Connected' : connection.status === 'error' ? 'Last connected' : 'Disconnected'}
                        </span>
                        <span className="font-medium" data-testid={`text-connected-date-${provider}`}>
                          {new Date(connection.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {connection.lastSyncedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last synced</span>
                          <span className="font-medium" data-testid={`text-last-synced-${provider}`}>
                            {new Date(connection.lastSyncedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {connection.status === 'error' && (
                        <p className="text-sm text-destructive" data-testid={`text-error-message-${provider}`}>
                          Sync error. Please reconnect your device.
                        </p>
                      )}
                    </div>
                    
                    {connection.status === 'connected' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={disconnectMutation.isPending}
                        data-testid={`button-disconnect-${provider}`}
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
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleConnect(provider)}
                        data-testid={`button-reconnect-${provider}`}
                      >
                        Reconnect {info.name}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(provider)}
                    data-testid={`button-connect-${provider}`}
                  >
                    Connect {info.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Your connected devices help us optimize your supplement formula
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">1</span>
                  </div>
                  <h4 className="font-medium">Data Collection</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  We securely sync your sleep, activity, and recovery metrics daily
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">2</span>
                  </div>
                  <h4 className="font-medium">AI Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Our AI identifies trends and patterns in your biometric data
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">3</span>
                  </div>
                  <h4 className="font-medium">Personalization</h4>
                </div>
                <p className="text-sm text-muted-foreground">
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
