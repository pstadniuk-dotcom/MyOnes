import lifestyleHero from '@assets/_-vm7d01QWUK7rGJzTL0V_229160b5562c4456982ea531b93d3bac.png';

export default function LifestyleBannerV2() {
  return (
    <section className="relative w-full h-[50vh] md:h-[60vh] lg:h-[70vh] overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${lifestyleHero})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1B4332]/80 via-[#1B4332]/40 to-transparent" />
      
      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-light leading-tight mb-6">
              Join thousands optimizing their health with{" "}
              <span className="font-medium">personalized nutrition</span>
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              From busy professionals to elite athletes, people are discovering what their bodies truly need.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
