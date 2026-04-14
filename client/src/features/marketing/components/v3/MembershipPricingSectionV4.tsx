import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Check, ArrowRight, Loader2, Scale, Layers, ShieldCheck, Package, Beaker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState, useEffect, useCallback } from "react";

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

const fallbackTiers = [
  { id: 'founding', name: 'Founding', limit: 250, claimed: 0, priceMonthly: 9, active: true },
  { id: 'early', name: 'Early', limit: 500, claimed: 0, priceMonthly: 15, active: false },
  { id: 'beta', name: 'Beta', limit: 2000, claimed: 0, priceMonthly: 19, active: false },
  { id: 'standard', name: 'Standard', limit: null as number | null, claimed: 0, priceMonthly: 29, active: false },
];

const pricingFactors = [
  { icon: Scale, title: "Daily Milligrams", description: "More total milligrams means more raw material per day." },
  { icon: Layers, title: "Ingredient Count", description: "More ingredients requires additional manufacturing complexity." },
  { icon: ShieldCheck, title: "Premium Forms", description: "Clinical-grade bioavailable forms for maximum absorption." },
  { icon: Package, title: "Replaces 5\u201310 Bottles", description: "One custom formula replaces multiple supplement bottles." },
  { icon: Beaker, title: "Made-to-Order", description: "Your formula is manufactured fresh when you order." },
];

function transformTiers(apiTiers: MembershipTier[]) {
  return apiTiers.map(tier => ({
    id: tier.tierKey,
    name: tier.name.replace(' Member', '').replace(' Adopter', ''),
    limit: tier.maxCapacity >= 999999 ? null : tier.maxCapacity,
    claimed: tier.currentCount,
    priceMonthly: tier.priceCents / 100,
    active: false,
  }));
}

function findActiveTier(tiers: ReturnType<typeof transformTiers>) {
  for (const tier of tiers) {
    if (tier.limit === null || tier.claimed < tier.limit) {
      return { ...tier, active: true };
    }
  }
  return { ...tiers[tiers.length - 1], active: true };
}

