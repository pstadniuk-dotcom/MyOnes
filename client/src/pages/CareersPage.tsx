import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MapPin, Clock, ArrowRight, Briefcase } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6" data-testid="heading-careers-hero">
              Join Our Mission
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-careers-description">
              Help us revolutionize personalized nutrition and make a real impact on people's health.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-12 text-center">
              Why Work at Ones?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Impact That Matters</CardTitle>
                  <CardDescription>
                    Your work directly improves people's health and wellbeing every day.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cutting-Edge Tech</CardTitle>
                  <CardDescription>
                    Work with AI, machine learning, and the latest health tech innovations.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Remote-First Culture</CardTitle>
                  <CardDescription>
                    Flexible work arrangements with a distributed team across the globe.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-12 text-center">
              Open Positions
            </h2>
            <div className="space-y-6">
              {openings.map((job) => (
                <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                        <CardDescription className="mb-4">{job.description}</CardDescription>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                      <Button data-testid={`button-apply-${job.id}`}>
                        Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                Don't see a perfect fit? We're always looking for talented people.
              </p>
              <Button variant="outline" data-testid="button-general-inquiry">
                Send General Application
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
