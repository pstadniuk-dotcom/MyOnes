import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How is this different from other personalized vitamins?",
    answer: "ONES uses advanced AI to analyze your complete health profile, including blood tests, lifestyle factors, and health goals. Unlike other services that use simple questionnaires, we create truly personalized formulas that evolve with your health journey. Our AI considers interactions between ingredients and optimizes dosages based on the latest scientific research."
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
    answer: "You purchase a 3-month, 6-month, or 12-month supply of your custom formula. When you're ready to reorder, you'll have a consultation to discuss how you're feeling and any changes in your health or lifestyle. Our AI analyzes this data and may adjust your formula for your next order to optimize your results."
  },
  {
    question: "What if I don't see results?",
    answer: "Health optimization is a journey, and we're committed to finding what works for you. Most people see improvements in energy and sleep within 2-4 weeks. If you're not noticing positive changes, we'll work with you through follow-up consultations to adjust your formula. Since each formula is custom-made specifically for you, we cannot accept returns, but we're dedicated to optimizing your results."
  },
  {
    question: "Are your supplements third-party tested?",
    answer: "Yes, every batch of supplements is tested by independent laboratories for purity, potency, and contaminants. We manufacture in cGMP-certified facilities following current Good Manufacturing Practices. You can access your batch's certificate of analysis through your account dashboard."
  }
];

export default function FAQSectionV2() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            Questions & Answers
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Frequently Asked{" "}
            <span className="font-medium">Questions</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] max-w-2xl mx-auto">
            Get answers to common questions about our personalized supplement approach.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#FAF7F2] rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-5 sm:px-8 py-5 sm:py-6 text-left flex items-center justify-between gap-4 hover:bg-[#F5F0E8] transition-colors"
              >
                <span className="text-base sm:text-lg font-medium text-[#1B4332]">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-[#52796F] flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-5 sm:px-8 pb-5 sm:pb-6">
                  <p className="text-[#52796F] leading-relaxed text-sm sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}
