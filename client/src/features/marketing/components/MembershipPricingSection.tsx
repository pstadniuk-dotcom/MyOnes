import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Check, ArrowRight, Loader2, Scale, Layers, ShieldCheck, Package, Beaker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState, useEffect } from "react";

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
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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

  useEffect(() => {
    if (isLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isLoading]);

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
    <section ref={sectionRef} id="pricing" className="py-24 md:py-32 bg-[#ede8e2] scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* ── Section Header ── */}
        <div
          className={`max-w-2xl mx-auto text-center mb-14 md:mb-20 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70">
            Membership & Pricing
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            One membership.{" "}
            <span className="text-[#8a9a2c]">Everything you need.</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-[#054700]/50 leading-relaxed max-w-xl mx-auto font-light">
            Lock in your rate forever. AI consultations, formula optimization, and member pricing on supplements and labs.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div
          className={`grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 max-w-5xl mx-auto transition-all duration-700 delay-200 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* ═══ Left — Hero Membership Card ═══ */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl shadow-[#054700]/5 border border-[#054700]/[0.06] flex flex-col">
            {/* Header — green strip with price + urgency */}
            <div className="bg-[#054700] px-5 sm:px-8 md:px-10 py-8">
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full">
                  <span className="text-sm">🎉</span>
                  <span className="text-white/80 text-sm font-medium">{activeTier.name} Member</span>
                </div>
                {spotsRemaining && (
                  <span className="text-[#8a9a2c] text-xs font-semibold">
                    {spotsRemaining} of {activeTier.limit} spots left
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl md:text-6xl font-light text-white tracking-tight">${activeTier.priceMonthly}</span>
                <span className="text-white/50 text-lg">/month forever</span>
              </div>

              {savingsPercent > 0 && (
                <p className="mt-3 text-[#8a9a2c] text-sm font-medium">
                  {savingsPercent}% off standard pricing, locked for life
                </p>
              )}

              {/* Progress bar — compact, inside header */}
              {spotsRemaining && activeTier.limit && (
                <div className="mt-5">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8a9a2c] rounded-full transition-all duration-700"
                      style={{ width: `${((activeTier.claimed || 0) / activeTier.limit) * 100}%` }}
                    />
                  </div>
                  <p className="text-white/35 text-xs mt-2">
                    Price increases to ${tiers.find(t => t.id === 'early')?.priceMonthly || 15}/mo when founding spots fill
                  </p>
                </div>
              )}
            </div>


            {/* Features — single column, left-aligned */}
            <div className="px-5 sm:px-8 md:px-10 pt-8 pb-6 flex-1 flex items-center">
              <ul className="space-y-4">
                {[
                  "Unlimited AI health consultations",
                  "Lab and wearable data analysis",
                  "Supplements at member pricing",
                  "Formula updates as your health evolves",
                  "Lab testing at member rates",
                  "Future platform upgrades included",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3.5">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#054700]/[0.07] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#054700]" />
                    </div>
                    <span className="text-[#054700]/75 text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-5 sm:px-8 md:px-10 pt-4 pb-8">
              <Link href={ctaHref}>
                <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] py-6 text-lg rounded-full font-medium group">
                  Claim Your {activeTier.name} Spot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <p className="text-center text-[#054700]/30 text-xs mt-3">
                Cancel anytime · Rejoin within 3 months to keep your rate
              </p>
            </div>
          </div>

          {/* ═══ Right — Supplement Pricing (Supporting) ═══ */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-[#054700]/[0.06] overflow-hidden flex flex-col">
            {/* Header — lighter treatment, not competing */}
            <div className="px-5 sm:px-8 pt-8 pb-6">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#054700]/40 mb-3">
                Your Supplements
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-light text-[#054700]">$100</span>
                <span className="text-[#054700]/30 text-lg">–</span>
                <span className="text-4xl md:text-5xl font-light text-[#054700]">$200</span>
              </div>
              <p className="text-sm text-[#054700]/40 mt-2">/month based on your formula</p>
            </div>

            <div className="mx-5 sm:mx-8 border-t border-[#054700]/[0.06]" />

            {/* Factors — compact */}
            <div className="px-5 sm:px-8 py-6 flex-1">
              <p className="text-sm text-[#054700]/50 mb-5 leading-relaxed">
                Your cost depends on what your body needs, not what we want to charge you.
              </p>
              <div className="space-y-4">
                {pricingFactors.slice(0, 4).map((factor, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#054700]/[0.05] flex items-center justify-center mt-0.5">
                      <factor.icon className="w-4 h-4 text-[#054700]/50" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#054700]/80">{factor.title}</h4>
                      <p className="text-xs text-[#054700]/40 leading-relaxed mt-0.5">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom note */}
            <div className="px-5 sm:px-8 pb-8">
              <div className="bg-[#054700]/[0.04] rounded-xl px-5 py-4 text-center">
                <p className="text-sm text-[#054700]/60">
                  Typically{" "}
                  <span className="text-[#054700] font-medium">15% cheaper</span>{" "}
                  than buying separately
                </p>
                <p className="text-xs text-[#054700]/35 mt-1">
                  Exact cost shown before you order
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tier progression — condensed inline ── */}
        <div
          className={`mt-10 max-w-3xl mx-auto transition-all duration-700 delay-400 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="flex items-center justify-center gap-1 md:gap-2">
            {tiers.map((tier, index) => (
              <div key={tier.id} className="flex items-center gap-1 md:gap-2">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tier.active
                      ? "bg-[#054700] text-white"
                      : index < tiers.findIndex(t => t.active)
                      ? "bg-[#054700]/20 text-[#054700]/60"
                      : "bg-[#054700]/[0.06] text-[#054700]/30"
                  }`}
                >
                  ${tier.priceMonthly}/mo
                  {tier.active && spotsRemaining && (
                    <span className="ml-1.5 text-[#8a9a2c]">← You're here</span>
                  )}
                </div>
                {index < tiers.length - 1 && (
                  <div className="w-4 md:w-6 h-px bg-[#054700]/10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust badges ── */}
        <div
          className={`mt-8 flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-[#054700]/50 transition-all duration-700 delay-500 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]/40" />
            <span>No credit card to start</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]/40" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#054700]/40" />
            <span>Rate locked forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
