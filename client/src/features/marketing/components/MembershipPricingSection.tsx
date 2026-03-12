import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Check, ArrowRight, Loader2, Scale, Layers, ShieldCheck, Package, Beaker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

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
  { id: 'founding', name: 'Founding', limit: 250, claimed: 0, priceMonthly: 9, active: true },
  { id: 'early', name: 'Early', limit: 500, claimed: 0, priceMonthly: 15, active: false },
  { id: 'beta', name: 'Beta', limit: 2000, claimed: 0, priceMonthly: 19, active: false },
  { id: 'standard', name: 'Standard', limit: null as number | null, claimed: 0, priceMonthly: 29, active: false },
];

// Supplement pricing factors
const pricingFactors = [
  { icon: Scale, title: "Daily Milligrams", description: "More total milligrams means more raw material and more capsules per day." },
  { icon: Layers, title: "Ingredient Count", description: "More active ingredients requires additional manufacturing complexity." },
  { icon: ShieldCheck, title: "Premium Ingredients", description: "Clinical-grade bioavailable forms for maximum absorption. No fillers, no additives, no artificial ingredients." },
  { icon: Package, title: "Replaces 5–10 Bottles", description: "One custom formula replaces 5–10 individual supplement bottles. Simpler, cheaper, and more effective." },
  { icon: Beaker, title: "Made-to-Order", description: "Your formula is manufactured fresh when you order — not pulled from a warehouse shelf." },
];

// Transform API tiers to display format
function transformTiers(apiTiers: MembershipTier[]) {
  return apiTiers.map(tier => ({
    id: tier.tierKey,
    name: tier.name.replace(' Member', '').replace(' Adopter', ''),
    limit: tier.maxCapacity >= 999999 ? null : tier.maxCapacity,
    claimed: tier.currentCount,
    priceMonthly: tier.priceCents / 100,
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
  const { user } = useAuth();
  const ctaHref = user ? '/membership' : '/signup';
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
      <section id="pricing" className="py-24 md:py-32 bg-[#ede8e2]">
        <div className="container mx-auto px-6 max-w-5xl flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#054700]" />
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[#ede8e2] scroll-mt-24">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* ── Section Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            Membership & Pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl text-[#054700] font-light leading-tight text-balance">
            One membership.{" "}
            <span className="text-[#8a9a2c]">Everything you need.</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/60 leading-relaxed">
            Lock in your rate forever. AI consultations, formula optimization, and member pricing on supplements and labs.
          </p>
        </div>

        {/* ── Tier Strip ── */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-6 md:px-10 py-5 shadow-sm">
            {/* Price points */}
            <div className="flex justify-between items-end mb-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="text-center flex-1">
                  <div className={`text-2xl md:text-3xl font-light transition-colors ${tier.active ? "text-[#054700]" : "text-[#054700]/25"}`}>
                    ${tier.priceMonthly}
                    <span className="text-xs font-normal">/mo</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-[#054700]/10 rounded-full mb-3">
              <div
                className="absolute left-0 top-0 h-full bg-[#054700]/40 rounded-full transition-all duration-500"
                style={{ width: `${((activeTier.claimed || 0) / (activeTier.limit || 100)) * 25}%` }}
              />
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 transition-colors ${tier.active
                    ? "bg-[#054700] border-[#054700]"
                    : index < tiers.findIndex(t => t.active)
                      ? "bg-[#054700]/70 border-[#054700]/70"
                      : "bg-white/70 backdrop-blur-sm border-[#054700]/20"
                    }`}
                  style={{ left: `${index * 33.33}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </div>

            {/* Tier labels */}
            <div className="flex justify-between items-start">
              {tiers.map((tier) => (
                <div key={tier.id} className="text-center flex-1">
                  <div className={`text-xs font-medium ${tier.active ? "text-[#054700]" : "text-[#054700]/30"}`}>
                    {tier.name}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${tier.active ? "text-[#054700]/60" : "text-[#054700]/25"}`}>
                    {tier.limit ? `First ${tier.limit.toLocaleString()}` : "After launch"}
                  </div>
                  {tier.active && spotsRemaining && (
                    <div className="text-[10px] text-[#5a6623] font-medium mt-0.5">
                      {spotsRemaining} spots left
                    </div>
                  )}
                  {!tier.active && tier.id !== 'standard' && (
                    <div className="text-[10px] text-[#054700]/20 mt-0.5">
                      Coming next
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two-column: Membership Card + Supplement Pricing ── */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left — Membership Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#054700]/5 overflow-hidden flex flex-col">
            <div className="bg-[#054700] px-8 py-10 text-center">
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

            <div className="px-8 py-10 flex-1 flex flex-col">
              <ul className="space-y-5 mb-10 flex-1">
                {[
                  "Unlimited AI health consultations",
                  "Lab and wearable data analysis",
                  "Supplements at member pricing",
                  "Formula updates as your health evolves",
                  "Lab testing at member rates",
                  "Future platform upgrades included",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#054700]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#054700]" />
                    </div>
                    <span className="text-[#054700]/80 text-base">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={ctaHref}>
                <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] py-6 text-lg rounded-full group">
                  Claim Your {activeTier.name} Spot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <div className="mt-5 pt-5 border-t border-[#054700]/10 text-center">
                <p className="text-xs text-[#054700]/50">
                  Cancel anytime. Rejoin within 3 months to keep your rate. Tier locked when you become a paying member.
                </p>
                <p className="text-xs text-[#054700]/40 mt-2">
                  Membership not required to order supplements. Members get discounted pricing and ongoing formula updates.
                </p>
              </div>
            </div>
          </div>

          {/* Right — Supplement Pricing */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#054700]/5 overflow-hidden flex flex-col">
              <div className="bg-[#074700] px-8 py-10 text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white/80 text-sm mb-4">
                  💊 Your Supplements
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl md:text-6xl font-light text-white">$100</span>
                  <span className="text-xl text-white/40">–</span>
                  <span className="text-5xl md:text-6xl font-light text-white">$200</span>
                </div>
                <p className="mt-3 text-white/70 text-sm">/month based on your formula</p>
              </div>

              <div className="px-8 py-8 flex-1 flex flex-col">
                <p className="text-sm text-[#074700]/60 mb-6">
                  Your formula cost depends on what your body needs, not what we want to charge you.
                </p>

                <div className="space-y-5 flex-1">
                  {pricingFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#074700]/10 flex items-center justify-center">
                        <factor.icon className="w-5 h-5 text-[#074700]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[#074700] mb-1">{factor.title}</h4>
                        <p className="text-xs text-[#074700]/60 leading-relaxed">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-[#074700]/10 text-center">
                  <p className="text-sm text-[#074700]/60">
                    Typically{" "}
                    <span className="text-[#074700] font-medium">15% cheaper</span>{" "}
                    than buying each ingredient separately.
                  </p>
                  <p className="text-xs text-[#074700]/50 mt-2">
                    You see your exact formula cost before you order. No surprises.
                  </p>
                </div>
              </div>
          </div>
        </div>

        {/* ── Trust badges ── */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[#054700]/60">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]" />
            <span>No credit card to start</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]" />
            <span>Rate locked forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
