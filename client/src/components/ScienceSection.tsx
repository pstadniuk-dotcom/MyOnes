import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Brain, Target, X, Check, AlertTriangle, Sparkles } from 'lucide-react';
import ag1Image from '@assets/ag1_1760387996934.jpg';
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
    <section className="py-24 bg-background" data-testid="section-science">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Headline */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-main-headline">
            Why One Size Fits None
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-main-description">
            Major wellness brands give identical formulas to completely different people
          </p>
        </div>

        {/* The Same Formula Problem */}
        <div className="mb-24">
          {/* Competitor Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-7xl mx-auto">
            {competitors.map((competitor, index) => (
              <Card key={index} className="overflow-hidden bg-card border hover-elevate transition-premium" data-testid={`card-competitor-${index}`}>
                <div className="aspect-square w-full bg-white flex items-center justify-center p-6">
                  <img 
                    src={competitor.image} 
                    alt={competitor.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-5 bg-muted/30">
                  <h4 className="font-semibold text-foreground mb-2">{competitor.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{competitor.formula}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Flow indicator */}
          <div className="flex items-center justify-center mb-12">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <span className="mx-4 text-sm text-muted-foreground uppercase tracking-wider">Serving</span>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Audience Types - Modern Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-16">
            {audienceTypes.map((audience, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-lg border bg-card p-6 hover-elevate transition-premium" 
                data-testid={`audience-type-${index}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed pt-2">{audience}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Problem Statement */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5 blur-xl"></div>
              <Card className="relative inline-block px-10 py-8 bg-background/80 backdrop-blur-sm border-destructive/20">
                <h4 className="text-2xl md:text-3xl font-serif font-bold text-destructive leading-relaxed" data-testid="text-same-bottle">
                  Different bodies. Different needs.<br />Same bottle.
                </h4>
              </Card>
            </div>
          </div>
        </div>

        {/* The ONES Difference */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4" data-testid="text-ones-difference-title">
              The ONES Difference
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Beyond generic quizzes to true personalization
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Them: 5-Question Quiz */}
            <Card className="relative overflow-hidden p-10 bg-gradient-to-br from-muted/30 to-muted/10 border hover-elevate transition-premium" data-testid="card-competitor-approach">
              <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive/70" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Standard Approach</p>
                    <h4 className="text-xl font-semibold text-foreground">5-Question Quiz</h4>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {competitorApproach.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 pl-2" data-testid={`competitor-item-${index}`}>
                      <X className="w-4 h-4 text-destructive/60 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ONES: AI Conversation */}
            <Card className="relative overflow-hidden p-10 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover-elevate transition-premium" data-testid="card-ones-approach">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary/70 mb-1">ONES Approach</p>
                    <h4 className="text-xl font-semibold text-primary">AI Conversation</h4>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {onesApproach.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 pl-2" data-testid={`ones-item-${index}`}>
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 blur-2xl"></div>
              <Card className="relative overflow-hidden border-accent/20">
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                  <div className="p-10 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Target className="w-8 h-8 text-accent" />
                    </div>
                    <div className="text-5xl font-serif font-bold text-accent mb-3">42%</div>
                    <p className="text-foreground font-medium mb-2">
                      of Americans take prescription meds
                    </p>
                  </div>
                  <div className="p-10 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg text-muted-foreground mb-2">Yet most supplement brands</p>
                      <p className="text-xl font-semibold text-foreground">Never ask about medications</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Final Quote */}
        <div className="text-center">
          <div className="relative inline-block max-w-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 blur-3xl"></div>
            <Card className="relative px-12 py-10 bg-background/90 backdrop-blur-sm border-primary/20">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-6" />
              <blockquote className="text-2xl md:text-3xl font-serif font-bold text-primary leading-relaxed" data-testid="text-final-quote">
                "You wouldn't take someone else's prescription. Why take their vitamins?"
              </blockquote>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}