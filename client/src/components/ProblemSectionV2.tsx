import { X, Check } from "lucide-react";

const withoutOnes = [
  "8 to 9 separate bottles",
  "Generic one size fits all doses",
  "Unknown ingredient interactions",
  "$150 to $300+ per month",
  "Based on guesswork and trends",
];

const withOnes = [
  "1 personalized formula",
  "Your exact doses from your data",
  "Designed to work together",
  "Transparent, honest pricing",
  "Based on your labs and wearables",
];

export default function ProblemSectionV2() {
  return (
    <section className="py-24 md:py-32 bg-[#1B4332] overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            The Problem
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-white font-light leading-tight">
            ONES replaces your{" "}
            <span className="font-medium">supplement shelf</span>
          </h2>
          <p className="mt-6 text-lg text-white/70 leading-relaxed">
            Most people take too many supplements because no one is optimizing them.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Without ONES */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="text-center mb-8">
              <h3 className="text-xl font-medium text-white/60 uppercase tracking-wider">
                Without ONES
              </h3>
            </div>
            <ul className="space-y-4">
              {withoutOnes.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With ONES */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h3 className="text-xl font-medium text-[#1B4332] uppercase tracking-wider">
                With ONES
              </h3>
            </div>
            <ul className="space-y-4">
              {withOnes.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#1B4332]" />
                  </div>
                  <span className="text-[#2D3436]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-16 text-center">
          <p className="text-2xl md:text-3xl text-white font-light">
            Stop managing supplements.{" "}
            <span className="font-medium text-[#D4A574]">Start optimizing health.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
