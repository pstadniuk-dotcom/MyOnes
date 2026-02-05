import { Link } from 'wouter';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { MapPin, Clock, ArrowRight, Briefcase } from 'lucide-react';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function CareersPage() {
  const openings = [
    {
      id: 1,
      title: 'Senior AI/ML Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Build and improve our AI health assessment system using cutting-edge machine learning.'
    },
    {
      id: 2,
      title: 'Clinical Nutritionist',
      department: 'Health Sciences',
      location: 'San Francisco, CA',
      type: 'Full-time',
      description: 'Help shape our supplement formulation algorithms and validate health recommendations.'
    },
    {
      id: 3,
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      description: 'Create beautiful, intuitive experiences for our health-focused platform.'
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
              Join Us
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6" data-testid="heading-careers-hero">
              Join Our Mission
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-careers-description">
              Help us revolutionize personalized nutrition and make a real impact on people's health.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-light text-[#1B4332] mb-12 text-center">
            Why Work at Ones?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#FAF7F2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#1B4332] mb-3">Impact That Matters</h3>
              <p className="text-[#52796F] leading-relaxed">
                Your work directly improves people's health and wellbeing every day.
              </p>
            </div>
            <div className="bg-[#FAF7F2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#1B4332] mb-3">Cutting-Edge Tech</h3>
              <p className="text-[#52796F] leading-relaxed">
                Work with AI, machine learning, and the latest health tech innovations.
              </p>
            </div>
            <div className="bg-[#FAF7F2] rounded-2xl p-8">
              <h3 className="text-xl font-medium text-[#1B4332] mb-3">Remote-First Culture</h3>
              <p className="text-[#52796F] leading-relaxed">
                Flexible work arrangements with a distributed team across the globe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-light text-[#1B4332] mb-12 text-center">
            Open Positions
          </h2>
          <div className="space-y-6">
            {openings.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-job-${job.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-medium text-[#1B4332] mb-2">{job.title}</h3>
                    <p className="text-[#52796F] mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-[#52796F]">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{job.department}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{job.type}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90" data-testid={`button-apply-${job.id}`}>
                    Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-[#52796F] mb-4">
              Don't see a perfect fit? We're always looking for talented people.
            </p>
            <Button variant="outline" className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white" data-testid="button-general-inquiry">
              Send General Application
            </Button>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
