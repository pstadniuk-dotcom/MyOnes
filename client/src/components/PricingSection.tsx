import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { Link } from 'wouter';

export default function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState(1); // Default to middle plan

  const plans = [
    {
      name: "Starter",
      duration: "3 months",
      price: 495,
      monthlyPrice: 165,
      description: "Perfect for getting started with personalized nutrition",
      features: [
        "AI health consultation",
        "Custom supplement formula",
        "Monthly progress tracking",
        "Basic ingredient adjustments",
        "Email support"
      ],
      cta: "Start Your Journey"
    },
    {
      name: "6 Month Supply",
      duration: "6 months",
      price: 875,
      monthlyPrice: 146,
      description: "Most popular plan for comprehensive health optimization",
      features: [
        "Everything in Starter",
        "Advanced blood test analysis",
        "Bi-weekly formula adjustments",
        "Priority chat support",
        "Health coaching calls",
        "Wearable device integration"
      ],
      cta: "Optimize My Health",
      popular: true,
      savings: "Save $115"
    },
    {
      name: "12 Month Supply",
      duration: "12 months",
      price: 1590,
      monthlyPrice: 133,
      description: "Best value - Complete health transformation with ongoing optimization",
      features: [
        "Everything in Optimize",
        "Quarterly comprehensive reviews",
        "Advanced genetic testing",
        "Dedicated health advisor",
        "Custom meal planning",
        "Annual lab work included"
      ],
      cta: "Transform My Health",
      savings: "Save $390"
    }
  ];

  const includedFeatures = [
    "Free shipping nationwide",
    "Custom-made for you",
    "Third-party tested ingredients",
    "Made in USA"
  ];

  const handlePlanSelect = (index: number) => {
    setSelectedPlan(index);
  };

  return (
    <section id="pricing" className="py-20 bg-background" data-testid="section-pricing">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-pricing-headline">
            Choose Your Health Journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-pricing-description">
            All plans include AI consultation, custom-made formula, and free shipping. Choose your supply duration.
          </p>
          
          {/* Included Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {includedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-full">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative p-8 hover-elevate transition-all duration-300 cursor-pointer ${
                selectedPlan === index ? 'ring-2 ring-primary shadow-lg scale-105' : ''
              } ${plan.popular ? 'border-2 border-primary' : ''}`}
              onClick={() => handlePlanSelect(index)}
              data-testid={`card-plan-${index}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Most Popular</span>
                  </Badge>
                </div>
              )}

              {/* Savings Badge */}
              {plan.savings && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {plan.savings}
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-serif font-bold text-foreground mb-2" data-testid={`text-plan-name-${index}`}>
                  {plan.name}
                </h3>
                <p className="text-muted-foreground mb-4" data-testid={`text-plan-description-${index}`}>
                  {plan.description}
                </p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground" data-testid={`text-plan-price-${index}`}>
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground ml-2">for {plan.duration}</span>
                </div>
                
                <p className="text-sm text-muted-foreground" data-testid={`text-plan-monthly-${index}`}>
                  ${plan.monthlyPrice}/month
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground" data-testid={`text-plan-feature-${index}-${featureIndex}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button 
                asChild
                className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                data-testid={`button-subscribe-${index}`}
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="max-w-2xl mx-auto">
            <p className="text-muted-foreground mb-6">
              Not sure which plan is right for you? Start with our free consultation and we'll recommend the best path forward.
            </p>
            <Button 
              asChild
              variant="outline" 
              size="lg"
              data-testid="button-free-consultation"
            >
              <Link href="/signup">Get Free Consultation First</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}