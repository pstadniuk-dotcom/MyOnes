import { useState } from "react";
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
      name: "ONES",
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
      name: "ONES",
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
      <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-6 h-6 rounded-full bg-[#D4A574]/30 flex items-center justify-center">
        <Minus className="w-4 h-4 text-[#D4A574]" />
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

  return (
    <section className="py-24 md:py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            How We Compare
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            The only platform that goes from{" "}
            <span className="font-medium">data to done</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            Everyone else stops at recommendations. We deliver the actual intervention.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-[#FAF7F2] rounded-full p-1.5 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#1B4332] text-white shadow-md"
                      : "text-[#52796F] hover:text-[#1B4332] hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Tagline */}
        <p className="text-center text-[#52796F] mb-10 text-lg">
          {currentTab.tagline}
        </p>

        {/* Comparison Table - Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1B4332]/10">
                <th className="text-left py-4 px-4 font-medium text-[#52796F]">
                  Platform
                </th>
                {currentTab.competitors.map((competitor, index) => (
                  <th
                    key={competitor.name}
                    className={`py-4 px-4 text-center ${
                      index === 0
                        ? "bg-[#1B4332] text-white rounded-t-xl"
                        : "text-[#1B4332]"
                    }`}
                  >
                    <div className="font-semibold">{competitor.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTab.featureLabels.map((feature, rowIndex) => (
                <tr
                  key={feature.key}
                  className={rowIndex % 2 === 0 ? "bg-[#FAF7F2]/50" : ""}
                >
                  <td className="py-4 px-4 text-[#2D3436] font-medium">
                    {feature.label}
                  </td>
                  {currentTab.competitors.map((competitor, colIndex) => (
                    <td
                      key={`${competitor.name}-${feature.key}`}
                      className={`py-4 px-4 text-center ${
                        colIndex === 0 ? "bg-[#1B4332]/5" : ""
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

        {/* Comparison Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {/* ONES Card - Featured */}
          <div className="bg-[#1B4332] rounded-2xl p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">ONES</h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs">
                You are here
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
          {currentTab.competitors.slice(1).map((competitor) => (
            <div
              key={competitor.name}
              className="bg-[#FAF7F2] rounded-2xl p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1B4332]">
                  {competitor.name}
                </h3>
              </div>
              <div className="space-y-2">
                {currentTab.featureLabels.map((feature) => (
                  <div key={feature.key} className="flex items-center gap-3">
                    <FeatureIcon value={competitor.features[feature.key]} />
                    <span className="text-[#2D3436]/70 text-sm">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-xl text-[#52796F] mb-2">
            Why settle for generic?
          </p>
          <p className="text-2xl md:text-3xl text-[#1B4332] font-medium">
            Get a supplement that's actually made for you.
          </p>
        </div>
      </div>
    </section>
  );
}
