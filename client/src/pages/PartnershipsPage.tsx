import { Link } from 'wouter';
import { Mail, Users, Sparkles, TrendingUp, Heart } from 'lucide-react';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Partner With Us
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6">
              Partnerships
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto">
              Join us in revolutionizing personalized health. We're looking for passionate creators and organizations to help spread the message of individualized wellness.
            </p>
          </div>
        </div>
      </section>

      {/* Partnership Types */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Creator Partnerships */}
            <div className="bg-[#FAF7F2] rounded-2xl p-8 md:p-10">
              <div className="w-12 h-12 bg-[#1B4332]/10 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-[#1B4332]" />
              </div>
              <h2 className="text-2xl font-light text-[#1B4332] mb-4">Creator Partnerships</h2>
              <p className="text-[#52796F] mb-6">
                Are you a health and wellness influencer, fitness coach, or content creator? Partner with ONES to offer your audience truly personalized supplementation.
              </p>
              <ul className="space-y-3 text-[#52796F]">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Competitive commission structure</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Dedicated partnership manager</span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Exclusive content and early access</span>
                </li>
              </ul>
            </div>

            {/* General Partnerships */}
            <div className="bg-[#FAF7F2] rounded-2xl p-8 md:p-10">
              <div className="w-12 h-12 bg-[#1B4332]/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-[#1B4332]" />
              </div>
              <h2 className="text-2xl font-light text-[#1B4332] mb-4">General Partnerships</h2>
              <p className="text-[#52796F] mb-6">
                We're always exploring new ways to collaborate with gyms, wellness centers, healthcare providers, and organizations aligned with our mission.
              </p>
              <ul className="space-y-3 text-[#52796F]">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Corporate wellness programs</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Gym and studio integrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                  <span>Healthcare provider collaborations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-light text-[#1B4332] mb-8 text-center">Why Partner With ONES?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-2xl font-light text-[#1B4332]">AI</span>
              </div>
              <h3 className="font-medium text-[#1B4332] mb-2">Cutting-Edge Technology</h3>
              <p className="text-sm text-[#52796F]">
                Our AI-powered platform creates truly personalized formulas based on individual health data.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-2xl font-light text-[#1B4332]">✓</span>
              </div>
              <h3 className="font-medium text-[#1B4332] mb-2">Science-Backed</h3>
              <p className="text-sm text-[#52796F]">
                Third-party tested, GMP certified, and formulated based on peer-reviewed research.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-2xl font-light text-[#1B4332]">♥</span>
              </div>
              <h3 className="font-medium text-[#1B4332] mb-2">Customer Success</h3>
              <p className="text-sm text-[#52796F]">
                High customer satisfaction with personalized formulas that actually address individual needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-[#FAF7F2] rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Ready to Partner?</h2>
            <p className="text-[#52796F] mb-8 max-w-xl mx-auto">
              We'd love to hear from you. Reach out to discuss how we can work together to bring personalized wellness to more people.
            </p>
            <Link 
              href="/contact?type=partnership" 
              className="inline-flex items-center gap-2 bg-[#1B4332] hover:bg-[#143728] text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <FooterV2 />
    </div>
  );
}
