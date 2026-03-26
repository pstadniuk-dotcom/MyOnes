import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rick M.",
    role: "72 year old male",
    image: "/Reviews/Rick matthews photo.jpg",
    rating: 5,
    text: "I am an active older gentleman with a big family history of cancer. I wanted to be proactive about my health — issues that pushed me towards using your products were general inflammation, thin skin, thyroid, arthritis, and prostate. I like your unorthodox approach and since being on my formula I've noticed my overall energy levels are up. When I ran out of product I noticed a significant drop in my energy levels. No miracles at my age, but I do believe there is hope this can extend quality of life.",
    highlight: "my overall energy levels are up",
    expandable: true,
  },
  {
    name: "Leslie H.",
    role: "47 year old female",
    image: "/Reviews/Leslie Hargis Testimonial.jpg",
    rating: 5,
    text: "I was suffering from fatigue and depression that interrupted my life. Within 1.5 months of being on my formula I felt like a different person. My energy levels were in sharp contrast to what I had before starting, to the point where my husband was interested in what I was taking. I recommend this product to everyone — a customized formula just for me was what made the difference.",
    highlight: "I felt like a different person",
    expandable: true,
  },
  {
    name: "Tammy S.",
    role: "55 year old female",
    image: "/Reviews/Tammy Silvernail Testimonial.jpg",
    rating: 5,
    text: "I had very low energy and hormone issues. I felt better than I've ever felt on the custom formula! 🤩",
    highlight: "better than I've ever felt",
    expandable: false,
  },
];

function TestimonialCard({ testimonial, index, revealed }: { testimonial: typeof testimonials[number]; index: number; revealed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const delayMs = 200 + index * 150;

  return (
    <div
      className={`bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-[#054700]/[0.04] transition-all duration-700 ease-out relative flex flex-col group ${
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: revealed ? `${delayMs}ms` : "0ms" }}
    >
      {/* Quote icon — grows on hover */}
      <Quote className="absolute top-6 right-6 w-8 h-8 text-[#054700]/[0.06] group-hover:text-[#054700]/10 transition-colors duration-300" />

      {/* Author — moved to top with larger photo */}
      <div className="flex items-center gap-4 mb-5">
        {testimonial.image ? (
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#054700]/[0.06] ring-offset-2"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#054700]/10 flex items-center justify-center">
            <span className="text-[#054700] font-medium">
              {testimonial.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
        )}
        <div>
          <div className="font-semibold text-[#054700]">{testimonial.name}</div>
          <div className="text-sm text-[#054700]/50">{testimonial.role}</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex gap-0.5 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-[#d4a843] text-[#d4a843]" />
        ))}
      </div>

      {/* Highlight callout */}
      <p className="text-lg font-medium text-[#054700] leading-snug mb-3 italic">
        "{testimonial.highlight}"
      </p>

      {/* Full text */}
      <div className="flex-1">
        <p
          className={`text-[#054700]/60 leading-relaxed text-[15px] mb-2 transition-all duration-300 ${
            testimonial.expandable && !expanded ? "line-clamp-3" : ""
          }`}
        >
          {testimonial.text}
        </p>
        {testimonial.expandable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#5a6623] hover:text-[#6b7528] transition-colors mb-2 cursor-pointer"
          >
            {expanded ? (
              <>Read less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TestimonialsSectionV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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
    <section ref={sectionRef} id="testimonials" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div
          className={`max-w-3xl mx-auto text-center mb-16 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            From Our Clinical Program
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl text-[#054700] font-light leading-tight text-balance">
            Real people.{" "}
            <span className="text-[#8a9a2c]">Real results.</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/60 leading-relaxed">
            With AI technology, we're bringing personalized supplement formulation directly to you—not just through select medical practitioners. What was once available only in high-end clinics is now accessible to everyone.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} revealed={revealed} />
          ))}
        </div>

        {/* Bottom stats — in a premium container */}
        <div
          className={`mt-16 transition-all duration-700 delay-500 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-[#054700] rounded-2xl py-10 px-8 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-light text-white">2,000+</div>
                <div className="text-sm text-white/50 mt-1">Clinical Patients</div>
              </div>
              <div className="sm:border-x sm:border-white/10">
                <div className="text-3xl md:text-4xl font-light text-white">8+ Years</div>
                <div className="text-sm text-white/50 mt-1">Practitioner Experience</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-light text-white">94%</div>
                <div className="text-sm text-white/50 mt-1">Report Improvement</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
