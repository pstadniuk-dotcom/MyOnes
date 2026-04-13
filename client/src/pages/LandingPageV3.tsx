import HeaderV3 from "@/features/marketing/components/v3/HeaderV3";
import HeroSectionV3 from "@/features/marketing/components/v3/HeroSectionV3";
import ProblemFlowSectionV3 from "@/features/marketing/components/v3/ProblemFlowSectionV3";
import OnesDifferenceSectionV3 from "@/features/marketing/components/v3/OnesDifferenceSectionV3";
import LifestyleShowcaseSection from "@/features/marketing/components/LifestyleShowcaseSection";
import CompetitiveComparisonSectionV2 from "@/features/marketing/components/v3/CompetitiveComparisonSectionV2";
import HowItWorksSectionV4 from "@/features/marketing/components/v3/HowItWorksSectionV4";
import MembershipPricingSectionV4 from "@/features/marketing/components/v3/MembershipPricingSectionV4";
import TestimonialsSectionV4 from "@/features/marketing/components/v3/TestimonialsSectionV4";
import FAQSectionV4 from "@/features/marketing/components/v3/FAQSectionV4";
import CTASectionV4 from "@/features/marketing/components/v3/CTASectionV4";
import FooterV3 from "@/features/marketing/components/v3/FooterV3";
import SectionDivider from "@/features/marketing/components/v3/SectionDivider";

/**
 * Landing Page V3 — Premium visual upgrade.
 * Glass morphism, gradient text, animated borders, ambient lighting.
 * Accessible at /v2 for side-by-side comparison.
 */
export default function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV3 />
      <main className="bg-[#ede8e2]">
        {/* Fixed header spacer */}
        <div className="pt-20">
          <HeroSectionV3 />
        </div>

        {/* Hero (cream) -> Problem (white) */}
        <SectionDivider from="cream" to="white" />
        <ProblemFlowSectionV3 />

        {/* Problem (white) -> Difference (cream) */}
        <SectionDivider from="white" to="cream" />
        <OnesDifferenceSectionV3 />

        {/* Difference (cream) -> Lifestyle (white) */}
        <SectionDivider from="cream" to="white" />
        <LifestyleShowcaseSection />

        {/* Lifestyle (white) -> Comparison (white) — same bg */}
        <CompetitiveComparisonSectionV2 />

        {/* Comparison (white) -> HowItWorks (cream) */}
        <SectionDivider from="white" to="cream" />
        <HowItWorksSectionV4 />

        {/* HowItWorks (cream) -> Pricing (cream) — seamless */}
        <MembershipPricingSectionV4 />

        {/* Pricing (cream) -> Testimonials (white) */}
        <SectionDivider from="cream" to="white" />
        <TestimonialsSectionV4 />

        {/* Testimonials (white) -> FAQ (cream) */}
        <SectionDivider from="white" to="cream" />
        <FAQSectionV4 />

        {/* FAQ (cream) -> CTA (full-bleed image) */}
        <CTASectionV4 />
      </main>
      <FooterV3 />
    </div>
  );
}
