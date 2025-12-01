import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Brain, 
  X, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  Microscope,
  Leaf
} from "lucide-react";
import ag1Image from "@assets/ag1_1760380986912.png";
import blueprintImage from "@assets/blueprint_1760380986912.webp";
import ritualImage from "@assets/Ritual_1760380986912.avif";
import huelImage from "@assets/Huel_1760380986912.png";

export default function ScienceSection() {
  const competitors = [
    {
      name: "AG1",
      formula: "Same greens powder for everyone",
      image: ag1Image
    },
    {
      name: "Blueprint",
      formula: "Bryan's exact 100-pill protocol for everyone",
      image: blueprintImage
    },
    {
      name: "Ritual",
      formula: "Same \"Essential\" whether you're 18 or 80",
      image: ritualImage
    },
    {
      name: "Huel",
      formula: "One formula, millions of bodies",
      image: huelImage
    }
  ];

  const audienceTypes = [
    { text: "22-year-old athletes & 65-year-olds with diabetes" },
    { text: "New moms & people on antidepressants" },
    { text: "Vegans with deficiencies & CEOs with stress" },
    { text: "Night shift workers & retirees with arthritis" }
  ];

  const competitorApproach = [
    "What's your age?",
    "Pick a health goal",
    "Here's formula #3 of 8",
    "Same thing forever",
    "Never asks about meds"
  ];

  const onesApproach = [
    "Tell me about YOUR health",
    "What medications?",
    "Builds YOUR formula",
    "200+ ingredients to choose from",
    "Evolves every refill"
  ];

  const sciencePoints = [
    {
      icon: FlaskConical,
      title: "200+ Clinical-Grade Ingredients",
      description: "Every ingredient in our catalog is backed by peer-reviewed research and sourced from trusted suppliers.",
    },
    {
      icon: ShieldCheck,
      title: "Third-Party Tested",
      description: "Each batch is independently tested for purity, potency, and safety before it reaches you.",
    },
    {
      icon: Microscope,
      title: "Biomarker-Driven Formulas",
      description: "Your formula is built from your actual blood work, not generic recommendations.",
    },
    {
      icon: Leaf,
      title: "Bioavailable Forms",
      description: "We use the most absorbable forms of each nutrient - like methylated B12 and chelated minerals.",
    },
  ];

  return (
    <section className="bg-[#FAF7F2]">
      {/* Hero */}
      <div className="bg-[#1B4332] py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            The Science
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl text-white font-light leading-tight">
            Why One Size{" "}
            <span className="font-semibold">Fits None</span>
          </h1>
          <p className="mt-6 text-xl text-[#95D5B2] max-w-2xl mx-auto">
            Different bodies. Different needs. Same bottle? That's the problem we're solving.
          </p>
        </div>
      </div>

      {/* The Same Formula Problem - Competitor Section */}
      <div className="py-20 md:py-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl text-[#1B4332] font-light">
              The Same Formula{" "}
              <span className="font-semibold">Problem</span>
            </h2>
            <p className="mt-4 text-lg text-[#52796F] max-w-2xl mx-auto">
              Major brands give identical formulas to completely different people.
            </p>
          </div>

          {/* Competitor Cards with Images */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {competitors.map((competitor, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                  <img
                    src={competitor.image}
                    alt={competitor.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-5 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 bg-red-400 rounded-full flex-shrink-0 mt-1.5" />
                    <div>
                      <h4 className="font-semibold text-[#1B4332] mb-1">{competitor.name}</h4>
                      <p className="text-sm text-[#52796F]">{competitor.formula}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Going to different audiences */}
          <div className="text-center mb-8">
            <span className="text-[#52796F] italic">All serving the same formula to:</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-12">
            {audienceTypes.map((audience, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-4 bg-white rounded-xl"
              >
                <Users className="w-5 h-5 text-[#52796F] flex-shrink-0" />
                <span className="text-[#52796F]">{audience.text}</span>
              </div>
            ))}
          </div>

          {/* Quote highlight */}
          <div className="text-center">
            <div className="inline-block bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-2xl px-10 py-6">
              <p className="text-xl md:text-2xl text-[#1B4332] font-light italic">
                "You wouldn't take someone else's prescription.{" "}
                <span className="font-semibold not-italic">Why take their vitamins?"</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The ONES Difference - Comparison */}
      <div className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl text-[#1B4332] font-light">
              The ONES{" "}
              <span className="font-semibold">Difference</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Them: 5-Question Quiz */}
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600">Them: 5-Question Quiz</h3>
              </div>

              <div className="space-y-4">
                {competitorApproach.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="text-gray-500">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ONES: AI Conversation */}
            <div className="bg-[#1B4332] rounded-2xl p-8 md:p-10">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#2D5A45] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">ONES: AI Conversation</h3>
              </div>

              <div className="space-y-4">
                {onesApproach.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#D4A574] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[#95D5B2]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat callout */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-4 bg-[#FAF7F2] rounded-full px-8 py-4">
              <span className="text-3xl font-bold text-[#D4A574]">42%</span>
              <span className="text-[#52796F]">of Americans take prescription meds. Most brands never ask.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Science Points */}
      <div className="py-20 md:py-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
              Our Standards
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl text-[#1B4332] font-light">
              Built on research.{" "}
              <span className="font-semibold">Backed by data.</span>
            </h2>
            <p className="mt-4 text-lg text-[#52796F] max-w-2xl mx-auto">
              We don't guess. Every formula is rooted in clinical science and personalized to your unique biochemistry.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {sciencePoints.map((point, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-white hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center group-hover:bg-[#1B4332] transition-colors duration-300">
                    <point.icon className="w-6 h-6 text-[#1B4332] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1B4332] mb-2">
                      {point.title}
                    </h3>
                    <p className="text-[#52796F] leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#1B4332] py-20">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl text-white font-light mb-6">
            Ready for{" "}
            <span className="font-semibold">Your Formula?</span>
          </h2>
          <p className="text-xl text-[#95D5B2] mb-10">
            Take a 3-minute consultation and discover what personalized nutrition can do for you.
          </p>
          <Link href="/auth">
            <Button
              size="lg"
              className="bg-[#D4A574] hover:bg-[#c4956a] text-white rounded-full px-10 py-6 text-lg shadow-lg group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
