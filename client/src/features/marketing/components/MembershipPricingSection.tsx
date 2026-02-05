import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MembershipTier {
  id: string;
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number;
  currentCount: number;
  sortOrder: number;
  isActive: boolean;
  benefits: string[];
}

// Fallback tiers if API fails
const fallbackTiers = [
  { id: 'founding', name: 'Founding', limit: 250, claimed: 0, priceMonthly: 9, priceYearly: 99, active: true },
  { id: 'early', name: 'Early', limit: 1000, claimed: 0, priceMonthly: 15, priceYearly: 149, active: false },
  { id: 'beta', name: 'Beta', limit: 5000, claimed: 0, priceMonthly: 19, priceYearly: 199, active: false },
  { id: 'standard', name: 'Standard', limit: null as number | null, claimed: 0, priceMonthly: 29, priceYearly: 299, active: false },
];

const membershipIncludes = [
  "Unlimited AI health consultations",
  "Lab and wearable data analysis",
  "Supplements at member pricing (15-20% savings)",
  "Formula updates as your health evolves",
  "Lab testing at member rates",
  "Direct AI practitioner messaging",
];

// Transform API tiers to display format
function transformTiers(apiTiers: MembershipTier[]) {
  return apiTiers.map(tier => ({
    id: tier.tierKey,
    name: tier.name.replace(' Member', '').replace(' Adopter', ''),
    limit: tier.maxCapacity >= 999999 ? null : tier.maxCapacity,
    claimed: tier.currentCount,
    priceMonthly: tier.priceCents / 100,
    priceYearly: Math.round((tier.priceCents / 100) * 10.5), // ~12.5% annual discount
    active: false, // Will be set below
  }));
}

// Find the first tier with available capacity
function findActiveTier(tiers: ReturnType<typeof transformTiers>) {
  for (const tier of tiers) {
    if (tier.limit === null || tier.claimed < tier.limit) {
      return { ...tier, active: true };
    }
  }
  return { ...tiers[tiers.length - 1], active: true }; // Fallback to last tier
}

export default function MembershipPricingSection() {
  // Fetch tiers from API
  const { data: apiTiers, isLoading } = useQuery<MembershipTier[]>({
    queryKey: ['/api/membership/tiers'],
    queryFn: async () => {
      const res = await fetch('/api/membership/tiers');
      if (!res.ok) throw new Error('Failed to fetch tiers');
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Transform and prepare tiers for display
  const rawTiers = apiTiers && apiTiers.length > 0 ? transformTiers(apiTiers) : fallbackTiers;
  const activeTierData = findActiveTier(rawTiers);
  
  // Mark the active tier in the tiers array
  const tiers = rawTiers.map(t => ({
    ...t,
    active: t.id === activeTierData.id
  }));

  const activeTier = activeTierData;
  const spotsRemaining = activeTier.limit ? activeTier.limit - activeTier.claimed : null;
  const savingsPercent = Math.round((1 - activeTier.priceMonthly / 49) * 100);

  // Loading state
  if (isLoading) {
    return (
      <section id="pricing" className="py-24 md:py-32 bg-[#FAF7F2]">
        <div className="container mx-auto px-6 max-w-5xl flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B4332]" />
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[#FAF7F2]">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            Membership
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Lock in your rate{" "}
            <span className="font-medium">forever</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F]">
            Early members get founding pricing for ongoing AI consultations and formula optimization.
          </p>
        </div>

        {/* Tier Slider Visual */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            {/* Price points */}
            <div className="flex justify-between items-end mb-4 px-2">
              {tiers.map((tier, index) => (
                <div key={tier.id} className="text-center flex-1">
                  <div className={`text-2xl md:text-3xl font-light ${
                    tier.active ? "text-[#1B4332]" : "text-[#1B4332]/40"
                  }`}>
                    ${tier.priceMonthly}
                    <span className="text-sm font-normal">/mo</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-[#1B4332]/10 rounded-full mb-4">
              <div 
                className="absolute left-0 top-0 h-full bg-[#1B4332] rounded-full transition-all duration-500"
                style={{ width: `${((activeTier.claimed || 0) / (activeTier.limit || 100)) * 25}%` }}
              />
              {/* Tier markers */}
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                    tier.active 
                      ? "bg-[#1B4332] border-[#1B4332]" 
                      : index < tiers.findIndex(t => t.active)
                        ? "bg-[#1B4332] border-[#1B4332]"
                        : "bg-white border-[#1B4332]/30"
                  }`}
                  style={{ left: `${index * 33.33}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </div>

            {/* Tier labels */}
            <div className="flex justify-between items-start px-2">
              {tiers.map((tier) => (
                <div key={tier.id} className="text-center flex-1">
                  <div className={`text-sm font-medium ${
                    tier.active ? "text-[#1B4332]" : "text-[#1B4332]/40"
                  }`}>
                    {tier.name}
                  </div>
                  <div className={`text-xs mt-1 ${
                    tier.active ? "text-[#52796F]" : "text-[#52796F]/40"
                  }`}>
                    {tier.limit ? `First ${tier.limit.toLocaleString()}` : "After launch"}
                  </div>
                  {tier.active && spotsRemaining && (
                    <div className="text-xs text-[#D4A574] font-medium mt-1">
                      {spotsRemaining} spots left
                    </div>
                  )}
                  {!tier.active && tier.id !== 'standard' && (
                    <div className="text-xs text-[#52796F]/40 mt-1">
                      Coming next
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Membership Card */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl shadow-[#1B4332]/5 overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#1B4332] px-8 py-8 text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white/80 text-sm mb-4">
                🎉 {activeTier.name} Member
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl md:text-6xl font-light text-white">${activeTier.priceMonthly}</span>
                <span className="text-white/60">/month forever</span>
              </div>
              <p className="mt-3 text-white/70 text-sm">
                {savingsPercent > 0 ? `${savingsPercent}% off standard pricing, locked for life` : 'Standard pricing'}
              </p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-8">
              <ul className="space-y-4 mb-8">
                {membershipIncludes.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#1B4332]" />
                    </div>
                    <span className="text-[#2D3436]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup">
                <Button 
                  className="w-full bg-[#1B4332] hover:bg-[#143728] text-white py-6 text-lg rounded-full group"
                >
                  Claim Your {activeTier.name} Spot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {/* Annual option */}
              <div className="mt-6 text-center">
                <p className="text-sm text-[#52796F]">
                  Or pay annually: <span className="font-medium text-[#1B4332]">${activeTier.priceYearly}/year</span>
                  <span className="text-[#D4A574]"> (save ${activeTier.priceMonthly * 12 - activeTier.priceYearly})</span>
                </p>
              </div>

              {/* Policy notes */}
              <div className="mt-6 pt-6 border-t border-[#1B4332]/10 text-center">
                <p className="text-xs text-[#52796F]">
                  Cancel anytime. Rejoin within 3 months to keep your rate.
                </p>
                <p className="text-xs text-[#52796F] mt-1">
                  Your tier is locked when you become a paying member.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[#52796F]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>No credit card to start</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>Rate locked forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
