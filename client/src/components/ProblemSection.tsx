import { Card } from '@/components/ui/card';
import { Boxes, Users, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <section className="py-20 bg-premium-gradient-subtle" data-testid="section-problem">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-problem-headline">
            Your supplement cabinet is a mess of guesswork
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-problem-description">
            Most people are taking supplements without any real strategy, wasting money and potentially harming their health.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card 
                  className="p-8 text-center glass shadow-premium micro-bounce transition-all duration-500 group border-none"
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
              </motion.div>
            );
          })}
        </div>

        {/* Visual representation of supplement chaos */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 glass p-6 rounded-xl shadow-premium">
            {Array.from({length: 8}).map((_, i) => (
              <div 
                key={i} 
                className="w-6 h-14 bg-gradient-to-b from-green-400 to-green-600 rounded-full opacity-75 shadow-sm"
                style={{ transform: `rotate(${(i - 4) * 4}deg)` }}
              ></div>
            ))}
            <span className="text-2xl mx-4">→</span>
            <div className="w-8 h-16 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-md"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">From chaos to precision</p>
        </div>
      </div>
    </section>
  );
}