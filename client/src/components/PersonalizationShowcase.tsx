import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import techFounder from '@assets/pstad_34-year-old_tech_founder_--stylize_50_--v_7_5025fbd0-a43a-41b1-baad-11d6e6551719_3_1762187852224.png';
import triathlete from '@assets/pstad_41-year-old_triathlete_training_for_Ironman_--stylize_5_e6168110-f9ee-4e01-9beb-50344db0ecaf_3_1762188020759.png';
import pregnantWoman from '@assets/pstad_28_year_old_pregnant_woman_--stylize_50_--v_7_9b49bd6d-18e2-40ec-b1ec-00ed13aad376_3_1762188075768.png';
import seniorMan from '@assets/pstad_retiree_with_arthritis_--stylize_50_--v_7_c97ff5c7-490a-4a2e-91d3-6aa2d97a61d3_1_1762188154463.png';
import perimenopauseWoman from '@assets/pstad_42_year_old_woman_--stylize_50_--v_7_d80049cc-ef52-4362-9a12-b5ef3771637a_1_1762189445790.png';
import veganWoman from '@assets/pstad_29-year-old_vegan_content_creator_--stylize_50_--v_7_4fd1d9eb-5ea5-4bd1-9071-138a045d963f_1_1762198616065.png';

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
    name: 'Marcus',
    age: 34,
    title: 'Tech Founder',
    image: techFounder,
    chat: [
      { role: 'ai', content: "Hi Marcus! What are your main health goals right now?", delay: 0 },
      { role: 'user', content: "I need to optimize energy and focus during 12-hour workdays, plus improve my sleep quality.", delay: 1500 },
      { role: 'ai', content: "Got it. Are you currently taking any supplements or medications?", delay: 3000 },
      { role: 'user', content: "Just caffeine pills and melatonin. I also track everything with my Oura ring.", delay: 4500 },
      { role: 'ai', content: "Perfect! I can see low magnesium and suboptimal vitamin levels in your uploaded labs. Let me design a formula to optimize your cognitive performance, sustained energy, and sleep quality...", delay: 6500 }
    ]
  },
  {
    name: 'Jordan',
    age: 41,
    title: 'Ironman Triathlete',
    image: triathlete,
    chat: [
      { role: 'ai', content: "Hi Jordan! I see you're training for an Ironman. How's your body holding up?", delay: 0 },
      { role: 'user', content: "Training 15-20 hours a week. My knees are taking a beating and recovery is getting slower.", delay: 1500 },
      { role: 'ai', content: "That's intense! Any inflammation or muscle cramping during or after workouts?", delay: 3000 },
      { role: 'user', content: "Yes, knee inflammation after long runs, and my calves cramp during night swims.", delay: 4500 },
      { role: 'ai', content: "I'm seeing the pattern. Let me create a performance formula targeting joint recovery, inflammation reduction, and muscle repair specifically for your Ironman training demands...", delay: 6500 }
    ]
  },
  {
    name: 'Emily',
    age: 28,
    title: 'Second Trimester',
    image: pregnantWoman,
    chat: [
      { role: 'ai', content: "Hello Emily! Congratulations on your pregnancy. Which trimester are you in?", delay: 0 },
      { role: 'user', content: "Thank you! I'm 18 weeks - second trimester.", delay: 1500 },
      { role: 'ai', content: "Wonderful! Are you experiencing any symptoms like nausea, fatigue, or specific concerns?", delay: 3000 },
      { role: 'user', content: "The nausea comes and goes, and I'm tired a lot. My OB said my iron is borderline low.", delay: 4500 },
      { role: 'ai', content: "I can see your lab results showing the low iron. Let me create a pregnancy-safe formula addressing your nausea, energy levels, and supporting healthy fetal development...", delay: 6500 }
    ]
  },
  {
    name: 'Robert',
    age: 67,
    title: 'Managing Multiple Medications',
    image: seniorMan,
    chat: [
      { role: 'ai', content: "Hi Robert! I see you're on several medications. Can you list them for me?", delay: 0 },
      { role: 'user', content: "Lisinopril for blood pressure, Atorvastatin for cholesterol, and Metformin for blood sugar.", delay: 1500 },
      { role: 'ai', content: "Thank you. Any specific health concerns besides managing these conditions?", delay: 3000 },
      { role: 'user', content: "My magnesium is low, and I'm concerned about heart health and bone density.", delay: 4500 },
      { role: 'ai', content: "Perfect. I'm cross-referencing your medications for interactions and creating a safe formula optimized for cardiovascular health, bone density, and addressing your low magnesium...", delay: 6500 }
    ]
  },
  {
    name: 'Lisa',
    age: 42,
    title: 'Perimenopause',
    image: perimenopauseWoman,
    chat: [
      { role: 'ai', content: "Hi Lisa! What symptoms are you experiencing?", delay: 0 },
      { role: 'user', content: "Hot flashes, mood swings, terrible sleep, and I'm exhausted all the time. I think it's perimenopause.", delay: 1500 },
      { role: 'ai', content: "Those are classic perimenopause symptoms. Have you had any recent hormone testing or bloodwork?", delay: 3000 },
      { role: 'user', content: "Yes, I uploaded my labs. My estrogen is fluctuating and cortisol is high.", delay: 4500 },
      { role: 'ai', content: "I can see your hormone panel. Let me design a formula to support hormonal balance, reduce your elevated cortisol, improve sleep quality, and manage those perimenopause symptoms...", delay: 6500 }
    ]
  },
  {
    name: 'Maya',
    age: 29,
    title: 'Vegan Content Creator',
    image: veganWoman,
    chat: [
      { role: 'ai', content: "Hi Maya! Tell me about your diet and lifestyle.", delay: 0 },
      { role: 'user', content: "I've been vegan for 5 years, very active, but I'm worried about nutrient gaps. I feel tired often.", delay: 1500 },
      { role: 'ai', content: "That's a valid concern. Have you had bloodwork done recently to check your levels?", delay: 3000 },
      { role: 'user', content: "Yes, I just uploaded my labs. My B12 is low and iron is borderline.", delay: 4500 },
      { role: 'ai', content: "Perfect, I can see your results. Let me analyze your blood work and start formulating a personalized supplement plan specifically for your vegan lifestyle and nutritional gaps...", delay: 7000 }
    ]
  }
];

