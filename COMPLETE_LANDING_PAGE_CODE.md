# ONES AI Landing Page - Complete Code Extraction for Design Team

## Overview
This document provides **complete file paths and code summaries** for all 12 components that make up the ONES AI public-facing landing page at route `/`.

**Important Distinction:**
- **This Document**: Public landing page (`/`) - Marketing site visitors see BEFORE signing up
- **DashboardHome.tsx**: Dashboard home (`/dashboard`) - What logged-in users see

---

## ⚡ Quick Start for Design Team

**All landing page component files are located in:**
```
client/src/components/
```

**To access the complete code:**
1. Clone repository: `git clone https://github.com/pstadniuk-dotcom/MyOnes`
2. Navigate to: `cd MyOnes/client/src/components`
3. Open files listed below in your code editor

**Or** browse directly on GitHub:
`https://github.com/pstadniuk-dotcom/MyOnes/tree/main/client/src/components`

---

## 📋 Component Summary

| # | Component | File | Lines | Purpose |
|---|-----------|------|-------|---------|
| 1 | Header | `Header.tsx` | 212 | Sticky nav with logo, menu, auth buttons |
| 2 | HeroSection | `HeroSection.tsx` | 119 | Hero banner with headline + AI chat demo |
| 3 | ProblemSection | `ProblemSection.tsx` | 75 | Pain points (3 problem cards) |
| 4 | HowItWorksSection | `HowItWorksSection.tsx` | 141 | 4-step process explanation |
| 5 | ScienceSection | `ScienceSection.tsx` | 341 | Competitor comparison + science credentials |
| 6 | PersonalizationShowcase | `PersonalizationShowcase.tsx` | 359 | Interactive persona carousel (6 personas) |
| 7 | TestimonialsSection | `TestimonialsSection.tsx` | 175 | Customer testimonials + stats |
| 8 | PricingSection | `PricingSection.tsx` | 206 | 3 pricing tiers (3/6/12 months) |
| 9 | FAQSection | `FAQSection.tsx` | 107 | FAQ accordion (6 questions) |
| 10 | CTASection | `CTASection.tsx` | 147 | Final call-to-action with trust badges |
| 11 | Footer | `Footer.tsx` | 245 | Footer with newsletter + links |
| 12 | AIChat | `AIChat.tsx` | 399 | AI chat demo widget (used in HeroSection) |

**Total:** ~2,646 lines of React/TypeScript code

---

## 🗂️ Landing Page Assembly

**File:** `client/src/App.tsx`

```tsx
function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <ScienceSection />
        <div className="py-16">
          <PersonalizationShowcase />
        </div>
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// Route: /
<Route path="/" component={LandingPage} />
```

---

## 📦 Component Details

### 1. Header - Navigation
**File:** `client/src/components/Header.tsx` (212 lines)

**Features:**
- Sticky top navigation (stays on scroll)
- Logo: "Ones" (links to home)
- Desktop menu: How it Works | Personalization | Science | Testimonials | Pricing
- Auth buttons: Login / Start Consultation (or Dashboard if logged in)
- Admin button (if user.isAdmin)
- Mobile hamburger menu
- Smooth scroll to sections
- Backdrop blur effect

**Key Code:**
```tsx
<header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
  {/* Logo */}
  <h1 className="text-2xl font-serif font-bold text-primary">Ones</h1>
  
  {/* Desktop Nav - Smooth scroll to sections */}
  <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView()}>
    How it Works
  </button>
  
  {/* Auth Buttons */}
  {isAuthenticated ? <Dashboard Button> : <Login/Signup Buttons>}
</header>
```

**Dependencies:**
- `useAuth()` - Authentication context
- Lucide icons: `Menu`, `X`, `User`, `Shield`
- Wouter `Link` for navigation

---

### 2. HeroSection - Hero Banner
**File:** `client/src/components/HeroSection.tsx` (119 lines)

**Features:**
- Full viewport height
- Left side: Animated headline
  - "One capsule."
  - "Fully personalized."
  - "Always evolving." (shimmer effect)
