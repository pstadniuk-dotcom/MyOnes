import { useRef, useState, useEffect } from "react";

/**
 * Premium Ingredients — Split layout.
 * Capsule product hero on the left, ingredient image grid on the right.
 * Right-side images are prepped for actual ingredient photography (camu camu, etc).
 */

const allIngredients = [
  {
    name: "Turmeric",
    benefit: "Anti-inflammatory support",
    src: "/Ones%20LIfestyle%20Images/Ingredients/turmeric.png",
  },
  {
    name: "Spirulina",
    benefit: "Detox & immune defense",
    src: "/Ones%20LIfestyle%20Images/Ingredients/spirulina.png",
  },
  {
    name: "Ginger",
    benefit: "Digestion & circulation",
    src: "/Ones%20LIfestyle%20Images/Ingredients/ginger.png",
  },
  {
    name: "Camu Camu",
    benefit: "Vitamin C & antioxidants",
    src: "/Ones%20LIfestyle%20Images/Ingredients/camu%20camu.png",
  },
  {
    name: "Artichoke",
    benefit: "Liver & digestive health",
    src: "/Ones%20LIfestyle%20Images/Ingredients/artichoke.png",
  },
  {
    name: "Cinnamon",
    benefit: "Blood sugar balance",
    src: "/Ones%20LIfestyle%20Images/Ingredients/cinnamon.png",
  },
  {
    name: "Dandelion",
    benefit: "Detox & kidney support",
    src: "/Ones%20LIfestyle%20Images/Ingredients/dandelion.png",
  },
  {
    name: "Rosemary",
    benefit: "Cognitive & memory support",
    src: "/Ones%20LIfestyle%20Images/Ingredients/rosemary.png",
  },
];

const ROTATE_INTERVAL = 3500;

export default function LifestyleShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [rotateOffset, setRotateOffset] = useState(0);

  // Visible ingredients: 4 at a time, cycling through all 8
  const visibleIngredients = Array.from({ length: 4 }, (_, i) =>
    allIngredients[(rotateOffset + i) % allIngredients.length]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Rotate one ingredient at a time
  useEffect(() => {
    if (!revealed) return;
    const timer = setInterval(() => {
      setRotateOffset((prev) => (prev + 1) % allIngredients.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [revealed]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-white overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Overline + Headline */}
        <div
          className={`max-w-3xl mx-auto text-center mb-16 md:mb-20 transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#5a6623]/70">
            Designed for your life
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] text-[#054700] font-light leading-[1.08] tracking-[-0.02em]">
            Premium ingredients.{" "}
            <span className="text-[#8a9a2c]">Built for&nbsp;you.</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-[#054700]/50 leading-relaxed max-w-xl mx-auto font-light">
            Every capsule is manufactured fresh with clinical-grade,
            bioavailable ingredients — no fillers, no compromises.
          </p>
        </div>

        {/* Split layout: capsule hero left + ingredient grid right */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Left — Capsule product hero */}
          <div
            className={`relative rounded-2xl md:rounded-3xl overflow-hidden group min-h-[400px] lg:min-h-0 transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <img
              src="/Ones%20LIfestyle%20Images/16X9%20CAPSULES.png"
              alt="ONES personalized supplement capsules"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#054700]/50 via-transparent to-transparent" />

            {/* Floating glass badge */}
            <div className="absolute bottom-5 left-5 md:bottom-8 md:left-8 bg-white/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg">
              <span className="text-xs font-medium text-[#054700] tracking-wide">
                150+ Clinical-Grade Ingredients
              </span>
            </div>
          </div>

          {/* Right — 2×2 ingredient grid with rotation */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {visibleIngredients.map((ingredient, i) => {
              const delayMs = 200 + i * 100;
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl md:rounded-3xl overflow-hidden group aspect-square transition-all duration-700 ${
                    revealed
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-12"
                  }`}
                  style={{ transitionDelay: revealed ? `${delayMs}ms` : "0ms" }}
                >
                  {/* Crossfade: render all images, only active one is visible */}
                  {allIngredients.map((ing) => (
                    <img
                      key={ing.name}
                      src={ing.src}
                      alt={ing.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out group-hover:scale-[1.05] ${
                        ing.name === ingredient.name ? "opacity-100" : "opacity-0"
                      }`}
                      loading="lazy"
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                  {/* Label overlay with crossfade */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4
                      key={ingredient.name}
                      className="text-white font-medium text-sm md:text-base leading-tight animate-fade-in"
                    >
                      {ingredient.name}
                    </h4>
                    <p
                      key={ingredient.benefit}
                      className="text-white/60 text-xs mt-0.5 animate-fade-in"
                    >
                      {ingredient.benefit}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </section>
  );
}
