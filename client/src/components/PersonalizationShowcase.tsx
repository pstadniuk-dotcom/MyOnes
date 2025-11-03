import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import marathonRunner from '@assets/stock_images/athletic_fit_woman_i_c0bf4c4a.jpg';
import pregnantWoman from '@assets/stock_images/pregnant_woman_in_he_051cc6af.jpg';
import seniorMan from '@assets/stock_images/senior_man_60s_healt_3c016037.jpg';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  delay: number;
}

interface Persona {
  name: string;
  age: number;
  title: string;
  image: string;
  chat: ChatMessage[];
}

const personas: Persona[] = [
  {
    name: 'Sarah',
    age: 35,
    title: 'Marathon Runner',
    image: marathonRunner,
    chat: [
      { role: 'ai', content: "Hi Sarah! I see you're training for marathons. How many miles are you running per week?", delay: 0 },
      { role: 'user', content: "About 50-60 miles weekly, with a long run on Sundays.", delay: 1500 },
      { role: 'ai', content: "That's impressive! Do you experience any joint pain or inflammation during or after runs?", delay: 3000 },
      { role: 'user', content: "Yes, my knees get sore after long runs, especially over 15 miles.", delay: 4500 },
      { role: 'ai', content: "Got it. I'll optimize your formula for joint support and recovery. Are you taking any supplements currently?", delay: 6000 },
      { role: 'user', content: "Just fish oil and a basic multivitamin.", delay: 7500 },
      { role: 'ai', content: "Perfect. I'll include Turmeric Extract, Omega-3, Magnesium for recovery, and Vitamin D for bone health - all in one capsule.", delay: 9000 }
    ]
  },
  {
    name: 'Emily',
    age: 27,
    title: 'Expecting Mother',
    image: pregnantWoman,
    chat: [
      { role: 'ai', content: "Hello Emily! Congratulations on your pregnancy. Which trimester are you in?", delay: 0 },
      { role: 'user', content: "Thank you! I'm 18 weeks - second trimester.", delay: 1500 },
      { role: 'ai', content: "Wonderful! Are you experiencing any nausea, fatigue, or specific symptoms?", delay: 3000 },
      { role: 'user', content: "The nausea has improved, but I'm dealing with fatigue and my iron was low at my last checkup.", delay: 4500 },
      { role: 'ai', content: "I see that in your uploaded lab results. Your iron is at 8 ng/mL. I'll prioritize iron supplementation along with folate and DHA.", delay: 6500 },
      { role: 'user', content: "That sounds perfect. Is it safe to combine everything?", delay: 8000 },
      { role: 'ai', content: "Absolutely. Your personalized formula will include prenatal-safe doses: Iron, Folate, DHA, B12, and Ginger Root for nausea support.", delay: 9500 }
    ]
  },
  {
    name: 'Robert',
    age: 67,
    title: 'Managing Multiple Medications',
    image: seniorMan,
    chat: [
      { role: 'ai', content: "Hi Robert! I see you're currently taking several medications. Can you list them for me?", delay: 0 },
      { role: 'user', content: "I take Lisinopril for blood pressure, Atorvastatin for cholesterol, and Metformin for blood sugar.", delay: 1500 },
      { role: 'ai', content: "Thank you. I'll check for any supplement interactions. Do you have any vitamin deficiencies we should address?", delay: 3500 },
      { role: 'user', content: "My doctor said my Vitamin D and B12 are low. I'm also concerned about bone health.", delay: 5000 },
      { role: 'ai', content: "I've cross-referenced your medications. I can safely include Vitamin D3, B12, Calcium, and CoQ10 - which helps with statin side effects.", delay: 7000 },
      { role: 'user', content: "Will this interfere with my prescriptions?", delay: 8500 },
      { role: 'ai', content: "No interactions detected. Your formula avoids Vitamin K (which can affect blood pressure meds) and includes only safe, complementary nutrients.", delay: 10000 }
    ]
  }
];

export default function PersonalizationShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const activePersona = personas[activeIndex];

  useEffect(() => {
    setVisibleMessages(0);
    setIsAnimating(true);
    
    const maxMessages = activePersona.chat.length;
    let messageIndex = 0;

    const showNextMessage = () => {
      if (messageIndex < maxMessages) {
        const timeout = setTimeout(() => {
          setVisibleMessages(messageIndex + 1);
          messageIndex++;
          if (messageIndex < maxMessages) {
            showNextMessage();
          } else {
            setIsAnimating(false);
          }
        }, activePersona.chat[messageIndex].delay);
        
        return () => clearTimeout(timeout);
      }
    };

    showNextMessage();
  }, [activeIndex]);

  const nextPersona = () => {
    setActiveIndex((prev) => (prev + 1) % personas.length);
  };

  const prevPersona = () => {
    setActiveIndex((prev) => (prev - 1 + personas.length) % personas.length);
  };

  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-2xl overflow-hidden border border-primary/10">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered Personalization</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold mb-3">
          One Formula.<br />Infinite Possibilities.
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Our AI analyzes your unique health profile, goals, and lab results to create a supplement formula that's 100% yours.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-8 p-6 md:p-12 items-center">
        {/* Left: Person Image */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
          <Card className="relative overflow-hidden border-primary/20">
            <div className="aspect-[3/4] relative overflow-hidden">
              <img 
                src={activePersona.image} 
                alt={activePersona.name}
                className="w-full h-full object-cover transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
              
              {/* Person Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="backdrop-blur-sm bg-background/80 rounded-xl p-4 border border-primary/20">
                  <h3 className="text-2xl font-semibold text-foreground">{activePersona.name}, {activePersona.age}</h3>
                  <p className="text-sm text-muted-foreground">{activePersona.title}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: AI Chat Window */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-2xl blur opacity-20"></div>
          <Card className="relative border-primary/20 bg-card/95 backdrop-blur-sm">
            <div className="p-6">
              {/* Chat Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Ones AI</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Analyzing your profile...
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4 py-6 min-h-[400px] max-h-[500px] overflow-y-auto">
                {activePersona.chat.slice(0, visibleMessages).map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'ai'
                          ? 'bg-primary/10 text-foreground border border-primary/20'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {isAnimating && visibleMessages < activePersona.chat.length && (
                  <div className="flex justify-start">
                    <div className="bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 pb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={prevPersona}
          className="rounded-full"
          data-testid="button-prev-persona"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Indicators */}
        <div className="flex gap-2">
          {personas.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-primary w-8' 
                  : 'bg-primary/30 hover:bg-primary/50'
              }`}
              data-testid={`indicator-${index}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextPersona}
          className="rounded-full"
          data-testid="button-next-persona"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
