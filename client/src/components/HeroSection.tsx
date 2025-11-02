import { Button } from '@/components/ui/button';
import AIChat from './AIChat';
import heroImage from '@assets/generated_images/Diverse_wellness_lifestyle_hero_a1825347.png';
import { Link } from 'wouter';

export default function HeroSection() {
  // Hero button now navigates to signup instead of scrolling to AIChat

  return (
    <section className="min-h-screen bg-premium-gradient relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20 dark:from-primary/20 dark:via-background dark:to-accent/30"></div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Side - Headline and Description */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.2]" data-testid="text-hero-headline">
                <span className="block animate-fade-in">One capsule.</span>
                <span className="block animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>Fully personalized.</span>
                <span className="block animate-fade-in-shimmer pb-2" style={{ animationDelay: '1s', opacity: 0 }}>Always evolving.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed" data-testid="text-hero-description">
                Stop guessing with your health. Get a supplement formula designed specifically for your biology, goals, and lifestyle.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg micro-bounce micro-glow transition-all duration-300"
                data-testid="button-hero-start-consultation"
              >
                <Link href="/signup">
                  Start Your Free Consultation
                </Link>
              </Button>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Free consultation
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  No commitment
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Personalized formula
                </span>
              </div>
            </div>

            {/* Animated Data Points */}
            <div className="hidden lg:block mt-12">
              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  </div>
                  <span>Blood data</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <span>Wearables</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-8 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                  </div>
                  <span>Your capsule</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - AI Chat Interface */}
          <div className="flex justify-center lg:justify-end">
            <div className="transform lg:scale-110">
              <AIChat />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
          <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}