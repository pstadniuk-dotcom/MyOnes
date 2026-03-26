import HeaderV2 from "@/features/marketing/components/HeaderV2";
import HeroSectionV2 from "@/features/marketing/components/HeroSectionV2";
import ProblemFlowSection from "@/features/marketing/components/ProblemFlowSection";
import { OnesDifferenceSection } from "@/features/marketing/components/InterventionSection";
import LifestyleShowcaseSection from "@/features/marketing/components/LifestyleShowcaseSection";
import CompetitiveComparisonSection from "@/features/marketing/components/CompetitiveComparisonSection";
import HowItWorksSectionV3 from "@/features/marketing/components/HowItWorksSectionV3";
import MembershipPricingSection from "@/features/marketing/components/MembershipPricingSection";
import TestimonialsSectionV3 from "@/features/marketing/components/TestimonialsSectionV3";
import FAQSectionV3 from "@/features/marketing/components/FAQSectionV3";
import CTASectionV3 from "@/features/marketing/components/CTASectionV3";
import FooterV2 from "@/features/marketing/components/FooterV2";

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      <main className="bg-[#ede8e2]">
        {/* Add padding for fixed header */}
        <div className="pt-20">
          <HeroSectionV2 />
        </div>
        <ProblemFlowSection />
        <OnesDifferenceSection />
        <LifestyleShowcaseSection />
        <CompetitiveComparisonSection />
        <HowItWorksSectionV3 />
        <MembershipPricingSection />
        <TestimonialsSectionV3 />
        <FAQSectionV3 />
        <CTASectionV3 />
      </main>
      <FooterV2 />
    </div>
  );
}
