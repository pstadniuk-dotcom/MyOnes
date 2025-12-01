import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, Users, Award, Target } from 'lucide-react';
import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="relative pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6 leading-tight" data-testid="heading-about-hero">
              Transforming Health,<br />One Formula at a Time
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-about-description">
              We're on a mission to make personalized nutrition accessible to everyone through the power of AI and scientific research.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-light text-[#1B4332] mb-6" data-testid="heading-mission">
                Our Mission
              </h2>
              <p className="text-[#52796F] mb-4 leading-relaxed">
                At Ones, we believe that everyone deserves access to personalized nutrition based on their unique health profile. Traditional supplements take a one-size-fits-all approach, but your body is unique.
              </p>
              <p className="text-[#52796F] mb-4 leading-relaxed">
                Using advanced AI and a comprehensive catalog of premium ingredients, we create custom supplement formulas tailored specifically to your health needs, goals, and biomarkers.
              </p>
              <p className="text-[#52796F] leading-relaxed">
                Our platform combines medical-grade thoroughness with the convenience of modern technology, making it simple to get the exact nutrients your body needs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <Target className="w-8 h-8 text-[#1B4332] mb-4" />
                <h3 className="font-medium text-[#1B4332] mb-2">Personalized</h3>
                <p className="text-sm text-[#52796F]">Custom formulas based on your unique health profile</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <Award className="w-8 h-8 text-[#1B4332] mb-4" />
                <h3 className="font-medium text-[#1B4332] mb-2">Premium Quality</h3>
                <p className="text-sm text-[#52796F]">400+ high-quality, scientifically-backed ingredients</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <Users className="w-8 h-8 text-[#1B4332] mb-4" />
                <h3 className="font-medium text-[#1B4332] mb-2">Expert-Guided</h3>
                <p className="text-sm text-[#52796F]">AI trained on medical-grade health assessments</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <Heart className="w-8 h-8 text-[#1B4332] mb-4" />
                <h3 className="font-medium text-[#1B4332] mb-2">Simple</h3>
                <p className="text-sm text-[#52796F]">One capsule, all your nutrients, delivered monthly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-light text-[#1B4332] mb-8 text-center" data-testid="heading-story">
              Our Story
            </h2>
            <div className="space-y-4">
              <p className="text-[#52796F] leading-relaxed">
                Ones was founded by a team of health professionals, data scientists, and engineers who experienced firsthand the frustration of generic supplements. Despite trying dozens of products, they couldn't find solutions tailored to their specific needs.
              </p>
              <p className="text-[#52796F] leading-relaxed">
                The breakthrough came when they realized that AI could analyze individual health profiles the same way a skilled practitioner would—but at scale. By combining extensive medical knowledge with advanced machine learning, they created a system that asks the right questions, understands complex health data, and formulates precise supplement recommendations.
              </p>
              <p className="text-[#52796F] leading-relaxed">
                Today, Ones serves thousands of customers who trust us to deliver personalized nutrition that actually works. We're continuously improving our AI, expanding our ingredient catalog, and staying at the forefront of nutritional science.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-light text-[#1B4332] mb-6">
              Ready to Experience Personalized Nutrition?
            </h2>
            <p className="text-[#52796F] mb-8">
              Start your health journey with a personalized AI consultation.
            </p>
            <Link href="/">
              <Button size="lg" className="bg-[#1B4332] hover:bg-[#1B4332]/90" data-testid="button-get-started">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
