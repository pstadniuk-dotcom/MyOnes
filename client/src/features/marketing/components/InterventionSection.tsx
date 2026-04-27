import { useRef, useState, useEffect } from "react";
import { Moon, TestTube, HeartPulse, Activity, Leaf, Zap, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useLocation } from "wouter";

interface IngredientCallout {
  icon: React.ReactNode;
  dataSource: string;
  ingredient: string;
  dose: string;
  position: "left" | "right";
}

const callouts: IngredientCallout[] = [
  {
    icon: <Leaf className="w-4 h-4" />,
    dataSource: "Hormonal balance support",
    ingredient: "Maca",
    dose: "500mg",
    position: "left",
  },
  {
    icon: <HeartPulse className="w-4 h-4" />,
    dataSource: "You mentioned afternoon fatigue",
    ingredient: "Adrenal Support",
    dose: "420mg",
    position: "right",
  },
  {
    icon: <Activity className="w-4 h-4" />,
    dataSource: "Your labs show suboptimal heart markers",
    ingredient: "CoEnzyme Q10",
    dose: "100mg",
    position: "left",
  },
  {
    icon: <Moon className="w-4 h-4" />,
    dataSource: "Your Oura shows poor deep sleep",
    ingredient: "Magnesium",
    dose: "400mg",
    position: "right",
  },
  {
    icon: <Zap className="w-4 h-4" />,
    dataSource: "Focus & calm support",
    ingredient: "L-Theanine",
    dose: "200mg",
    position: "left",
  },
  {
    icon: <TestTube className="w-4 h-4" />,
    dataSource: "Your bloodwork shows elevated cortisol",
    ingredient: "Ashwagandha",
    dose: "300mg",
    position: "right",
  },
];

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ── 3D perspective tilt handlers (desktop/hover devices only) ── */
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
  if (!canHover) return;
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateY = ((x - centerX) / centerX) * 10;
  const rotateX = ((centerY - y) / centerY) * 10;
  card.style.transform = `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.03)`;
  card.style.transition = 'transform 0.1s ease-out';
};

const handleTiltReset = (e: React.MouseEvent<HTMLDivElement>) => {
  if (!canHover) return;
  e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
  e.currentTarget.style.transition = 'transform 0.5s ease-out';
};

