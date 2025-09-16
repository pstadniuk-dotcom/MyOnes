import { Button } from '@/components/ui/button';
import AIChat from './AIChat';

export default function HeroSection() {
  const handleStartConsultation = () => {
    console.log('Start consultation clicked from hero');
  };

  return (
    <section className="min-h-screen bg-background relative">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
        <div className="grid lg:grid-cols-12 gap-16 items-center min-h-[80vh]">
          {/* Left Side - Editorial Headlines */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-serif font-normal text-foreground leading-[1.1] tracking-tight max-w-[12ch]" data-testid="text-hero-headline">
                Precision nutrition.
                <span className="text-primary block">Powered by AI.</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-[32ch] leading-relaxed font-light" data-testid="text-hero-description">
                Stop guessing with your health. Get supplements designed specifically for your biology, goals, and lifestyle.
              </p>
            </div>

            <div className="space-y-8">
              <Button 
                variant="outline"
                size="lg" 
                onClick={handleStartConsultation}
                className="px-8 py-6 text-lg border-foreground/20 hover:border-foreground/40 transition-colors duration-300"
                data-testid="button-hero-start-consultation"
              >
                Start Your Consultation
              </Button>
              
              <div className="grid grid-cols-3 gap-8 pt-4 max-w-md">
                <div className="text-center border-r border-border last:border-r-0">
                  <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Free</div>
                  <div className="text-sm text-foreground mt-1">Consultation</div>
                </div>
                <div className="text-center border-r border-border last:border-r-0">
                  <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium">No</div>
                  <div className="text-sm text-foreground mt-1">Commitment</div>
                </div>
                <div className="text-center">
                  <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Custom</div>
                  <div className="text-sm text-foreground mt-1">Formula</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - AI Chat Interface */}
          <div className="lg:col-span-5 flex justify-end">
            <div className="max-w-md w-full">
              <AIChat />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}