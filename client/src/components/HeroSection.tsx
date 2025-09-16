import { Button } from '@/components/ui/button';
import AIChat from './AIChat';
import heroImage from '@assets/generated_images/Diverse_wellness_lifestyle_hero_a1825347.png';

export default function HeroSection() {
  const handleStartConsultation = () => {
    console.log('Start consultation clicked from hero');
  };

  return (
    <section className="min-h-screen bg-earthy-gradient dark:bg-earthy-gradient-dark relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="People living healthy lifestyles" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40 dark:from-background/90 dark:to-background/60"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Side - Headline and Description */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight" data-testid="text-hero-headline">
                One personalized capsule.
                <span className="text-primary block">Powered by AI.</span>
                <span className="text-muted-foreground block">Evolved by you.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed" data-testid="text-hero-description">
                Stop guessing with your health. Get a supplement formula designed specifically for your biology, goals, and lifestyle.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={handleStartConsultation}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                data-testid="button-hero-start-consultation"
              >
                Start Your Free Consultation
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
                  <div className="w-12 h-8 bg-primary rounded-lg flex items-center justify-center">
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