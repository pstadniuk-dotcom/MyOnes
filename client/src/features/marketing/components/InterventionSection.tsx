import { useRef } from "react";
import { Moon, TestTube, HeartPulse, Activity, HelpCircle, Leaf, Zap, ArrowRight, Watch, ClipboardList } from "lucide-react";
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
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function InterventionSection() {
  const problemRef = useRef<HTMLElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const problemInView = useInView(problemRef, { once: true, margin: "-80px" });
  const solutionInView = useInView(solutionRef, { once: true, margin: "-80px" });
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
              className="mt-4 text-3xl md:text-4xl text-[#054700] font-light leading-tight"
            >
              Blood tests give you biomarkers.<br />
              Wearables give you metrics.<br />
              <span className="font-semibold text-[#5a6623]">But who gives you a solution?</span>
            </motion.h2>

            {/* The typical journey — card layout */}
            <motion.div
              variants={fadeUp}
              className="mt-14 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4"
            >
              {/* Card: 100+ biomarkers */}
              <div className="flex items-center gap-3.5 bg-gradient-to-br from-[#ede8e2] to-[#e4ddd6] border border-[#054700]/10 rounded-2xl px-6 py-5 min-w-[190px] shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
                  <TestTube className="w-6 h-6 text-[#054700]/70" />
                </div>
                <span className="text-[15px] font-medium text-[#054700]/80">100+ biomarkers</span>
              </div>

              {/* Plus */}
              <span className="text-[#054700]/30 text-2xl font-light hidden md:block">+</span>
              <span className="text-[#054700]/30 text-xl font-light md:hidden">+</span>

              {/* Card: Sleep, HRV, strain */}
              <div className="flex items-center gap-3.5 bg-gradient-to-br from-[#ede8e2] to-[#e4ddd6] border border-[#054700]/10 rounded-2xl px-6 py-5 min-w-[210px] shadow-sm">
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <div className="w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#054700]/70" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
                    <Watch className="w-6 h-6 text-[#054700]/70" />
                  </div>
                </div>
                <span className="text-[15px] font-medium text-[#054700]/80">Sleep, HRV, strain</span>
              </div>

              {/* Arrow */}
              <span className="text-[#054700]/25 text-2xl hidden md:block">→</span>
              <span className="text-[#054700]/25 text-xl md:hidden rotate-90">→</span>

              {/* Card: Charts & reports */}
              <div className="flex items-center gap-3.5 bg-gradient-to-br from-[#ede8e2] to-[#e4ddd6] border border-[#054700]/10 rounded-2xl px-6 py-5 min-w-[200px] shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-[#054700]/70" />
                </div>
                <span className="text-[15px] font-medium text-[#054700]/80">Charts & reports</span>
              </div>

              {/* Arrow */}
              <span className="text-[#054700]/25 text-2xl hidden md:block">→</span>
              <span className="text-[#054700]/25 text-xl md:hidden rotate-90">→</span>

              {/* Card: Now what? */}
              <div className="flex items-center gap-3.5 bg-gradient-to-br from-[#ede8e2] to-[#e4ddd6] border border-[#054700]/10 rounded-2xl px-6 py-5 min-w-[165px] shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
                  <HelpCircle className="w-7 h-7 text-[#054700]/70" />
                </div>
                <span className="text-[15px] font-medium text-[#054700]/80">Now what?</span>
              </div>
            </motion.div>

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
              <span className="text-sm font-medium">The ONES Difference</span>
            </motion.div>

            <motion.h3
              variants={fadeUp}
              className="text-3xl md:text-[2.75rem] text-[#054700] font-light leading-tight"
            >
              We don't recommend supplements.<br />
              <span className="font-semibold">We formulate yours.</span>
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
