import HeaderV2 from "@/components/HeaderV2";
import HeroSectionV2 from "@/components/HeroSectionV2";
import ProblemSectionV2 from "@/components/ProblemSectionV2";
import HowItWorksSectionV2 from "@/components/HowItWorksSectionV2";
import LifestyleBannerV2 from "@/components/LifestyleBannerV2";
import PersonalizationShowcase from "@/components/PersonalizationShowcase";
import ScienceSectionV2 from "@/components/ScienceSectionV2";
import TestimonialsSectionV2 from "@/components/TestimonialsSectionV2";
import PricingSectionV2 from "@/components/PricingSectionV2";
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
        <ProblemSectionV2 />
        <HowItWorksSectionV2 />
        <PersonalizationShowcase />
        <ScienceSectionV2 />
        <TestimonialsSectionV2 />
        <LifestyleBannerV2 />
        <div id="pricing">
          <PricingSectionV2 />
        </div>
        <FAQSectionV2 />
        <CTASectionV2 />
      </main>
      <FooterV2 />
    </div>
  );
}
