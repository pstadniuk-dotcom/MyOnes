import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Brain, Target, X, Check, AlertTriangle, Sparkles } from 'lucide-react';
import ag1Image from '@assets/ag1_1760380986912.png';
import blueprintImage from '@assets/blueprint_1760380986912.webp';
import ritualImage from '@assets/Ritual_1760380986912.avif';
import huelImage from '@assets/Huel_1760380986912.png';

export default function ScienceSection() {
  const competitors = [
    { 
      name: "AG1", 
      formula: "Same greens powder for everyone", 
      color: "bg-red-50 border-red-200",
      image: ag1Image
    },
    { 
      name: "Blueprint", 
      formula: "Bryan's exact 100-pill protocol for everyone", 
      color: "bg-red-50 border-red-200",
      image: blueprintImage
    },
    { 
      name: "Ritual", 
      formula: "Same \"Essential\" whether you're 18 or 80", 
      color: "bg-red-50 border-red-200",
      image: ritualImage
    },
    { 
      name: "Huel", 
      formula: "One formula, millions of bodies", 
      color: "bg-red-50 border-red-200",
      image: huelImage
    }
  ];

  const audienceTypes = [
    "22-year-old athletes & 65-year-olds with diabetes",
    "New moms & people on antidepressants", 
    "Vegans with deficiencies & CEOs with stress",
    "Night shift workers & retirees with arthritis"
  ];

  const competitorApproach = [
    "What's your age?",
    "Pick a health goal", 
    "Here's formula #3 of 8",
    "Same thing forever",
    "Never asks about meds"
  ];

  const onesApproach = [
    "Tell me about YOUR health",
    "What medications?",
    "Builds YOUR formula", 
    "400+ ingredients to choose from",
    "Evolves every refill"
  ];

  return (
    <section className="py-20 bg-background" data-testid="section-science">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Headline */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-main-headline">
            Why One Size Fits None
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-main-description">
            Different bodies. Different needs. Same bottle.
          </p>
        </div>

        {/* The Same Formula Problem */}
        <div className="mb-16">
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-center text-foreground mb-8" data-testid="text-problem-title">
            The Same Formula Problem
          </h3>
          <p className="text-lg text-muted-foreground text-center mb-8 max-w-3xl mx-auto">
            Major brands give identical formulas to completely different people:
          </p>

          {/* Competitor Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
            {competitors.map((competitor, index) => (
              <Card key={index} className={`overflow-hidden ${competitor.color} hover-elevate`} data-testid={`card-competitor-${index}`}>
                <div className="aspect-square w-full bg-white flex items-center justify-center p-8">
                  <img 
                    src={competitor.image} 
                    alt={competitor.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">{competitor.name}</h4>
                      <p className="text-sm text-muted-foreground">{competitor.formula}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-center text-muted-foreground mb-6 italic">Going to:</p>

          {/* Audience Types */}
          <div className="grid md:grid-cols-2 gap-3 max-w-3xl mx-auto mb-8">
            {audienceTypes.map((audience, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg" data-testid={`audience-type-${index}`}>
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{audience}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Card className="inline-block p-6 bg-destructive/5 border-2 border-destructive/20">
              <h4 className="text-xl font-bold text-destructive mb-2" data-testid="text-same-bottle">
                Different bodies. Different needs. Same bottle.
              </h4>
            </Card>
          </div>
        </div>

        {/* The ONES Difference */}
        <div className="mb-16">
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-center text-foreground mb-12" data-testid="text-ones-difference-title">
            The ONES Difference
          </h3>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Them: 5-Question Quiz */}
            <Card className="p-8 bg-red-50 border-red-200" data-testid="card-competitor-approach">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="text-xl font-bold text-red-700 mb-2">Them: 5-Question Quiz</h4>
              </div>
              
              <div className="space-y-3">
                {competitorApproach.map((item, index) => (
                  <div key={index} className="flex items-center gap-3" data-testid={`competitor-item-${index}`}>
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ONES: AI Conversation */}
            <Card className="p-8 bg-primary/5 border-primary/20" data-testid="card-ones-approach">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-xl font-bold text-primary mb-2">ONES: AI Conversation</h4>
              </div>
              
              <div className="space-y-3">
                {onesApproach.map((item, index) => (
                  <div key={index} className="flex items-center gap-3" data-testid={`ones-item-${index}`}>
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-primary">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="mb-16 text-center">
          <Card className="inline-block p-8 bg-accent/10 border-accent/20">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Target className="w-6 h-6 text-accent" />
              <span className="text-2xl font-bold text-accent">42%</span>
            </div>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">42% of Americans take prescription meds.</strong>
            </p>
            <p className="text-sm text-muted-foreground">Most brands never ask.</p>
          </Card>
        </div>

        {/* Final Quote */}
        <div className="text-center">
          <Card className="inline-block p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 max-w-2xl">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <blockquote className="text-xl md:text-2xl font-serif font-bold text-primary leading-relaxed" data-testid="text-final-quote">
              "You wouldn't take someone else's prescription. Why take their vitamins?"
            </blockquote>
          </Card>
        </div>
      </div>
    </section>
  );
}