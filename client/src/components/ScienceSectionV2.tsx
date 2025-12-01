import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FlaskConical, ShieldCheck, Microscope, Leaf, ArrowRight, X, Check } from "lucide-react";

const sciencePoints = [
  {
    icon: FlaskConical,
    title: "200+ Clinical-Grade Ingredients",
    description: "Every ingredient in our catalog is backed by peer-reviewed research and sourced from trusted suppliers.",
  },
  {
    icon: ShieldCheck,
    title: "Third-Party Tested",
    description: "Each batch is independently tested for purity, potency, and safety before it reaches you.",
  },
  {
    icon: Microscope,
    title: "Biomarker-Driven Formulas",
    description: "Your formula is built from your actual blood work, not generic recommendations.",
  },
  {
    icon: Leaf,
    title: "Bioavailable Forms",
    description: "We use the most absorbable forms of each nutrient - like methylated B12 and chelated minerals.",
  },
];

const comparisonFeatures = [
  { feature: "Personalized to your blood work", ones: true, others: false },
  { feature: "AI-powered health analysis", ones: true, others: false },
  { feature: "Adjusts as your health changes", ones: true, others: false },
  { feature: "Considers your medications", ones: true, others: false },
  { feature: "200+ ingredient options", ones: true, others: false },
  { feature: "One-size-fits-all formula", ones: false, others: true },
  { feature: "Generic dosing for everyone", ones: false, others: true },
];

export default function ScienceSectionV2() {
  return (
    <section id="science" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            The Science
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Built on research.{" "}
<span className="font-medium">Backed by data.</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            We don't guess. Every formula is rooted in clinical science and personalized to your unique biochemistry.
          </p>
        </div>

        {/* Science Points Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-20">
          {sciencePoints.map((point, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-[#FAF7F2] hover:bg-[#F5F0E8] transition-colors duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center group-hover:bg-[#1B4332] transition-colors duration-300">
                  <point.icon className="w-6 h-6 text-[#1B4332] group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#1B4332] mb-2">
                    {point.title}
                  </h3>
                  <p className="text-[#52796F] leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="bg-[#FAF7F2] rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl text-[#1B4332] font-light">
Why <span className="font-medium">personalized</span> beats generic
            </h3>
            <p className="mt-3 text-[#52796F]">
              Most supplements use the same formula for everyone. We believe your body deserves better.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div></div>
              <div className="bg-[#1B4332] text-white py-3 px-4 rounded-t-xl font-medium">
                ONES
              </div>
              <div className="bg-gray-200 text-gray-600 py-3 px-4 rounded-t-xl font-medium text-sm">
                Generic Brands
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {comparisonFeatures.map((item, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-3 gap-4 items-center bg-white rounded-xl p-4"
                >
                  <div className="text-[#2D3436] text-sm md:text-base">
                    {item.feature}
                  </div>
                  <div className="flex justify-center">
                    {item.ones ? (
                      <div className="w-8 h-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-[#1B4332]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <X className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {item.others ? (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Check className="w-5 h-5 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                        <X className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/science">
              <Button
                className="bg-[#1B4332] hover:bg-[#143728] text-white rounded-full px-8 group"
              >
                Learn More About Our Science
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
