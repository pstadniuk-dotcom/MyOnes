import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AIChat from './AIChat';
import { Link } from 'wouter';

export default function HeroSection() {
  return (
    <section className="min-h-screen bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-[90px] pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
          {/* Left Side - Headline and Description */}
          <div className="space-y-6">
            {/* Pill Badges */}
            <div className="flex flex-wrap gap-3 text-sm text-foreground/70">
              <span className="flex items-center">
                <span className="w-1 h-1 bg-foreground/40 rounded-full mr-2"></span>
                Blood Data
              </span>
              <span className="flex items-center">
                <span className="w-1 h-1 bg-foreground/40 rounded-full mr-2"></span>
                Wearables
              </span>
              <span className="flex items-center">
                <span className="w-1 h-1 bg-foreground/40 rounded-full mr-2"></span>
                Your Capsule
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1]" data-testid="text-hero-headline">
                <span className="block text-primary">One capsule.</span>
                <span className="block text-primary">Fully personalized.</span>
                <span className="block text-accent">Always evolving.</span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-base md:text-lg text-foreground/70 max-w-lg leading-relaxed" data-testid="text-hero-description">
              Stop guessing with your health. Get a supplement formula designed specifically for your biology, goals, and lifestyle.
            </p>

            {/* CTA Button */}
            <div>
              <Button 
                asChild
                size="lg" 
                className="bg-foreground text-background hover:bg-foreground/90 px-8 py-6 text-base micro-bounce transition-all duration-300"
                data-testid="button-hero-start-consultation"
              >
                <Link href="/signup">
                  Start your free consultation
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - AI Chat Interface */}
          <div className="flex justify-center lg:justify-end">
            <AIChat />
          </div>
        </div>
      </div>
    </section>
  );
}