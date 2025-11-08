import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Watch, Activity, Heart, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface WearableConnection {
  id: string;
  userId: string;
  provider: 'fitbit' | 'oura' | 'whoop';
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  lastSyncedAt: string | null;
  providerUserId: string | null;
}

const PROVIDER_INFO = {
  fitbit: {
    name: 'Fitbit',
    description: 'Track steps, heart rate, sleep, and daily activity',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  oura: {
    name: 'Oura Ring',
    description: 'Monitor sleep quality, HRV, and recovery metrics',
    icon: Watch,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  whoop: {
    name: 'WHOOP',
    description: 'Analyze strain, recovery, and sleep performance',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
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

  const handleConnect = (provider: 'fitbit' | 'oura' | 'whoop') => {
    window.location.href = `/api/wearables/connect/${provider}`;
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  const getConnectionStatus = (provider: 'fitbit' | 'oura' | 'whoop') => {
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
        {(Object.keys(PROVIDER_INFO) as Array<'fitbit' | 'oura' | 'whoop'>).map((provider) => {
          const info = PROVIDER_INFO[provider];
          const connection = getConnectionStatus(provider);
          const Icon = info.icon;

          return (
            <Card key={provider} className="relative overflow-hidden" data-testid={`card-wearable-${provider}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${info.bgColor} rounded-full -mr-16 -mt-16 opacity-20`} />
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${info.bgColor}`}>
                    <Icon className={`h-6 w-6 ${info.color}`} />
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
