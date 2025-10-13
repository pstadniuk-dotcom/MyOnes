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
    <section className="py-24 bg-muted/30" data-testid="section-problem">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight" data-testid="text-problem-headline">
            Your supplement cabinet is a mess of guesswork
          </h2>
          <p className="text-lg text-muted-foreground" data-testid="text-problem-description">
            Most people are taking supplements without any real strategy, wasting money and potentially harming their health.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <Card 
                key={index}
                className="p-8 text-center border-border/50 hover-elevate transition-all duration-300"
                data-testid={`card-problem-${index}`}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <IconComponent className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3" data-testid={`text-problem-title-${index}`}>
                  {problem.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm" data-testid={`text-problem-description-${index}`}>
                  {problem.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Visual representation of supplement chaos */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 bg-card/50 border border-border/50 p-8 rounded-2xl">
            {Array.from({length: 8}).map((_, i) => (
              <div 
                key={i} 
                className="w-5 h-12 bg-gradient-to-b from-primary/40 to-primary/70 rounded-full"
                style={{ transform: `rotate(${(i - 4) * 3}deg)` }}
              ></div>
            ))}
            <span className="text-2xl mx-4 text-muted-foreground">→</span>
            <div className="w-6 h-14 bg-gradient-to-b from-primary to-primary/80 rounded-full"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 font-medium">From chaos to precision</p>
        </div>
      </div>
    </section>
  );
}
