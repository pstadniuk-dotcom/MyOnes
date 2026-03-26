import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";

/**
 * R3/R6 — Immersive full-bleed CTA with lifestyle photography.
 * Yoga image background + glassmorphism overlay for the call-to-action.
 */

interface MembershipTier {
  tierKey: string;
  name: string;
  maxCapacity: number;
  currentCount: number;
  isActive: boolean;
}

export default function CTASectionV3() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const { data: tiers } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership/tiers"],
    queryFn: () => fetch("/api/membership/tiers").then((r) => r.json()),
    staleTime: 60_000,
  });

  const foundingTier = tiers?.find(
    (t) => t.tierKey === "founding" && t.isActive
  );
  const spotsRemaining = foundingTier
    ? foundingTier.maxCapacity - foundingTier.currentCount
    : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[600px] md:min-h-[700px] overflow-hidden flex items-center"
    >
      {/* Background lifestyle image */}
      <img
        src="/Ones%20LIfestyle%20Images/16X9%20YOGA.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* Soft warm overlay — lets the image breathe */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

      {/* Decorative blurred elements */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-[#8a9a2c]/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-24 md:py-32">
        <div
          className={`max-w-2xl transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Overline */}
          <span className="inline-block text-[11px] font-semibold tracking-[0.25em] uppercase text-white/40 mb-6">
            Your journey starts here
          </span>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-light leading-[1.05] tracking-[-0.02em]">
            Stop guessing.
            <br />
            <span className="text-[#b8cc50]">Start optimizing.</span>
          </h2>

          {/* Subtext */}
          <p className="mt-6 md:mt-8 text-lg md:text-xl text-white/60 max-w-lg leading-relaxed font-light">
            Get a supplement formula built from your actual health data —
            bloodwork, wearables, and your unique biology.
          </p>

          {/* CTA group */}
          <div
            className={`mt-10 flex flex-col sm:flex-row gap-4 items-start transition-all duration-700 delay-200 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-[#054700] hover:bg-[#ede8e2] px-10 py-6 text-lg rounded-full group shadow-2xl shadow-black/20"
              >
                Start Your Formula
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full backdrop-blur-sm"
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See How It Works
            </Button>
          </div>

          {/* Spots remaining */}
          {spotsRemaining !== null && spotsRemaining > 0 && (
            <div
              className={`mt-8 transition-all duration-700 delay-400 ${
                revealed ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                <span className="w-2 h-2 bg-[#b8cc50] rounded-full animate-pulse" />
                <span className="text-sm text-white/70 font-light">
                  {spotsRemaining} founding member spots remaining
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