export default function InterventionSection() {
  const problemRef = useRef<HTMLElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const problemInView = useInView(problemRef, { once: true, margin: "-80px" });
  const solutionInView = useInView(solutionRef, { once: true, margin: "100px" });
  const [, navigate] = useLocation();

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          SECTION 1: THE PROBLEM
          ═══════════════════════════════════════════════════ */}
      <section ref={problemRef} id="the-problem" className="py-24 md:py-32 bg-white overflow-hidden scroll-mt-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial="hidden"
            animate={problemInView ? "visible" : "hidden"}
            variants={stagger}
            className="text-center"
          >
            <motion.span
              variants={fadeUp}
              className="text-[#5a6623] font-medium tracking-wider text-sm uppercase"
            >
              The Problem With Health Data Today
            </motion.span>

            <motion.h2
              variants={fadeUp}
              className="mt-4 text-2xl sm:text-3xl md:text-4xl text-[#054700] font-light leading-snug text-balance"
            >
              Blood tests give you biomarkers.<span className="hidden sm:inline"><br /></span>{" "}
              Wearables give you metrics.<span className="hidden sm:inline"><br /></span>{" "}
              <span className="font-semibold text-[#5a6623]">But who gives you a solution?</span>
            </motion.h2>

            {/* The typical journey � photo card layout */}
            {(() => {
              const tiles = [
                { src: "/problem section/your labs.png",        label: "Your labs",      sub: "100+ biomarkers",    connector: "+" },
                { src: "/problem section/wearables.jpg",        label: "Your wearables", sub: "Sleep, HRV, strain", connector: "?" },
                { src: "/problem section/generic advice 2.png", label: "Generic advice", sub: "Charts & reports",   connector: "?" },
                { src: "/problem section/now what.png",         label: "Now what?",      sub: "No clear action",    connector: null },
              ];
              return (
                <motion.div variants={fadeUp} className="mt-14">
                  {/* Mobile: 2×2 grid, no connectors */}
                  <div className="grid grid-cols-2 gap-4 sm:hidden">
                    {tiles.map((tile, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-[#054700]/8">
                          <img src={tile.src} alt={tile.label} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm font-semibold text-[#054700]">{tile.label}</p>
                          <p className="text-xs text-[#054700]/50 mt-0.5">{tile.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: flex row with connectors */}
                  <div className="hidden sm:flex items-center justify-center gap-0">
                    {tiles.map((tile, i) => (
                      <>
                        <div key={`tile-${i}`} className="flex flex-col items-center">
                          <div className="w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-[#054700]/8">
                            <img src={tile.src} alt={tile.label} className="w-full h-full object-cover" />
                          </div>
                          <div className="mt-4 text-center">
                            <p className="text-sm font-semibold text-[#054700]">{tile.label}</p>
                            <p className="text-xs text-[#054700]/50 mt-0.5">{tile.sub}</p>
                          </div>
                        </div>
                        {tile.connector && (
                          <span key={`connector-${i}`} className="text-[#054700]/30 text-xl font-light mx-3 mb-12 flex-shrink-0">
                            {tile.connector}
                          </span>
                        )}
                      </>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            <motion.div
              variants={fadeUp}
              className="mt-10 max-w-2xl mx-auto bg-white/60 border border-[#054700]/8 rounded-2xl px-8 py-6 shadow-sm"
            >
              <p className="text-[15px] leading-relaxed text-black/65">
                You're drowning in data but starving for action. A PDF of biomarkers. A dashboard of sleep scores.
                And a list of supplements to research on your own. That's not healthcare.{" "}
                <span className="font-semibold text-[#054700]">That's homework.</span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: THE ONES DIFFERENCE
          ═══════════════════════════════════════════════════ */}
      <section ref={solutionRef} id="the-difference" className="py-24 md:py-32 bg-[#ede8e2] scroll-mt-24">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Headline */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
            className="max-w-3xl mx-auto text-center mb-16 md:mb-20"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-[#054700] text-[#ede8e2] px-4 py-2 rounded-full mb-6"
            >
              <img src="/ones-logo-icon.svg" alt="" className="w-4 h-4 brightness-0 invert" />
              <span className="text-sm font-medium">The Ones Difference</span>
            </motion.div>

            <motion.h3
              variants={fadeUp}
              className="text-2xl sm:text-3xl md:text-[2.75rem] text-[#054700] font-light leading-tight text-balance"
            >
              We don't recommend supplements.<span className="hidden sm:inline"><br /></span>{" "}
              <span className="text-[#8a9a2c]">We formulate yours.</span>
            </motion.h3>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-black/60 leading-relaxed max-w-xl mx-auto"
            >
              Your blood tests, your wearable data, your conversation with our AI — turned into one custom formula that ships to your door.
            </motion.p>
          </motion.div>

          {/* Video + Ingredient Cards */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
          >
            {/* ── Mobile Layout ── */}
            <div className="md:hidden">
              <motion.div variants={scaleIn} className="flex justify-center mb-8">
                <div className="relative w-full max-w-sm">
                  <video
                    src="/capsule-formation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="relative w-full h-auto rounded-2xl shadow-xl"
                  />
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {callouts.map((callout, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: {
                        opacity: 1, y: 0,
                        transition: { duration: 0.4, delay: 0.3 + i * 0.08 },
                      },
                    }}
                    className="bg-white/70 backdrop-blur-sm rounded-xl p-3.5 border border-[#5a6623]/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-[#054700]/[0.07] flex items-center justify-center text-[#054700]">
                        {callout.icon}
                      </div>
                      <span className="text-[10px] text-[#5a6623] font-medium uppercase tracking-wide leading-tight line-clamp-2">
                        {callout.dataSource}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-semibold text-[#054700]">{callout.ingredient}</span>
                      <span className="text-xs text-[#054700]/35">{callout.dose}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Desktop Layout: 5-column grid [cards | gap | video | gap | cards] ── */}
            <div className="hidden md:grid md:grid-cols-[1fr_2rem_1.4fr_2rem_1fr] items-center max-w-6xl mx-auto">

              {/* Left Cards (3) */}
              <div className="flex flex-col justify-center gap-5">
                {callouts
                  .filter((c) => c.position === "left")
                  .map((callout, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        hidden: { opacity: 0, x: -24 },
                        visible: {
                          opacity: 1, x: 0,
                          transition: { duration: 0.5, delay: 0.4 + index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
                        },
                      }}
                      className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-[#5a6623]/30 hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/[0.07] flex items-center justify-center text-[#054700]">
                          {callout.icon}
                        </div>
                        <div>
                          <p className="text-xs text-[#5a6623] font-medium uppercase tracking-wide mb-1">
                            {callout.dataSource}
                          </p>
                          <p className="text-base font-semibold text-[#054700]">
                            {callout.ingredient}
                          </p>
                          <p className="text-sm text-[#054700]/45">
                            {callout.dose}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>

              {/* Left connector column */}
              <div className="flex flex-col justify-center items-center gap-5 h-full">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 flex items-center w-full">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a6623]/30 to-[#5a6623]/50" />
                    <div className="w-2 h-2 rounded-full bg-[#5a6623] flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* Center Video */}
              <motion.div variants={scaleIn} className="relative flex items-center justify-center">
                <div className="relative w-full">
                  <video
                    src="/capsule-formation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="relative w-full h-auto rounded-2xl shadow-[0_32px_80px_-16px_rgba(5,71,0,0.12)]"
                  />
                </div>
              </motion.div>

              {/* Right connector column */}
              <div className="flex flex-col justify-center items-center gap-5 h-full">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 flex items-center w-full">
                    <div className="w-2 h-2 rounded-full bg-[#5a6623] flex-shrink-0" />
                    <div className="w-full h-px bg-gradient-to-r from-[#5a6623]/50 via-[#5a6623]/30 to-transparent" />
                  </div>
                ))}
              </div>

              {/* Right Cards (3) */}
              <div className="flex flex-col justify-center gap-5">
                {callouts
                  .filter((c) => c.position === "right")
                  .map((callout, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        hidden: { opacity: 0, x: 24 },
                        visible: {
                          opacity: 1, x: 0,
                          transition: { duration: 0.5, delay: 0.4 + index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
                        },
                      }}
                      className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-[#5a6623]/30 hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/[0.07] flex items-center justify-center text-[#054700]">
                          {callout.icon}
                        </div>
                        <div>
                          <p className="text-xs text-[#5a6623] font-medium uppercase tracking-wide mb-1">
                            {callout.dataSource}
                          </p>
                          <p className="text-base font-semibold text-[#054700]">
                            {callout.ingredient}
                          </p>
                          <p className="text-sm text-[#054700]/45">
                            {callout.dose}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
            className="mt-14 md:mt-20 text-center"
          >
            <motion.button
              variants={fadeUp}
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-2 bg-[#054700] text-[#ede8e2] px-8 py-4 rounded-full text-base font-medium hover:bg-[#053600] transition-colors duration-300 shadow-lg shadow-[#054700]/20"
            >
              Start Your Formula
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </section>
    </>
  );
}

export function OnesDifferenceSection() {
  const solutionRef = useRef<HTMLElement>(null);
  const solutionInView = useInView(solutionRef, { once: true, margin: "100px" });
  const [, navigate] = useLocation();
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const [mobileVideoBlocked, setMobileVideoBlocked] = useState(false);

  // Try to autoplay the mobile capsule video; if the browser blocks it (iOS Low Power Mode,
  // Android data-saver, etc.) show a tap-to-play overlay so users still see something.
  // React doesn't always set the HTML `muted` attribute correctly on initial render, which
  // can cause iOS Safari to treat the autoplay as audible and block it — we fix that imperatively.
  // We also gate every play() on `paused` so we never overlap the browser's own autoplay
  // attempt (overlapping play() calls reject the first promise with AbortError, which used
  // to spuriously flip blocked=true).
  useEffect(() => {
    const v = mobileVideoRef.current;
    if (!v) return;

    // Ensure muted is set early and explicitly to help bypass autoplay blocks
    v.muted = true;
    v.defaultMuted = true;

    let cancelled = false;

    const tryPlay = async () => {
      if (cancelled || !v.paused) return;
      try {
        await v.play();
        if (!cancelled) setMobileVideoBlocked(false);
      } catch (err: any) {
        if (cancelled) return;
        // AbortError is common and safe to ignore (e.g. another play() call interrupted this one)
        if (err && err.name === 'AbortError') return;
        
        console.warn("Mobile video autoplay blocked:", err);
        setMobileVideoBlocked(true);
      }
    };

    // If already ready, try playing immediately
    if (v.readyState >= 2) {
      tryPlay();
    }

    // Listen for all events that indicate the video is ready to attempt playback
    const events = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    events.forEach(event => v.addEventListener(event, tryPlay));

    const onVis = () => { 
      if (!document.hidden && v.paused) {
        tryPlay();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      events.forEach(event => v.removeEventListener(event, tryPlay));
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
      <section ref={solutionRef} id="the-difference" className="py-24 md:py-32 bg-[#ede8e2] scroll-mt-24">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Headline */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
            className="max-w-3xl mx-auto text-center mb-16 md:mb-20"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-[#054700] text-[#ede8e2] px-4 py-2 rounded-full mb-6"
            >
              <img src="/ones-logo-icon.svg" alt="" className="w-4 h-4 brightness-0 invert" />
              <span className="text-sm font-medium">The Ones Difference</span>
            </motion.div>

            <motion.h3
              variants={fadeUp}
              className="text-2xl sm:text-3xl md:text-[2.75rem] text-[#054700] font-light leading-tight text-balance"
            >
              We don't recommend supplements.<span className="hidden sm:inline"><br /></span>{" "}
              <span className="text-[#8a9a2c]">We formulate yours.</span>
            </motion.h3>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-black/60 leading-relaxed max-w-xl mx-auto"
            >
              Your blood tests, your wearable data, your conversation with our AI — turned into one custom formula that ships to your door.
            </motion.p>
          </motion.div>

          {/* Video + Ingredient Cards */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
          >
            {/* ── Mobile Layout ── */}
            <div className="md:hidden">
              <div className="flex justify-center mb-8">
                <div className="relative w-full max-w-sm">
                  {/* Radial glow behind video */}
                  <div className="absolute inset-0 -inset-x-8 -inset-y-8 bg-[radial-gradient(circle,_rgba(138,154,44,0.08)_0%,_transparent_70%)] pointer-events-none" />
                  <video
                    ref={mobileVideoRef}
                    src="/capsule-formation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disableRemotePlayback
                    style={{ aspectRatio: '1 / 1' }}
                    className="relative w-full h-auto rounded-2xl shadow-xl bg-[#054700]/5 object-cover"
                  />
                  {mobileVideoBlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        const v = mobileVideoRef.current;
                        if (!v) return;
                        v.muted = true;
                        v.play().then(() => setMobileVideoBlocked(false)).catch(() => {});
                      }}
                      aria-label="Play capsule formation video"
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#054700]/40"
                    >
                      <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1 fill-[#054700]"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {callouts.map((callout, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: {
                        opacity: 1, y: 0,
                        transition: { duration: 0.4, delay: 0.3 + i * 0.08 },
                      },
                    }}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl p-3.5 border border-white/60 shadow-[0_1px_16px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-[#054700]/10 flex items-center justify-center text-[#054700]">
                        {callout.icon}
                      </div>
                      <span className="text-[10px] text-[#5a6623] font-medium uppercase tracking-wide leading-tight line-clamp-2">
                        {callout.dataSource}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-semibold text-[#054700]">{callout.ingredient}</span>
                      <span className="text-xs text-[#054700]/35">{callout.dose}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Desktop Layout ── */}
            <div className="hidden md:grid md:grid-cols-[1fr_2.5rem_1.4fr_2.5rem_1fr] items-center max-w-6xl mx-auto">
              {/* Left Cards */}
              <div className="flex flex-col justify-center gap-5">
                {callouts.filter((c) => c.position === "left").map((callout, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: -24 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.4 + index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] } },
                    }}
                    onMouseMove={handleTilt}
                    onMouseLeave={handleTiltReset}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 will-change-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/10 ring-1 ring-[#054700]/[0.06] flex items-center justify-center text-[#054700]">{callout.icon}</div>
                      <div>
                        <p className="text-[11px] text-[#5a6623]/80 font-medium uppercase tracking-wider mb-1">{callout.dataSource}</p>
                        <p className="text-base font-semibold text-[#054700]">{callout.ingredient}</p>
                        <p className="text-sm text-[#054700]/40 font-light">{callout.dose}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Left connectors */}
              <div className="flex flex-col justify-center items-center gap-5 h-full">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 flex items-center w-full">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#054700]/10 to-[#054700]/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#054700]/30 flex-shrink-0 mr-3" />
                  </div>
                ))}
              </div>

              {/* Center Video with glow */}
              <motion.div variants={scaleIn} className="relative flex items-center justify-center">
                <div className="absolute inset-0 -inset-x-12 -inset-y-12 bg-[radial-gradient(circle,_rgba(138,154,44,0.1)_0%,_transparent_65%)]" />
                <video src="/capsule-formation.mp4" autoPlay loop muted playsInline preload="auto" className="relative w-full h-auto rounded-3xl shadow-[0_32px_80px_-16px_rgba(5,71,0,0.15),_0_0_0_1px_rgba(255,255,255,0.3)]" />
              </motion.div>

              {/* Right connectors */}
              <div className="flex flex-col justify-center items-center gap-5 h-full">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 flex items-center w-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#054700]/30 flex-shrink-0 ml-3" />
                    <div className="w-full h-px bg-gradient-to-r from-[#054700]/20 via-[#054700]/10 to-transparent" />
                  </div>
                ))}
              </div>

              {/* Right Cards */}
              <div className="flex flex-col justify-center gap-5">
                {callouts.filter((c) => c.position === "right").map((callout, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: 24 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.4 + index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] } },
                    }}
                    onMouseMove={handleTilt}
                    onMouseLeave={handleTiltReset}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 will-change-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/10 ring-1 ring-[#054700]/[0.06] flex items-center justify-center text-[#054700]">{callout.icon}</div>
                      <div>
                        <p className="text-[11px] text-[#5a6623]/80 font-medium uppercase tracking-wider mb-1">{callout.dataSource}</p>
                        <p className="text-base font-semibold text-[#054700]">{callout.ingredient}</p>
                        <p className="text-sm text-[#054700]/40 font-light">{callout.dose}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial="hidden"
            animate={solutionInView ? "visible" : "hidden"}
            variants={stagger}
            className="mt-14 md:mt-20 text-center"
          >
            <motion.button
              variants={fadeUp}
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-2 bg-[#054700] text-[#ede8e2] px-8 py-4 rounded-full text-base font-medium hover:bg-[#053600] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#054700]/20"
            >
              Start Your Formula
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </section>
  );
}
