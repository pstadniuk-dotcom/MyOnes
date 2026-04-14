import { useState } from 'react';
import { useLocation } from 'wouter';
import { Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import CollectJSCheckout from '@/components/checkout/CollectJSCheckout';

interface MembershipTier {
  id: string;
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number;
  currentCount: number;
  benefits: string[];
}

const MEMBERSHIP_BENEFITS = [
  'Unlimited AI health consultations',
  'Lab and wearable data analysis',
  'Supplements at member pricing (15% savings)',
  'Formula updates as your health evolves',
  'Lab testing at member rates',
  'Future platform upgrades included',
];

export default function MembershipPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const { data: tiers, isLoading, error } = useQuery<MembershipTier[]>({
    queryKey: ['/api/membership/tiers'],
    queryFn: () => fetch('/api/membership/tiers').then(r => r.json()),
    staleTime: 60_000,
  });

  // Find first tier with capacity
  const activeTier = tiers?.find(t => t.currentCount < t.maxCapacity) ?? tiers?.[tiers.length - 1];

  const checkoutMutation = useMutation({
    mutationFn: async (paymentToken: string) => {
      const res = await apiRequest('POST', '/api/billing/checkout', {
        paymentToken,
        includeMembership: true,
        plan: 'monthly',
      });
      const data = await res.json();
      return data as { success: boolean; orderId?: string; membershipActivated?: boolean; error?: string };
    },
    onSuccess: (data) => {
      setShowPayment(false);
      setPaymentSubmitting(false);
      navigate(`/membership/success?membership=1&order_id=${data.orderId || ''}`);
    },
    onError: (err: any) => {
      setPaymentSubmitting(false);
      const msg = err?.message || '';
      if (msg.includes('already has an active membership')) {
        navigate('/dashboard');
        return;
      }
      if (msg.includes('No membership tier')) {
        toast({ title: 'No spots available', description: 'All membership tiers are currently full.', variant: 'destructive' });
        return;
      }
      if (msg.includes('PAYMENT_DECLINED')) {
        toast({ title: 'Payment Declined', description: msg.replace('PAYMENT_DECLINED: ', ''), variant: 'destructive' });
        return;
      }
      toast({ title: 'Something went wrong', description: 'Unable to process payment. Please try again.', variant: 'destructive' });
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

  const monthlyPrice = activeTier.priceCents / 100;
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
            <span className="text-5xl font-light text-white">${monthlyPrice}</span>
            <span className="text-white/60">/mo</span>
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
            onClick={() => setShowPayment(true)}
            disabled={checkoutMutation.isPending}
            className="w-full bg-[#054700] hover:bg-[#043d00] text-white py-6 text-base rounded-full group"
          >
            Continue to checkout <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Dialog open={showPayment} onOpenChange={setShowPayment}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete Membership</DialogTitle>
                <DialogDescription>
                  Enter your payment details to activate your {activeTier?.name || 'Founding'} membership at ${monthlyPrice}/mo.
                </DialogDescription>
              </DialogHeader>
              <CollectJSCheckout
                onToken={(token) => {
                  setPaymentSubmitting(true);
                  checkoutMutation.mutate(token);
                }}
                loading={paymentSubmitting}
                showShipping={false}
                buttonText="Activate Membership"
                totalAmount={String(monthlyPrice)}
              />
            </DialogContent>
          </Dialog>

          <div className="mt-5 pt-5 border-t border-[#054700]/10 text-center space-y-1">
            <p className="text-xs text-[#5a6623]">Cancel anytime. Rejoin within 3 months to keep your rate.</p>
            <p className="text-xs text-[#5a6623]">Your tier is locked when you become a paying member.</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#5a6623]">
        Secure checkout
      </p>
    </div>
  );
}