- Subheadline: "Stop guessing with your health..."
- Large CTA button: "Start Your Free Consultation"
- Trust badges: Free consultation | No commitment | Personalized formula
- Animated data flow: Blood data → Wearables → Your capsule
- Right side: AIChat component
- Animated scroll indicator (hidden on scroll)

**Key Code:**
```tsx
<section className="min-h-screen bg-premium-gradient relative overflow-hidden">
  {/* Left: Headline */}
  <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold">
    <span className="block animate-fade-in">One capsule.</span>
    <span className="block animate-fade-in-shimmer">Always evolving.</span>
  </h1>
  
  {/* Right: AI Chat Demo */}
  <AIChat />
  
  {/* Scroll Indicator */}
  {showScrollIndicator && <div className="animate-bounce">...</div>}
</section>
```

**Animations:**
- `animate-fade-in` - Sequential fade-in with delays
- `animate-fade-in-shimmer` - Fade-in + shimmer gradient effect
- `animate-pulse` - Pulsing dots
- `animate-bounce` - Scroll indicator

**Assets:**
- Imports `heroImage` from `@assets/generated_images/Diverse_wellness_lifestyle_hero_a1825347.png` (not directly rendered)

---

### 3. ProblemSection - Problem Statement
**File:** `client/src/components/ProblemSection.tsx` (75 lines)

**Features:**
- Headline: "Your supplement cabinet is a mess of guesswork"
- 3 problem cards with icons
  1. "10-15 bottles with overlapping ingredients" (Boxes icon)
  2. "Generic formulas ignoring your unique biology" (Users icon)
  3. "No idea what's actually working" (Eye icon)
- Framer Motion animations (fade-in on scroll)
- Glass morphism card effects

**Key Code:**
```tsx
{problems.map((problem, index) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
  >
    <Card className="glass shadow-premium micro-bounce">
      <IconComponent className="w-8 h-8 text-primary" />
      <h3>{problem.title}</h3>
      <p>{problem.description}</p>
    </Card>
  </motion.div>
))}
```

**Dependencies:**
- Framer Motion for scroll animations
- Lucide icons: `Boxes`, `Users`, `Eye`

---

### 4. HowItWorksSection - Process Steps
**File:** `client/src/components/HowItWorksSection.tsx` (141 lines)

**Features:**
- Section ID: `how-it-works` (for smooth scroll)
- Headline: "How Ones Works"
- 4 interactive step cards:
  1. Chat with AI (MessageCircle icon)
  2. Upload blood tests - optional (Upload icon)
  3. Receive personalized formula (FlaskConical icon)
  4. Evolve with each refill (RotateCcw icon)
- Progress line connecting steps (desktop only)
- Hover to activate step (shows additional details)
- Active step gets ring + scale animation

**Key Code:**
```tsx
const [activeStep, setActiveStep] = useState(0);

{steps.map((step, index) => (
  <Card 
    className={activeStep === index ? 'ring-2 ring-primary scale-110' : ''}
    onMouseEnter={() => setActiveStep(index)}
  >
    <IconComponent className={activeStep === index ? 'scale-110' : ''} />
    <h3>{step.title}</h3>
    <p>{step.description}</p>
    {activeStep === index && <p className="border-t pt-4">{step.details}</p>}
  </Card>
))}
```

**Interactions:**
- Hover over card → activates step → shows extra details
- Progress dots update based on active step

---

### 5. ScienceSection - Science & Comparison
**File:** `client/src/components/ScienceSection.tsx` (341 lines)

**Features:**
- Section ID: `science` (for smooth scroll)
- Headline: "Why One Size Fits None"
- Competitor comparison cards (4 brands with images):
  - AG1, Blueprint, Ritual, Huel
- Audience type cards (4 diverse audiences)
- Problem statement card: "Different bodies. Different needs. Same bottle."
- Side-by-side comparison:
  - Left: "5-Question Quiz" (competitors)
  - Right: "AI Conversation" (Ones)
- Statistic card: "42% of Americans take prescription meds"
- Final quote: "You wouldn't take someone else's prescription. Why take their vitamins?"

