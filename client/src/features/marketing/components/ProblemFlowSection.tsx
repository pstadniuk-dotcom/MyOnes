import { useState, useRef, useEffect, useCallback } from "react";

const AUTOPLAY_INTERVAL = 5000; // ms per card

const tiles = [
  {
    label: "Your labs",
    sublabel: "100+ biomarkers",
    src: "/problem section/your labs.png",
    headline: "You have the numbers. But what do they mean?",
    description:
      'Your blood panel comes back with 100+ biomarkers. A reference range that says "normal" tells you nothing about optimization.',
    problem: false,
  },
  {
    label: "Your wearables",
    sublabel: "Sleep, HRV, strain",
    src: "/problem section/wearables.jpg",
    headline: "More data than most clinical trials.",
    description:
      "Your watch tracks every heartbeat, sleep cycle, and stress score. But without context, it's just noise on a screen.",
    problem: false,
  },
  {
    label: "Generic advice",
    sublabel: "Charts & reports",
    src: "/problem section/generic advice 2.png",
    headline: "Generic protocols don't move the needle.",
    description:
      "You get a PDF, a supplement list, a one-size-fits-all protocol. The advice isn't wrong — it's just not built for you.",
    problem: false,
  },
  {
    label: "Now what?",
    sublabel: "No clear action",
    src: "/problem section/now what.png",
    headline: "You're left to connect the dots alone.",
    description:
      "Research ingredients. Cross-reference dosages. Hope it works. That's not healthcare. That's homework.",
    problem: true,
  },
];

