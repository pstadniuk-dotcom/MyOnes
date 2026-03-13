import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0); // First FAQ open by default

  const faqs = [
    {
      question: "How is this different from other personalized vitamins?",
      answer: "Ones uses advanced AI to analyze your complete health profile, including blood tests, lifestyle factors, and health goals. Unlike other services that use simple questionnaires, we create truly personalized formulas that evolve with your health journey. Our AI considers interactions between ingredients and optimizes dosages based on the latest scientific research."
    },
    {
      question: "What if I'm taking medications?",
      answer: "Our AI system is trained to identify potential interactions between supplements and medications. During your consultation, you'll share all medications you're taking, and our system will ensure your formula is safe and complementary. We always recommend consulting with your healthcare provider before starting any new supplement regimen, especially if you have existing medical conditions."
    },
    {
      question: "Can I see what's in my formula before ordering?",
      answer: "Absolutely! After your AI consultation, you'll receive a detailed breakdown of your personalized formula, including each ingredient, dosage, and the scientific reasoning behind its inclusion. You can review everything before placing your order and even request modifications if needed."
    },
    {
      question: "How do orders work?",
      answer: "You purchase a 2-month supply of your custom formula. Because every formula is custom-manufactured, a 2-month supply is the minimum that keeps pricing reasonable. When you're ready to reorder, you'll have a consultation to discuss how you're feeling and any changes in your health or lifestyle. Our AI analyzes this data and may adjust your formula for your next order to optimize your results."
    },
    {
      question: "What if I don't see results?",
      answer: "Health optimization is a journey, and we're committed to finding what works for you. Most people notice improvements in energy and sleep within 2-4 weeks. If you're not noticing positive changes, we'll work with you through follow-up consultations to adjust your formula. Since each formula is custom-manufactured specifically for you, we cannot offer refunds or returns — but we're dedicated to optimizing your results with your next order."
    },
    {
      question: "What makes your ingredients different?",
      answer: "We use clinical-grade, bioavailable forms of every ingredient — not cheap fillers or synthetic substitutes. Our AI selects from over 150 high-quality, scientifically-backed ingredients based on published research, and each formula is manufactured fresh to order specifically for you."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
    console.log('FAQ toggled:', index);
  };

  return (
    <section className="py-20 bg-muted/50" data-testid="section-faq">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-faq-headline">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-faq-description">
            Get answers to common questions about our personalized supplement approach.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <Card 
              key={index}
              className="overflow-hidden transition-all duration-300 hover-elevate"
              data-testid={`card-faq-${index}`}
            >
              <button
                className="w-full p-6 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                onClick={() => toggleFAQ(index)}
                data-testid={`button-faq-toggle-${index}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground pr-4" data-testid={`text-faq-question-${index}`}>
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>
              
              {openFAQ === index && (
                <div className="px-6 pb-6 pt-0" data-testid={`container-faq-answer-${index}`}>
                  <div className="border-t border-border pt-4">
                    <p className="text-muted-foreground leading-relaxed" data-testid={`text-faq-answer-${index}`}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-16">
          <div className="inline-block bg-background p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Our health experts are here to help you on your journey.
            </p>
            <button 
              className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
              onClick={() => console.log('Contact support clicked')}
              data-testid="button-contact-support"
            >
              Contact our support team →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}