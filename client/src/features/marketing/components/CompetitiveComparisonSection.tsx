import { useState, useRef, useEffect } from "react";
import { Check, X, Minus, Pill, FlaskConical } from "lucide-react";

type FeatureValue = boolean | "partial";

interface Competitor {
  name: string;
  price?: string;
  priceNote?: string;
  features: Record<string, FeatureValue>;
}

interface TabData {
  id: string;
  label: string;
  icon: typeof Pill;
  tagline: string;
  competitors: Competitor[];
  featureLabels: { key: string; label: string }[];
}

const supplementsTab: TabData = {
  id: "supplements",
  label: "Supplements",
  icon: Pill,
  tagline: "One-size-fits-all vs. made for you",
  competitors: [
    {
      name: "Ones",
      features: {
        personalizedToBloodwork: true,
        aiHealthAnalysis: true,
        adjustsAsHealthChanges: true,
        considersMedications: true,
        ingredientOptions: true,
        notOneSizeFitsAll: true,
        notGenericDosing: true,
      },
    },
    {
      name: "AG1",
      features: {
        personalizedToBloodwork: false,
        aiHealthAnalysis: false,
        adjustsAsHealthChanges: false,
        considersMedications: false,
        ingredientOptions: false,
        notOneSizeFitsAll: false,
        notGenericDosing: false,
      },
    },
    {
      name: "Blueprint",
      features: {
        personalizedToBloodwork: false,
        aiHealthAnalysis: false,
        adjustsAsHealthChanges: false,
        considersMedications: false,
        ingredientOptions: false,
        notOneSizeFitsAll: false,
        notGenericDosing: false,
      },
    },
    {
      name: "Thorne",
      features: {
        personalizedToBloodwork: false,
        aiHealthAnalysis: "partial",
        adjustsAsHealthChanges: false,
        considersMedications: false,
        ingredientOptions: "partial",
        notOneSizeFitsAll: "partial",
        notGenericDosing: false,
      },
    },
    {
      name: "Grüns",
      features: {
        personalizedToBloodwork: false,
        aiHealthAnalysis: false,
        adjustsAsHealthChanges: false,
        considersMedications: false,
        ingredientOptions: false,
        notOneSizeFitsAll: false,
        notGenericDosing: false,
      },
    },
  ],
  featureLabels: [
    { key: "personalizedToBloodwork", label: "Personalized to Your Blood Work" },
    { key: "aiHealthAnalysis", label: "AI-Powered Health Analysis" },
    { key: "adjustsAsHealthChanges", label: "Adjusts as Your Health Changes" },
    { key: "considersMedications", label: "Considers Your Medications" },
    { key: "ingredientOptions", label: "200+ Ingredient Options" },
    { key: "notOneSizeFitsAll", label: "Not One-Size-Fits-All" },
    { key: "notGenericDosing", label: "Not Generic Dosing" },
  ],
};

const bloodTestingTab: TabData = {
  id: "bloodTesting",
  label: "Blood Testing",
  icon: FlaskConical,
  tagline: "Data without intervention vs. action",
  competitors: [
    {
      name: "Ones",
      features: {
        comprehensivePanels: true,
        aiAnalysis: true,
        actionableIntervention: true,
        customSupplements: true,
        continuousTracking: true,
      },
    },
    {
      name: "Function Health",
      features: {
        comprehensivePanels: true,
        aiAnalysis: "partial",
        actionableIntervention: false,
        customSupplements: false,
        continuousTracking: "partial",
      },
    },
    {
      name: "InsideTracker",
      features: {
        comprehensivePanels: true,
        aiAnalysis: true,
        actionableIntervention: false,
        customSupplements: false,
        continuousTracking: "partial",
      },
    },
    {
      name: "Levels",
      features: {
        comprehensivePanels: true,
        aiAnalysis: true,
        actionableIntervention: false,
        customSupplements: false,
        continuousTracking: true,
      },
    },
    {
      name: "Lifeforce",
      features: {
        comprehensivePanels: true,
        aiAnalysis: false,
        actionableIntervention: "partial",
        customSupplements: false,
        continuousTracking: true,
      },
    },
  ],
  featureLabels: [
    { key: "comprehensivePanels", label: "Comprehensive Blood Panels" },
    { key: "aiAnalysis", label: "AI-Powered Analysis" },
    { key: "actionableIntervention", label: "Actionable Intervention" },
    { key: "customSupplements", label: "Custom Supplement Creation" },
    { key: "continuousTracking", label: "Continuous Tracking" },
  ],
};