export default function ProblemFlowSection() {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Instant switch — CSS handles the crossfade via max-h + opacity transitions
  const changeTile = useCallback(
    (index: number) => {
      if (index === active) return;
      setActive(index);
      setProgress(0);
    },
    [active]
  );

  // Scroll-triggered reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          // Clear entrance stagger delays after animation finishes
          setTimeout(() => setEntranceDone(true), 900);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (!revealed || paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    const progressStep = 50 / AUTOPLAY_INTERVAL;
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + progressStep, 1));
    }, 50);

    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % tiles.length);
      setProgress(0);
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [revealed, paused]);

  const handleMouseEnter = (index: number) => {
    setPaused(true);
    changeTile(index);
  };
  const handleMouseLeave = () => {
    setPaused(false);
    setProgress(0);
  };

  // ── 3D tilt handlers (desktop/hover devices only) ──
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const handleTilt = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canHover) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 8;
    const rotateX = ((centerY - y) / centerY) * 8;
    card.style.transform = `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
    card.style.transition = "transform 0.15s ease-out";
  }, [canHover]);

  const handleTiltReset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canHover) return;
    e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
    e.currentTarget.style.transition = "transform 0.5s ease-out";
  }, [canHover]);

  return (
    <section
      ref={sectionRef}
      id="the-problem"
      className="bg-white py-24 md:py-32 scroll-mt-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Eyebrow */}
        <p
          className={`text-center text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70 mb-5 transition-all duration-700 delay-100 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          The problem with health data today
        </p>

        {/* Headline */}
        <h2
          className={`text-center text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em] max-w-[820px] mx-auto transition-all duration-700 delay-200 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          More data than ever.
          <br />
          <span className="text-[#8a9a2c]">Still no&nbsp;solution.</span>
        </h2>

        {/* ── Cards row — active card expands ── */}
        <div
          className="mt-14 md:mt-20"
          onMouseLeave={handleMouseLeave}
        >
          {/* Desktop: flex row with expanding active card */}
          <div className="hidden md:flex gap-3 items-stretch" style={{ minHeight: 420 }}>
            {tiles.map((t, i) => {
              const isActive = active === i;
              const delayMs = 400 + i * 100;

              return (
                <div
                  key={t.label}
                  className={`relative transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive ? "flex-[2.2]" : "flex-1"
                  } ${
                    revealed
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-10"
                  }`}
                  style={{
                    transitionDelay: entranceDone ? "0ms" : revealed ? `${delayMs}ms` : "0ms",
                    perspective: "800px",
                  }}
                >
                <button
                  onClick={() => changeTile(i)}
                  onMouseEnter={() => handleMouseEnter(i)}
                  onMouseMove={handleTilt}
                  onMouseLeave={(e) => {
                    handleTiltReset(e);
                    handleMouseLeave();
                  }}
                  className="relative w-full h-full rounded-2xl overflow-hidden focus:outline-none cursor-pointer"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.15s ease-out",
                  }}
                  aria-label={t.label}
                >
                  {/* Photo */}
                  <img
                    src={t.src}
                    alt={t.label}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out ${
                      isActive ? "scale-100" : "scale-105"
                    } ${t.problem ? "grayscale" : ""}`}
                  />

                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      t.problem
                        ? "bg-gradient-to-t from-red-950/80 via-red-950/30 to-black/10"
                        : "bg-gradient-to-t from-[#021f00]/80 via-[#021f00]/25 to-black/5"
                    }`}
                  />

                  {/* Problem badge */}
                  {t.problem && (
                    <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center z-10">
                      <span className="text-white text-sm font-bold leading-none">
                        ?
                      </span>
                    </div>
                  )}

                  {/* Content — bottom aligned */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 z-10">
                    {/* Label — always visible */}
                    <p className="text-white font-semibold text-sm md:text-base">
                      {t.label}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {t.sublabel}
                    </p>

                    {/* Expanded description — only on active card */}
                    <div
                      className={`transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isActive
                          ? "max-h-40 opacity-100 mt-4"
                          : "max-h-0 opacity-0 mt-0"
                      }`}
                    >
                      <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10" style={{ willChange: 'opacity' }}>
                        <p
                          className={`text-sm font-medium leading-snug mb-1.5 ${
                            t.problem ? "text-red-300" : "text-white/90"
                          }`}
                        >
                          {t.headline}
                        </p>
                        <p className="text-white/60 text-xs leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20">
                    <div
                      className={`h-full transition-all duration-100 ease-linear ${
                        t.problem ? "bg-red-400" : "bg-white/80"
                      }`}
                      style={{
                        width: isActive ? `${progress * 100}%` : "0%",
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                  </div>
                </button>
                </div>
              );
            })}
          </div>

          {/* Mobile: 2×2 grid — tapping reveals description */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {tiles.map((t, i) => {
              const isActive = active === i;
              const delayMs = 400 + i * 100;

              return (
                <div
                  key={t.label}
                  className={`transition-all duration-500 ease-out ${
                    revealed
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-10"
                  }`}
                  style={{
                    transitionDelay: entranceDone ? "0ms" : revealed ? `${delayMs}ms` : "0ms",
                  }}
                >
                <button
                  onClick={() => changeTile(i)}
                  className={`group relative rounded-2xl overflow-hidden aspect-[3/4] w-full focus:outline-none cursor-pointer ${
                    isActive
                      ? "ring-2 shadow-xl z-10"
                      : "shadow-md"
                  } ${
                    isActive && t.problem
                      ? "ring-red-400/40"
                      : isActive
                      ? "ring-[#054700]/20"
                      : ""
                  }`}
                  aria-label={t.label}
                >
                  <img
                    src={t.src}
                    alt={t.label}
                    className={`absolute inset-0 w-full h-full object-cover ${
                      t.problem ? "grayscale" : ""
                    }`}
                  />
                  <div
                    className={`absolute inset-0 ${
                      t.problem
                        ? "bg-gradient-to-t from-red-950/75 via-transparent to-black/5"
                        : "bg-gradient-to-t from-[#021f00]/70 via-transparent to-black/5"
                    }`}
                  />
                  {t.problem && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center">
                      <span className="text-white text-xs font-bold leading-none">
                        ?
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-semibold text-sm">
                      {t.label}
                    </p>
                    <p className="text-white/40 text-[11px] mt-0.5">
                      {t.sublabel}
                    </p>
                  </div>
                  {/* Mobile progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                    <div
                      className={`h-full transition-all duration-100 ease-linear ${
                        t.problem ? "bg-red-400" : "bg-white/80"
                      }`}
                      style={{
                        width: isActive ? `${progress * 100}%` : "0%",
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                  </div>
                </button>
                </div>
              );
            })}
          </div>

          {/* Mobile description below cards */}
          <div
            className={`md:hidden mt-6 text-center transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: entranceDone ? "0ms" : revealed ? "880ms" : "0ms" }}
          >
            <div
              key={active}
              className="animate-fade-in"
            >
              <p
                className={`text-base font-semibold leading-snug ${
                  tiles[active].problem ? "text-red-700" : "text-[#054700]"
                }`}
              >
                {tiles[active].headline}
              </p>
              <p className="text-sm text-[#054700]/50 leading-relaxed mt-2">
                {tiles[active].description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

