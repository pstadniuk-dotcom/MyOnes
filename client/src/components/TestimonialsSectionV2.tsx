import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Marketing Director",
    image: null,
    rating: 5,
    text: "I was skeptical at first, but after uploading my blood work and chatting with the AI, I got a formula that actually addressed my low iron and vitamin D. Three months in, my energy is completely different.",
    highlight: "my energy is completely different",
  },
  {
    name: "James K.",
    role: "Software Engineer",
    image: null,
    rating: 5,
    text: "The fact that it considers my medications and adjusts accordingly gives me peace of mind. No more worrying about interactions. Plus, my brain fog has cleared up significantly.",
    highlight: "brain fog has cleared up",
  },
  {
    name: "Maria L.",
    role: "Fitness Trainer",
    image: null,
    rating: 5,
    text: "I've tried dozens of supplement stacks over the years. ONES is the first one that's actually personalized to MY body. Recovery time has improved and I sleep so much better.",
    highlight: "personalized to MY body",
  },
];

export default function TestimonialsSectionV2() {
  return (
    <section id="testimonials" className="py-24 md:py-32 bg-[#FAF7F2]">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            From Our Clinical Program
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Real people.{" "}
<span className="font-medium">Real results.</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            With AI technology, we're bringing personalized supplement formulation directly to you—not just through select medical practitioners. What was once available only in high-end clinics is now accessible to everyone.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-[#1B4332]/10" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D4A574] text-[#D4A574]" />
                ))}
              </div>

              {/* Text */}
              <p className="text-[#2D3436] leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#1B4332]/10">
                <div className="w-10 h-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                  <span className="text-[#1B4332] font-medium text-sm">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-[#1B4332]">{testimonial.name}</div>
                  <div className="text-sm text-[#52796F]">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#1B4332]">2,000+</div>
            <div className="text-sm text-[#52796F] mt-1">Clinical Patients</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#1B4332]">8+ Years</div>
            <div className="text-sm text-[#52796F] mt-1">Practitioner Experience</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-[#1B4332]">94%</div>
            <div className="text-sm text-[#52796F] mt-1">Report Improvement</div>
          </div>
        </div>
      </div>
    </section>
  );
}
