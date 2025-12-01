import { Pill, FlaskConical, ShieldAlert, DollarSign } from "lucide-react";

const problems = [
  {
    icon: Pill,
    title: "Generic Multivitamins",
    description: "One-size-fits-all supplements ignore your unique biochemistry, genetics, and lifestyle.",
  },
  {
    icon: FlaskConical,
    title: "Guesswork & Trends",
    description: "Choosing supplements based on marketing hype instead of your actual bloodwork and health data.",
  },
  {
    icon: ShieldAlert,
    title: "Interaction Risks",
    description: "Taking multiple supplements without knowing how they interact with your medications.",
  },
  {
    icon: DollarSign,
    title: "Wasted Money",
    description: "Spending hundreds on supplements your body doesn't need or can't absorb properly.",
  },
];

export default function ProblemSectionV2() {
  return (
    <section className="py-24 md:py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            The Problem
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-[#1B4332] font-light leading-tight">
            Your supplements should be as{" "}
<span className="font-medium">unique as you are</span>
          </h2>
          <p className="mt-6 text-lg text-[#52796F] leading-relaxed">
            95% of people take supplements that aren't right for their body. Here's why the traditional approach fails.
          </p>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-[#FAF7F2] hover:bg-[#F5F0E8] transition-colors duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center group-hover:bg-[#1B4332] transition-colors duration-300">
                  <problem.icon className="w-6 h-6 text-[#1B4332] group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#1B4332] mb-2">
                    {problem.title}
                  </h3>
                  <p className="text-[#52796F] leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom statement */}
        <div className="mt-16 text-center">
          <p className="text-2xl md:text-3xl text-[#1B4332] font-light">
            There's a better way.{" "}
<span className="font-medium text-[#52796F]">A personal way.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
