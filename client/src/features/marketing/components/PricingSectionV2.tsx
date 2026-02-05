import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const features = [
  "Personalized AI consultation",
  "Blood work & lab analysis",
  "200+ clinical-grade ingredients",
  "Formula adjustments each cycle",
  "Wearable data integration",
  "Direct practitioner messaging",
  "Free shipping on all orders",
];

export default function PricingSectionV2() {
  return (
    <section className="py-24 md:py-32 bg-[#FAF7F2]">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            Simple Pricing
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            One membership.{" "}
<span className="font-medium">Everything included.</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F]">
            Your personalized formula, delivered every 3 months.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl shadow-[#1B4332]/5 overflow-hidden relative">
            {/* Popular badge */}
            <div className="absolute top-6 right-6">
              <div className="bg-[#D4A574]/10 text-[#D4A574] px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Most Popular
              </div>
            </div>

            {/* Card Header */}
            <div className="bg-[#1B4332] px-8 py-10 text-center">
              <h3 className="text-white/70 text-sm font-medium tracking-wider uppercase mb-4">
                3-Month Supply
              </h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-white/60 text-lg">Starting at</span>
              </div>
              <div className="flex items-baseline justify-center gap-1 mt-2">
                <span className="text-5xl md:text-6xl font-light text-white">$99</span>
                <span className="text-white/60">/month*</span>
              </div>
              <p className="mt-4 text-white/70 text-sm">
                $297 billed every 3 months
              </p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-10">
              <ul className="space-y-4 mb-10">
                {features.map((feature, index) => (
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
                  Start Your Formula
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <p className="mt-6 text-center text-sm text-[#52796F]">
                30-day satisfaction guarantee. Cancel anytime.
              </p>

              {/* Asterisk explanation */}
              <p className="mt-4 text-center text-xs text-[#52796F]/70">
                *Price varies based on your personalized formula. 3-month minimum commitment.
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[#52796F]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>GMP Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>Third-Party Tested</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1B4332]" />
            <span>Made in USA</span>
          </div>
        </div>
      </div>
    </section>
  );
}
