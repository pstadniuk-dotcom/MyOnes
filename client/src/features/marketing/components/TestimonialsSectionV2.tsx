import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rick M.",
    role: "72 year old male",
    image: null,
    rating: 5,
    text: "I am an active older gentleman with a big family history of cancer. I wanted to be proactive about my health — issues that pushed me towards using your products were general inflammation, thin skin, thyroid, arthritis, and prostate. I like your unorthodox approach and since being on my formula I've noticed my overall energy levels are up. When I ran out of product I noticed a significant drop in my energy levels. No miracles at my age, but I do believe there is hope this can extend quality of life.",
    highlight: "my overall energy levels are up",
    expandable: true,
  },
  {
    name: "Leslie H.",
    role: "47 year old female",
    image: null,
    rating: 5,
    text: "I was suffering from fatigue and depression that interrupted my life. Within 1.5 months of being on my formula I felt like a different person. My energy levels were in sharp contrast to what I had before starting, to the point where my husband was interested in what I was taking. I recommend this product to everyone — a customized formula just for me was what made the difference.",
    highlight: "I felt like a different person",
    expandable: true,
  },
  {
    name: "Tammy S.",
    role: "55 year old female",
    image: null,
    rating: 5,
    text: "I had very low energy and hormone issues. I felt better than I've ever felt on the custom formula! 🤩",
    highlight: "better than I've ever felt",
    expandable: false,
  },
];

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 relative flex flex-col">
      {/* Quote icon */}
      <Quote className="absolute top-6 right-6 w-8 h-8 text-[#054700]/10" />

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <FlaskConical key={i} className="w-3.5 h-3.5 fill-[#5a6623]/20 text-[#5a6623]" />
        ))}
      </div>

      {/* Text */}
      <div className="flex-1">
        <p
          className={`text-[#054700]/80 leading-relaxed mb-2 transition-all duration-300 ${
            testimonial.expandable && !expanded ? "line-clamp-4" : ""
          }`}
        >
          "{testimonial.text}"
        </p>
        {testimonial.expandable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#5a6623] hover:text-[#6b7528] transition-colors mb-4 cursor-pointer"
          >
            {expanded ? (
              <>Read less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
        {!testimonial.expandable && <div className="mb-4" />}
      </div>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#054700]/10 mt-auto">
        <div className="w-10 h-10 rounded-full bg-[#054700]/10 flex items-center justify-center">
          <span className="text-[#054700] font-medium text-sm">
            {testimonial.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <div className="font-medium text-[#054700]">{testimonial.name}</div>
          <div className="text-sm text-[#054700]/60">{testimonial.role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSectionV2() {
  return (
    <section id="testimonials" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[#5a6623] font-medium tracking-wider text-sm uppercase">
            From Our Clinical Program
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#054700] font-light leading-tight">
            Real people.{" "}
<span className="font-medium">Real results.</span>
          </h2>
          <p className="mt-6 text-lg text-[#054700]/60 leading-relaxed">
            With AI technology, we're bringing personalized supplement formulation directly to you—not just through select medical practitioners. What was once available only in high-end clinics is now accessible to everyone.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#054700]">2,000+</div>
            <div className="text-sm text-[#054700]/60 mt-1">Clinical Patients</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#054700]">8+ Years</div>
            <div className="text-sm text-[#054700]/60 mt-1">Practitioner Experience</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#054700]">94%</div>
            <div className="text-sm text-[#054700]/60 mt-1">Report Improvement</div>
          </div>
        </div>
      </div>
    </section>
  );
}
