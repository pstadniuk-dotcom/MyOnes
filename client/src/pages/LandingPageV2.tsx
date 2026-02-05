import HeaderV2 from "@/features/marketing/components/HeaderV2";
import HeroSectionV2 from "@/features/marketing/components/HeroSectionV2";
import MembershipValueSection from "@/features/marketing/components/MembershipValueSection";
import InterventionSection from "@/features/marketing/components/InterventionSection";
import CompetitiveComparisonSection from "@/features/marketing/components/CompetitiveComparisonSection";
import HowItWorksSectionV2 from "@/features/marketing/components/HowItWorksSectionV2";
import ScienceSectionV2 from "@/features/marketing/components/ScienceSectionV2";
import MembershipPricingSection from "@/features/marketing/components/MembershipPricingSection";
import SupplementPricingSection from "@/features/formulas/components/SupplementPricingSection";
import TestimonialsSectionV2 from "@/features/marketing/components/TestimonialsSectionV2";
import FAQSectionV2 from "@/features/marketing/components/FAQSectionV2";
import CTASectionV2 from "@/features/marketing/components/CTASectionV2";
import FooterV2 from "@/features/marketing/components/FooterV2";

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      <main className="bg-[#FAF7F2]">
        {/* Add padding for fixed header */}
        <div className="pt-20">
          <HeroSectionV2 />
        </div>
        <MembershipValueSection />
        <InterventionSection />
        <CompetitiveComparisonSection />
        <HowItWorksSectionV2 />
        <ScienceSectionV2 />
        <div id="pricing">
          <MembershipPricingSection />
        </div>
        <SupplementPricingSection />
        <div id="testimonials">
          <TestimonialsSectionV2 />
        </div>
        <FAQSectionV2 />
        <CTASectionV2 />
      </main>
      <FooterV2 />
    </div>
  );
}
