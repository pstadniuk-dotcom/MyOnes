import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

// Chat demo messages
const chatMessages = [
  { role: "assistant", text: "Hi! I'm your ONES health practitioner. What are your main health goals?" },
  { role: "user", text: "I want more energy and better focus throughout the day." },
  { role: "assistant", text: "Got it. Do you have any recent blood work I can analyze? And are you taking any medications?" },
  { role: "user", text: "Yes, I uploaded my labs. I take sertraline for anxiety." },
  { role: "assistant", text: "Perfect. Based on your labs, I see low magnesium and B12. I'm building a formula with Ashwagandha, Magnesium Glycinate, and L-Theanine - all safe with sertraline." },
];

export default function HeroSectionV2() {
  const [visibleMessages, setVisibleMessages] = useState(0);

  useEffect(() => {
    if (visibleMessages < chatMessages.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  return (
    <section className="relative min-h-[90vh] bg-[#FAF7F2] flex items-center overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left - Copy */}
          <div className="space-y-8 max-w-xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-[#1B4332]/5 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-[#1B4332] rounded-full animate-pulse" />
              <span className="text-sm text-[#1B4332] font-medium tracking-wide">
                AI-Powered Personalization
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-[#1B4332] leading-[1.1] tracking-tight">
              <span className="font-bold">One Supplement.</span>
              <br />
              <span className="font-light italic">Built for One Person.</span>
            </h1>
            
            <p className="text-xl text-[#52796F] leading-relaxed">
              One daily formula, built from your bloodwork, lifestyle, and goals. 
              No generic multivitamins. No guesswork. Just what your body actually needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="bg-[#1B4332] hover:bg-[#143728] text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-[#1B4332]/20 transition-all hover:shadow-xl hover:shadow-[#1B4332]/30 group"
                >
                  Start Your Formula
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/science">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332]/5 px-8 py-6 text-lg rounded-full"
                >
                  See the Science
                </Button>
              </Link>
            </div>
            
            {/* Mini Progression */}
            <div className="flex flex-wrap items-center gap-2 pt-4 text-sm">
              <span className="text-[#1B4332] font-medium">Consultation</span>
              <span className="text-[#1B4332]/40">→</span>
              <span className="text-[#1B4332] font-medium">Upload Labs</span>
              <span className="text-[#1B4332]/40">→</span>
              <span className="text-[#1B4332] font-medium">Your Capsule</span>
              <span className="text-[#1B4332]/40">→</span>
              <span className="text-[#1B4332] font-medium">Sync Wearables</span>
            </div>
          </div>
          
          {/* Right - AI Chat Demo */}
          <div className="relative lg:pl-8">
            <div className="bg-white rounded-3xl shadow-2xl shadow-[#1B4332]/10 overflow-hidden max-w-md mx-auto">
              {/* Chat Header */}
              <div className="bg-[#1B4332] px-6 py-4 flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src="/Ones Logo (2).svg" alt="ONES" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-white font-medium">ONES</h3>
                  <p className="text-white/60 text-sm">AI Health Practitioner</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/60 text-xs">Online</span>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="p-4 space-y-4 h-80 overflow-y-auto bg-[#FAF7F2]/50">
                {chatMessages.slice(0, visibleMessages).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div className={`flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      msg.role === 'assistant' ? 'w-8 h-8' : 'w-8 h-8 rounded-full'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <img src="/ones-logo-icon.svg" alt="ONES" className="w-full h-full object-contain" />
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'assistant' 
                        ? 'bg-white text-[#2D3436] rounded-tl-sm shadow-sm' 
                        : 'bg-[#1B4332] text-white rounded-tr-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {visibleMessages < chatMessages.length && (
                  <div className="flex gap-3 animate-in fade-in duration-300">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <img src="/ones-logo-icon.svg" alt="ONES" className="w-full h-full object-contain" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#52796F]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#52796F]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#52796F]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chat Input (decorative) */}
              <div className="p-4 border-t border-[#1B4332]/10 bg-white">
                <div className="flex items-center gap-3 bg-[#FAF7F2] rounded-full px-4 py-3">
                  <span className="text-[#52796F]/50 text-sm flex-1">Tell me about your health goals...</span>
                  <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
