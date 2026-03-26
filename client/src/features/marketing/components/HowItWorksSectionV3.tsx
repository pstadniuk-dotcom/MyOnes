import { useRef, useEffect, useState } from "react";

/**
 * How-It-Works — Clean numbered step cards over a single lifestyle image bg.
 * Frosted glassmorphism cards with step numbers and readable headline overlay.
 */

const steps = [
  {
    number: "01",
    title: "Share Your Data",
    description:
      "Connect your wearables, upload your labs, and tell us about your health goals and history.",
  },
  {
    number: "02",
    title: "We Analyze Everything",
    description:
      "Our AI cross-references your data with clinical research to understand exactly what your body needs.",
  },
  {
    number: "03",
    title: "Get Your Formula",
    description:
      "Receive a personalized supplement formula with every ingredient and dose chosen specifically for you.",
  },
  {
    number: "04",
    title: "Evolve Over Time",
    description:
      "As your labs and wearable data change, your formula adapts. Your health is dynamic — your supplements should be too.",
  },
];

export default function HowItWorksSectionV3() {
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
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-24 md:py-32 overflow-hidden scroll-mt-24"
    >
      {/* Lifestyle background image — soft, atmospheric */}
      <img
        src="/Ones%20LIfestyle%20Images/LLCl6KjWLmo0RlYJ9GZE6_vUxvLlpD.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        loading="lazy"
      />
      {/* Cream overlay + subtle dark wash for headline readability */}
      <div className="absolute inset-0 bg-[#ede8e2]/80 z-[1]" />
      <div className="absolute inset-0 bg-black/10 z-[1]" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div
          className={`max-w-2xl mx-auto text-center mb-16 md:mb-20 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70">
            How it works
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            Four steps to{" "}
            <span className="text-[#8a9a2c]">your formula</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/50 leading-relaxed font-light">
            Your health changes. Your plan changes with it.
          </p>
        </div>

        {/* Step cards — 4-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => {
            const delayMs = 200 + index * 120;

            return (
              <div
                key={step.number}
                className={`relative group transition-all duration-700 ease-out ${
                  revealed
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{
                  transitionDelay: revealed ? `${delayMs}ms` : "0ms",
                }}
              >
                {/* Glassmorphism card */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 md:p-7 border border-white/80 shadow-sm group-hover:shadow-lg group-hover:bg-white/80 transition-all duration-300 h-full">
                  {/* Step number */}
                  <div className="text-3xl md:text-4xl font-light leading-none text-[#054700]/15 select-none mb-4">
                    {step.number}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-medium text-[#054700] mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#054700]/55 leading-relaxed text-[15px] font-light">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
