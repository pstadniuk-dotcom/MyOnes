import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle, Upload, FlaskConical, RotateCcw } from 'lucide-react';

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: MessageCircle,
      title: "Chat with our AI about your health",
      description: "Share your health goals, current routine, and any concerns. Our AI asks the right questions to understand your unique needs.",
      details: "Takes 5-10 minutes and covers your lifestyle, diet, exercise, sleep, stress levels, and health objectives."
    },
    {
      icon: Upload,
      title: "Upload blood tests (optional)",
      description: "Share recent lab results for deeper insights into your nutritional status and metabolic health.",
      details: "Supports PDF uploads of standard blood panels. We analyze 40+ biomarkers for personalized recommendations."
    },
    {
      icon: FlaskConical,
      title: "Receive your personalized formula",
      description: "Get a custom blend designed specifically for your biology, backed by scientific research and optimal dosing.",
      details: "Each formula contains 8-15 targeted ingredients with precise dosages based on your individual profile."
    },
    {
      icon: RotateCcw,
      title: "Evolve with each refill",
      description: "Track your progress and let your formula adapt as your health improves and your needs change.",
      details: "Monthly check-ins allow us to adjust your formula based on how you're feeling and any new health data."
    }
  ];

  const handleStepHover = (index: number) => {
    setActiveStep(index);
    console.log('Step hovered:', index);
  };

  return (
    <section className="py-24 bg-background" data-testid="section-how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight" data-testid="text-how-it-works-headline">
            How ONES Works
          </h2>
          <p className="text-lg text-muted-foreground" data-testid="text-how-it-works-description">
            A simple, science-backed process that evolves with your health journey.
          </p>
        </div>

        {/* Progress Line */}
        <div className="hidden lg:block mb-12">
          <div className="flex items-center justify-center max-w-4xl mx-auto">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeStep >= index ? 'bg-primary scale-125' : 'bg-border'
                }`}></div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-24 transition-all duration-300 ${
                    activeStep > index ? 'bg-primary' : 'bg-border'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <Card 
                key={index}
                className={`p-6 border-border/50 hover-elevate transition-all duration-300 cursor-pointer ${
                  activeStep === index ? 'ring-1 ring-primary shadow-lg' : ''
                }`}
                onMouseEnter={() => handleStepHover(index)}
                data-testid={`card-step-${index}`}
              >
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 ${
                    activeStep === index ? 'bg-primary text-primary-foreground scale-110' : 'bg-primary/10 text-primary'
                  }`}>
                    <IconComponent className="w-7 h-7" />
                  </div>
                  
                  <div className="text-xs font-semibold text-primary mb-2" data-testid={`text-step-number-${index}`}>
                    STEP {index + 1}
                  </div>
                  
                  <h3 className="text-base font-semibold text-foreground mb-3" data-testid={`text-step-title-${index}`}>
                    {step.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed" data-testid={`text-step-description-${index}`}>
                    {step.description}
                  </p>
                  
                  {activeStep === index && (
                    <div className="border-t border-border/50 pt-4 mt-2">
                      <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-step-details-${index}`}>
                        {step.details}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
            <span className="text-primary font-semibold text-sm">Ready to start?</span>
            <span className="text-muted-foreground text-sm">It takes less than 10 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
