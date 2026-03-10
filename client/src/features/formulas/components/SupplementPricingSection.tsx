import { Scale, Layers, Leaf } from "lucide-react";

const pricingFactors = [
  {
    icon: Scale,
    title: "Daily Milligrams",
    description: "More total milligrams means more raw material per capsule and more capsules per day.",
  },
  {
    icon: Layers,
    title: "Ingredient Count",
    description: "More active ingredients in your formula requires additional manufacturing complexity.",
  },
  {
    icon: Leaf,
    title: "Sourcing Quality",
    description: "Premium bioavailable forms like methylated B vitamins and chelated minerals cost more than basic forms.",
  },
];

export default function SupplementPricingSection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#ede8e2] overflow-hidden">
      {/* Capsule outlines */}
      <svg aria-hidden="true" className="absolute inset-0 pointer-events-none select-none z-0 w-full h-full" viewBox="0 0 1400 900" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pricingMetallicGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feSpecularLighting in="blur" surfaceScale="8" specularConstant="1.8" specularExponent="28" result="spec"><fePointLight x="200" y="100" z="300" /></feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" operator="in" result="specClip" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="specClip"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="pricingMetallicGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b8cc50" /><stop offset="35%" stopColor="#d4e87a" /><stop offset="50%" stopColor="#f0ffc0" /><stop offset="65%" stopColor="#d4e87a" /><stop offset="100%" stopColor="#7a8c28" />
          </linearGradient>
          <path id="pricingCapsule" d="M60,0 C93.2,0 120,26.8 120,60 L120,228 C120,261.2 93.2,288 60,288 C26.8,288 0,261.2 0,228 L0,60 C0,26.8 26.8,0 60,0 Z"/>
        </defs>
        <g opacity="0.20">
          <use href="#pricingCapsule" transform="translate(60, 20) rotate(-15, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(460, 35) rotate(20, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(820, 15) rotate(-30, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(1160, 45) rotate(14, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(40, 390) rotate(35, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(550, 410) rotate(-18, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(1050, 380) rotate(40, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(220, 660) rotate(-35, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#pricingCapsule" transform="translate(870, 630) rotate(22, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
        </g>
        <use href="#pricingCapsule" transform="translate(60, 20) rotate(-15, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="60 800"><animate attributeName="stroke-dashoffset" values="0;-860" dur="10s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(460, 35) rotate(20, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="55 800"><animate attributeName="stroke-dashoffset" values="0;-855" dur="12s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(820, 15) rotate(-30, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="58 800"><animate attributeName="stroke-dashoffset" values="0;-858" dur="8s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(1160, 45) rotate(14, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="62 800"><animate attributeName="stroke-dashoffset" values="0;-862" dur="13s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(40, 390) rotate(35, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="56 800"><animate attributeName="stroke-dashoffset" values="0;-856" dur="12s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(550, 410) rotate(-18, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="54 800"><animate attributeName="stroke-dashoffset" values="0;-854" dur="7s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(1050, 380) rotate(40, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="60 800"><animate attributeName="stroke-dashoffset" values="0;-860" dur="10s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(220, 660) rotate(-35, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="57 800"><animate attributeName="stroke-dashoffset" values="0;-857" dur="14s" repeatCount="indefinite"/></use>
        <use href="#pricingCapsule" transform="translate(870, 630) rotate(22, 60, 144)" fill="none" stroke="url(#pricingMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#pricingMetallicGlow)" opacity="0.55" strokeDasharray="59 800"><animate attributeName="stroke-dashoffset" values="0;-859" dur="15s" repeatCount="indefinite"/></use>
      </svg>

      <div className="relative z-10 container mx-auto px-6 max-w-5xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            Supplement Pricing
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#074700] font-light leading-tight">
            Your supplements.{" "}
            <span className="font-medium">Priced honestly.</span>
          </h2>
          <p className="mt-6 text-lg text-[#074700]/60 leading-relaxed">
            Your formula cost depends on what your body needs, not what we want to charge you.
          </p>
        </div>

        {/* Pricing Factors */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {pricingFactors.map((factor, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-2xl bg-[#ede8e2]"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#074700]/10 mb-6">
                <factor.icon className="w-7 h-7 text-[#074700]" />
              </div>
              <h3 className="text-xl font-medium text-[#074700] mb-3">
                {factor.title}
              </h3>
              <p className="text-[#074700]/60 leading-relaxed">
                {factor.description}
              </p>
            </div>
          ))}
        </div>

        {/* Price Range */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#074700] rounded-2xl p-8 md:p-10 text-center">
            <p className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Typical Monthly Cost (in addition to membership)
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl md:text-5xl font-light text-white">$100</span>
              <span className="text-2xl text-white/40">to</span>
              <span className="text-4xl md:text-5xl font-light text-white">$200</span>
            </div>
            <p className="mt-6 text-white/70 leading-relaxed max-w-lg mx-auto">
              You see your exact formula cost before you order. No surprises, no hidden fees.
            </p>
          </div>
        </div>

        {/* Transparency note */}
        <div className="mt-12 text-center">
          <p className="text-lg text-[#074700]/60">
            Typically{" "}
            <span className="text-[#074700] font-medium">15% cheaper</span>{" "}
            than buying each ingredient separately—with better quality control.
          </p>
        </div>
      </div>
    </section>
  );
}
