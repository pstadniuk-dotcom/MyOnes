import { Mail } from 'lucide-react';
import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

export default function PressPage() {
  const pressReleases = [
    {
      id: 1,
      title: 'ONES Launches AI-Powered Personalized Supplement Platform',
      date: '2024-03-01',
      excerpt: 'Revolutionary platform combines artificial intelligence with nutritional science to create custom supplement formulas.'
    },
    {
      id: 2,
      title: 'ONES Secures Series A Funding to Expand Health Tech Innovation',
      date: '2024-02-15',
      excerpt: 'Investment will accelerate AI development and expand ingredient catalog to serve more health needs.'
    },
    {
      id: 3,
      title: 'Clinical Study Validates Ones Personalization Approach',
      date: '2024-01-20',
      excerpt: 'New research shows significant improvements in health outcomes with personalized supplementation.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              News
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6" data-testid="heading-press-hero">
              Press & Media
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-press-description">
              Latest news, press releases, and media resources for Ones.
            </p>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-light text-[#1B4332] mb-8">Recent Press Releases</h2>
          <div className="space-y-6">
            {pressReleases.map((release) => (
              <div key={release.id} className="bg-[#FAF7F2] rounded-2xl p-8 hover:shadow-md transition-shadow" data-testid={`card-press-${release.id}`}>
                <div className="text-sm text-[#52796F] mb-2">
                  {new Date(release.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <h3 className="text-xl font-medium text-[#1B4332] mb-2">{release.title}</h3>
                <p className="text-[#52796F]">{release.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h3 className="flex items-center gap-2 text-xl font-medium text-[#1B4332] mb-4">
              <Mail className="w-5 h-5" />
              Press Inquiries
            </h3>
            <p className="text-[#52796F] mb-6">
              For media inquiries, interviews, or additional information, please contact our press team.
            </p>
            <a 
              href="mailto:support@myones.ai" 
              className="inline-flex items-center gap-2 text-[#1B4332] font-medium hover:underline"
            >
              <Mail className="w-4 h-4" />
              support@myones.ai
            </a>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
