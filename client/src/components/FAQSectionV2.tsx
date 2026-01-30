import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What's included in the membership?",
    answer: "Your membership includes unlimited AI health consultations, lab and wearable data analysis, personalized supplement formula recommendations, formula updates as your health changes, and access to near cost diagnostic testing. You get ongoing optimization, not just a one time recommendation."
  },
  {
    question: "How is supplement pricing determined?",
    answer: "Your supplement cost depends on your personalized formula: the total daily milligrams, the number of active ingredients, and the sourcing quality of each ingredient. Premium bioavailable forms cost more than basic forms. Typical monthly cost ranges from $100 to $200. You see your exact price before you order, with no hidden fees or markup games."
  },
  {
    question: "What happens if I cancel my membership?",
    answer: "You can cancel anytime with no penalties. If you rejoin within 3 months, you keep your original membership rate. After 3 months, you'll join at whatever tier is currently available. We believe in earning your membership every month, not locking you into contracts."
  },
  {
    question: "Will my membership rate ever increase?",
    answer: "No. Your membership rate is locked forever from the day you become a paying member. If you join as a Founding Member at $19 per month, that's your rate for life."
  },
  {
    question: "How is ONES different from other personalized vitamins?",
    answer: "Most personalized vitamin companies use a simple quiz to recommend from a preset menu of formulas. ONES uses AI to analyze your actual lab results and wearable data, then builds a truly custom formula. And we continuously update your recommendations as your health data changes."
  },
  {
    question: "Do I have to buy supplements as a member?",
    answer: "No. Your membership gives you access to the AI consultations and analysis. You can upload labs, connect wearables, and get personalized recommendations without purchasing supplements. When you're ready, you can order your personalized formula, but it's never required."
  },
  {
    question: "How do the lab tests work?",
    answer: "We partner with certified diagnostic labs to offer the same comprehensive tests as premium health platforms, but at near cost pricing. You order through your dashboard, visit a local lab or use an at home kit, and results sync directly to your ONES profile for AI analysis. Lab testing is always optional but helps us give you better recommendations."
  },
  {
    question: "What if I'm taking medications?",
    answer: "Our AI system is trained to identify potential interactions between supplements and medications. During your consultation, you'll share all medications you're taking, and our system will ensure your formula is safe and complementary. We always recommend consulting with your healthcare provider before starting any new supplement regimen."
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
