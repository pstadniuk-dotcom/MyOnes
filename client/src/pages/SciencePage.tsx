import HeaderV2 from "@/features/marketing/components/HeaderV2";
import ScienceSection from "@/features/marketing/components/ScienceSection";
import FooterV2 from "@/features/marketing/components/FooterV2";

export default function SciencePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      <main>
        <ScienceSection />
      </main>
      <FooterV2 />
    </div>
  );
}