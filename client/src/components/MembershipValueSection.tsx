import { Brain, Pill, RefreshCw, FlaskConical, Tag } from "lucide-react";

const membershipFeatures = [
  {
    icon: Brain,
    title: "AI Health Consultations",
    description: "Unlimited conversations with our AI practitioner that analyzes your labs, wearables, and health history to give you personalized guidance.",
  },
  {
    icon: Pill,
    title: "Personalized Formula",
    description: "A supplement formula built from your data, not generic guesswork. Every ingredient chosen specifically for your body and goals.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Optimization",
    description: "As your labs and wearable data change, your formula adapts. Your health is dynamic and your supplements should be too.",
  },
  {
    icon: Tag,
    title: "Member Pricing on Supplements & Labs",
    description: "Access your custom supplements and diagnostic testing at exclusive member rates. No retail markups—just transparent, honest pricing.",
  },
];

export default function MembershipValueSection() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            What You Get
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            More than a supplement.{" "}
            <span className="font-medium">An ongoing system.</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            Your membership includes everything you need to optimize your supplementation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {membershipFeatures.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-[#FAF7F2] hover:bg-[#F5F0E8] transition-colors duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center group-hover:bg-[#1B4332] transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-[#1B4332] group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#1B4332] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#52796F] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom statement */}
        <div className="mt-16 text-center">
          <p className="text-xl md:text-2xl text-[#1B4332] font-light">
            One membership.{" "}
            <span className="font-medium text-[#52796F]">Supplements that actually make sense for you.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
