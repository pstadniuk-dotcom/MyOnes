import HeaderV2 from "@/components/HeaderV2";
import HeroSectionV2 from "@/components/HeroSectionV2";
import MembershipValueSection from "@/components/MembershipValueSection";
import ProblemSectionV2 from "@/components/ProblemSectionV2";
import HowItWorksSectionV2 from "@/components/HowItWorksSectionV2";
import PersonalizationShowcase from "@/components/PersonalizationShowcase";
import ScienceSectionV2 from "@/components/ScienceSectionV2";
import MembershipPricingSection from "@/components/MembershipPricingSection";
import SupplementPricingSection from "@/components/SupplementPricingSection";
import TestimonialsSectionV2 from "@/components/TestimonialsSectionV2";
import FAQSectionV2 from "@/components/FAQSectionV2";
import CTASectionV2 from "@/components/CTASectionV2";
import FooterV2 from "@/components/FooterV2";

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
        <ProblemSectionV2 />
        <HowItWorksSectionV2 />
        <PersonalizationShowcase />
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
