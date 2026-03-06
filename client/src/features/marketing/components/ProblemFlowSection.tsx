import { useState } from "react";

const tiles = [
  {
    label: "Your labs",
    sublabel: "100+ biomarkers",
    src: "/problem section/your labs.png",
    headline: "You have the numbers. But what do they mean for you?",
    description:
      "Your blood panel comes back with 100+ biomarkers — ferritin, cortisol, thyroid, testosterone. A reference range that says \"normal\" tells you nothing about optimization. You're left to interpret it yourself.",
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
  const tile = tiles[active];

  return (
    <section className="py-14 md:py-20 bg-[#f5f2ee]">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Eyebrow — centered on mobile, hidden on desktop (moved to right panel) */}
        <p className="lg:hidden text-center text-xs font-semibold tracking-[0.2em] uppercase text-[#5a6623] mb-5">
          The problem with health data today
        </p>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">

          {/* ── Left: Accordion image gallery ── */}
          <div className="lg:w-1/2 flex flex-row gap-2 min-h-[420px] lg:min-h-[500px]">
            {tiles.map((t, i) => {
              const isActive = active === i;
              return (
                <button
                  key={t.label}
                  onClick={() => setActive(i)}
                  className={`
                    relative overflow-hidden rounded-2xl cursor-pointer
                    flex-shrink-0 transition-all duration-500 ease-in-out
                    border focus:outline-none
                    ${isActive
                      ? "flex-grow border-[#054700]/15 shadow-lg"
                      : "w-12 sm:w-14 flex-grow-0 border-transparent hover:border-[#054700]/10"
                    }
                    ${t.problem && isActive ? "border-red-300/40" : ""}
                  `}
                  style={{ minWidth: isActive ? undefined : "3rem" }}
                  aria-label={t.label}
                >
                  {/* Image */}
                  <img
                    src={t.src}
                    alt={t.label}
                    className={`
                      absolute inset-0 w-full h-full object-cover transition-all duration-500
                      ${t.problem ? "grayscale" : ""}
                      ${!isActive ? "scale-110" : "scale-100"}
                    `}
                  />

                  {/* Gradient overlay */}
                  <div
                    className={`
                      absolute inset-0 transition-opacity duration-500
                      ${t.problem
                        ? "bg-gradient-to-t from-red-950/80 via-red-950/20 to-black/20"
                        : "bg-gradient-to-t from-[#021f00]/75 via-[#021f00]/10 to-black/10"
                      }
                    `}
                  />

                  {/* Collapsed: rotated label */}
                  <div
                    className={`
                      absolute inset-0 flex items-center justify-center transition-opacity duration-300
                      ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"}
                    `}
                  >
                    <p className="text-white/80 text-xs font-semibold tracking-widest uppercase whitespace-nowrap"
                       style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                      {t.label}
                    </p>
                  </div>

                  {/* Expanded: bottom label + step badge */}
                  <div
                    className={`
                      absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300
                      ${isActive ? "opacity-100" : "opacity-0 pointer-events-none"}
                    `}
                  >
                    <p className="text-white font-semibold text-sm">{t.label}</p>
                    <p className="text-white/55 text-xs mt-0.5">{t.sublabel}</p>
                  </div>

                  {/* Problem badge */}
                  {t.problem && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold leading-none">?</span>
                    </div>
                  )}

                  {/* Active step indicator dot */}
                  {isActive && (
                    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-white/70" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Right: Text panel ── */}
          <div className="lg:w-1/2 flex flex-col justify-center gap-5 text-center lg:text-left">
            {/* Eyebrow — desktop only */}
            <p className="hidden lg:block text-xs font-semibold tracking-[0.2em] uppercase text-[#5a6623]">
              The problem with health data today
            </p>

            {/* Step dots */}
            <div className="flex gap-2 justify-center lg:justify-start">
              {tiles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${
                    active === i
                      ? tiles[i].problem ? "bg-red-500 w-6" : "bg-[#054700] w-6"
                      : "bg-[#054700]/20 w-3"
                  }`}
                />
              ))}
            </div>

            {/* Main headline */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-[#054700] font-light leading-tight">
              Blood tests give you biomarkers.{" "}
              Wearables give you metrics.{" "}
              <span className="font-semibold">But who gives you a solution?</span>
            </h2>

            {/* Divider */}
            <div className="w-10 h-px bg-[#054700]/25 mx-auto lg:mx-0" />

            {/* Per-tile headline + description */}
            <div key={active} className="space-y-3">
              <p className={`text-base font-semibold ${tile.problem ? "text-red-700" : "text-[#054700]"}`}>
                {tile.headline}
              </p>
              <p className="text-base md:text-lg text-[#054700]/60 leading-relaxed">
                {tile.description}
                {tile.problem && (
                  <span className="font-semibold text-[#054700]"> That's homework.</span>
                )}
              </p>
            </div>

            {/* Step label */}
            <p className="text-xs text-[#054700]/35 uppercase tracking-widest">
              {active + 1} of {tiles.length} — {tile.label}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

