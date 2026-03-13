import { useState, useRef, useEffect, useCallback } from "react";

const AUTOPLAY_INTERVAL = 4500; // ms per card

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
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textFading, setTextFading] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tile = tiles[active];

  // Smooth transition when changing active tile
  const changeTile = useCallback((index: number) => {
    if (index === active) return;
    setTextFading(true);
    setTimeout(() => {
      setActive(index);
      setProgress(0);
      setTextFading(false);
    }, 200);
  }, [active]);

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

  // Auto-advance timer — starts after reveal, pauses on hover
  useEffect(() => {
    if (!revealed || paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    // Progress bar ticks every 50ms
    const progressStep = 50 / AUTOPLAY_INTERVAL;
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + progressStep, 1));
    }, 50);

    // Advance card
    timerRef.current = setInterval(() => {
      setTextFading(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % tiles.length);
        setProgress(0);
        setTextFading(false);
      }, 200);
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [revealed, paused]);

  // Pause on hover, resume on leave
  const handleMouseEnter = (index: number) => {
    setPaused(true);
    changeTile(index);
  };
  const handleMouseLeave = () => {
    setPaused(false);
    setProgress(0);
  };

  return (
    <section ref={sectionRef} id="the-problem" className="bg-white py-20 md:py-28 lg:py-36 scroll-mt-20">
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
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-14 md:mt-20"
          onMouseLeave={handleMouseLeave}
        >
          {tiles.map((t, i) => {
            const isActive = active === i;
            // Stagger each tile's entrance by 100ms
            const delayMs = 400 + i * 120;

            return (
              <button
                key={t.label}
                onClick={() => changeTile(i)}
                onMouseEnter={() => handleMouseEnter(i)}
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
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    t.problem
                      ? "bg-gradient-to-t from-red-950/70 via-transparent to-black/5"
                      : "bg-gradient-to-t from-[#021f00]/65 via-transparent to-black/5"
                  } ${isActive ? "opacity-100" : "opacity-80"}`}
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

                {/* Active progress bar at bottom of card */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                  <div
                    className={`h-full transition-all duration-100 ease-linear ${
                      t.problem ? "bg-red-400" : "bg-white/90"
                    }`}
                    style={{
                      width: isActive ? `${progress * 100}%` : "0%",
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                </div>

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

        {/* ── Dot indicators ── */}
        <div
          className={`
            flex justify-center gap-2 mt-6
            transition-all duration-700
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
          style={{ transitionDelay: revealed ? "860ms" : "0ms" }}
        >
          {tiles.map((t, i) => (
            <button
              key={i}
              onClick={() => changeTile(i)}
              aria-label={`Go to ${t.label}`}
              className={`
                rounded-full transition-all duration-300 cursor-pointer
                ${active === i
                  ? `w-8 h-2.5 ${t.problem ? "bg-red-400" : "bg-[#054700]"}`
                  : "w-2.5 h-2.5 bg-[#054700]/20 hover:bg-[#054700]/40"
                }
              `}
            />
          ))}
        </div>

        {/* ── Selected tile description — crossfade below ── */}
        <div
          className={`
            mt-8 md:mt-12 text-center max-w-2xl mx-auto
            transition-all duration-700
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
          style={{ transitionDelay: revealed ? "880ms" : "0ms" }}
        >
          <div
            className={`transition-all duration-300 ease-out ${
              textFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
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

          {/* Hint text */}
          <p className="text-xs text-[#054700]/30 mt-5 tracking-wide">
            Hover or tap each card to explore
          </p>
        </div>

      </div>
    </section>
  );
}

