import HeaderV2 from "@/components/HeaderV2";
import ScienceSection from "@/components/ScienceSection";
import FooterV2 from "@/components/FooterV2";

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