**Key Code:**
```tsx
{/* Competitor Cards */}
{competitors.map(competitor => (
  <Card>
    <img src={competitor.image} alt={competitor.name} />
    <h4>{competitor.name}</h4>
    <p>{competitor.formula}</p>
  </Card>
))}

{/* Comparison Cards */}
<Card className="bg-muted"> {/* Competitor */}
  <AlertTriangle /> 5-Question Quiz
  {competitorApproach.map(item => <><X /> {item}</>)}
</Card>

<Card className="bg-primary/5"> {/* Ones */}
  <MessageSquare /> AI Conversation
  {onesApproach.map(item => <><Check /> {item}</>)}
</Card>
```

**Assets:**
- `ag1Image` - AG1 product image
- `blueprintImage` - Blueprint product image
- `ritualImage` - Ritual product image
- `huelImage` - Huel product image

**Dependencies:**
- Lucide icons: `Users`, `MessageSquare`, `Target`, `X`, `Check`, `AlertTriangle`

---

### 6. PersonalizationShowcase - Persona Carousel
**File:** `client/src/components/PersonalizationShowcase.tsx` (359 lines)

**Features:**
- Section ID: `personalization` (for smooth scroll)
- Headline: "One Formula. Infinite Possibilities."
- Interactive carousel with 6 personas:
  1. Marcus (34) - Tech Founder
  2. Jordan (41) - Ironman Triathlete
  3. Emily (28) - Pregnant (Second Trimester)
  4. Robert (67) - Managing Multiple Medications
  5. Lisa (42) - Perimenopause
  6. Maya (29) - Vegan Content Creator
- Each persona has:
  - Portrait image
  - Name, age, title
  - AI chat conversation (5 messages)
  - Typing indicator animation
- Left/right navigation buttons
- Dot indicators (clickable)
- Auto-animated chat messages with delays

**Key Code:**
```tsx
const [activeIndex, setActiveIndex] = useState(0);
const [visibleMessages, setVisibleMessages] = useState(0);

useEffect(() => {
  // Schedule all messages with cumulative delays
  activePersona.chat.forEach((message, index) => {
    setTimeout(() => {
      setVisibleMessages(index + 1);
    }, message.delay);
  });
}, [activeIndex]);

<div className="grid md:grid-cols-2 gap-8">
  {/* Left: Person Image */}
  <img src={activePersona.image} />
  
  {/* Right: AI Chat */}
  <Card>
    {activePersona.chat.slice(0, visibleMessages).map(message => (
      <div className={message.role === 'ai' ? 'bg-primary/10' : 'bg-primary'}>
        {message.content}
      </div>
    ))}
    {isAnimating && <div className="animate-bounce">...</div>}
  </Card>
</div>
```

**Assets (6 persona images):**
- `techFounder` - Marcus image
- `triathlete` - Jordan image
- `pregnantWoman` - Emily image
- `seniorMan` - Robert image
- `perimenopauseWoman` - Lisa image
- `veganWoman` - Maya image

---

### 7. TestimonialsSection - Customer Testimonials
**File:** `client/src/components/TestimonialsSection.tsx` (175 lines)

**Features:**
- Section ID: `testimonials` (for smooth scroll)
- Headline: "Real Results from Real People"
- 4 key statistics:
  - 87% - Report better energy within 30 days
  - 92% - Continue subscription after 6 months
  - 78% - See improvements in sleep quality
  - 1,000+ - Health journeys optimized
- 2 testimonial cards:
  - Sarah Chen (32) - Marketing Director
  - Michael Rodriguez (45) - Software Engineer
- Each testimonial includes:
  - Avatar image
  - 5-star rating
  - Quote
  - Results metrics with green badges
  - Timeframe badge
- Social proof footer:
  - Avatar stack (1,000+ members)
  - 4.9/5 average rating

