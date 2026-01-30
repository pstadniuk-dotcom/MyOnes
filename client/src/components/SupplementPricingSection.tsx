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
    <section className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            Supplement Pricing
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Your supplements.{" "}
            <span className="font-medium">Priced honestly.</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            Your formula cost depends on what your body needs, not what we want to charge you.
          </p>
        </div>

        {/* Pricing Factors */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {pricingFactors.map((factor, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-2xl bg-[#FAF7F2]"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#1B4332]/10 mb-6">
                <factor.icon className="w-7 h-7 text-[#1B4332]" />
              </div>
              <h3 className="text-xl font-medium text-[#1B4332] mb-3">
                {factor.title}
              </h3>
              <p className="text-[#52796F] leading-relaxed">
                {factor.description}
              </p>
            </div>
          ))}
        </div>

        {/* Price Range */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#1B4332] rounded-2xl p-8 md:p-10 text-center">
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
          <p className="text-lg text-[#52796F]">
            Typically{" "}
            <span className="text-[#1B4332] font-medium">15-20% cheaper</span>{" "}
            than buying each ingredient separately—with better quality control.
          </p>
        </div>
      </div>
    </section>
  );
}
