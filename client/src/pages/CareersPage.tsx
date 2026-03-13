import { Button } from '@/shared/components/ui/button';
import { Mail } from 'lucide-react';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Careers
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#054700] mb-6" data-testid="heading-careers-hero">
              Join Our Mission
            </h1>
            <p className="text-xl text-[#5a6623] max-w-2xl mx-auto" data-testid="text-careers-description">
              Help us revolutionize personalized nutrition and make a real impact on people's health.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-light text-[#054700] mb-12 text-center">
            Why Work at Ones?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#ede8e2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#054700] mb-3">Impact That Matters</h3>
              <p className="text-[#5a6623] leading-relaxed">
                Your work directly improves people's health and wellbeing every day.
              </p>
            </div>
            <div className="bg-[#ede8e2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#054700] mb-3">Cutting-Edge Tech</h3>
              <p className="text-[#5a6623] leading-relaxed">
                Work with AI, machine learning, and the latest health tech innovations.
              </p>
            </div>
            <div className="bg-[#ede8e2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#054700] mb-3">Remote-First Culture</h3>
              <p className="text-[#5a6623] leading-relaxed">
                Flexible work arrangements with a distributed team across the globe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* No Open Positions */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-3xl font-light text-[#054700] mb-6">
            No Open Positions
          </h2>
          <p className="text-lg text-[#5a6623] mb-8 max-w-xl mx-auto">
            We're not actively hiring right now, but we're always interested in hearing from talented people. Feel free to reach out — we'll keep you in mind for future openings.
          </p>
          <a href="mailto:support@ones.health">
            <Button variant="outline" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white" data-testid="button-general-inquiry">
              <Mail className="w-4 h-4 mr-2" />
              Get in Touch
            </Button>
          </a>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
