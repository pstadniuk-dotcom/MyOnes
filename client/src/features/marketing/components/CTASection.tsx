import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Shield, Award, MapPin } from 'lucide-react';
import { Link } from 'wouter';

export default function CTASection() {
  const trustBadges = [
    {
      icon: Award,
      title: "Third-party tested",
      description: "Every batch verified for purity and potency"
    },
    {
      icon: MapPin,
      title: "Made in USA",
      description: "Proudly manufactured in American facilities"
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "Manufactured to the highest safety standards"
    }
  ];

  // Removed old handlers - using Link components for proper routing

  return (
    <section className="py-20 bg-earthy-gradient dark:bg-earthy-gradient-dark relative overflow-hidden" data-testid="section-final-cta">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-primary rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6" data-testid="text-final-cta-headline">
              Your health is unique.
              <span className="text-primary block">Your supplements should be too.</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-final-cta-description">
              Join thousands who've transformed their health with AI-powered personalization. Start your journey today.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mb-16">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold"
                data-testid="button-final-start-consultation"
              >
                <Link href="/signup">
                  Start Your Consultation
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-foreground/20 hover:border-primary px-8 py-4 text-lg"
                data-testid="button-learn-more-process"
                onClick={() => {
                  const scienceSection = document.getElementById('science');
                  scienceSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More About Our Process
              </Button>
            </div>
            
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Free consultation & analysis
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Free nationwide shipping
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Custom-made formulas
              </span>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {trustBadges.map((badge, index) => {
              const IconComponent = badge.icon;
              return (
                <Card key={index} className="p-6 bg-background/80 backdrop-blur-sm hover-elevate transition-all duration-300">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2" data-testid={`text-trust-badge-title-${index}`}>
                      {badge.title}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-trust-badge-description-${index}`}>
                      {badge.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}