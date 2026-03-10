import { useState, useRef, useEffect } from "react";

const tiles = [
  {
    label: "Your labs",
    sublabel: "100+ biomarkers",
    src: "/problem section/your labs.png",
    headline: "You have the numbers. But what do they mean for you?",
    description:
      'Your blood panel comes back with 100+ biomarkers — ferritin, cortisol, thyroid, testosterone. A reference range that says "normal" tells you nothing about optimization. You\'re left to interpret it yourself.',
    problem: false,
  },
  {
    label: "Your wearables",
    sublabel: "Sleep, HRV, strain",
    src: "/problem section/wearables.jpg",
    headline: "More data than most clinical trials. No action plan.",
    description:
      "Your watch tracks every heartbeat, sleep cycle, and stress score. You have more biometric data than ever before. But without context, it's just noise on a screen.",
    problem: false,
  },
  {
    label: "Generic advice",
    sublabel: "Charts & reports",
    src: "/problem section/generic advice 2.png",
    headline: "Generic protocols don't move the needle.",
    description:
      "You see a practitioner or turn to the internet. You get a PDF, a supplement list, a one-size-fits-all protocol. The advice isn't wrong — it's just not built for you.",
    problem: false,
  },
  {
    label: "Now what?",
    sublabel: "No clear action",
    src: "/problem section/now what.png",
    headline: "You're left to connect the dots alone.",
    description:
      "Research ingredients. Cross-reference dosages. Hope it works. You're drowning in data but starving for action. That's not healthcare.",
    problem: true,
  },
];

export default function ProblemFlowSection() {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tile = tiles[active];

  // Scroll-triggered reveal
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
    <section ref={sectionRef} className="bg-white py-20 md:py-28 lg:py-36">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* ── Eyebrow ── */}
        <p
          className={`
            text-center text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70 mb-6
            transition-all duration-700 delay-100
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          The problem with health data today
        </p>

        {/* ── Headline ── */}
        <h2
          className={`
            text-center text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700]
            font-light leading-[1.12] max-w-[820px] mx-auto
            transition-all duration-700 delay-200
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          More data than ever.<br />
          <span className="text-[#8a9a2c]">Still no&nbsp;solution.</span>
        </h2>

        {/* ── Image tiles — equal-width grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-14 md:mt-20">
          {tiles.map((t, i) => {
            const isActive = active === i;
            // Stagger each tile's entrance by 100ms
            const delayMs = 400 + i * 120;

            return (
              <button
                key={t.label}
                onClick={() => setActive(i)}
                className={`
                  group relative rounded-2xl overflow-hidden
                  aspect-[3/4] focus:outline-none
                  transition-all duration-500 ease-out cursor-pointer
                  ${isActive
                    ? "ring-2 shadow-xl scale-[1.03] z-10"
                    : "shadow-md hover:shadow-lg hover:scale-[1.015]"
                  }
                  ${isActive && t.problem ? "ring-red-400/40" : isActive ? "ring-[#054700]/20" : ""}
                  ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
                `}
                style={{ transitionDelay: revealed ? `${delayMs}ms` : "0ms" }}
                aria-label={t.label}
              >
                {/* Photo */}
                <img
                  src={t.src}
                  alt={t.label}
                  className={`
                    absolute inset-0 w-full h-full object-cover
                    transition-transform duration-700 ease-out
                    group-hover:scale-105
                    ${t.problem ? "grayscale" : ""}
                  `}
                />

                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 ${
                    t.problem
                      ? "bg-gradient-to-t from-red-950/70 via-transparent to-black/5"
                      : "bg-gradient-to-t from-[#021f00]/65 via-transparent to-black/5"
                  }`}
                />

                {/* Bottom label — always visible */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <p className="text-white font-semibold text-sm md:text-base">{t.label}</p>
                  <p className="text-white/50 text-xs mt-0.5">{t.sublabel}</p>
                </div>

                {/* Problem badge */}
                {t.problem && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center">
                    <span className="text-white text-sm font-bold leading-none">?</span>
                  </div>
                )}

                {/* Active indicator — subtle top bar */}
                <div
                  className={`
                    absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300
                    ${isActive ? "opacity-100" : "opacity-0"}
                    ${t.problem ? "bg-red-400" : "bg-white/80"}
                  `}
                />
              </button>
            );
          })}
        </div>

        {/* ── Selected tile description — centered below ── */}
        <div
          className={`
            mt-12 md:mt-16 text-center max-w-2xl mx-auto
            transition-all duration-700
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
          style={{ transitionDelay: revealed ? "880ms" : "0ms" }}
        >
          <div key={active} className="animate-in fade-in duration-300">
            <p
              className={`text-lg md:text-xl font-semibold leading-snug ${
                tile.problem ? "text-red-700" : "text-[#054700]"
              }`}
            >
              {tile.headline}
            </p>
            <p className="text-base md:text-lg text-[#054700]/50 leading-relaxed mt-3">
              {tile.description}
              {tile.problem && (
                <span className="font-semibold text-[#054700]"> That's homework.</span>
              )}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

