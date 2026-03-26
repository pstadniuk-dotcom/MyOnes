import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * R10 — Split layout FAQ with lifestyle image on the right.
 * Clean accordion on left, full-height lifestyle image on right.
 */

const faqs = [
  {
    question: "What's included in the membership?",
    answer:
      "Your membership includes unlimited AI health consultations, lab and wearable data analysis, personalized supplement formula recommendations, formula updates as your health changes, and access to near-cost diagnostic testing. You get ongoing optimization — not just a one-time recommendation.",
  },
  {
    question: "How is supplement pricing determined?",
    answer:
      "Your supplement cost depends on your personalized formula: the total daily milligrams, the number of active ingredients, and the sourcing quality of each ingredient. Premium bioavailable forms cost more than basic forms. Typical monthly cost ranges from $100 to $200. You see your exact price before you order.",
  },
  {
    question: "Will my membership rate ever increase?",
    answer:
      "No. Your membership rate is locked forever from the day you become a paying member. If you join as a Founding Member at $9 per month, that's your rate for life — even as the price increases for new members.",
  },
  {
    question: "How is Ones different from other personalized vitamins?",
    answer:
      "Most personalized vitamin companies use a simple quiz to recommend from a preset menu of formulas. Ones uses AI to analyze your actual lab results and wearable data, then builds a truly custom formula. And we continuously update your recommendations as your health data changes.",
  },
  {
    question: "What if I'm taking medications?",
    answer:
      "Our AI system is trained to identify potential interactions between supplements and medications. During your consultation, you'll share all medications you're taking, and our system will ensure your formula is safe and complementary. We always recommend consulting with your healthcare provider before starting any new supplement regimen.",
  },
  {
    question: "Do I have to buy supplements as a member?",
    answer:
      "No. Your membership gives you access to the AI consultations and analysis. You can upload labs, connect wearables, and get personalized recommendations without purchasing supplements. When you're ready, you can order your personalized formula — but it's never required.",
  },
  {
    question: "What happens if I cancel my membership?",
    answer:
      "You can cancel anytime with no penalties. If you rejoin within 3 months, you keep your original membership rate. After 3 months, you'll join at whatever tier is currently available.",
  },
  {
    question: "How do the lab tests work?",
    answer:
      "We partner with certified diagnostic labs to offer comprehensive tests at near-cost pricing. You order through your dashboard, visit a local lab or use an at-home kit, and results sync directly to your Ones profile for AI analysis.",
  },
];

export default function FAQSectionV3() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="py-24 md:py-32 bg-[#ede8e2] overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div
          className={`max-w-3xl mx-auto text-center mb-16 md:mb-20 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70">
            Questions & Answers
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            Frequently asked{" "}
            <span className="text-[#8a9a2c]">questions</span>
          </h2>
        </div>

        {/* Split layout: FAQ left, lifestyle image right */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-start">
          {/* Accordion */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const delayMs = 100 + index * 60;
              return (
                <div
                  key={index}
                  className={`rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
                    isOpen
                      ? "bg-white shadow-lg shadow-[#054700]/[0.06] ring-1 ring-[#054700]/[0.06]"
                      : "bg-white/60 shadow-sm hover:shadow-md hover:bg-white/80"
                  } ${
                    revealed
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{
                    transitionDelay: revealed ? `${delayMs}ms` : "0ms",
                  }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <span
                      className={`text-base font-medium transition-colors duration-200 ${
                        isOpen ? "text-[#054700]" : "text-[#054700]/70"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isOpen
                          ? "bg-[#054700] text-white rotate-180"
                          : "bg-[#054700]/[0.06] text-[#054700]/50"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-400 ease-out ${
                      isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-6 pb-5">
                      <div className="w-12 h-px bg-[#054700]/10 mb-4" />
                      <p className="text-[#054700]/60 leading-relaxed text-[15px] font-light">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lifestyle image — sticky on desktop */}
          <div
            className={`hidden lg:block sticky top-32 transition-all duration-700 delay-300 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[3/4]">
              <img
                src="/Ones%20LIfestyle%20Images/website%20v6.png"
                alt="ONES premium supplements"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#054700]/30 via-transparent to-transparent" />

              {/* Floating trust badge */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 backdrop-blur-xl rounded-xl px-5 py-4 shadow-lg border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#054700] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#054700]">
                        Clinically Validated
                      </div>
                      <div className="text-xs text-[#054700]/50">
                        8+ years of practitioner experience
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
