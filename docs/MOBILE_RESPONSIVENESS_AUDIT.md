# ONES AI Mobile Responsiveness Audit & Redesign Specification

**Version:** 2.0  
**Date:** December 2024  
**Scope:** Complete mobile UX overhaul for ONES health optimization platform
**Status:** IMPLEMENTATION IN PROGRESS ✅

---

## Implementation Progress

### ✅ COMPLETED (Phase 1-5)
- [x] Safe-area CSS utilities in `index.css`
- [x] MobileBottomNav component created
- [x] MobileHeader component created  
- [x] DashboardLayout updated for mobile/desktop branching
- [x] WorkoutSchedule horizontal scroll carousel
- [x] SetLogger mobile 2-column grid layout
- [x] MobileScrollableTabs component for 7-day selectors
- [x] NutritionPlanTab mobile scrollable day tabs
- [x] HydrationTracker larger touch targets
- [x] ResponsiveDialog component (Dialog → Sheet on mobile)
- [x] AIChat mobile input improvements
- [x] ConsultationPage mobile header/input
- [x] OptimizePage responsive padding
- [x] Accessibility CSS utilities (reduced motion, focus states)
- [x] Touch feedback animations
- [x] Font-size 16px on mobile inputs (prevents iOS zoom)

### Files Modified
- `client/src/index.css` - Mobile utilities & accessibility
- `client/src/components/DashboardLayout.tsx` - Mobile layout
- `client/src/components/mobile/MobileBottomNav.tsx` - NEW
- `client/src/components/mobile/MobileHeader.tsx` - NEW
- `client/src/components/mobile/MobileScrollableTabs.tsx` - NEW
- `client/src/components/mobile/ResponsiveDialog.tsx` - NEW
- `client/src/components/mobile/index.ts` - Barrel exports
- `client/src/components/optimize/workout/WorkoutSchedule.tsx`
- `client/src/components/optimize/workout/SetLogger.tsx`
- `client/src/components/optimize/NutritionPlanTab.tsx`
- `client/src/components/optimize/nutrition/HydrationTracker.tsx`
- `client/src/components/AIChat.tsx`
- `client/src/pages/ConsultationPage.tsx`
- `client/src/pages/OptimizePage.tsx`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Mobile Design System](#3-mobile-design-system)
4. [Component-Level Fixes](#4-component-level-fixes)
5. [Mobile Navigation System](#5-mobile-navigation-system)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Executive Summary

### Overview
The ONES AI application currently has partial mobile support through Tailwind's responsive utilities and a sidebar component that converts to a Sheet on mobile. However, systematic mobile-first design is missing, resulting in usability issues on devices < 768px.

### Key Issues Identified
1. **Navigation:** Desktop sidebar-based navigation is not optimized for thumb zones
2. **Layout Overflow:** Many grids don't collapse properly below `md` breakpoint
3. **Touch Targets:** Buttons and interactive elements often < 44px (iOS HIG minimum)
4. **Modal Sizing:** Dialogs don't respect safe areas or viewport constraints
5. **Typography:** Heading hierarchy not scaled for mobile viewports
6. **Forms:** Input fields and multi-step forms require horizontal scrolling
7. **Charts/Visualizations:** Not responsive, overflow on small screens

### Goals
- 100% usable on iPhone SE (375px) through iPad Pro (1024px)
- Native-feeling interactions with proper touch feedback
- Thumb-zone optimized navigation
- Consistent spacing and typography across all breakpoints

---

## 2. Current State Audit

### 2.1 Global Layout Issues

#### DashboardLayout.tsx
```tsx
// CURRENT: Sidebar always visible on desktop, Sheet on mobile
// ISSUES:
// - Header h-16 takes valuable vertical space on mobile
// - p-6 padding too large for mobile (24px wastes space)
// - No safe-area-inset handling for notched devices
// - SidebarTrigger positioned for desktop, not thumb-accessible
```

**Problems:**
- Main content `p-6` (24px) too much padding on mobile
- Header layout `justify-between` leaves dead center space
- No `safe-area-inset-*` for iPhone X+ notches
- No bottom navigation alternative to sidebar

#### App.tsx Routes
- All routes wrapped in `DashboardLayout` which assumes desktop-first
- No mobile-specific route layouts
- No Suspense boundaries for code splitting

### 2.2 Page-by-Page Audit

#### Dashboard Home (DashboardHome.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Grid overflow | High | `grid-cols-3` doesn't collapse to `grid-cols-1` on mobile |
| Card padding | Medium | Cards have `p-6` even on mobile |
| Typography | Medium | `text-3xl` headings too large for mobile |
| Progress bars | Low | Small progress bars hard to interact with |

**Current Code Issues:**
```tsx
// Line 106: Grid doesn't collapse properly
<div className="grid gap-4 md:grid-cols-3">
// Should be: "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
```

#### Optimize Page (OptimizePage.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Tab overflow | Critical | TabsList `grid-cols-2 md:grid-cols-3` clips content |
| Tab content | High | Nested tabs create scroll-within-scroll |
| Reminder card | Medium | `flex-wrap` doesn't wrap soon enough |
| Container width | Medium | `max-w-7xl` too wide for calculation |

**Current Code Issues:**
```tsx
// Line 211: TabsList needs horizontal scroll on mobile
<TabsList className="h-auto w-full rounded-xl border bg-muted/20 p-1 grid grid-cols-2 md:grid-cols-3 gap-1">
// Should be scrollable horizontal container
```

#### Workout Schedule (WorkoutSchedule.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| 7-column grid | Critical | `grid-cols-1 md:grid-cols-7` - cards too cramped |
| Card content | High | Exercise badges overflow on narrow cards |
| Rest day cards | Medium | Inconsistent height with workout cards |

**Fix Required:**
```tsx
// Current: grid-cols-1 md:grid-cols-7 - need swipeable cards on mobile
// Recommend: Horizontal scroll with snap points or vertical stack
```

#### Set Logger (SetLogger.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Input row overflow | Critical | 4 inputs + label on one row overflows |
| Input width | High | `w-20`, `w-16` fixed widths don't scale |
| Target display | Medium | Target info pushed off-screen |

**Current Code:**
```tsx
// Line 40-70: All inputs in one flex row
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3">
// Needs complete redesign for mobile: stacked layout with inline labels
```

#### Nutrition Plan Tab (NutritionPlanTab.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Day tabs | Critical | 7 horizontal tabs overflow viewport |
| Meal cards | High | 3-column macro display overflows |
| Recipe modal | Medium | Modal content not scrollable |
| Grocery list | Medium | Checkboxes too small for touch |

#### Streak/Heatmap Cards
| Issue | Severity | Description |
|-------|----------|-------------|
| Heatmap cells | High | `w-5 h-5` cells too small for touch/visibility |
| Week labels | Medium | Labels overlap on narrow screens |
| Category grid | Medium | `grid-cols-2` clips content |

#### Hydration Tracker (HydrationTracker.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Quick-add grid | Medium | `grid-cols-4` buttons cramped on mobile |
| Custom amount | Low | Stepper controls too small |

#### Supplement Tracker (SupplementTracker.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Dose grid | Medium | `grid-cols-3` cramped on iPhone SE |
| Hover card | High | HoverCard not touch-friendly |
| Badge positioning | Low | Badges overlap on small screens |

#### Profile Page (ProfilePage.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Form layout | High | `grid-cols-2` forms don't collapse |
| Tab labels | Medium | Long tab labels truncate poorly |
| Input density | Medium | Too many inputs visible at once |

#### Grocery List Modal (GroceryListModal.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Modal width | High | `sm:max-w-[500px]` - full width needed on mobile |
| Scroll area | Medium | `h-[50vh]` doesn't account for keyboard |
| Footer buttons | Medium | Buttons cramped with counts |

#### AI Chat Component (AIChat.tsx)
| Issue | Severity | Description |
|-------|----------|-------------|
| Fixed height | Medium | `h-[500px]` doesn't adapt to viewport |
| Input area | Medium | Voice button overlaps send button |
| Message bubbles | Low | `max-w-[80%]` could be wider on mobile |

### 2.3 UI Component Library Issues

#### Tabs (tabs.tsx)
- No overflow handling
- Fixed `h-10` doesn't adapt
- No scroll-snap for horizontal overflow

#### Dialog (dialog.tsx)
- `max-w-2xl` too wide for mobile
- No `max-h-[100dvh]` for dynamic viewport
- Close button position conflicts with notch

#### Sheet (sheet.tsx)
- Width `w-3/4` could be fuller on mobile
- No gesture support for swipe-to-close

#### Button (button.tsx)
- ✅ Touch targets already improved (`min-h-9`, `min-h-11`)
- Consider larger default for mobile-only views

---

## 3. Mobile Design System

### 3.1 Breakpoint Strategy

```typescript
// tailwind.config.ts - add custom mobile breakpoints
export default {
  theme: {
    screens: {
      'xs': '375px',    // iPhone SE, small phones
      'sm': '640px',    // Large phones landscape
      'md': '768px',    // Tablets portrait
      'lg': '1024px',   // Tablets landscape, small laptops
      'xl': '1280px',   // Desktops
      '2xl': '1536px',  // Large desktops
    },
  },
}
```

### 3.2 Spacing Scale for Mobile

```css
/* Mobile-first spacing utilities */
:root {
  /* Base spacing - mobile */
  --spacing-page-x: 1rem;      /* 16px horizontal page padding */
  --spacing-page-y: 0.75rem;   /* 12px vertical page padding */
  --spacing-card: 0.75rem;     /* 12px card padding */
  --spacing-section: 1rem;     /* 16px between sections */
  --spacing-item: 0.5rem;      /* 8px between list items */
}

@media (min-width: 640px) {
  :root {
    --spacing-page-x: 1.5rem;  /* 24px */
    --spacing-page-y: 1rem;    /* 16px */
    --spacing-card: 1rem;      /* 16px */
    --spacing-section: 1.5rem; /* 24px */
  }
}

@media (min-width: 768px) {
  :root {
    --spacing-page-x: 1.5rem;  /* 24px */
    --spacing-page-y: 1.5rem;  /* 24px */
    --spacing-card: 1.5rem;    /* 24px */
    --spacing-section: 2rem;   /* 32px */
  }
}
```

### 3.3 Typography Scale for Mobile

```tsx
// Recommended type scale
const mobileTypeScale = {
  // Display - used sparingly
  'display': 'text-2xl sm:text-3xl md:text-4xl font-bold',
  
  // Page titles
  'h1': 'text-xl sm:text-2xl md:text-3xl font-semibold',
  
  // Section titles
  'h2': 'text-lg sm:text-xl md:text-2xl font-semibold',
  
  // Card titles
  'h3': 'text-base sm:text-lg font-semibold',
  
  // Subsection titles
  'h4': 'text-sm sm:text-base font-medium',
  
  // Body text
  'body': 'text-sm sm:text-base',
  
  // Secondary text
  'body-sm': 'text-xs sm:text-sm',
  
  // Captions/labels
  'caption': 'text-[10px] sm:text-xs',
}
```

### 3.4 Touch Target Guidelines

Following Apple HIG (44pt minimum) and Material Design (48dp recommended):

```tsx
// Minimum touch targets
const touchTargets = {
  // Primary actions (buttons, links)
  primary: 'min-h-11 min-w-11', // 44px
  
  // Secondary actions (icon buttons)
  secondary: 'min-h-10 min-w-10', // 40px
  
  // Inline actions (within lists)
  inline: 'min-h-9 min-w-9', // 36px
  
  // Spacing between targets
  gap: 'gap-2', // 8px minimum
}
```

### 3.5 Safe Area Handling

```tsx
// Add to index.css
@layer utilities {
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-left {
    padding-left: env(safe-area-inset-left);
  }
  .safe-right {
    padding-right: env(safe-area-inset-right);
  }
  .safe-x {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  .safe-y {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-all {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
}
```

### 3.6 Container Widths

```tsx
// Standard container classes
const containers = {
  // Full-width sections (landing page)
  full: 'w-full',
  
  // Main content areas
  content: 'w-full max-w-6xl mx-auto',
  
  // Narrow content (forms, modals)
  narrow: 'w-full max-w-lg mx-auto',
  
  // Mobile horizontal padding
  padded: 'px-4 sm:px-6 lg:px-8',
}
```

### 3.7 Gesture Support Patterns

```tsx
// Swipe gestures for common patterns
const gesturePatterns = {
  // Horizontal scroll with snap
  horizontalScroll: 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide',
  snapItem: 'snap-start scroll-ml-4 flex-shrink-0',
  
  // Pull to refresh (via library)
  pullRefresh: 'overscroll-contain',
  
  // Swipe to dismiss (Sheet component)
  swipeDismiss: 'touch-pan-y',
}
```

---

## 4. Component-Level Fixes

### 4.1 DashboardLayout.tsx - Mobile Overhaul

```tsx
// NEW: MobileDashboardLayout.tsx
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { MobileHeader } from '@/components/mobile/MobileHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#FAF7F2]">
        {/* Compact mobile header */}
        <MobileHeader />
        
        {/* Main content with safe areas */}
        <main className="flex-1 overflow-auto pb-20 safe-x">
          <div className="px-4 py-3">
            {children}
          </div>
        </main>
        
        {/* Bottom navigation - thumb zone */}
        <MobileBottomNav />
      </div>
    );
  }
  
  // Desktop layout unchanged
  return (
    <SidebarProvider defaultOpen={true}>
      {/* ... existing desktop layout ... */}
    </SidebarProvider>
  );
}
```

### 4.2 MobileBottomNav.tsx - New Component

```tsx
// client/src/components/mobile/MobileBottomNav.tsx
import { Home, Sparkles, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/optimize', icon: Sparkles, label: 'Optimize' },
  { href: '/dashboard/optimize/tracking', icon: ClipboardList, label: 'Log' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#1B4332]/10 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== '/dashboard' && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors",
                  "active:scale-95 active:bg-[#1B4332]/10",
                  isActive 
                    ? "text-[#1B4332]" 
                    : "text-[#52796F]"
                )}
              >
                <item.icon className={cn(
                  "h-6 w-6 mb-0.5",
                  isActive && "stroke-[2.5]"
                )} />
                <span className={cn(
                  "text-[10px]",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 4.3 MobileHeader.tsx - New Component

```tsx
// client/src/components/mobile/MobileHeader.tsx
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#1B4332]/10 safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5 text-[#1B4332]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <AppSidebar />
          </SheetContent>
        </Sheet>
        
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-1">
          <img src="/ones-logo-icon.svg" alt="" className="h-7 w-7" />
          <span className="font-semibold text-[#1B4332]">ONES</span>
        </Link>
        
        {/* Notifications */}
        <NotificationsDropdown />
      </div>
    </header>
  );
}
```

### 4.4 WorkoutSchedule.tsx - Mobile Carousel

```tsx
// Updated WorkoutSchedule component
export function WorkoutSchedule({ plan, onWorkoutClick, workoutLogs = [] }: WorkoutScheduleProps) {
  const weekPlan = plan?.content?.weekPlan || [];
  const weekDates = getWeekDates();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Horizontal scrollable cards */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
          {weekPlan.map((day: any, index: number) => {
            const dayDate = weekDates[index];
            const isCurrentDay = isToday(dayDate);
            const isCompleted = isWorkoutCompleted(dayDate, workoutLogs);
            
            return (
              <div
                key={index}
                className="snap-start flex-shrink-0 w-[280px]"
              >
                <Card 
                  className={cn(
                    "cursor-pointer active:scale-[0.98] transition-all h-full",
                    day.isRestDay ? "opacity-70 bg-muted/50" : "border-l-4 border-l-primary",
                    isCurrentDay && "ring-2 ring-primary ring-offset-2",
                    isCompleted && !day.isRestDay && "bg-green-50/50 border-l-green-500"
                  )}
                  onClick={() => !day.isRestDay && onWorkoutClick(day, index)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={cn(
                          "font-semibold",
                          isCurrentDay && "text-primary"
                        )}>
                          {day.dayName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(dayDate, 'MMM d')}
                        </span>
                      </div>
                      {isCompleted && !day.isRestDay && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {day.isRestDay ? (
                      <Badge variant="outline">Rest Day</Badge>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-medium">{day.workout?.name}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {day.workout?.durationMinutes}m
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {day.workout?.exercises?.length} exercises
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        
        {/* Scroll indicator dots */}
        <div className="flex justify-center gap-1.5">
          {weekPlan.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i === 0 ? "bg-[#1B4332]" : "bg-[#1B4332]/20"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop: existing grid layout
  return (
    <div className="grid grid-cols-7 gap-4">
      {/* ... existing desktop code ... */}
    </div>
  );
}
```

### 4.5 SetLogger.tsx - Mobile Redesign

```tsx
// Completely redesigned for mobile
export function SetLogger({ setNumber, targetReps, targetWeight, onUpdate, initialData }: SetLoggerProps) {
  const [completed, setCompleted] = useState(initialData?.completed ?? false);
  const [reps, setReps] = useState(initialData?.reps ?? targetReps);
  const [weight, setWeight] = useState(initialData?.weight ?? targetWeight ?? 0);
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
    )}>
      {/* Header row: Set number + checkbox */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id={`set-${setNumber}`}
            checked={completed}
            onCheckedChange={(checked) => {
              setCompleted(checked === true);
              onUpdate({ completed: checked === true, reps, weight });
            }}
            className="h-6 w-6"
          />
          <Label htmlFor={`set-${setNumber}`} className="text-base font-semibold">
            Set {setNumber}
          </Label>
        </div>
        
        {completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>
      
      {/* Target display */}
      {targetReps && (
        <p className="text-xs text-muted-foreground mb-3">
          Target: {targetWeight ? `${targetWeight} lbs × ` : ''}{targetReps} reps
        </p>
      )}
      
      {/* Input grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Weight (lbs)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="5"
            value={weight}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setWeight(val);
              onUpdate({ completed, reps, weight: val });
            }}
            className="h-12 text-lg text-center font-semibold"
            disabled={!completed}
          />
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Reps</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={reps}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setReps(val);
              onUpdate({ completed, reps: val, weight });
            }}
            className="h-12 text-lg text-center font-semibold"
            disabled={!completed}
          />
        </div>
      </div>
    </div>
  );
}
```

### 4.6 Tabs Component - Scrollable Variant

```tsx
// client/src/components/ui/tabs.tsx - add scrollable variant
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    scrollable?: boolean;
  }
>(({ className, scrollable, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      scrollable && "flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
      className
    )}
    {...props}
  />
))

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2",
      "text-sm font-medium ring-offset-background transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      "min-h-10 min-w-[80px] flex-shrink-0 snap-start", // Mobile touch targets
      className
    )}
    {...props}
  />
))
```

### 4.7 NutritionPlanTab - Day Selector Mobile

```tsx
// Mobile-friendly day selector
function MobileDaySelector({ weekTabs, activeDay, setActiveDay }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to active day
  useEffect(() => {
    const activeElement = scrollRef.current?.querySelector(`[data-day="${activeDay}"]`);
    activeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeDay]);
  
  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 -mx-4 px-4 scrollbar-hide"
    >
      {weekTabs.map((tab) => (
        <button
          key={tab.value}
          data-day={tab.value}
          onClick={() => setActiveDay(tab.value)}
          className={cn(
            "snap-start flex-shrink-0 flex flex-col items-center p-3 rounded-xl min-w-[64px]",
            "transition-all active:scale-95",
            activeDay === tab.value
              ? "bg-[#1B4332] text-white"
              : "bg-white border border-[#1B4332]/10 text-[#1B4332]"
          )}
        >
          <span className="text-xs font-medium">{tab.tabLabel}</span>
          <span className={cn(
            "text-lg font-bold",
            activeDay === tab.value ? "text-white" : "text-[#1B4332]"
          )}>
            {tab.dateLabel.split(' ')[1]}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### 4.8 Dialog - Mobile Full-Screen Variant

```tsx
// Update dialog.tsx for mobile
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { 
    fullScreenOnMobile?: boolean;
  }
>(({ className, children, fullScreenOnMobile, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col bg-background shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        fullScreenOnMobile
          ? [
              // Mobile: full screen with safe areas
              "inset-0 rounded-none",
              "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
              "sm:max-w-lg sm:max-h-[90vh] sm:rounded-lg sm:border",
            ]
          : [
              // Default: centered modal
              "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
              "w-[calc(100%-2rem)] max-w-lg max-h-[90vh] rounded-lg border",
            ],
        className
      )}
      {...props}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 safe-top safe-bottom">
        {children}
      </div>
      <DialogPrimitive.Close className="absolute right-3 top-3 sm:right-4 sm:top-4 h-10 w-10 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

### 4.9 StreakConsistencyCard - Mobile Optimized

```tsx
// Mobile-optimized streak card
export function StreakConsistencyCard({ data, trackingPrefs }: StreakConsistencyCardProps) {
  const isMobile = useIsMobile();
  
  return (
    <Card className="border-[#1B4332]/10">
      <CardHeader className="pb-2 px-4">
        {/* ... header ... */}
      </CardHeader>
      
      <CardContent className="px-4 space-y-4">
        {/* Weekly Progress - more compact on mobile */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-[#1B4332]/5 to-[#52796F]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1B4332]">This Week</span>
            <span className="text-base font-bold text-[#1B4332]">
              {activeDays}/{weekDays} days
            </span>
          </div>
          <Progress value={(activeDays / weekDays) * 100} className="h-2" />
        </div>

        {/* Category Streaks - horizontal scroll on mobile */}
        {isMobile ? (
          <div className="flex overflow-x-auto snap-x gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {enabledCategories.map((cat) => (
              <CategoryStreakChip key={cat.key} cat={cat} streak={data[cat.key]} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {enabledCategories.map((cat) => (
              <CategoryStreakCard key={cat.key} cat={cat} streak={data[cat.key]} />
            ))}
          </div>
        )}

        {/* Weekly Mini Heatmap - larger touch targets */}
        <div className="pt-2 border-t border-[#1B4332]/10">
          <div className="flex gap-1.5">
            {last7Days.map((day, i) => (
              <div key={i} className="flex-1 text-center">
                <p className="text-[10px] text-[#52796F] mb-1">{day.dayName}</p>
                <button
                  className={cn(
                    "w-full aspect-square rounded-lg flex items-center justify-center",
                    "min-h-[44px] active:scale-95 transition-transform",
                    getScoreColor(day.dailyScore ?? null)
                  )}
                  onClick={() => {/* Show day detail */}}
                >
                  <span className={cn(
                    "text-xs font-semibold",
                    getScoreTextColor(day.dailyScore ?? null)
                  )}>
                    {day.dayNum}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.10 HydrationTracker - Mobile Touch Optimized

```tsx
export function HydrationTracker({ currentOz = 0, goalOz = 100, onUpdate }: HydrationTrackerProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50">
      <CardHeader className="pb-2 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Hydration
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 space-y-4">
        {/* Progress ring - more visual on mobile */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e0e7ff"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#3b82f6"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${percentage * 3.52} 352`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{currentOz}</span>
              <span className="text-xs text-muted-foreground">/ {goalOz} oz</span>
            </div>
          </div>
        </div>

        {/* Quick add buttons - larger for touch */}
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ADD_OPTIONS.map((option) => (
            <Button
              key={option.oz}
              variant="outline"
              onClick={() => logWater.mutate(option.oz)}
              disabled={logWater.isPending}
              className="h-14 flex flex-col gap-1 bg-white hover:bg-blue-50 border-blue-200"
            >
              <GlassWater className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">{option.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.11 GroceryListModal - Mobile Sheet

```tsx
// Convert to bottom sheet on mobile
export function GroceryListModal({ open, onOpenChange }: GroceryListModalProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-green-600" />
              Grocery List
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <GroceryListContent groceryList={groceryList} onToggle={handleToggleItem} />
          </div>
          
          <SheetFooter className="px-4 py-3 border-t safe-bottom">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-muted-foreground">
                {groceryList?.items.filter(i => i.checked).length}/{groceryList?.items.length} items
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
  
  // Desktop: existing dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ... existing dialog content ... */}
    </Dialog>
  );
}
```

### 4.12 Chart Components - Responsive Containers

```tsx
// WorkoutAnalytics.tsx - Responsive charts
<Card>
  <CardHeader className="px-4 sm:px-6">
    <CardTitle className="text-base sm:text-lg">Volume Progression</CardTitle>
  </CardHeader>
  <CardContent className="px-2 sm:px-6">
    {/* Responsive chart height */}
    <div className="h-[200px] sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.volumeChartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10 }}
            tickMargin={8}
            // Hide some labels on mobile
            interval={isMobile ? 1 : 0}
          />
          <YAxis 
            tick={{ fontSize: 10 }}
            tickFormatter={(val) => isMobile ? `${(val/1000).toFixed(0)}k` : val.toLocaleString()}
            width={isMobile ? 35 : 50}
          />
          <Tooltip 
            contentStyle={{ fontSize: 12 }}
          />
          <Area 
            type="monotone" 
            dataKey="volume" 
            stroke="#0ea5e9"
            fill="url(#colorVolume)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

---

## 5. Mobile Navigation System

### 5.1 Navigation Architecture

```
┌─────────────────────────────────────────┐
│           Mobile Header (56px)          │
│  [☰ Menu]     ONES Logo    [🔔 Notif]  │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│            Page Content                 │
│         (with safe-area-x)              │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│        Bottom Nav (64px + safe)         │
│  [🏠]    [✨]    [📋]    [👤]          │
│  Home   Optimize  Log   Profile         │
└─────────────────────────────────────────┘
```

### 5.2 Bottom Navigation Tabs

| Tab | Icon | Destination | Contains |
|-----|------|-------------|----------|
| Home | Home | /dashboard | Dashboard overview, quick stats, today's plan |
| Optimize | Sparkles | /dashboard/optimize | Nutrition, Workout, Lifestyle plans |
| Log | ClipboardList | /dashboard/optimize/tracking | Quick logging, streaks, hydration |
| Profile | User | /dashboard/profile | Profile, settings, orders, support |

### 5.3 Floating Action Button (Optional)

For primary logging actions, consider a FAB:

```tsx
// client/src/components/mobile/FloatingLogButton.tsx
export function FloatingLogButton() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      {/* FAB */}
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-[#1B4332] hover:bg-[#143728]",
          "safe-bottom"
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* Quick log sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <div className="grid grid-cols-4 gap-4 p-4">
            <QuickLogOption icon={Utensils} label="Meal" onClick={() => {}} />
            <QuickLogOption icon={Droplets} label="Water" onClick={() => {}} />
            <QuickLogOption icon={Pill} label="Supps" onClick={() => {}} />
            <QuickLogOption icon={Dumbbell} label="Workout" onClick={() => {}} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### 5.4 Sub-page Navigation (App Bar)

For nested pages, use a top app bar with back navigation:

```tsx
// client/src/components/mobile/MobilePageHeader.tsx
interface MobilePageHeaderProps {
  title: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export function MobilePageHeader({ title, backHref, actions }: MobilePageHeaderProps) {
  const [, navigate] = useLocation();
  
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#1B4332]/10 safe-top">
      <div className="flex items-center h-14 px-2">
        {backHref && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(backHref)}
            className="h-10 w-10 mr-1"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <h1 className="flex-1 text-lg font-semibold text-[#1B4332] truncate">
          {title}
        </h1>
        
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
```

### 5.5 Tab Navigation within Pages

For Optimize page tabs (Nutrition/Workout/Lifestyle):

```tsx
// Segmented control style for mobile
export function MobileSegmentedControl({ tabs, activeTab, onChange }) {
  return (
    <div className="flex bg-muted rounded-xl p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg",
            "text-sm font-medium transition-all",
            activeTab === tab.key
              ? "bg-white shadow-sm text-[#1B4332]"
              : "text-muted-foreground"
          )}
        >
          <tab.icon className="h-4 w-4" />
          <span className="hidden xs:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## 6. Performance Optimizations

### 6.1 Code Splitting Strategy

```tsx
// App.tsx - Lazy load route components
import { lazy, Suspense } from 'react';

const DashboardHome = lazy(() => import('@/pages/DashboardHome'));
const OptimizePage = lazy(() => import('@/pages/OptimizePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ConsultationPage = lazy(() => import('@/pages/ConsultationPage'));
const TrackingPage = lazy(() => import('@/pages/TrackingPage'));

// Route with suspense
<Route path="/dashboard">
  <ProtectedRoute>
    <DashboardLayout>
      <Suspense fallback={<PageSkeleton />}>
        <DashboardHome />
      </Suspense>
    </DashboardLayout>
  </ProtectedRoute>
</Route>
```

### 6.2 Image Optimization

```tsx
// Use next-gen formats and lazy loading
<img 
  src="/images/hero.webp"
  srcSet="/images/hero-sm.webp 640w, /images/hero-md.webp 1024w, /images/hero.webp 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
  loading="lazy"
  decoding="async"
  alt="Hero image"
/>
```

### 6.3 Query Optimization

```tsx
// Prefetch related data
const queryClient = useQueryClient();

// On dashboard mount, prefetch optimize data
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ['/api/optimize/plans'],
    staleTime: 5 * 60 * 1000,
  });
}, []);

// Use placeholder data for instant UI
const { data } = useQuery({
  queryKey: ['/api/dashboard/wellness'],
  placeholderData: emptyWellnessData,
});
```

### 6.4 Skeleton Loading Strategy

```tsx
// Unified skeleton component for cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

// Grid skeleton
export function GridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### 6.5 Touch Feedback CSS

```css
/* index.css - Add to utilities */
@layer utilities {
  .touch-feedback {
    @apply transition-transform active:scale-[0.98] active:opacity-90;
  }
  
  .touch-feedback-strong {
    @apply transition-transform active:scale-95 active:opacity-80;
  }
  
  /* Disable hover effects on touch devices */
  @media (hover: none) {
    .hover-only:hover {
      @apply bg-transparent;
    }
  }
}
```

### 6.6 Prevent Layout Shift

```tsx
// Reserve space for async content
<div className="min-h-[200px] sm:min-h-[280px]">
  {isLoading ? (
    <Skeleton className="h-full w-full" />
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} />
    </ResponsiveContainer>
  )}
</div>
```

---

## 7. Implementation Roadmap

### Phase 1: Critical Layout Fixes (Week 1)
**Priority: Critical | Effort: 3-4 days**

| Task | Component | Estimate |
|------|-----------|----------|
| Add safe-area CSS utilities | index.css | 0.5d |
| Create MobileBottomNav component | New component | 1d |
| Create MobileHeader component | New component | 0.5d |
| Update DashboardLayout for mobile | DashboardLayout.tsx | 1d |
| Fix WorkoutSchedule grid overflow | WorkoutSchedule.tsx | 0.5d |
| Fix SetLogger mobile layout | SetLogger.tsx | 0.5d |

### Phase 2: Navigation Restructure (Week 2)
**Priority: High | Effort: 2-3 days**

| Task | Component | Estimate |
|------|-----------|----------|
| Implement mobile tab navigation | Tabs component | 1d |
| Create MobilePageHeader component | New component | 0.5d |
| Add FloatingLogButton (optional) | New component | 0.5d |
| Update route structure for mobile | App.tsx | 0.5d |
| Add swipe gestures to Sheet | Sheet component | 0.5d |

### Phase 3: Component Redesign (Weeks 3-4)
**Priority: High | Effort: 5-6 days**

| Task | Component | Estimate |
|------|-----------|----------|
| Redesign NutritionPlanTab for mobile | NutritionPlanTab.tsx | 1d |
| Update StreakConsistencyCard | StreakConsistencyCard.tsx | 0.5d |
| Update HydrationTracker | HydrationTracker.tsx | 0.5d |
| Update SupplementTracker | SupplementTracker.tsx | 0.5d |
| Convert modals to sheets on mobile | GroceryListModal, etc. | 1d |
| Update form layouts (Profile) | ProfilePage.tsx | 1d |
| Responsive chart containers | WorkoutAnalytics.tsx | 1d |

### Phase 4: Accessibility & Touch (Week 5)
**Priority: Medium | Effort: 2-3 days**

| Task | Component | Estimate |
|------|-----------|----------|
| Audit touch target sizes | All interactive elements | 0.5d |
| Add touch feedback animations | Global CSS | 0.5d |
| Fix focus states for mobile | Button, Input, etc. | 0.5d |
| Test with screen readers | All components | 1d |

### Phase 5: Polish & Animations (Week 6)
**Priority: Low | Effort: 2-3 days**

| Task | Component | Estimate |
|------|-----------|----------|
| Add page transitions | Route changes | 1d |
| Micro-interactions (logging) | Log buttons | 0.5d |
| Loading state refinements | All pages | 0.5d |
| Final QA on devices | All | 1d |

---

## Appendix A: Testing Checklist

### Devices to Test
- [ ] iPhone SE (375 × 667)
- [ ] iPhone 13/14 (390 × 844)
- [ ] iPhone 14 Pro Max (430 × 932)
- [ ] Pixel 5 (393 × 851)
- [ ] Samsung Galaxy S21 (360 × 800)
- [ ] iPad Mini (768 × 1024)
- [ ] iPad Pro 11" (834 × 1194)

### Test Scenarios
- [ ] All navigation flows
- [ ] Form submissions with keyboard
- [ ] Scroll performance on long lists
- [ ] Orientation changes
- [ ] Pull-to-refresh (if implemented)
- [ ] Swipe gestures
- [ ] Offline states

---

## Appendix B: CSS Utilities to Add

```css
/* Add to index.css */
@layer utilities {
  /* Scrollbar hide */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Safe areas */
  .safe-top { padding-top: env(safe-area-inset-top); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  .safe-left { padding-left: env(safe-area-inset-left); }
  .safe-right { padding-right: env(safe-area-inset-right); }
  .safe-x { @apply safe-left safe-right; }
  .safe-y { @apply safe-top safe-bottom; }
  
  /* Touch feedback */
  .touch-feedback {
    @apply transition-transform duration-100 active:scale-[0.98];
  }
  
  /* Dynamic viewport height */
  .h-dvh { height: 100dvh; }
  .min-h-dvh { min-height: 100dvh; }
  .max-h-dvh { max-height: 100dvh; }
}
```

---

## Appendix C: Component Import Checklist

New components to create:
- [ ] `client/src/components/mobile/MobileBottomNav.tsx`
- [ ] `client/src/components/mobile/MobileHeader.tsx`
- [ ] `client/src/components/mobile/MobilePageHeader.tsx`
- [ ] `client/src/components/mobile/FloatingLogButton.tsx` (optional)
- [ ] `client/src/components/mobile/MobileSegmentedControl.tsx`

---

*Document generated by GitHub Copilot for ONES AI mobile responsiveness initiative.*