**Key Code:**
```tsx
{/* Statistics Grid */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
  <div className="text-3xl md:text-4xl font-bold text-primary">87%</div>
  <p className="text-sm text-muted-foreground">Report better energy</p>
</div>

{/* Testimonial Cards */}
{testimonials.map(testimonial => (
  <Card className="hover-elevate cursor-pointer">
    <Avatar><AvatarImage src={testimonial.image} /></Avatar>
    <h3>{testimonial.name}, {testimonial.age}</h3>
    {/* 5 stars */}
    <blockquote>"{testimonial.quote}"</blockquote>
    {testimonial.results.map(result => (
      <div>
        <span>{result.metric}</span>
        <Badge className="bg-green-100">{result.improvement}</Badge>
      </div>
    ))}
  </Card>
))}
```

**Assets:**
- `testimonialWoman` - Female testimonial headshot
- `testimonialMan` - Male testimonial headshot

---

### 8. PricingSection - Pricing Tiers
**File:** `client/src/components/PricingSection.tsx` (206 lines)

**Features:**
- Section ID: `pricing` (for smooth scroll)
- Headline: "Choose Your Health Journey"
- Included features badges (free shipping, made in USA, etc.)
- 3 pricing plans:
  1. **Starter** - 3 months - $495 ($165/month)
  2. **6 Month Supply** - 6 months - $875 ($146/month) - **MOST POPULAR** (saves $115)
  3. **12 Month Supply** - 12 months - $1,590 ($133/month) - (saves $390)
- Each plan card has:
  - Popular badge (middle plan)
  - Savings badge
  - Feature list with checkmarks
  - CTA button
- Selected plan gets ring + shadow
- Click to select, hover to highlight
- Bottom CTA: "Get Free Consultation First"

**Key Code:**
```tsx
const [selectedPlan, setSelectedPlan] = useState(1); // Middle plan default

{plans.map((plan, index) => (
  <Card 
    className={`
      ${selectedPlan === index ? 'ring-2 ring-primary scale-105' : ''}
      ${plan.popular ? 'border-2 border-primary' : ''}
    `}
    onClick={() => setSelectedPlan(index)}
  >
    {plan.popular && <Badge><Star /> Most Popular</Badge>}
    {plan.savings && <Badge className="bg-green-100">{plan.savings}</Badge>}
    
    <h3>{plan.name}</h3>
    <div className="text-4xl font-bold">${plan.price}</div>
    <p className="text-sm">${plan.monthlyPrice}/month</p>
    
    {plan.features.map(feature => (
      <div><Check className="text-green-500" /> {feature}</div>
    ))}
    
    <Button variant={plan.popular ? 'default' : 'outline'}>
      {plan.cta}
    </Button>
  </Card>
))}
```

**Interactions:**
- Click card → selects plan → shows ring
- Popular plan has primary border
- Savings badges on longer plans

---

### 9. FAQSection - FAQ Accordion
**File:** `client/src/components/FAQSection.tsx` (107 lines)

**Features:**
- Headline: "Frequently Asked Questions"
- 6 FAQ items (accordion):
  1. How is this different from other personalized vitamins?
  2. What if I'm taking medications?
  3. Can I see what's in my formula before ordering?
  4. How do orders work?
  5. What if I don't see results?
  6. Are your supplements third-party tested?
- First FAQ open by default
- Click to toggle open/close
- ChevronDown/ChevronUp icon
- Contact support CTA at bottom

**Key Code:**
```tsx
const [openFAQ, setOpenFAQ] = useState<number | null>(0); // First open

{faqs.map((faq, index) => (
  <Card className="hover-elevate">
    <button onClick={() => setOpenFAQ(openFAQ === index ? null : index)}>
      <h3>{faq.question}</h3>
      {openFAQ === index ? <ChevronUp /> : <ChevronDown />}
    </button>
    
    {openFAQ === index && (
      <div className="border-t pt-4">
        <p>{faq.answer}</p>
      </div>
    )}
  </Card>
))}

{/* Contact Support */}
<div className="text-center">
  <h3>Still have questions?</h3>
  <button>Contact our support team →</button>
</div>
```

**Interactions:**
- Click question → toggles answer visibility
- Only one answer visible at a time

