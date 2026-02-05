import { Upload, Brain, Sparkles, RefreshCw } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Share Your Data",
    description: "Connect your wearables, upload your labs, and tell us about your health goals and history.",
  },
  {
    number: "02",
    icon: Brain,
    title: "We Analyze Everything",
    description: "Our AI cross references your data with clinical research to understand exactly what your body needs.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Get Your Formula",
    description: "Receive a personalized supplement formula with every ingredient and dose chosen specifically for you.",
  },
  {
    number: "04",
    icon: RefreshCw,
    title: "Evolve Over Time",
    description: "As your labs and wearable data change, your formula adapts. Your health is dynamic and your supplements should be too.",
  },
];

export default function HowItWorksSectionV2() {
  return (
    <section 
      id="how-it-works" 
      className="py-24 md:py-32 bg-[#FAF7F2] relative scroll-mt-24"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            How your membership{" "}
            <span className="font-medium">works</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[#52796F]">
            Your health changes. Your plan changes with it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative group">
                <div className="text-center">
                  {/* Step number */}
                  <div className="text-[#D4A574] font-medium text-sm mb-4">
                    Step {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-6 bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon className="w-8 h-8 text-[#1B4332]" />
                  </div>
                  
                  <h3 className="text-xl font-medium text-[#1B4332] mb-3">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-[#52796F]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
