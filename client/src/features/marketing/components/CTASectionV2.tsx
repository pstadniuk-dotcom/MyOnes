import { Link } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTASectionV2() {
  // In production, this would come from the backend
  const spotsRemaining = 227;

  return (
    <section className="py-24 md:py-32 bg-[#1B4332] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4A574]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
        <h2 className="text-4xl md:text-5xl lg:text-6xl text-white font-light leading-tight">
          Stop guessing.{" "}
          <span className="font-medium text-[#D4A574]">Start optimizing.</span>
        </h2>
        
        <p className="mt-6 text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          Get a supplement formula built from your actual health data.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button 
              size="lg"
              className="bg-white text-[#1B4332] hover:bg-[#FAF7F2] px-10 py-6 text-lg rounded-full group"
            >
              Start Your Formula
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        
        <p className="mt-6 text-[#D4A574] font-medium">
          {spotsRemaining} founding member spots remaining
        </p>
      </div>
    </section>
  );
}