---

### 10. CTASection - Final Call-to-Action
**File:** `client/src/components/CTASection.tsx` (147 lines)

**Features:**
- Headline: "Your health is unique. Your supplements should be too."
- Subheadline: "Join thousands who've transformed their health..."
- 2 CTA buttons:
  1. "Start Your Consultation" (primary)
  2. "Learn More About Our Process" (outline)
- Trust badges (free consultation, free shipping, custom-made)
- 3 trust badge cards:
  - Third-party tested (Award icon)
  - Made in USA (MapPin icon)
  - Quality Assured (Shield icon)
- Gradient background with blur effects

**Key Code:**
```tsx
<section className="py-20 bg-earthy-gradient relative overflow-hidden">
  {/* Background Pattern */}
  <div className="absolute inset-0 opacity-10">
    <div className="w-32 h-32 bg-primary rounded-full blur-3xl"></div>
  </div>
  
  <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif">
    Your health is unique.
    <span className="text-primary">Your supplements should be too.</span>
  </h2>
  
  <Button size="lg" className="px-8 py-4 text-lg">
    Start Your Consultation
  </Button>
  
  {/* Trust Badges */}
  {trustBadges.map(badge => (
    <Card className="bg-background/80 backdrop-blur-sm">
      <IconComponent className="text-primary" />
      <h3>{badge.title}</h3>
      <p>{badge.description}</p>
    </Card>
  ))}
</section>
```

**Dependencies:**
- Lucide icons: `Shield`, `Award`, `MapPin`

---

### 11. Footer - Footer Links
**File:** `client/src/components/Footer.tsx` (245 lines)

**Features:**
- Brand section with logo and tagline
- Newsletter signup form (email input + subscribe button)
- 4 link columns:
  - **Product**: How it Works, Science, Pricing
  - **Company**: About Us, Blog, Careers, Press
  - **Support**: Help Center, Contact Us, Shipping
  - **Legal**: Privacy, Terms, Refund Policy, Disclaimer
- Smooth scroll for section links (How it Works, Science, etc.)
- Newsletter API integration (`POST /api/newsletter/subscribe`)
- Bottom section:
  - Copyright: "© 2025 Ones. All rights reserved."
  - Social proof: "1,000+ optimizing their health"
  - Trust badges: 3rd party tested, Made in USA

**Key Code:**
```tsx
const [email, setEmail] = useState('');

const handleEmailSubmit = async (e) => {
  e.preventDefault();
  await apiRequest('POST', '/api/newsletter/subscribe', { email });
  toast({ title: "Subscribed!" });
  setEmail('');
};

<footer className="bg-background border-t">
  {/* Brand + Newsletter */}
  <h2 className="text-2xl font-serif font-bold text-primary">Ones</h2>
  <form onSubmit={handleEmailSubmit}>
    <Input type="email" placeholder="Enter your email" value={email} />
    <Button type="submit">Subscribe</Button>
  </form>
  
  {/* 4 Link Columns */}
  {Object.entries(footerLinks).map(([category, links]) => (
    <div>
      <h3>{category}</h3>
      <ul>
        {links.map(link => (
          link.isSection ? 
            <button onClick={() => scrollToSection(link.href)} /> :
            <Link href={link.href} />
        ))}
      </ul>
    </div>
  ))}
  
  {/* Bottom */}
  <p>© 2025 Ones. All rights reserved.</p>
</footer>
```

**Dependencies:**
- `apiRequest()` - API helper
- `useToast()` - Toast notifications
- Wouter `Link` for routing

---

### 12. AIChat - AI Demo Widget
**File:** `client/src/components/AIChat.tsx` (399 lines)

**Features:**
- Used in HeroSection (right side of hero)
- AI chat demo widget (does NOT call real API on landing page)
- Features:
  - Chat messages (AI and user)
  - Text input with send button
  - Voice input button (Web Speech API)
  - Typing indicator (animated dots)
  - Formula visualization (if AI returns formula)
  - Saves message to localStorage → redirects to /signup
