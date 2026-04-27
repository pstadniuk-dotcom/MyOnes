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
    video: "/Ones - Formulation Alex.mp4",
  },
  {
    name: "Rachel",
    age: 34,
    video: "/Ones - Rachel.mp4",
  },
];

// Typewriter hook — cycles through phrases with type/delete animation
function useTypewriter(phrases: string[], typingSpeed = 70, deletingSpeed = 40, pauseDuration = 2200) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [delay, setDelay] = useState(typingSpeed);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        const nextText = currentPhrase.slice(0, text.length + 1);
        setText(nextText);

        if (nextText === currentPhrase) {
          setDelay(pauseDuration);
          setIsDeleting(true);
        } else {
          setDelay(typingSpeed);
        }
      } else {
        const nextText = currentPhrase.slice(0, text.length - 1);
        setText(nextText);

        if (nextText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
          setDelay(typingSpeed);
        } else {
          setDelay(deletingSpeed);
        }
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration, delay]);

  return text;
}

export default function HeroSectionV2() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeBgVideo, setActiveBgVideo] = useState(0);
  const typewriterText = useTypewriter(["your bloodwork", "your wearables", "your biology", "your lifestyle"]);
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
      <div className="relative w-full lg:w-1/2 bg-[#ede8e2] flex flex-col justify-center px-5 sm:px-8 md:px-16 lg:px-16 xl:px-20 py-10 lg:py-16">
        <div className="relative z-10 max-w-xl space-y-8 text-center lg:text-left mx-auto lg:mx-0">
          {/* Pill labels */}
          <div className="inline-flex items-center gap-3 sm:gap-8 border border-[#c5c5c5] rounded-full px-4 sm:px-6 py-2.5 sm:py-3 mx-auto lg:mx-0 max-w-full">
            <span className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-[#757575] font-light tracking-wide whitespace-nowrap">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full flex-shrink-0" />
              Blood Data
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-[#757575] font-light tracking-wide whitespace-nowrap">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full flex-shrink-0" />
              Wearables
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-[#757575] font-light tracking-wide whitespace-nowrap">
              <span className="w-1.5 h-1.5 bg-[#5a6623] rounded-full flex-shrink-0" />
              Your Capsule
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[2rem] sm:text-5xl md:text-6xl lg:text-[56px] xl:text-[60px] leading-[1.24] tracking-[-0.02em]">
            <span className="block font-light text-[#054700]">One formula.</span>
            <span className="block font-light text-[#054700] min-h-[1.25em]">Built from{" "}
              <span className="relative inline-grid lg:min-w-[14ch] align-baseline leading-[1.2] text-center lg:text-left">
                <span className="invisible col-start-1 row-start-1 hidden lg:inline">your wearables</span>
                <span className="text-gradient-green font-light col-start-1 row-start-1">{typewriterText}</span>
              </span>
            </span>
            <span className="block font-light pb-1 text-gradient-green">
              Always evolving.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-[rgba(0,0,0,0.75)] font-light leading-relaxed max-w-lg mx-auto lg:mx-0">
            ONES uses your bloodwork, wearable data, and habits to build a
            personalized daily supplement, designed uniquely for your body and
            updated as your biology changes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2 items-center lg:items-start">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#054700] hover:bg-[#043800] text-[#ede8e2] px-8 py-6 text-lg rounded-full shadow-lg transition-all hover:shadow-xl group"
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
      <div className="flex relative w-full lg:w-1/2 min-h-[60vh] sm:min-h-[70vh] lg:min-h-[92vh] items-center justify-center px-4 sm:px-6 lg:px-0 py-10 lg:py-0">
        {/* Background video cycle */}
        {/* {heroVideos.map((src, idx) => (
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
        ))} */}

          <video
            key={"6d9efde5ac45418c979e43130ecc6e77"}
            src={"/6d9efde5ac45418c979e43130ecc6e77.mp4"}
            muted
            playsInline
            autoPlay
            loop
            disablePictureInPicture
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000`}
          />


        {/* Transparent overlay blocks browser video controls + darkens for contrast */}
        <div className="absolute inset-0 bg-black/20 z-[1]" />

        {/* Frosted glass chat widget */}
        <div className="relative z-10 w-full max-w-[380px] mx-auto px-4 sm:px-0 sm:max-w-[420px] backdrop-blur-[24px] bg-[rgba(32,40,31,0.36)] rounded-[32px] p-2 shadow-2xl">
          {/* Widget header */}
          <div className="relative py-5">
            {/* Separator line aligned to center of widget (tab divider) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-8 bg-white/30" />
            <div className="flex">
              {/* Logo — right-aligned to just before center */}
              <div className="flex-1 flex items-center justify-end pr-4">
                <Link href="/">
                  <img src="/Ones%20Logo%20Home%20Screen.png" alt="Ones" className="h-[27px] cursor-pointer" />
                </Link>
              </div>
              {/* Text — left-aligned just after center */}
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

          {/* Video content area — plays inside the chat widget */}
          {/* <div className="bg-[#f8f8f8] rounded-b-[24px] overflow-hidden"> */}
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
              {/* Block browser video control overlays */}
              <div className="absolute inset-0 z-[1]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
