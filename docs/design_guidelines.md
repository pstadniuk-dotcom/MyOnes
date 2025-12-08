# ONES - Personalized AI Supplement Platform Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from health-tech leaders like Headspace, Calm, and modern wellness platforms. This conversational AI platform requires a trustworthy, clean aesthetic that balances medical credibility with approachable personalization.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 168 76% 42% (Deep teal-green for trust and health)
- Secondary: 220 14% 96% (Clean light gray backgrounds)
- Accent: 45 86% 67% (Warm amber for CTAs, used sparingly)
- Text: 220 14% 15% (Near-black for readability)

**Dark Mode:**
- Primary: 168 65% 55% (Lighter teal for contrast)
- Secondary: 220 14% 12% (Dark background)
- Accent: 45 75% 60% (Muted amber)
- Text: 220 14% 85% (Light gray text)

### Typography
- **Primary**: Inter (Google Fonts) - Clean, medical-grade readability
- **Accent**: Poppins (Google Fonts) - Friendly headings and CTAs
- Hierarchy: text-4xl/3xl for heroes, text-lg for body, text-sm for metadata

### Layout System
**Tailwind Spacing Units**: Primarily 4, 6, 8, 12, 16
- Consistent p-6, m-8 patterns
- Large sections use py-16, px-8
- Form elements standardized to p-4, gap-6

### Component Library
**Conversational Interface:**
- Chat bubbles with subtle shadows and rounded-xl borders
- AI responses in primary color containers
- User messages in secondary gray containers
- Typing indicators with animated dots

**Health Data Cards:**
- Rounded-lg cards with subtle border and shadow
- Progress indicators using primary color fills
- Supplement recommendations in grid layouts

**Forms & Inputs:**
- Rounded borders with focus states in primary color
- Large, accessible touch targets (min-height: 48px)
- Clear validation states using semantic colors

**Navigation:**
- Clean sidebar with health iconography
- Sticky header with user health summary
- Breadcrumb navigation for supplement journey

### Images
**Hero Section**: Large, calming hero image featuring diverse people in wellness settings (yoga, healthy eating, supplements). Place prominently on landing page.

**Supplement Cards**: Product photography with clean white backgrounds, consistent lighting and angles.

**Trust Indicators**: Professional headshots of nutritionists/doctors, certification badges, lab imagery for credibility.

**Background Elements**: Subtle gradient overlays (168 76% 95% to 168 30% 98%) for section separation.

### Key Interactions
- Smooth chat message animations (slide-up, no bounce)
- Gentle hover states on cards (subtle shadow increase)
- Progress animations for health assessments
- Minimal, purposeful micro-interactions only

### Accessibility
- High contrast ratios maintained in both modes
- Focus indicators clearly visible
- Screen reader friendly chat interface
- Large, clear fonts throughout

This design creates a trustworthy, medical-grade feel while maintaining approachability for daily health conversations and supplement recommendations.