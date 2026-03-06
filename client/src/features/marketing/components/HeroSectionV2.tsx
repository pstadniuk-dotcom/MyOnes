import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

// Hero background videos — cycle with crossfade
const heroVideos = [
  "/Hero%20Section/1pN_Da9wiBpM9pX6mF7-C_492e42aee93d4081b12e21a02db3620d.mp4",
  "/Hero%20Section/25cb723f64c24ff7a5b473eaf3ddf957.mp4",
  "/Hero%20Section/6d9efde5ac45418c979e43130ecc6e77.mp4",
  "/Hero%20Section/vE0MK5wrO4j1XjnPPU4rB_59b0b5398dac438eafa639b096553f72.mp4",
  "/Hero%20Section/AdobeStock_1717805080.mov",
  "/Hero%20Section/AdobeStock_211927150.mov",
  "/Hero%20Section/AdobeStock_723953147.mov",
];

// Persona data for Alex and Rachel tabs
const personas = [
  {
    name: "Alex",
    age: 36,
    video: "/Ones%20-%20Formulation%20Alex.mp4",
  },
  {
    name: "Rachel",
    age: 34,
    video: "/Ones%20-%20Rachel.mp4",
  },
];

export default function HeroSectionV2() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeBgVideo, setActiveBgVideo] = useState(0);
  const bgVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Cycle background videos — advance when current video ends
  const handleBgVideoEnded = useCallback(() => {
    setActiveBgVideo((prev) => (prev + 1) % heroVideos.length);
  }, []);

  // Play the active background video, pause others
  useEffect(() => {
    bgVideoRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === activeBgVideo) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeBgVideo]);

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
          LEFT HALF — Copy on cream with pill outlines
          ═══════════════════════════════════════════════════ */}
      <div className="relative w-full lg:w-1/2 bg-[#ede8e2] flex flex-col justify-center px-8 md:px-16 lg:px-16 xl:px-20 py-10 lg:py-16 overflow-hidden">
        {/* Decorative pill outlines with faint traveling glow */}
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
            {/* Metallic shiny glow filter — specular highlight + blur */}
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
            {/* Metallic green gradient for the glow traces */}
            <linearGradient id="metallicGreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b8cc50" />
              <stop offset="35%" stopColor="#d4e87a" />
              <stop offset="50%" stopColor="#f0ffc0" />
              <stop offset="65%" stopColor="#d4e87a" />
              <stop offset="100%" stopColor="#7a8c28" />
            </linearGradient>
            {/* Double-size capsule shape — 120×288px */}
            <path id="heroCapsule" d="M60,0 C93.2,0 120,26.8 120,60 L120,228 C120,261.2 93.2,288 60,288 C26.8,288 0,261.2 0,228 L0,60 C0,26.8 26.8,0 60,0 Z"/>
          </defs>

          {/* Static capsule outlines — sage/olive whispers */}
          <g opacity="0.20">
            <use href="#heroCapsule" transform="translate(320, 120) rotate(15, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(700, 50) rotate(-40, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(10, 300) rotate(20, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(550, 320) rotate(-10, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(820, 380) rotate(35, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(100, 580) rotate(-15, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(430, 650) rotate(40, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
            <use href="#heroCapsule" transform="translate(750, 700) rotate(-30, 60, 144)" fill="none" stroke="#b5b87a" strokeWidth="1"/>
          </g>

          {/* Animated metallic glow traces */}
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
          {/* Pill labels */}
          <div className="inline-flex items-center gap-8 border border-[#c5c5c5] rounded-full px-6 py-3 mx-auto lg:mx-0">
            <span className="flex items-center gap-2 text-sm text-[#757575] font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full" />
              Blood Data
            </span>
            <span className="flex items-center gap-2 text-sm text-[#757575] font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full" />
              Wearables
            </span>
            <span className="flex items-center gap-2 text-sm text-[#757575] font-light tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full" />
              Your Capsule
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] leading-[1.05] tracking-[-0.02em]">
            <span className="block font-light text-[#054700]">One formula.</span>
            <span className="block font-light text-[#054700]">Built for you.</span>
            <span className="block font-light text-[#5a6623]">Always evolving.</span>
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-[rgba(0,0,0,0.75)] font-light leading-relaxed max-w-lg">
            ONES uses your bloodwork, wearable data, and habits to build a
            personalized daily supplement, designed uniquely for your body and
            updated as your biology changes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2 items-center lg:items-start">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#074700] hover:bg-[#053600] text-[#ede8e2] px-8 py-6 text-lg rounded-full shadow-lg transition-all hover:shadow-xl group"
              >
                Start Your Formula
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-[#054700]/20 text-[#054700] hover:bg-[#054700]/5 px-8 py-6 text-lg rounded-full"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See How It Works
            </Button>
          </div>

          {/* Mini Progression */}
          <div className="flex items-center justify-center lg:justify-start gap-x-1.5 pt-4 text-xs sm:text-sm overflow-hidden">
            <span className="text-[#054700] font-medium whitespace-nowrap">Consultation</span>
            <span className="text-[#054700]/40">&bull;</span>
            <span className="text-[#054700] font-medium whitespace-nowrap">Upload Labs</span>
            <span className="text-[#054700]/40">&bull;</span>
            <span className="text-[#054700] font-medium whitespace-nowrap">Your Formula</span>
            <span className="text-[#054700]/40">&bull;</span>
            <span className="text-[#054700] font-medium whitespace-nowrap">Ongoing Updates</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT HALF — Nature photo + frosted glass chat with video
          ═══════════════════════════════════════════════════ */}
      <div className="flex relative w-full lg:w-1/2 min-h-[70vh] lg:min-h-[92vh] items-center justify-center">
        {/* Background video cycle */}
        {heroVideos.map((src, idx) => (
          <video
            key={src}
            ref={(el) => { bgVideoRefs.current[idx] = el; }}
            src={src}
            muted
            playsInline
            disablePictureInPicture
            controlsList="noplaybackrate nodownload"
            onEnded={handleBgVideoEnded}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000 ${
              idx === activeBgVideo ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Transparent overlay blocks browser video controls + darkens for contrast */}
        <div className="absolute inset-0 bg-black/20 z-[1]" />

        {/* Frosted glass chat widget */}
        <div className="relative z-10 w-full max-w-[380px] mx-auto px-4 sm:px-0 sm:max-w-[420px] backdrop-blur-[24px] bg-[rgba(32,40,31,0.36)] rounded-[32px] p-2 shadow-2xl">
          {/* Widget header */}
          <div className="flex items-center justify-center gap-4 px-6 py-5">
            <img src="/Ones%20AI%20transparent.png" alt="Ones AI" className="h-[27px]" />
            <div className="w-px h-6 bg-white/30" />
            <p className="text-white/80 text-sm font-light leading-tight">
              Your health<br />consultant
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex">
            {personas.map((persona, idx) => (
              <button
                key={persona.name}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 py-3.5 text-sm font-medium transition-all rounded-t-[16px] ${
                  idx === activeTab
                    ? 'bg-[#f8f8f8] text-[#2f2f2f]'
                    : 'bg-[#f8f8f8]/[0.12] text-white/80 hover:bg-[#f8f8f8]/20 border border-white/25 border-b-0'
                }`}
              >
                {persona.name}, {persona.age}
              </button>
            ))}
          </div>

          {/* Video content area — plays inside the chat widget */}
          <div className="bg-[#f8f8f8] rounded-b-[24px] overflow-hidden">
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
              {/* Block browser video control overlays */}
              <div className="absolute inset-0 z-[1]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