- Voice recording:
  - Click mic → starts recording
  - Shows "[Speaking...]" indicator
  - Click send → stops recording + redirects
- Initial AI message: "Let's build your perfect supplement..."

**Key Code:**
```tsx
const [messages, setMessages] = useState([{
  content: "Let's build your perfect supplement. Tell me about yourself...",
  sender: 'ai',
  timestamp: new Date()
}]);
const [inputValue, setInputValue] = useState('');
const [isListening, setIsListening] = useState(false);

const handleSendMessage = async () => {
  // Save to localStorage and redirect to signup
  localStorage.setItem('preAuthMessage', inputValue);
  setLocation('/signup');
};

const handleVoiceInput = () => {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onresult = (event) => {
    let transcript = event.results[index][0].transcript;
    setInputValue(prev => prev + transcript + ' [Speaking...]');
  };
  
  recognition.start();
  setIsListening(true);
};

<Card className="w-full max-w-md h-[500px] glass">
  {/* Header */}
  <h3>Ones AI</h3>
  <p>Your health consultant</p>
  
  {/* Messages */}
  {messages.map(message => (
    <div className={message.sender === 'user' ? 'bg-primary' : 'bg-muted'}>
      {message.content}
      {message.formula && <FormulaVisualization />}
    </div>
  ))}
  
  {isTyping && <div className="animate-bounce">...</div>}
  
  {/* Input */}
  <Input value={inputValue} onChange={...} onKeyPress={...} />
  <Button onClick={handleVoiceInput} className={isListening ? 'animate-pulse bg-red-500' : ''}>
    {isListening ? <MicOff /> : <Mic />}
  </Button>
  <Button onClick={handleSendMessage}><Send /></Button>
</Card>
```

**Dependencies:**
- Web Speech API (`SpeechRecognition`)
- `useLocation()` - Wouter navigation
- `useToast()` - Error notifications
- Lucide icons: `Send`, `Mic`, `MicOff`, `User`, `AlertTriangle`, `CheckCircle`

---

## 🎨 Assets Reference

All images are located in `attached_assets/` or `attached_assets/generated_images/`:

### HeroSection
- `Diverse_wellness_lifestyle_hero_a1825347.png` (imported but not directly used in JSX)

### ScienceSection
- `ag1_1760387996934.jpg` - AG1 product
- `blueprint_1760380986912.webp` - Blueprint product
- `Ritual_1760380986912.avif` - Ritual product
- `Huel_1760380986912.png` - Huel product

### PersonalizationShowcase (6 persona images)
- `pstad_34-year-old_tech_founder_--stylize_50_--v_7_5025fbd0-a43a-41b1-baad-11d6e6551719_3_1762187852224.png` - Marcus
- `pstad_41-year-old_triathlete_training_for_Ironman_--stylize_5_e6168110-f9ee-4e01-9beb-50344db0ecaf_3_1762188020759.png` - Jordan
- `pstad_28_year_old_pregnant_woman_--stylize_50_--v_7_9b49bd6d-18e2-40ec-b1ec-00ed13aad376_3_1762188075768.png` - Emily
- `pstad_retiree_with_arthritis_--stylize_50_--v_7_c97ff5c7-490a-4a2e-91d3-6aa2d97a61d3_1_1762188154463.png` - Robert
- `pstad_42_year_old_woman_--stylize_50_--v_7_d80049cc-ef52-4362-9a12-b5ef3771637a_1_1762189445790.png` - Lisa
- `pstad_29-year-old_vegan_content_creator_--stylize_50_--v_7_4fd1d9eb-5ea5-4bd1-9071-138a045d963f_1_1762198616065.png` - Maya

### TestimonialsSection
- `Customer_testimonial_woman_headshot_83cadbc6.png` - Sarah Chen
- `Customer_testimonial_man_headshot_e6097c8b.png` - Michael Rodriguez

---

## 🎨 Design System Summary

### Color Tokens (from Tailwind theme)
```css
--primary: Brand color (warm gold/bronze tone)
--secondary: Accent color
--foreground: Main text color
--muted-foreground: Secondary/subtle text
--background: Page background
--card: Card background
--border: Default border color
--accent: Accent color for highlights
```

