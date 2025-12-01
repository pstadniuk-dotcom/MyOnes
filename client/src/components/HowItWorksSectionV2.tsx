import { MessageSquare, FlaskConical, Package, RefreshCcw } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Share Your Story",
    description: "Have a conversation with our AI health practitioner. Share your goals, health history, and upload your blood work.",
  },
  {
    number: "02",
    icon: FlaskConical,
    title: "We Analyze",
    description: "Our AI cross-references your data with clinical research to identify exactly what your body needs.",
  },
  {
    number: "03",
    icon: Package,
    title: "Your Formula Ships",
    description: "Receive your personalized supplement formula, made fresh and delivered monthly to your door.",
  },
  {
    number: "04",
    icon: RefreshCcw,
    title: "Adapt & Optimize",
    description: "As your health evolves, so does your formula. We adjust based on new labs and how you're feeling.",
  },
];

export default function HowItWorksSectionV2() {
  return (
    <section 
      id="how-it-works" 
      className="py-24 md:py-32 bg-[#1B4332] relative"
      style={{ 
        marginTop: "-1px", 
        paddingTop: "calc(6rem + 1px)",
        boxShadow: "0 -1px 0 #1B4332"
      }}
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl text-white font-light leading-tight">
            From conversation to custom formula
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            Four simple steps to supplements that actually work for your body.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white/10">
                  <Icon className="w-7 h-7 text-[#D4A574]" />
                </div>
                
                <h3 className="text-xl font-medium text-white mb-3">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-white/60">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
