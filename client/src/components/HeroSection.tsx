import AIChat from './AIChat';

export default function HeroSection() {
  return (
    <section className="min-h-screen bg-premium-gradient relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20 dark:from-primary/20 dark:via-background dark:to-accent/30"></div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12">
          
          {/* Main Heading */}
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground leading-tight" data-testid="text-hero-headline">
              Perfect Your Health
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed" data-testid="text-hero-description">
              Create personalized supplements by chatting with AI
            </p>
          </div>

          {/* Conversation Starter */}
          <div className="space-y-4 max-w-2xl">
            <p className="text-lg text-muted-foreground/80 italic">
              Ask ONES about your chronic fatigue and brain fog...
            </p>
          </div>

          {/* AI Chat Interface - Prominently Centered */}
          <div className="transform scale-110 lg:scale-125">
            <AIChat />
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