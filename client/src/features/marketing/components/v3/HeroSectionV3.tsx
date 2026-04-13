import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

// Persona data for Alex and Rachel tabs
const personas = [
  { name: "Alex", age: 36, video: "/Ones - Formulation Alex.mp4" },
  { name: "Rachel", age: 34, video: "/Ones - Rachel.mp4" },
];

// Typewriter hook
function useTypewriter(phrases: string[], typingSpeed = 70, deletingSpeed = 40, pauseDuration = 2200) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentPhrase.slice(0, text.length + 1));
        if (text.length === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), pauseDuration);
          return;
        }
      } else {
        setText(currentPhrase.slice(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return text;
}

export default function HeroSectionV3() {
  const [activeTab, setActiveTab] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const typewriterText = useTypewriter([
    "your bloodwork",
    "your wearables",
    "your biology",
    "your lifestyle",
  ]);

  // Play the active video, pause the other
  useEffect(() => {
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === activeTab) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeTab]);

  return (
    <section className="relative flex flex-col-reverse lg:flex-row overflow-hidden">
      {/* ═══════════════════════════════════════════════════
          LEFT HALF — Premium copy with glass effects
          ═══════════════════════════════════════════════════ */}
      <div className="relative w-full lg:w-1/2 bg-[#ede8e2] flex flex-col justify-center px-8 md:px-16 lg:px-16 xl:px-20 py-10 lg:py-16 overflow-hidden">
        {/* Ambient floating blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-[#8a9a2c]/[0.05] rounded-full blur-[100px] animate-blob-1" />
        <div className="absolute bottom-20 left-[-40px] w-56 h-56 bg-[#054700]/[0.04] rounded-full blur-[80px] animate-blob-3" />

        {/* Decorative pill outlines with metallic glow — kept from V2 */}
        <svg
          aria-hidden="true"
          className="absolute pointer-events-none select-none z-0"
          style={{ width: '1628px', height: '1121px', right: '-520px', top: '-216px' }}
          viewBox="0 0 960 905"
          fill="none"
          overflow="visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="metallicGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feSpecularLighting in="blur" surfaceScale="8" specularConstant="1.8" specularExponent="28" result="spec">
                <fePointLight x="200" y="100" z="300" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceGraphic" operator="in" result="specClip" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="specClip" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="metallicGreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b8cc50" />
              <stop offset="35%" stopColor="#d4e87a" />
              <stop offset="50%" stopColor="#f0ffc0" />
              <stop offset="65%" stopColor="#d4e87a" />
              <stop offset="100%" stopColor="#5a6623" />
            </linearGradient>
            <path id="heroCapsule" d="M60,0 C93.2,0 120,26.8 120,60 L120,228 C120,261.2 93.2,288 60,288 C26.8,288 0,261.2 0,228 L0,60 C0,26.8 26.8,0 60,0 Z"/>
          </defs>
          <g opacity="0.18">
            <use href="#heroCapsule" transform="translate(320, 120) rotate(15, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(700, 50) rotate(-40, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(10, 300) rotate(20, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(550, 320) rotate(-10, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(820, 380) rotate(35, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(100, 580) rotate(-15, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(430, 650) rotate(40, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(750, 700) rotate(-30, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          </g>
          <use href="#heroCapsule" transform="translate(320, 120) rotate(15, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="55 800"><animate attributeName="stroke-dashoffset" values="0;-855" dur="11s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(700, 50) rotate(-40, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="58 800"><animate attributeName="stroke-dashoffset" values="0;-858" dur="8s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(10, 300) rotate(20, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="62 800"><animate attributeName="stroke-dashoffset" values="0;-862" dur="13s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(550, 320) rotate(-10, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="56 800"><animate attributeName="stroke-dashoffset" values="0;-856" dur="12s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(820, 380) rotate(35, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="54 800"><animate attributeName="stroke-dashoffset" values="0;-854" dur="7s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(100, 580) rotate(-15, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="60 800"><animate attributeName="stroke-dashoffset" values="0;-860" dur="10s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(430, 650) rotate(40, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="57 800"><animate attributeName="stroke-dashoffset" values="0;-857" dur="14s" repeatCount="indefinite"/></use>
          <use href="#heroCapsule" transform="translate(750, 700) rotate(-30, 60, 144)" fill="none" stroke="url(#metallicGreen)" strokeWidth="3" strokeLinecap="round" filter="url(#metallicGlow)" opacity="0.55" strokeDasharray="59 800"><animate attributeName="stroke-dashoffset" values="0;-859" dur="15s" repeatCount="indefinite"/></use>
        </svg>

        <div className="relative z-10 max-w-xl space-y-8 text-center lg:text-left mx-auto lg:mx-0">
          {/* Glass pill badges */}
          <div className="inline-flex items-center gap-3 glass-premium rounded-full px-5 py-2.5 mx-auto lg:mx-0">
            <span className="flex items-center gap-2 text-sm text-[#054700]/60 font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#8a9a2c] rounded-full animate-pulse" />
              Blood Data
            </span>
            <span className="w-px h-4 bg-[#054700]/10" />
            <span className="flex items-center gap-2 text-sm text-[#054700]/60 font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#8a9a2c] rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
              Wearables
            </span>
            <span className="w-px h-4 bg-[#054700]/10" />
            <span className="flex items-center gap-2 text-sm text-[#054700]/60 font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#8a9a2c] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
              Your Capsule
            </span>
          </div>

          {/* Headline with gradient text */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] leading-[1.12] tracking-[-0.02em] overflow-visible">
            <span className="block font-extralight text-[#054700]">One formula.</span>
            <span className="block font-extralight text-[#054700] whitespace-nowrap">Built from{" "}
              <span className="text-gradient-green font-light inline-block min-w-[3ch]">{typewriterText}</span>
              <span className="typewriter-cursor" />
            </span>
            <span className="block font-extralight pb-1 text-gradient-green">
              Always evolving.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-[#054700]/55 font-light leading-relaxed max-w-lg">
            ONES uses your bloodwork, wearable data, and habits to build a
            personalized daily supplement — designed uniquely for your body and
            updated as your biology changes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2 items-center lg:items-start">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#054700] hover:bg-[#043800] text-white px-10 py-6 text-lg rounded-full shadow-xl shadow-[#054700]/20 hover:shadow-2xl hover:shadow-[#054700]/25 hover:-translate-y-0.5 transition-all duration-300 group btn-shimmer"
              >
                Start Your Formula
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-[#054700]/15 text-[#054700] hover:bg-[#054700]/5 px-8 py-6 text-lg rounded-full backdrop-blur-sm"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See How It Works
            </Button>
          </div>

          {/* Mini Progression — glass style */}
          <div className="flex items-center justify-center lg:justify-start gap-x-3 pt-4">
            {["Consultation", "Upload Labs", "Your Formula", "Ongoing Updates"].map((step, i) => (
              <div key={step} className="flex items-center gap-x-3">
                <span className="text-xs sm:text-sm text-[#054700]/50 font-light whitespace-nowrap">{step}</span>
                {i < 3 && (
                  <span className="w-4 h-px bg-gradient-to-r from-[#054700]/20 to-[#054700]/5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT HALF — Video + frosted glass chat (UNCHANGED)
          ═══════════════════════════════════════════════════ */}
      <div className="flex relative w-full lg:w-1/2 min-h-[70vh] lg:min-h-[92vh] items-center justify-center">
        {/* Background video */}
        <video
          key="6d9efde5ac45418c979e43130ecc6e77"
          src="/6d9efde5ac45418c979e43130ecc6e77.mp4"
          muted
          autoPlay
          loop
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20 z-[1]" />

        {/* Frosted glass chat widget */}
        <div className="relative z-10 w-full max-w-[380px] mx-auto px-4 sm:px-0 sm:max-w-[420px] backdrop-blur-[24px] bg-[rgba(32,40,31,0.36)] rounded-[32px] p-2 shadow-2xl">
          {/* Widget header */}
          <div className="relative py-5">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-8 bg-white/30" />
            <div className="flex">
              <div className="flex-1 flex items-center justify-end pr-4">
                <Link href="/">
                  <img src="/Ones%20Logo%20Home%20Screen.png" alt="Ones" className="h-[27px] cursor-pointer" />
                </Link>
              </div>
              <div className="flex-1 flex items-center pl-4">
                <p className="text-white/80 text-sm font-light leading-tight">
                  Your health<br />consultant
                </p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex">
            {personas.map((persona, idx) => (
              <button
                key={persona.name}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 py-3.5 text-sm font-medium transition-all rounded-t-[16px] ${
                  idx === activeTab
                    ? 'bg-[#f1f1f1] text-[#2f2f2f]'
                    : 'bg-[#f8f8f8]/[0.12] text-white/80 hover:bg-[#f8f8f8]/20 border border-white/25 border-b-0'
                }`}
              >
                {persona.name}, {persona.age}
              </button>
            ))}
          </div>

          {/* Video content area */}
          <div className="bg-[#f1f1f1] rounded-b-[24px] overflow-hidden">
            <div className="relative h-[340px] sm:h-[380px]">
              {personas.map((persona, idx) => (
                <video
                  key={persona.name}
                  ref={(el) => { videoRefs.current[idx] = el; }}
                  src={persona.video}
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  controlsList="noplaybackrate nodownload"
                  className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-500 ${
                    idx === activeTab ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              <div className="absolute inset-0 z-[1]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