### Typography Scale
```css
text-6xl: 3.75rem (60px)  /* Hero headline */
text-5xl: 3rem (48px)      /* Section headlines */
text-4xl: 2.25rem (36px)   /* Card headlines */
text-3xl: 1.875rem (30px)  /* Subheadings */
text-2xl: 1.5rem (24px)    /* Card titles */
text-xl: 1.25rem (20px)    /* Large body */
text-base: 1rem (16px)     /* Body text */
text-sm: 0.875rem (14px)   /* Small text */
text-xs: 0.75rem (12px)    /* Micro text */
```

### Font Weights
```css
font-bold: 700       /* Headlines */
font-semibold: 600   /* Subheadings */
font-medium: 500     /* Emphasis */
font-normal: 400     /* Body text */
```

### Spacing System
```css
space-y-6: 1.5rem (24px)  /* Section spacing */
gap-8: 2rem (32px)        /* Grid gaps */
gap-4: 1rem (16px)        /* Small gaps */
p-8: 2rem (32px)          /* Card padding */
p-6: 1.5rem (24px)        /* Medium padding */
py-20: 5rem (80px)        /* Section vertical padding */
```

### Custom Animations (from `client/src/index.css`)

```css
/* Fade-in animation for hero text */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}

/* Silver shimmer animation */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.animate-shimmer {
  background: linear-gradient(90deg, ...);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s ease-in-out infinite;
}

/* Fade-in with shimmer (hero third line) */
@keyframes fade-in-shimmer {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-shimmer {
  animation: fade-in-shimmer 0.8s ease-out forwards, 
             shimmer 12s ease-in-out infinite 0.8s;
}

/* Hover elevation system */
.hover-elevate:hover::after {
  background-color: var(--elevate-1);  /* Subtle brightness overlay */
}

/* Micro-interactions */
.micro-bounce:hover {
  transform: translateY(-1px);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.micro-glow:hover {
  box-shadow: 
    0 0 20px rgba(145, 95, 65, 0.06),
    0 10px 15px -3px rgba(0, 0, 0, 0.04);
}

/* Glass morphism */
.glass {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

### Custom Gradient Backgrounds
```css
.bg-premium-gradient {
  background: linear-gradient(135deg, 
    hsl(var(--background)) 0%, 
    hsl(var(--card)) 50%, 
    hsl(var(--background)) 100%);
}

