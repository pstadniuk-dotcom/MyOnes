import { useRef } from "react";
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
  { icon: <Leaf className="w-4 h-4" />, dataSource: "Hormonal balance support", ingredient: "Maca", dose: "500mg", position: "left" as const },
  { icon: <HeartPulse className="w-4 h-4" />, dataSource: "You mentioned afternoon fatigue", ingredient: "Adrenal Support", dose: "420mg", position: "right" as const },
  { icon: <Activity className="w-4 h-4" />, dataSource: "Your labs show suboptimal heart markers", ingredient: "CoEnzyme Q10", dose: "100mg", position: "left" as const },
  { icon: <Moon className="w-4 h-4" />, dataSource: "Your Oura shows poor deep sleep", ingredient: "Magnesium", dose: "400mg", position: "right" as const },
  { icon: <Zap className="w-4 h-4" />, dataSource: "Focus & calm support", ingredient: "L-Theanine", dose: "200mg", position: "left" as const },
  { icon: <TestTube className="w-4 h-4" />, dataSource: "Your bloodwork shows elevated cortisol", ingredient: "Ashwagandha", dose: "300mg", position: "right" as const },
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

/* ── 3D perspective tilt handlers ── */
const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
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
  e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
  e.currentTarget.style.transition = 'transform 0.5s ease-out';
};

export default function OnesDifferenceSectionV3() {
  const solutionRef = useRef<HTMLElement>(null);
  const solutionInView = useInView(solutionRef, { once: true, margin: "100px" });
  const [, navigate] = useLocation();

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
            <span className="text-gradient-green font-semibold">We formulate yours.</span>
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
                <div className="absolute inset-0 -inset-x-8 -inset-y-8 bg-[radial-gradient(circle,_rgba(138,154,44,0.08)_0%,_transparent_70%)]" />
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
                  className="bg-white/90 backdrop-blur-xl rounded-2xl p-3.5 border border-white/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)]"
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

          {/* ── Desktop Layout: 5-column grid [cards | gap | video | gap | cards] ── */}
          <div className="hidden md:grid md:grid-cols-[1fr_2.5rem_1.4fr_2.5rem_1fr] items-center max-w-6xl mx-auto">

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
                    onMouseMove={handleTilt}
                    onMouseLeave={handleTiltReset}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 will-change-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/10 ring-1 ring-[#054700]/[0.06] flex items-center justify-center text-[#054700]">
                        {callout.icon}
                      </div>
                      <div>
                        <p className="text-[11px] text-[#5a6623]/80 font-medium uppercase tracking-wider mb-1">
                          {callout.dataSource}
                        </p>
                        <p className="text-base font-semibold text-[#054700]">
                          {callout.ingredient}
                        </p>
                        <p className="text-sm text-[#054700]/40 font-light">
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
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#054700]/10 to-[#054700]/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#054700]/30 flex-shrink-0 mr-3" />
                </div>
              ))}
            </div>

            {/* Center Video */}
            <motion.div variants={scaleIn} className="relative flex items-center justify-center">
              <div className="absolute inset-0 -inset-x-12 -inset-y-12 bg-[radial-gradient(circle,_rgba(138,154,44,0.1)_0%,_transparent_65%)]" />
              <video
                src="/capsule-formation.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="relative w-full h-auto rounded-3xl shadow-[0_32px_80px_-16px_rgba(5,71,0,0.15),_0_0_0_1px_rgba(255,255,255,0.3)]"
              />
            </motion.div>

            {/* Right connector column */}
            <div className="flex flex-col justify-center items-center gap-5 h-full">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-1 flex items-center w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#054700]/30 flex-shrink-0 ml-3" />
                  <div className="w-full h-px bg-gradient-to-r from-[#054700]/20 via-[#054700]/10 to-transparent" />
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
                    onMouseMove={handleTilt}
                    onMouseLeave={handleTiltReset}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 will-change-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#054700]/10 ring-1 ring-[#054700]/[0.06] flex items-center justify-center text-[#054700]">
                        {callout.icon}
                      </div>
                      <div>
                        <p className="text-[11px] text-[#5a6623]/80 font-medium uppercase tracking-wider mb-1">
                          {callout.dataSource}
                        </p>
                        <p className="text-base font-semibold text-[#054700]">
                          {callout.ingredient}
                        </p>
                        <p className="text-sm text-[#054700]/40 font-light">
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
