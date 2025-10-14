import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Mail, FileText, Image as ImageIcon } from 'lucide-react';

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
      title: 'Clinical Study Validates ONES Personalization Approach',
      date: '2024-01-20',
      excerpt: 'New research shows significant improvements in health outcomes with personalized supplementation.'
    }
  ];

  const mediaKit = [
    {
      name: 'Company Logo Pack',
      description: 'High-resolution logos in various formats',
      icon: ImageIcon
    },
    {
      name: 'Press Kit',
      description: 'Company overview, fact sheet, and key statistics',
      icon: FileText
    },
    {
      name: 'Product Images',
      description: 'High-quality product photography',
      icon: ImageIcon
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6" data-testid="heading-press-hero">
              Press & Media
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-press-description">
              Latest news, press releases, and media resources for ONES.
            </p>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8">Recent Press Releases</h2>
            <div className="space-y-6">
              {pressReleases.map((release) => (
                <Card key={release.id} className="hover-elevate" data-testid={`card-press-${release.id}`}>
                  <CardHeader>
                    <div className="text-sm text-muted-foreground mb-2">
                      {new Date(release.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <CardTitle className="text-xl mb-2">{release.title}</CardTitle>
                    <CardDescription>{release.excerpt}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8">Media Kit</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {mediaKit.map((item, index) => (
                <Card key={index} className="hover-elevate">
                  <CardHeader>
                    <item.icon className="w-8 h-8 text-primary mb-4" />
                    <CardTitle className="text-lg mb-2">{item.name}</CardTitle>
                    <CardDescription className="mb-4">{item.description}</CardDescription>
                    <Button variant="outline" size="sm" data-testid={`button-download-${index}`}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Press Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5" />
                  Press Inquiries
                </CardTitle>
                <CardDescription className="mb-4">
                  For media inquiries, interviews, or additional information, please contact our press team.
                </CardDescription>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> press@ones.health</p>
                  <p><strong>Response Time:</strong> Within 24 hours</p>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
