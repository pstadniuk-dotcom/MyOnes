import { Moon, TestTube, Brain, Activity, FileText, HelpCircle, Package } from "lucide-react";
import bottleImage from "@assets/generated_images/Premium_supplement_bottle_product_2500f07c.png";

interface IngredientCallout {
  icon: React.ReactNode;
  dataSource: string;
  insight: string;
  ingredient: string;
  dose: string;
  position: "left" | "right";
}

const callouts: IngredientCallout[] = [
  {
    icon: <Moon className="w-4 h-4" />,
    dataSource: "Your Oura shows poor deep sleep",
    insight: "Supporting restorative sleep",
    ingredient: "Magnesium",
    dose: "400mg",
    position: "left",
  },
  {
    icon: <TestTube className="w-4 h-4" />,
    dataSource: "Your bloodwork shows elevated cortisol",
    insight: "Stress adaptation support",
    ingredient: "Ashwagandha",
    dose: "600mg",
    position: "right",
  },
  {
    icon: <Brain className="w-4 h-4" />,
    dataSource: "You mentioned afternoon fatigue",
    insight: "Sustained mental clarity",
    ingredient: "Adrenal Support",
    dose: "420mg",
    position: "left",
  },
  {
    icon: <Activity className="w-4 h-4" />,
    dataSource: "Your labs show suboptimal heart markers",
    insight: "Cardiovascular support",
    ingredient: "Heart Support",
    dose: "689mg",
    position: "right",
  },
];

export default function InterventionSection() {
  return (
    <section className="py-24 md:py-32 bg-[#FAF7F2] overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* The Industry Problem */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            The Problem With Health Data Today
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl text-[#1B4332] font-light leading-tight">
            Blood tests give you biomarkers. Wearables give you metrics.<br />
            <span className="font-medium">But who gives you a solution?</span>
          </h2>
          
          {/* The typical journey */}
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-[#2D3436]/60">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              <span>100+ biomarkers</span>
            </div>
            <span className="hidden md:block text-[#2D3436]/30">+</span>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <span>Sleep, HRV, strain</span>
            </div>
            <span className="hidden md:block">→</span>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>Charts & reports</span>
            </div>
            <span className="hidden md:block">→</span>
            <div className="flex items-center gap-2 text-red-500/70">
              <HelpCircle className="w-5 h-5" />
              <span className="italic">Now what?</span>
            </div>
          </div>
          
          <p className="mt-8 text-lg text-[#2D3436]/70 max-w-2xl mx-auto">
            You're drowning in data but starving for action. A PDF of biomarkers. A dashboard of sleep scores. 
            And a list of supplements to research on your own. That's not healthcare. That's homework.
          </p>
        </div>

        {/* The ONES Solution */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-full mb-6">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">The ONES Difference</span>
          </div>
          <h3 className="text-3xl md:text-4xl text-[#1B4332] font-light leading-tight">
            We don't recommend supplements.<br />
            <span className="font-medium">We formulate yours.</span>
          </h3>
          <p className="mt-6 text-lg text-[#2D3436]/70 leading-relaxed max-w-2xl mx-auto">
            Your blood tests, your wearable data, your conversation with our AI—turned into one custom formula that ships to your door.
          </p>
        </div>

        {/* Bottle with Callouts */}
        <div className="relative max-w-5xl mx-auto">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Bottle centered on mobile */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48">
                <img
                  src={bottleImage}
                  alt="Your Custom ONES Formula"
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
            
            {/* Callouts stacked on mobile */}
            <div className="space-y-4">
              {callouts.map((callout, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-4 shadow-sm border border-[#1B4332]/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                      {callout.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#D4A574] font-medium">
                        {callout.dataSource}
                      </p>
                      <p className="text-lg font-semibold text-[#1B4332]">
                        {callout.ingredient}
                      </p>
                      <p className="text-sm text-[#2D3436]/60">
                        {callout.dose}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-3 items-center gap-8">
            {/* Left Callouts */}
            <div className="space-y-8">
              {callouts
                .filter((c) => c.position === "left")
                .map((callout, index) => (
                  <div
                    key={index}
                    className="relative bg-white rounded-xl p-5 shadow-lg border border-[#1B4332]/10 transform hover:scale-105 transition-transform duration-300"
                  >
                    {/* Connector line */}
                    <div className="absolute right-0 top-1/2 w-8 h-px bg-gradient-to-r from-transparent to-[#D4A574] translate-x-full" />
                    <div className="absolute right-0 top-1/2 w-2 h-2 rounded-full bg-[#D4A574] translate-x-[calc(100%+2rem)] -translate-y-1/2" />
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                        {callout.icon}
                      </div>
                      <div>
                        <p className="text-sm text-[#D4A574] font-medium mb-1">
                          {callout.dataSource}
                        </p>
                        <p className="text-lg font-semibold text-[#1B4332]">
                          {callout.ingredient}
                        </p>
                        <p className="text-sm text-[#2D3436]/60">
                          {callout.dose}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Center Bottle */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[#D4A574]/20 blur-3xl rounded-full scale-75" />
                <img
                  src={bottleImage}
                  alt="Your Custom ONES Formula"
                  className="relative w-64 h-auto drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Right Callouts */}
            <div className="space-y-8">
              {callouts
                .filter((c) => c.position === "right")
                .map((callout, index) => (
                  <div
                    key={index}
                    className="relative bg-white rounded-xl p-5 shadow-lg border border-[#1B4332]/10 transform hover:scale-105 transition-transform duration-300"
                  >
                    {/* Connector line */}
                    <div className="absolute left-0 top-1/2 w-8 h-px bg-gradient-to-l from-transparent to-[#D4A574] -translate-x-full" />
                    <div className="absolute left-0 top-1/2 w-2 h-2 rounded-full bg-[#D4A574] -translate-x-[calc(100%+2rem)] -translate-y-1/2" />
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                        {callout.icon}
                      </div>
                      <div>
                        <p className="text-sm text-[#D4A574] font-medium mb-1">
                          {callout.dataSource}
                        </p>
                        <p className="text-lg font-semibold text-[#1B4332]">
                          {callout.ingredient}
                        </p>
                        <p className="text-sm text-[#2D3436]/60">
                          {callout.dose}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-20 text-center max-w-2xl mx-auto">
          <p className="text-xl md:text-2xl text-[#2D3436] leading-relaxed">
            Every ingredient selected for <em>your</em> biology. Every dose calibrated to <em>your</em> data.
          </p>
          <p className="mt-6 text-2xl md:text-3xl font-medium text-[#1B4332]">
            One formula. Your formula. Shipped monthly.
          </p>
        </div>
      </div>
    </section>
  );
}