.bg-earthy-gradient {
  background: linear-gradient(to bottom, 
    hsl(var(--background)) 0%, 
    hsl(var(--card)) 100%);
}
```

---

## 📝 For Design Team

### ✅ What You CAN Change

**Visual Design:**
- All colors, gradients, backgrounds
- Typography (fonts, sizes, weights, line-heights)
- Spacing (margins, padding, gaps)
- Border radius, shadows, effects
- Animations and transitions
- Card layouts and designs
- Button styles and states
- Icon choices (can swap Lucide or use custom)
- Image placements and treatments
- Grid layouts and responsive breakpoints

**Content:**
- Headlines and copy
- Feature lists
- Testimonial content
- FAQ questions/answers
- Pricing plans and features
- Trust badges and social proof

### ⚠️ What Should STAY THE SAME

**Technical Structure:**
- Component architecture (React components)
- Props and data flow
- State management patterns
- Routing configuration
- API integrations (Newsletter, etc.)
- Authentication logic
- Data types and interfaces
- Test IDs (`data-testid` attributes)

**Functional Elements:**
- Smooth scroll navigation
- Section anchors (`id="how-it-works"`, etc.)
- Form submissions (newsletter)
- Voice recording functionality
- Accordion interactions
- Carousel navigation
- Hover/click behaviors (maintain interactivity)

**Dependencies:**
- React, TypeScript
- Wouter (routing)
- shadcn/ui components
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

---

## 🚀 Recommended Design Workflow

1. **Review Current Code**
   - Clone repo and explore all 12 component files
   - Test the live landing page on local dev server
   - Document current user flows and interactions

2. **Create Design Mockups**
   - Design new visuals in Figma/Sketch
   - Maintain component structure (Header, Hero, Problem, etc.)
   - Keep section IDs for smooth scroll navigation
   - Design responsive layouts (mobile, tablet, desktop)

3. **Update Styling**
   - Modify Tailwind classes in components
   - Update `tailwind.config.ts` for custom colors/fonts
   - Add custom CSS in `index.css` for special effects
   - Test accessibility (contrast, focus states, keyboard nav)

4. **Replace Assets**
   - Swap placeholder images with final assets
   - Optimize images (WebP, lazy loading)
   - Update alt text for accessibility

5. **Test & Iterate**
   - Test on all breakpoints (mobile, tablet, desktop)
   - Verify all interactions still work
   - Check smooth scroll navigation
   - Test voice recording in AIChat
   - Validate newsletter signup

6. **Deploy**
   - Push changes to GitHub
   - Vercel auto-deploys frontend
   - Railway auto-deploys backend

---

## 📊 Component Breakdown by Complexity

**Simple (Easy to redesign):**
- ProblemSection (3 cards)
- FAQSection (accordion)
- CTASection (headline + buttons)

**Medium (Moderate complexity):**
- Header (nav + mobile menu)
- HowItWorksSection (4 steps + hover)
- TestimonialsSection (cards + stats)
- PricingSection (3 tiers + selection)
- Footer (links + newsletter)

**Complex (Careful redesign needed):**
- HeroSection (animations + AIChat integration)
- ScienceSection (many sub-sections + comparisons)
- PersonalizationShowcase (carousel + animated chat)
- AIChat (voice recording + localStorage + routing)

---

## 🔗 File Locations Quick Reference

```
MyOnes/
├── client/src/
│   ├── App.tsx                          # LandingPage assembly
│   ├── components/
│   │   ├── Header.tsx                   # 1. Navigation
│   │   ├── HeroSection.tsx              # 2. Hero banner
│   │   ├── ProblemSection.tsx           # 3. Pain points
│   │   ├── HowItWorksSection.tsx        # 4. Process
│   │   ├── ScienceSection.tsx           # 5. Comparison
│   │   ├── PersonalizationShowcase.tsx  # 6. Personas
│   │   ├── TestimonialsSection.tsx      # 7. Social proof
│   │   ├── PricingSection.tsx           # 8. Pricing
│   │   ├── FAQSection.tsx               # 9. FAQ
│   │   ├── CTASection.tsx               # 10. Final CTA
│   │   ├── Footer.tsx                   # 11. Footer
│   │   └── AIChat.tsx                   # 12. Chat widget
│   ├── index.css                        # Custom animations
│   └── pages/
│       └── DashboardHome.tsx            # DIFFERENT (logged-in dashboard)
└── attached_assets/
    └── generated_images/                # All image assets
```

---

## 💡 Design Team Next Steps

1. **Access Code:**
   - Clone: `git clone https://github.com/pstadniuk-dotcom/MyOnes`
   - Or browse on GitHub

2. **Run Locally:**
   ```bash
   cd MyOnes
   npm install
   npm run dev
   ```
   Navigate to `http://localhost:5000`

3. **Identify Priority Components:**
   - Which sections need redesign first?
   - Which can stay mostly unchanged?

4. **Create Design System:**
   - New color palette
   - Typography scale
   - Component library (buttons, cards, etc.)
   - Spacing/layout grid

5. **Iterate & Implement:**
   - Update components one at a time
   - Test each change
   - Maintain functionality

---

## 📞 Questions?

If you need clarification on any component's code or functionality, refer to the file directly in:
```
client/src/components/[ComponentName].tsx
```

Or reach out with specific questions about:
- Component interactions
- Data flow
- Animation details
- Responsive behavior
- Accessibility considerations

---

**Document Created:** November 25, 2025
**For:** Design Team - Landing Page Redesign
**Complete Code:** 12 components, ~2,646 lines total


