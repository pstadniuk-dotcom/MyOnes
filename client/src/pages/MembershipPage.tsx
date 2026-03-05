import { useState } from 'react';
import { useLocation } from 'wouter';
import { Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface MembershipTier {
  id: string;
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number;
  currentCount: number;
  benefits: string[];
}

type Plan = 'monthly' | 'quarterly' | 'annual';

const PLAN_OPTIONS: { key: Plan; label: string; discount: number; intervalCount: number }[] = [
  { key: 'monthly',   label: 'Monthly',   discount: 0,    intervalCount: 1  },
  { key: 'quarterly', label: 'Quarterly', discount: 0.10, intervalCount: 3  },
  { key: 'annual',    label: 'Annual',    discount: 0.15, intervalCount: 12 },
];

const MEMBERSHIP_BENEFITS = [
  'Unlimited AI health consultations',
  'Lab and wearable data analysis',
  'Supplements at member pricing (15% savings)',
  'Formula updates as your health evolves',
  'Lab testing at member rates',
  'Future platform upgrades included',
];

function planPrice(priceCents: number, plan: Plan): { perMonth: number; total: number; label: string } {
  const opt = PLAN_OPTIONS.find(p => p.key === plan)!;
  const monthlyBase = priceCents / 100;
  const total = Math.round(monthlyBase * opt.intervalCount * (1 - opt.discount));
  const perMonth = Math.round((total / opt.intervalCount) * 100) / 100;
  const label = plan === 'monthly' ? '/mo' : plan === 'quarterly' ? '/quarter' : '/year';
  return { perMonth, total, label };
}

export default function MembershipPage() {
  const [plan, setPlan] = useState<Plan>('monthly');
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: tiers, isLoading, error } = useQuery<MembershipTier[]>({
    queryKey: ['/api/membership/tiers'],
    queryFn: () => fetch('/api/membership/tiers').then(r => r.json()),
    staleTime: 60_000,
  });

  // Find first tier with capacity
  const activeTier = tiers?.find(t => t.currentCount < t.maxCapacity) ?? tiers?.[tiers.length - 1];

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/billing/checkout/session', { plan });
      const data = await res.json();
      return data as { checkoutUrl: string; sessionId: string; expiresAt: string };
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (err: any) => {
      const msg = err?.message || '';
      if (msg.includes('already has an active membership')) {
        navigate('/dashboard');
        return;
      }
      if (msg.includes('No membership tier')) {
        toast({ title: 'No spots available', description: 'All membership tiers are currently full.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Something went wrong', description: 'Unable to start checkout. Please try again.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#ede8e2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#054700]" />
      </div>
    );
  }

  if (error || !activeTier) {
    return (
      <div className="min-h-screen bg-[#ede8e2] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#054700] mb-2">Membership unavailable</h2>
          <p className="text-[#5a6623] text-sm">We couldn't load membership options. Please try again later.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-6">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { perMonth, total, label } = planPrice(activeTier.priceCents, plan);
  const spotsRemaining = activeTier.maxCapacity - activeTier.currentCount;
  const tierLabel = activeTier.name.replace(' Member', '').replace(' Adopter', '');

  return (
    <div className="min-h-screen bg-[#ede8e2] flex flex-col items-center justify-center px-6 py-16">
      {/* Header */}
      <div className="text-center mb-10 max-w-lg">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">Membership</span>
        <h1 className="mt-3 text-4xl text-[#054700] font-light leading-tight">
          Lock in your rate <span className="font-medium">forever</span>
        </h1>
        {spotsRemaining > 0 && (
          <p className="mt-3 text-[#D4A574] font-medium text-sm">
            {spotsRemaining} {tierLabel} spots remaining
          </p>
        )}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#054700]/5 overflow-hidden">
        {/* Card header */}
        <div className="bg-[#054700] px-8 py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white/80 text-sm mb-4">
            🎉 {tierLabel} Member
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-light text-white">${plan === 'monthly' ? perMonth : `${total}`}</span>
            <span className="text-white/60">{label}</span>
          </div>
          {plan !== 'monthly' && (
            <p className="mt-2 text-white/60 text-sm">${perMonth}/mo effective</p>
          )}
        </div>

        {/* Plan selector */}
        <div className="px-8 pt-6">
          <div className="flex rounded-full border border-[#054700]/20 p-1 gap-1">
            {PLAN_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setPlan(opt.key)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  plan === opt.key
                    ? 'bg-[#054700] text-white'
                    : 'text-[#5a6623] hover:text-[#054700]'
                }`}
              >
                {opt.label}
                {opt.discount > 0 && (
                  <span className={`ml-1 text-xs ${plan === opt.key ? 'text-white/70' : 'text-[#D4A574]'}`}>
                    −{opt.discount * 100}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="px-8 py-6">
          <ul className="space-y-3 mb-6">
            {MEMBERSHIP_BENEFITS.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#054700]/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#054700]" />
                </div>
                <span className="text-[#2D3436] text-sm">{benefit}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="w-full bg-[#054700] hover:bg-[#043d00] text-white py-6 text-base rounded-full group"
          >
            {checkoutMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to checkout…</>
            ) : (
              <>Continue to checkout <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
            )}
          </Button>

          <div className="mt-5 pt-5 border-t border-[#054700]/10 text-center space-y-1">
            <p className="text-xs text-[#5a6623]">Cancel anytime. Rejoin within 3 months to keep your rate.</p>
            <p className="text-xs text-[#5a6623]">Your tier is locked when you become a paying member.</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#5a6623]">
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
