import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Star, Quote, ArrowLeft, ArrowRight } from "lucide-react";

/**
 * R5/R2 — Editorial testimonials with large lifestyle image feature.
 * Split layout: featured testimonial with photo on left, cards on right.
 * Stats bar at bottom with glassmorphism.
 */

const testimonials = [
  {
    name: "Rick M.",
    role: "72 year old male",
    image: "/Reviews/Rick matthews photo.jpg",
    rating: 5,
    text: "I am an active older gentleman with a big family history of cancer. I wanted to be proactive about my health — issues that pushed me towards using your products were general inflammation, thin skin, thyroid, arthritis, and prostate. I like your unorthodox approach and since being on my formula I've noticed my overall energy levels are up. When I ran out of product I noticed a significant drop in my energy levels. No miracles at my age, but I do believe there is hope this can extend quality of life.",
    highlight: "my overall energy levels are up",
  },
  {
    name: "Leslie H.",
    role: "47 year old female",
    image: "/Reviews/Leslie Hargis Testimonial.jpg",
    rating: 5,
    text: "I was suffering from fatigue and depression that interrupted my life. Within 1.5 months of being on my formula I felt like a different person. My energy levels were in sharp contrast to what I had before starting, to the point where my husband was interested in what I was taking. I recommend this product to everyone — a customized formula just for me was what made the difference.",
    highlight: "I felt like a different person",
  },
  {
    name: "Tammy S.",
    role: "55 year old female",
    image: "/Reviews/Tammy Silvernail Testimonial.jpg",
    rating: 5,
    text: "I had very low energy and hormone issues. I felt better than I've ever felt on the custom formula!",
    highlight: "better than I've ever felt",
  },
];

const stats = [
  { value: "2,000+", label: "Clinical Patients" },
  { value: "8+ Years", label: "Practitioner Experience" },
  { value: "94%", label: "Report Improvement" },
];

export default function TestimonialsSectionV3() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [textFading, setTextFading] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const active = testimonials[activeIndex];

  const goTo = (index: number) => {
    if (index === activeIndex) return;
    setTextFading(true);
    setTimeout(() => {
      setActiveIndex(index);
      setTextFading(false);
    }, 250);
  };

  const goNext = () => goTo((activeIndex + 1) % testimonials.length);
  const goPrev = () =>
    goTo((activeIndex - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="py-24 md:py-32 bg-white overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div
          className={`max-w-3xl mx-auto text-center mb-16 md:mb-20 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70">
            From our clinical program
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            Real people.{" "}
            <span className="text-[#8a9a2c]">Real&nbsp;results.</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/50 leading-relaxed font-light max-w-xl mx-auto">
            What was once available only in high-end clinics is now accessible
            to everyone through AI-powered personalization.
          </p>
        </div>

        {/* Featured Testimonial — split layout */}
        <div
          className={`grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-center mb-16 transition-all duration-700 delay-200 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Left — Lifestyle image with floating testimonial photo */}
          <div className="relative">
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[4/5] md:aspect-[3/4]">
              <img
                src="/Ones%20LIfestyle%20Images/website%20v2.png"
                alt="ONES wellness lifestyle"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#054700]/50 via-transparent to-transparent" />

              {/* Floating quote highlight */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-[#054700]/10 border border-white/50">
                  <Quote className="w-6 h-6 text-[#054700]/10 mb-2" />
                  <p
                    className={`text-xl md:text-2xl font-light text-[#054700] leading-snug italic transition-all duration-300 ${
                      textFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
                    }`}
                  >
                    "{active.highlight}"
                  </p>
                  <div
                    className={`flex items-center gap-3 mt-4 transition-all duration-300 ${
                      textFading ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    {active.image && (
                      <img
                        src={active.image}
                        alt={active.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-[#054700]/10 ring-offset-2"
                      />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-[#054700]">
                        {active.name}
                      </div>
                      <div className="text-xs text-[#054700]/50">
                        {active.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Full testimonial + navigation */}
          <div className="flex flex-col justify-center">
            {/* Stars */}
            <div
              className={`flex gap-1 mb-6 transition-all duration-300 ${
                textFading ? "opacity-0" : "opacity-100"
              }`}
            >
              {[...Array(active.rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-[#d4a843] text-[#d4a843]"
                />
              ))}
            </div>

            {/* Full text */}
            <div
              className={`transition-all duration-300 ${
                textFading
                  ? "opacity-0 translate-y-2"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <p className="text-lg md:text-xl text-[#054700]/70 leading-relaxed font-light">
                "{active.text}"
              </p>
              <div className="flex items-center gap-3 mt-6">
                {active.image && (
                  <img
                    src={active.image}
                    alt={active.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#054700]/10 ring-offset-2 lg:hidden"
                  />
                )}
                <div className="lg:hidden">
                  <div className="font-semibold text-[#054700]">
                    {active.name}
                  </div>
                  <div className="text-sm text-[#054700]/50">
                    {active.role}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-10">
              <button
                onClick={goPrev}
                className="w-12 h-12 rounded-full border border-[#054700]/15 flex items-center justify-center text-[#054700]/60 hover:bg-[#054700] hover:text-white hover:border-[#054700] transition-all duration-300 cursor-pointer"
                aria-label="Previous testimonial"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                className="w-12 h-12 rounded-full border border-[#054700]/15 flex items-center justify-center text-[#054700]/60 hover:bg-[#054700] hover:text-white hover:border-[#054700] transition-all duration-300 cursor-pointer"
                aria-label="Next testimonial"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Dot indicators */}
              <div className="flex gap-2 ml-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-300 cursor-pointer ${
                      i === activeIndex
                        ? "w-8 h-2.5 bg-[#054700]"
                        : "w-2.5 h-2.5 bg-[#054700]/15 hover:bg-[#054700]/30"
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar — glassmorphism */}
        <div
          className={`transition-all duration-700 delay-500 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-[#054700] backdrop-blur-md rounded-2xl md:rounded-3xl py-10 md:py-14 px-8 max-w-4xl mx-auto border border-[#054700]/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 text-center">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`${
                    i < stats.length - 1
                      ? "sm:border-r sm:border-white/15"
                      : ""
                  }`}
                >
                  <div className="text-4xl md:text-5xl font-light text-white leading-none tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/50 mt-2 font-light tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