export default function MembershipPricingSectionV4() {
  const { user } = useAuth();
  const ctaHref = user ? '/membership' : '/signup';
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: apiTiers, isLoading } = useQuery<MembershipTier[]>({
    queryKey: ['/api/membership/tiers'],
    queryFn: async () => {
      const res = await fetch('/api/membership/tiers');
      if (!res.ok) throw new Error('Failed to fetch tiers');
      return res.json();
    },
    staleTime: 60000,
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

  // Mouse glow tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  const rawTiers = apiTiers && apiTiers.length > 0 ? transformTiers(apiTiers) : fallbackTiers;
  const activeTierData = findActiveTier(rawTiers);
  const tiers = rawTiers.map(t => ({ ...t, active: t.id === activeTierData.id }));
  const activeTier = activeTierData;
  const spotsRemaining = activeTier.limit ? activeTier.limit - activeTier.claimed : null;
  const savingsPercent = Math.round((1 - activeTier.priceMonthly / 49) * 100);

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
    <section ref={sectionRef} id="pricing" className="py-24 md:py-36 bg-[#ede8e2] scroll-mt-24 overflow-hidden relative">
      {/* Ambient blobs */}
      <div className="absolute top-10 right-[10%] w-96 h-96 bg-[#8a9a2c]/[0.04] rounded-full blur-[120px] animate-blob-2" />
      <div className="absolute bottom-10 left-[5%] w-72 h-72 bg-[#054700]/[0.03] rounded-full blur-[100px] animate-blob-4" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className={`max-w-2xl mx-auto text-center mb-16 md:mb-20 transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/60">
            <span className="w-8 h-px bg-[#5a6623]/20" />
            Membership & Pricing
            <span className="w-8 h-px bg-[#5a6623]/20" />
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            One membership.{" "}
            <span className="text-gradient-green font-medium">Everything you need.</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-[#054700]/45 leading-relaxed max-w-xl mx-auto font-light">
            Lock in your rate forever. AI consultations, formula optimization, and member pricing on supplements and labs.
          </p>
        </div>

        {/* Two-column layout */}
        <div className={`grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 max-w-5xl mx-auto transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Left — Hero pricing card with glass effect */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className="relative glass-premium rounded-3xl overflow-hidden shadow-xl shadow-[#054700]/8 hover-glow flex flex-col"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8a9a2c]/40 to-transparent" />

            {/* Header — gradient green */}
            <div className="relative bg-gradient-to-br from-[#054700] via-[#065200] to-[#043800] px-6 sm:px-8 md:px-10 py-8 overflow-hidden">
              {/* Radial mesh */}
              <div className="pointer-events-none absolute inset-0" style={{
                background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(138,154,44,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(255,255,255,0.04) 0%, transparent 50%)',
              }} />

              <div className="relative z-[1]">
                <div className="flex items-center justify-between mb-5">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                    <span className="text-white text-sm font-medium">{activeTier.name} Member</span>
                  </div>
                  {spotsRemaining && (
                    <span className="text-white/80 text-xs font-semibold">
                      {spotsRemaining} of {activeTier.limit} left
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-extralight text-white tracking-tight">
                    ${activeTier.priceMonthly}
                  </span>
                  <span className="text-white/60 text-lg font-light">/month forever</span>
                </div>

                {savingsPercent > 0 && (
                  <p className="mt-3 text-white/80 text-sm font-medium">
                    {savingsPercent}% off standard pricing — locked for life
                  </p>
                )}

                {/* Progress bar */}
                {spotsRemaining && activeTier.limit && (
                  <div className="mt-5">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white/50 to-white/80 rounded-full transition-all duration-700 progress-glow"
                        style={{ width: `${((activeTier.claimed || 0) / activeTier.limit) * 100}%` }}
                      />
                    </div>
                    <p className="text-white/40 text-xs mt-2 font-light">
                      Price increases to ${tiers.find(t => t.id === 'early')?.priceMonthly || 15}/mo when founding spots fill
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="px-6 sm:px-8 md:px-10 pt-8 pb-6 flex-1 flex items-center">
              <ul className="space-y-4 w-full">
                {[
                  "Unlimited AI health consultations",
                  "Lab and wearable data analysis",
                  "Supplements at member pricing",
                  "Formula updates as your health evolves",
                  "Lab testing at member rates",
                  "Future platform upgrades included",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3.5 group/item">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#054700] to-[#065a00] flex items-center justify-center shadow-sm group-hover/item:shadow-md group-hover/item:shadow-[#054700]/20 transition-shadow">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[#054700]/65 text-[15px] font-light">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-6 sm:px-8 md:px-10 pt-4 pb-8">
              <Link href={ctaHref}>
                <Button className="relative w-full bg-[#054700] hover:bg-[#053600] text-white py-6 text-lg rounded-full font-medium group overflow-hidden btn-shimmer shadow-lg shadow-[#054700]/20 hover:shadow-xl hover:shadow-[#054700]/25 transition-all duration-300">
                  <span className="relative z-[2] flex items-center justify-center">
                    Claim Your {activeTier.name} Spot
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <p className="text-center text-[#054700]/25 text-xs mt-3 font-light">
                Cancel anytime &middot; Rejoin within 3 months to keep your rate
              </p>
            </div>
          </div>

          {/* Right — Supplement Pricing */}
          <div className="glass-premium rounded-3xl overflow-hidden flex flex-col shadow-lg shadow-[#054700]/[0.04]">
            <div className="px-6 sm:px-8 pt-8 pb-6">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#054700]/35 mb-3">
                Your Supplements
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-extralight text-[#054700]">$100</span>
                <span className="text-[#054700]/20 text-lg">&ndash;</span>
                <span className="text-4xl md:text-5xl font-extralight text-[#054700]">$200</span>
              </div>
              <p className="text-sm text-[#054700]/35 mt-2 font-light">/month based on your formula</p>
            </div>

            <div className="mx-6 sm:mx-8 border-t border-[#054700]/[0.05]" />

            <div className="px-6 sm:px-8 py-6 flex-1">
              <p className="text-sm text-[#054700]/45 mb-5 leading-relaxed font-light">
                Your cost depends on what your body needs, not what we want to charge you.
              </p>
              <div className="space-y-4">
                {pricingFactors.slice(0, 4).map((factor, index) => (
                  <div key={index} className="flex items-start gap-3 group/factor">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#054700]/[0.04] flex items-center justify-center mt-0.5 group-hover/factor:bg-[#054700]/[0.08] transition-colors">
                      <factor.icon className="w-4 h-4 text-[#054700]/40" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#054700]/70">{factor.title}</h4>
                      <p className="text-xs text-[#054700]/35 leading-relaxed mt-0.5 font-light">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-8">
              <div className="bg-[#054700]/[0.03] backdrop-blur-sm rounded-xl px-5 py-4 text-center border border-[#054700]/[0.04]">
                <p className="text-sm text-[#054700]/55">
                  Typically{" "}
                  <span className="text-[#054700] font-medium">15% cheaper</span>{" "}
                  than buying separately
                </p>
                <p className="text-xs text-[#054700]/30 mt-1 font-light">
                  Exact cost shown before you order
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier progression */}
        <div className={`mt-10 max-w-3xl mx-auto transition-all duration-700 delay-400 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex items-center justify-center gap-1 md:gap-2 overflow-x-auto pb-1">
            {tiers.map((tier, index) => (
              <div key={tier.id} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div className={`rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  tier.active
                    ? "px-4 py-2 bg-[#054700] text-white shadow-lg shadow-[#054700]/20"
                    : index < tiers.findIndex(t => t.active)
                    ? "px-3 py-1.5 bg-[#054700]/15 text-[#054700]/50"
                    : "px-3 py-1.5 bg-[#054700]/[0.05] text-[#054700]/25"
                }`}>
                  ${tier.priceMonthly}/mo
                  {tier.active && spotsRemaining && (
                    <span className="ml-1.5 text-white/70">&larr; You're here</span>
                  )}
                </div>
                {index < tiers.length - 1 && (
                  <div className="w-4 md:w-6 h-px bg-[#054700]/[0.08]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className={`mt-8 flex flex-wrap justify-center gap-4 md:gap-5 transition-all duration-700 delay-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {["No credit card to start", "Cancel anytime", "Rate locked forever"].map((text) => (
            <div key={text} className="flex items-center gap-2 glass-premium rounded-full px-4 py-2">
              <Check className="w-4 h-4 text-[#054700]/30" />
              <span className="text-sm text-[#054700]/45 font-light">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
