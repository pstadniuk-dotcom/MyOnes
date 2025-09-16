import { Card } from '@/components/ui/card';
import { Boxes, Users, Eye } from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      icon: Boxes,
      title: "10-15 bottles with overlapping ingredients",
      description: "Your medicine cabinet is overflowing with supplements that may be working against each other or duplicating effects."
    },
    {
      icon: Users,
      title: "Generic formulas ignoring your unique biology", 
      description: "One-size-fits-all supplements ignore your genetics, lifestyle, blood work, and individual health goals."
    },
    {
      icon: Eye,
      title: "No idea what's actually working",
      description: "Without proper tracking and personalization, you're flying blind on which supplements are helping or hurting."
    }
  ];

  return (
    <section className="py-20 bg-background" data-testid="section-problem">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-problem-headline">
            Your supplement cabinet is a mess of guesswork
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-problem-description">
            Most people are taking supplements without any real strategy, wasting money and potentially harming their health.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <Card 
                key={index} 
                className="p-8 text-center hover-elevate transition-all duration-300 group"
                data-testid={`card-problem-${index}`}
              >
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20 transition-colors duration-300">
                  <IconComponent className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4" data-testid={`text-problem-title-${index}`}>
                  {problem.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed" data-testid={`text-problem-description-${index}`}>
                  {problem.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Visual representation of supplement chaos */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 bg-muted p-4 rounded-lg">
            {Array.from({length: 8}).map((_, i) => (
              <div 
                key={i} 
                className="w-8 h-12 bg-gradient-to-b from-amber-400 to-amber-600 rounded-sm opacity-70"
                style={{ transform: `rotate(${(i - 4) * 3}deg)` }}
              ></div>
            ))}
            <span className="text-2xl mx-4">→</span>
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">From chaos to precision</p>
        </div>
      </div>
    </section>
  );
}