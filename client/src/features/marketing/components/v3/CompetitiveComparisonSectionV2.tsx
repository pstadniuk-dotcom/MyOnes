import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Minus, Pill, FlaskConical, ArrowRight } from "lucide-react";

type FeatureValue = boolean | "partial";

interface Competitor {
  name: string;
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

function FeatureIcon({ value, isOnes }: { value: FeatureValue; isOnes?: boolean }) {
  if (value === true) {
    return (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isOnes ? "bg-gradient-to-br from-[#054700] to-[#065a00] shadow-md shadow-[#054700]/20" : "bg-[#054700]/10"}`}>
        <Check className={`w-4 h-4 ${isOnes ? "text-white" : "text-[#054700]"}`} />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-7 h-7 rounded-full bg-[#8a9a2c]/15 flex items-center justify-center">
        <Minus className="w-4 h-4 text-[#5a6623]" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#054700]/[0.04] flex items-center justify-center">
      <X className="w-4 h-4 text-[#054700]/15" />
    </div>
  );
}

export default function CompetitiveComparisonSectionV2() {
  const [activeTab, setActiveTab] = useState("supplements");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  // Drag-to-scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="compare"
      className="py-24 md:py-32 bg-white scroll-mt-24"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div className={`max-w-3xl mx-auto text-center mb-12 transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/60">
            <span className="w-8 h-px bg-[#5a6623]/20" />
            How We Compare
            <span className="w-8 h-px bg-[#5a6623]/20" />
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl text-[#054700] font-light leading-tight">
            The only platform that goes from{" "}
            <span className="text-gradient-green font-medium">data to done</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/50 leading-relaxed font-light">
            Everyone else stops at recommendations. We deliver the actual intervention.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`flex justify-center mb-10 transition-all duration-700 delay-100 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex bg-[#ede8e2]/80 backdrop-blur-sm rounded-full p-1.5 gap-1 shadow-inner border border-[#054700]/[0.04]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#054700] text-white shadow-lg shadow-[#054700]/15"
                      : "text-[#054700]/50 hover:text-[#054700] hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Glass comparison — horizontally scrollable */}
        <div className={`transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Drag hint */}
          <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-[#054700]/20 animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-[#054700]/15 animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-1 h-1 rounded-full bg-[#054700]/10 animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
            <span className="text-xs text-[#054700]/30 font-medium">Drag to explore</span>
          </div>

          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`overflow-x-auto comparison-scroll pb-4 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
          >
            <div className="min-w-[800px]">
              {/* Glass card container */}
              <div className="glass-premium rounded-3xl p-1">
                {/* Header row */}
                <div className="grid gap-0" style={{ gridTemplateColumns: `200px repeat(${currentTab.competitors.length}, 1fr)` }}>
                  <div className="p-5 flex items-end">
                    <span className="text-sm font-medium text-[#054700]/40 tracking-wide uppercase">Feature</span>
                  </div>
                  {currentTab.competitors.map((competitor, index) => (
                    <div
                      key={competitor.name}
                      className={`p-5 text-center rounded-t-2xl transition-colors ${
                        index === 0
                          ? "bg-gradient-to-b from-[#054700] to-[#054700]/95"
                          : ""
                      }`}
                    >
                      <div className={`font-semibold text-sm ${index === 0 ? "text-white text-base" : "text-[#054700]/60"}`}>
                        {competitor.name}
                      </div>
                      {index === 0 && (
                        <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1 font-medium">
                          Your Formula
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Feature rows */}
                {currentTab.featureLabels.map((feature, rowIndex) => (
                  <div
                    key={feature.key}
                    className={`grid gap-0 group transition-colors duration-200 hover:bg-[#054700]/[0.02] ${
                      rowIndex % 2 === 0 ? "bg-white/30" : "bg-transparent"
                    } ${rowIndex === currentTab.featureLabels.length - 1 ? "rounded-b-2xl" : ""}`}
                    style={{ gridTemplateColumns: `200px repeat(${currentTab.competitors.length}, 1fr)` }}
                  >
                    <div className="p-4 pl-5 flex items-center">
                      <span className="text-sm text-[#054700]/60 font-light">{feature.label}</span>
                    </div>
                    {currentTab.competitors.map((competitor, colIndex) => (
                      <div
                        key={`${competitor.name}-${feature.key}`}
                        className={`p-4 flex items-center justify-center ${
                          colIndex === 0 ? "bg-[#054700]/[0.04]" : ""
                        }`}
                      >
                        <FeatureIcon
                          value={competitor.features[feature.key]}
                          isOnes={colIndex === 0}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`mt-14 text-center transition-all duration-700 delay-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[#054700]/40 text-lg mb-2 font-light">Why settle for generic?</p>
          <p className="text-2xl md:text-3xl text-[#054700] font-light mb-8">
            Get a supplement that's actually{" "}
            <span className="text-gradient-green font-medium">made for you</span>.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#054700] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#065a00] transition-all duration-300 shadow-lg shadow-[#054700]/15 hover:shadow-xl hover:shadow-[#054700]/20 hover:-translate-y-0.5 btn-shimmer"
          >
            Start Your Formula
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
