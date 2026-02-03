import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, User, FlaskConical, Package, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelData {
  totalSignups: number;
  profilesComplete: number;
  formulasCreated: number;
  firstOrders: number;
  reorders: number;
  conversionRates: {
    signupToProfile: number;
    profileToFormula: number;
    formulaToOrder: number;
    orderToReorder: number;
  };
}

function FunnelStep({
  label,
  count,
  rate,
  icon: Icon,
  isLast = false,
  color = 'bg-primary'
}: {
  label: string;
  count: number;
  rate?: number;
  icon: typeof Users;
  isLast?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex flex-col items-center justify-center min-w-[120px] p-4 rounded-lg text-white",
        color
      )}>
        <Icon className="h-6 w-6 mb-1" />
        <span className="text-2xl font-bold">{count.toLocaleString()}</span>
        <span className="text-xs opacity-90">{label}</span>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center px-2">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          {rate !== undefined && (
            <span className="text-xs font-medium text-muted-foreground mt-1">
              {rate}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ConversionFunnel() {
  const { data, isLoading, error } = useQuery<FunnelData>({
    queryKey: ['/api/admin/analytics/funnel'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-28" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load funnel data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="conversion-funnel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>
          User journey from signup to 90-day reorder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center overflow-x-auto pb-2">
          <FunnelStep
            label="Signups"
            count={data.totalSignups}
            icon={Users}
            rate={data.conversionRates?.signupToProfile}
            color="bg-slate-500"
          />
          <FunnelStep
            label="Profile Done"
            count={data.profilesComplete}
            icon={User}
            rate={data.conversionRates.profileToFormula}
            color="bg-blue-500"
          />
          <FunnelStep
            label="Formula Created"
            count={data.formulasCreated}
            icon={FlaskConical}
            rate={data.conversionRates.formulaToOrder}
            color="bg-violet-500"
          />
          <FunnelStep
            label="First Order"
            count={data.firstOrders}
            icon={Package}
            rate={data.conversionRates.orderToReorder}
            color="bg-emerald-500"
          />
          <FunnelStep
            label="Reorders"
            count={data.reorders}
            icon={RefreshCw}
            isLast
            color="bg-amber-500"
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Signup → Profile</p>
            <p className="text-lg font-semibold">{data.conversionRates.signupToProfile}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Profile → Formula</p>
            <p className="text-lg font-semibold">{data.conversionRates.profileToFormula}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Formula → Order</p>
            <p className="text-lg font-semibold">{data.conversionRates.formulaToOrder}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Order → Reorder (90d)</p>
            <p className="text-lg font-semibold">{data.conversionRates.orderToReorder}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
