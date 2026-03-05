import HeaderV2 from "@/features/marketing/components/HeaderV2";
import HeroSectionV2 from "@/features/marketing/components/HeroSectionV2";
import InterventionSection from "@/features/marketing/components/InterventionSection";
import CompetitiveComparisonSection from "@/features/marketing/components/CompetitiveComparisonSection";
import HowItWorksSectionV2 from "@/features/marketing/components/HowItWorksSectionV2";
import MembershipPricingSection from "@/features/marketing/components/MembershipPricingSection";
import TestimonialsSectionV2 from "@/features/marketing/components/TestimonialsSectionV2";
import FAQSectionV2 from "@/features/marketing/components/FAQSectionV2";
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
        <InterventionSection />
        <CompetitiveComparisonSection />
        <HowItWorksSectionV2 />
        <MembershipPricingSection />
        <TestimonialsSectionV2 />
        <FAQSectionV2 />
      </main>
      <FooterV2 />
    </div>
  );
}
