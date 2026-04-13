import { useRef, useState, useEffect, useCallback } from "react";

const steps = [
  {
    number: "01",
    title: "Share Your Data",
    description:
      "Connect your wearables, upload your labs, and tell us about your health goals and history.",
    gradient: "from-[#054700]/10 to-[#8a9a2c]/10",
  },
  {
    number: "02",
    title: "We Analyze Everything",
    description:
      "Our AI cross-references your data with clinical research to understand exactly what your body needs.",
    gradient: "from-[#8a9a2c]/10 to-[#5a6623]/10",
  },
  {
    number: "03",
    title: "Get Your Formula",
    description:
      "Receive a personalized supplement formula with every ingredient and dose chosen specifically for you.",
    gradient: "from-[#5a6623]/10 to-[#054700]/10",
  },
  {
    number: "04",
    title: "Evolve Over Time",
    description:
      "As your labs and wearable data change, your formula adapts. Your health is dynamic — your supplements should be too.",
    gradient: "from-[#054700]/10 to-[#8a9a2c]/10",
  },
];

export default function HowItWorksSectionV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Mouse position tracking for glow effect — tighter radius
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, index: number) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
      setHoveredCard(index);
    },
    []
  );

  // 3D tilt handler
  const handleTilt = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 8;
      const rotateX = ((centerY - y) / centerY) * 8;
      card.style.transform = `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
    },
    []
  );

  const handleTiltReset = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
    },
    []
  );

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll("[data-step-card]");
    if (!cards) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(
              entry.target.getAttribute("data-step-index")
            );
            setVisibleCards((prev) => new Set(prev).add(index));
          }
        });
      },
      { root: null, rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-28 md:py-36 overflow-hidden bg-[#ede8e2]"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #054700 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      {/* Floating ambient blobs */}
      <div className="absolute top-20 left-[10%] w-80 h-80 bg-[#8a9a2c]/[0.06] rounded-full blur-[100px] animate-blob-1" />
      <div className="absolute bottom-20 right-[15%] w-64 h-64 bg-[#054700]/[0.05] rounded-full blur-[80px] animate-blob-3" />

      <div className="relative z-10 w-full px-6 md:px-16 lg:px-20 max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-24">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] uppercase text-[#054700]/40 mb-5">
            <span className="w-8 h-px bg-[#054700]/20" />
            How it works
            <span className="w-8 h-px bg-[#054700]/20" />
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-light text-[#054700] leading-[1.1] tracking-tight mb-5">
            Four steps to{" "}
            <span className="text-gradient-green font-medium">your formula</span>
          </h2>
          <p className="text-lg md:text-xl text-[#054700]/50 max-w-xl mx-auto leading-relaxed font-light">
            Your health changes. Your plan changes with it.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
          {steps.map((step, i) => {
            const isVisible = visibleCards.has(i);
            const isHovered = hoveredCard === i;

            return (
              <div
                key={step.number}
                data-step-card
                data-step-index={i}
                className={`
                  transition-all duration-700 ease-out
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
                `}
                style={{
                  transitionDelay: `${i * 150}ms`,
                  perspective: "800px",
                }}
              >
                <div
                  className={`
                    relative h-full rounded-2xl p-7 cursor-default
                    glass-premium
                    shadow-[0_4px_20px_rgba(5,71,0,0.04)]
                    hover:shadow-[0_20px_60px_rgba(5,71,0,0.1)]
                    transition-shadow duration-500 ease-out
                  `}
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.15s ease-out, box-shadow 0.5s ease-out",
                  }}
                  onMouseMove={(e) => {
                    handleMouseMove(e, i);
                    handleTilt(e);
                  }}
                  onMouseLeave={(e) => {
                    setHoveredCard(null);
                    handleTiltReset(e);
                  }}
                >
                  {/* Tight mouse-following glow — smaller radius, closer to cursor */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl z-0 opacity-0 transition-opacity duration-300"
                    style={{
                      background: isHovered
                        ? `radial-gradient(120px circle at var(--mouse-x) var(--mouse-y), rgba(138,154,44,0.15), transparent 60%)`
                        : "none",
                      opacity: isHovered ? 1 : 0,
                    }}
                  />

                  {/* Animated gradient blob inside card */}
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-0 transition-opacity duration-500 ${isHovered ? "opacity-100" : ""}`}
                    style={{ zIndex: 0 }}
                  />

                  {/* Step number — large, elegant */}
                  <div className="relative z-10 mb-6">
                    <span className="text-6xl font-extralight text-[#054700]/[0.08] leading-none select-none">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-[#054700] mb-3 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#054700]/50 leading-relaxed font-light">
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom connecting line indicator */}
                  <div className="relative z-10 mt-6 flex items-center gap-2">
                    <div className={`h-0.5 rounded-full transition-all duration-500 ${isHovered ? "w-8 bg-[#8a9a2c]" : "w-4 bg-[#054700]/15"}`} />
                    {i < steps.length - 1 && (
                      <span className="text-[10px] text-[#054700]/25 font-medium tracking-wider uppercase">
                        Then
                      </span>
                    )}
                    {i === steps.length - 1 && (
                      <span className="text-[10px] text-[#8a9a2c]/60 font-medium tracking-wider uppercase">
                        Repeat
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom flow indicator */}
        <div className="hidden lg:flex items-center justify-center mt-12 gap-3">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${visibleCards.has(i) ? "bg-[#054700] scale-100" : "bg-[#054700]/15 scale-75"}`} />
              {i < steps.length - 1 && (
                <div className={`w-16 h-px transition-all duration-700 ${visibleCards.has(i) ? "bg-gradient-to-r from-[#054700]/30 to-[#054700]/10" : "bg-[#054700]/5"}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