const tabs = [supplementsTab, bloodTestingTab];

function FeatureIcon({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <div className="w-6 h-6 rounded-full bg-[#054700] flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-6 h-6 rounded-full bg-[#5a6623]/30 flex items-center justify-center">
        <Minus className="w-4 h-4 text-[#5a6623]" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
      <X className="w-4 h-4 text-gray-400" />
    </div>
  );
}

export default function CompetitiveComparisonSection() {
  const [activeTab, setActiveTab] = useState("supplements");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <section ref={sectionRef} id="compare" className="py-24 md:py-32 bg-white scroll-mt-24">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div
          className={`max-w-3xl mx-auto text-center mb-12 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            How We Compare
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl text-[#054700] font-light leading-tight text-balance">
            The only platform that goes from{" "}
            <span className="text-[#8a9a2c]">data to done</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/60 leading-relaxed">
            Everyone else stops at recommendations. We deliver the actual intervention.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex justify-center mb-8 transition-all duration-700 delay-100 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex bg-[#ede8e2] rounded-full p-1.5 gap-1 max-w-full overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#054700] text-[#ede8e2] shadow-md"
                      : "text-[#054700]/60 hover:text-[#054700] hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Tagline */}
        <p className="text-center text-[#054700]/60 mb-10 text-lg">
          {currentTab.tagline}
        </p>

        {/* Comparison Table - Desktop — elevated ONES column */}
        <div
          className={`hidden lg:block transition-all duration-700 delay-200 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-[#faf9f7] rounded-3xl border border-[#054700]/[0.06] shadow-lg shadow-[#054700]/[0.04] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-5 px-6 font-medium text-[#054700]/50 text-sm tracking-wide uppercase">
                    Feature
                  </th>
                  {currentTab.competitors.map((competitor, index) => (
                    <th
                      key={competitor.name}
                      className={`py-5 px-4 text-center ${
                        index === 0
                          ? "bg-[#054700] text-white"
                          : "text-[#054700]/70"
                      }`}
                    >
                      <div className={`font-semibold ${index === 0 ? "text-base" : "text-sm"}`}>{competitor.name}</div>
                      {index === 0 && (
                        <div className="text-[10px] uppercase tracking-widest text-white/50 mt-1">Your Formula</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTab.featureLabels.map((feature, rowIndex) => (
                  <tr
                    key={feature.key}
                    className={`border-t border-[#054700]/[0.04] ${rowIndex % 2 === 0 ? "" : "bg-white/50"}`}
                  >
                    <td className="py-4 px-6 text-[#054700]/70 text-[15px]">
                      {feature.label}
                    </td>
                    {currentTab.competitors.map((competitor, colIndex) => (
                      <td
                        key={`${competitor.name}-${feature.key}`}
                        className={`py-4 px-4 text-center ${
                          colIndex === 0 ? "bg-[#054700]/[0.03]" : ""
                        }`}
                      >
                        <div className="flex justify-center">
                          <FeatureIcon value={competitor.features[feature.key]} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {/* ONES Card - Featured */}
          <div
            className={`bg-[#054700] rounded-2xl p-6 text-[#ede8e2] shadow-xl shadow-[#054700]/20 transition-all duration-700 delay-200 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Ones</h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs">
                Your Formula
              </span>
            </div>
            <div className="space-y-3">
              {currentTab.featureLabels.map((feature) => (
                <div key={feature.key} className="flex items-center gap-3">
                  <FeatureIcon value={true} />
                  <span className="text-white/90">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Other Competitors */}
          {currentTab.competitors.slice(1).map((competitor, idx) => (
            <div
              key={competitor.name}
              className={`bg-white rounded-2xl p-6 border border-[#054700]/[0.06] transition-all duration-700 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: revealed ? `${300 + idx * 100}ms` : "0ms" }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#054700]">
                  {competitor.name}
                </h3>
              </div>
              <div className="space-y-2">
                {currentTab.featureLabels.map((feature) => (
                  <div key={feature.key} className="flex items-center gap-3">
                    <FeatureIcon value={competitor.features[feature.key]} />
                    <span className="text-[#054700]/60 text-sm">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={`mt-16 text-center transition-all duration-700 delay-500 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-xl text-[#054700]/60 mb-2">
            Why settle for generic?
          </p>
          <p className="text-2xl md:text-3xl text-[#054700] font-medium">
            Get a supplement that's actually made for you.
          </p>
        </div>
      </div>
    </section>
  );
}
