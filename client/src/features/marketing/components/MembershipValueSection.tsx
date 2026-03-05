import { Pill, RefreshCw, Tag } from "lucide-react";

const membershipFeatures = [
  {
    icon: null as any,
    customIcon: true,
    title: "AI Health Consultations",
    description: "Unlimited conversations with our AI practitioner that analyzes your labs, wearables, and health history to give you personalized guidance.",
  },
  {
    icon: Pill,
    title: "Personalized Formula",
    description: "A supplement formula built from your data, not generic guesswork. Every ingredient chosen specifically for your body and goals.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Optimization",
    description: "As your labs and wearable data change, your formula adapts. Your health is dynamic and your supplements should be too.",
  },
  {
    icon: Tag,
    title: "Member Pricing on Supplements & Labs",
    description: "Access your custom supplements and diagnostic testing at exclusive member rates. No retail markups—just transparent, honest pricing.",
  },
];

export default function MembershipValueSection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#ede8e2] overflow-hidden">
      {/* Capsule outlines */}
      <svg aria-hidden="true" className="absolute inset-0 pointer-events-none select-none z-0 w-full h-full" viewBox="0 0 1400 900" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="valueMetallicGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feSpecularLighting in="blur" surfaceScale="8" specularConstant="1.8" specularExponent="28" result="spec"><fePointLight x="200" y="100" z="300" /></feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" operator="in" result="specClip" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="specClip"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="valueMetallicGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b8cc50" /><stop offset="35%" stopColor="#d4e87a" /><stop offset="50%" stopColor="#f0ffc0" /><stop offset="65%" stopColor="#d4e87a" /><stop offset="100%" stopColor="#7a8c28" />
          </linearGradient>
          <path id="valueCapsule" d="M60,0 C93.2,0 120,26.8 120,60 L120,228 C120,261.2 93.2,288 60,288 C26.8,288 0,261.2 0,228 L0,60 C0,26.8 26.8,0 60,0 Z"/>
        </defs>
        <g opacity="0.20">
          <use href="#valueCapsule" transform="translate(80, 30) rotate(-22, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(440, 15) rotate(18, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(850, 40) rotate(-32, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(1200, 60) rotate(10, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(20, 400) rotate(28, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(600, 380) rotate(-12, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(1080, 400) rotate(38, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(250, 680) rotate(-42, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          <use href="#valueCapsule" transform="translate(900, 650) rotate(20, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
        </g>
        <use href="#valueCapsule" transform="translate(80, 30) rotate(-22, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="60 800"><animate attributeName="stroke-dashoffset" values="0;-860" dur="11s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(440, 15) rotate(18, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="55 800"><animate attributeName="stroke-dashoffset" values="0;-855" dur="9s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(850, 40) rotate(-32, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="58 800"><animate attributeName="stroke-dashoffset" values="0;-858" dur="8s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(1200, 60) rotate(10, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="62 800"><animate attributeName="stroke-dashoffset" values="0;-862" dur="13s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(20, 400) rotate(28, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="56 800"><animate attributeName="stroke-dashoffset" values="0;-856" dur="12s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(600, 380) rotate(-12, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="54 800"><animate attributeName="stroke-dashoffset" values="0;-854" dur="7s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(1080, 400) rotate(38, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="60 800"><animate attributeName="stroke-dashoffset" values="0;-860" dur="10s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(250, 680) rotate(-42, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="57 800"><animate attributeName="stroke-dashoffset" values="0;-857" dur="14s" repeatCount="indefinite"/></use>
        <use href="#valueCapsule" transform="translate(900, 650) rotate(20, 60, 144)" fill="none" stroke="url(#valueMetallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#valueMetallicGlow)" opacity="0.55" strokeDasharray="59 800"><animate attributeName="stroke-dashoffset" values="0;-859" dur="15s" repeatCount="indefinite"/></use>
      </svg>

      <div className="relative z-10 container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            What You Get
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#054700] font-light leading-tight">
            More than a supplement.{" "}
            <span className="font-medium">An ongoing system.</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/60 leading-relaxed">
            Your membership includes everything you need to optimize your supplementation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {membershipFeatures.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-[#ede8e2] hover:bg-[#e4ddd6] transition-colors duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#054700]/10 flex items-center justify-center group-hover:bg-[#054700] transition-colors duration-300">
                  {(feature as any).customIcon ? (
                    <img src="/ones-logo-icon.svg" alt="" className="w-7 h-7 group-hover:brightness-0 group-hover:invert transition-all duration-300" />
                  ) : (
                    <feature.icon className="w-6 h-6 text-[#054700] group-hover:text-white transition-colors duration-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#054700] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#054700]/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom statement */}
        <div className="mt-16 text-center">
          <p className="text-xl md:text-2xl text-[#054700] font-light">
            One membership.{" "}
            <span className="font-medium text-[#054700]/60">Supplements that actually make sense for you.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
