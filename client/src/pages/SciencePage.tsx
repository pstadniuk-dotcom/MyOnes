import Header from "@/components/Header";
import ScienceSection from "@/components/ScienceSection";
import Footer from "@/components/Footer";

export default function SciencePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ScienceSection />
      </main>
      <Footer />
    </div>
  );
}