export default function PersonalizationShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const activePersona = personas[activeIndex];

  useEffect(() => {
    // Reset state
    setVisibleMessages(0);
    setIsAnimating(true);
    
    const timeouts: NodeJS.Timeout[] = [];
    const maxMessages = activePersona.chat.length;
    
    // Schedule all messages with cumulative delays
    activePersona.chat.forEach((message, index) => {
      const timeout = setTimeout(() => {
        setVisibleMessages(index + 1);
        if (index === maxMessages - 1) {
          setIsAnimating(false);
        }
      }, message.delay);
      
      timeouts.push(timeout);
    });

    // Cleanup: clear all timeouts if persona changes
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [activeIndex, activePersona]);

  const nextPersona = () => {
    setActiveIndex((prev) => (prev + 1) % personas.length);
  };

  const prevPersona = () => {
    setActiveIndex((prev) => (prev - 1 + personas.length) % personas.length);
  };

  return (
    <div className="w-full bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center py-8 px-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full mb-4">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent dark:from-background dark:via-background/50 dark:to-transparent"></div>
                  
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                      AI
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
                  <div key={`chat-${activeIndex}`} className="space-y-4 py-6 min-h-[400px] max-h-[500px] overflow-y-auto transition-opacity duration-300">
                    {activePersona.chat.slice(0, visibleMessages).map((message, index) => (
                      <div
                        key={`${activeIndex}-${index}`}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
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
      </div>
    </div>
  );
}
