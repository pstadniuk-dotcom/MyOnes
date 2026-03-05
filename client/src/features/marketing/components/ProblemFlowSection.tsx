const tiles = [
  {
    label: "Your labs",
    sublabel: "100+ biomarkers",
    src: "/problem section/your labs.png",
    bg: "bg-[#e2ded8]",
  },
  {
    label: "Your wearables",
    sublabel: "Sleep, HRV, strain",
    src: "/problem section/wearables.jpg",
    bg: "bg-[#dde3d8]",
  },
  {
    label: "Generic advice",
    sublabel: "PDFs & dashboards",
    src: "/problem section/generic advice.png",
    bg: "bg-[#e2e2d8]",
  },
  {
    label: "Now what?",
    sublabel: "No clear action",
    src: "/problem section/now what.png",
    bg: "bg-[#e8ddd8]",
  },
];

const connectors = ["+", "→", "→"];

export default function ProblemFlowSection() {
  return (
    <section className="py-24 md:py-32 bg-[#f5f2ee]">
      <div className="container mx-auto px-6 max-w-5xl">

        {/* Eyebrow */}
        <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-[#5a6623] mb-6">
          The problem with health data today
        </p>

        {/* Headline */}
        <h2 className="text-center text-4xl md:text-5xl text-[#054700] font-light leading-tight max-w-3xl mx-auto mb-16">
          Blood tests give you biomarkers.{" "}
          Wearables give you metrics.{" "}
          <span className="font-semibold">But who gives you a solution?</span>
        </h2>

        {/* Flow tiles */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          {tiles.map((tile, i) => (
            <>
              {/* Tile */}
              <div
                key={tile.label}
                className="flex flex-col items-center gap-3 w-full sm:w-auto"
              >
                {/* Image card */}
                <div
                  className={`
                    relative w-full sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden
                    shadow-sm border border-[#054700]/8
                  `}
                >
                  <img
                    src={tile.src}
                    alt={tile.label}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Label below the image */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#054700]">{tile.label}</p>
                  <p className="text-xs text-[#054700]/50 mt-0.5">{tile.sublabel}</p>
                </div>
              </div>

              {/* Connector between tiles */}
              {i < tiles.length - 1 && (
                <div
                  key={`connector-${i}`}
                  className="
                    text-[#054700]/30 text-xl font-light
                    sm:mx-4 sm:mb-8
                    rotate-90 sm:rotate-0
                  "
                >
                  {connectors[i]}
                </div>
              )}
            </>
          ))}
        </div>

        {/* Body copy */}
        <p className="mt-16 text-center text-base md:text-lg text-[#054700]/60 leading-relaxed max-w-2xl mx-auto">
          You're drowning in data but starving for action. A PDF of biomarkers. 
          A dashboard of sleep scores. And a list of supplements to research on your own.{" "}
          That's not healthcare.{" "}
          <span className="font-semibold text-[#054700]">That's homework.</span>
        </p>

      </div>
    </section>
  );
}
