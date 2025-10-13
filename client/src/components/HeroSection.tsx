import { Button } from '@/components/ui/button';
import AIChat from './AIChat';
import heroImage from '@assets/generated_images/Diverse_wellness_lifestyle_hero_a1825347.png';
import { Link } from 'wouter';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="min-h-screen relative overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[85vh]">
          {/* Left Side - Headline and Description */}
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Personalization
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight" data-testid="text-hero-headline">
                One capsule.
                <span className="text-primary block mt-2">Built for you.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed" data-testid="text-hero-description">
                Stop guessing with your health. Get a supplement formula designed for your unique biology, goals, and lifestyle.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild
                size="lg" 
                className="text-lg group"
                data-testid="button-hero-start-consultation"
              >
                <Link href="/signup">
                  Start Free Consultation
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                asChild
                variant="outline"
                size="lg"
                className="text-lg"
              >
                <Link href="#how-it-works">
                  See How It Works
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                Free consultation
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                No commitment
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                400+ ingredients
              </div>
            </div>
          </div>

          {/* Right Side - AI Chat Interface */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-lg">
              <AIChat />
            </div>
          </div>
        </div>
      </div>

      {/* Minimal scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border border-border rounded-full flex justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
        </div>
      </div>
    </section>
  );
}
