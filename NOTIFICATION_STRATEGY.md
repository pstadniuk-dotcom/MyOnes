# ONES AI - Comprehensive Notification Strategy

> **Analysis Date:** November 27, 2025  
> **Scope:** Full audit of current system + future architecture

---

## 📊 CURRENT STATE ANALYSIS

### What's Working ✅

| Component | Status | Notes |
|-----------|--------|-------|
| **SMS Infrastructure** | ✅ Implemented | Twilio configured, `smsService.ts` working |
| **Email Infrastructure** | ✅ Implemented | SendGrid configured, `emailService.ts` working |
| **Daily Pill Reminders** | ✅ Implemented | Cron scheduler, 3x daily (breakfast/lunch/dinner), timezone-aware |
| **Personalized Health Tips** | ✅ Implemented | 100+ tips, morning/evening context, AI fallback |
| **Optimize Reminders** | ✅ Implemented | Morning brief, workout reminder, evening check-in |
| **Notification Preferences UI** | ✅ Implemented | Settings page with toggles for all channels |
| **In-App Notifications Table** | ✅ Implemented | `notifications` table, read/unread tracking |
| **Streak Tracking** | ✅ Implemented | Overall, nutrition, workout, lifestyle streaks |
| **Timezone Support** | ✅ Implemented | User timezone stored, reminders respect local time |

### What's Missing / Planned ❌

| Component | Status | Impact |
|-----------|--------|--------|
| **Order Confirmation** | ❌ Not implemented | User has no confirmation email/SMS after checkout |
| **Shipping Updates** | ❌ Not implemented | User has no visibility into shipment status |
| **Delivery Confirmation** | ❌ Not implemented | Missed onboarding moment |
| **Reorder Reminders** | ❌ Not implemented | Revenue leakage when users forget to reorder |
| **Payment Failed** | ❌ Not implemented | Revenue recovery needed |
| **Weekly Summary** | ❌ Not implemented | Adherence/engagement visibility missing |
| **Reactivation Campaigns** | ❌ Not implemented | Churned users not re-engaged |
| **In-App Notification Bell** | ⚠️ Partial | Bell icon exists but notifications not prominently surfaced |
| **Push Notifications** | ❌ Not implemented | PWA/native app not ready |
| **Lab Results Ready** | ❌ Not implemented | User not notified when AI analysis complete |
| **Wearable Insights** | ❌ Not implemented | Oura/Fitbit data not triggering notifications |
| **Email Onboarding Sequence** | ❌ Not implemented | New users get no nurture sequence |

### Current Database Schema

```sql
-- notifications table (in-app)
notifications (
  id, userId, type, title, content, isRead, 
  orderId, formulaId, metadata (actionUrl, icon, priority),
  createdAt
)

-- notification_prefs table
notification_prefs (
  userId, 
  emailConsultation, emailShipping, emailBilling,
  smsConsultation, smsShipping, smsBilling,
  dailyRemindersEnabled, 
  reminderBreakfast, reminderLunch, reminderDinner,
  updatedAt
)

-- users table (inline prefs - redundant)
users (
  ...,
  emailConsultation, emailShipping, emailBilling,
  smsConsultation, smsShipping, smsBilling,
  dailyRemindersEnabled, reminderBreakfast, reminderLunch, reminderDinner,
  timezone
)
```

**Issue:** Preferences exist in both `users` and `notification_prefs` tables - potential sync issues.

---

## 🎯 NOTIFICATION GOALS

### Primary Goals

| Goal | Definition | Key Metrics |
|------|------------|-------------|
| **Adherence** | Users take supplements daily as prescribed | Streak length, completion %, missed days |
| **Education** | Users understand how/why supplements work | Tip engagement, content reads, knowledge retention |
| **Retention** | Users continue using ONES long-term | Churn rate, LTV, reorder rate |
| **Reactivation** | Win back inactive/churned users | Reactivation rate, time-to-return |
| **Delight** | Surprise users with value | NPS, social shares, referrals |

### Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Daily reminder opt-in rate | Unknown | 60% | `dailyRemindersEnabled = true` / active users |
| Streak 7+ days | Unknown | 40% | Users with `currentStreak >= 7` |
| Streak 30+ days | Unknown | 15% | Users with `currentStreak >= 30` |
| Reorder rate (90 days) | Unknown | 70% | Orders / users at 90 days post-delivery |
| Notification CTR (email) | Unknown | 15% | Clicks / delivered (via SendGrid) |
| Notification CTR (SMS) | Unknown | 25% | Clicks / delivered (via Twilio) |
| Unsubscribe rate (email) | Unknown | <2% | Unsubscribes / delivered |
| Churn rate (30 days) | Unknown | <5% | Inactive users / total users |

---

## 📋 NOTIFICATION TAXONOMY

### Category 1: System / Transactional (Required)

**Purpose:** Legally required or critical user-expected notifications  
**Unsubscribable:** No (with rare exceptions)  
**Channels:** Email + SMS

#### Notifications YOU Build:

| Trigger | Email | SMS | Priority | Example Content |
|---------|-------|-----|----------|-----------------|
| Order confirmed | ✅ | ✅ | HIGH | "Order #12345 confirmed! Your custom formula is being made. Ships in 5-7 days." |
| Payment failed | ✅ | ✅ | CRITICAL | "Payment failed for order #12345. Update card: [link]" |
| Password reset | ✅ | ❌ | HIGH | "Reset your password: [link] (expires 1hr)" |
| Account security alert | ✅ | ✅ | CRITICAL | "New login detected from [location]. Not you? [link]" |

#### Notifications SHIPPO Handles (Automatic):

| Event | Shippo Auto-Email | Notes |
|-------|-------------------|-------|
| Label created / Shipped | ✅ | Includes tracking link |
| In transit updates | ✅ | Carrier scans |
| Out for delivery | ✅ | Day-of notification |
| Delivered | ✅ | Confirmation with proof |
| Delivery exception | ✅ | Issues/delays |

> **Integration Note:** Use Shippo or EasyPost for shipping. They handle all carrier communications, tracking emails, and delivery notifications automatically. ONES only needs to:
> 1. Call Shippo API to create shipment/label when order is ready
> 2. (Optional) Listen to Shippo webhooks to update order status in database

### Category 2: Adherence / Habits (Core Value)

**Purpose:** Help users take supplements consistently  
**Unsubscribable:** Yes  
**Channels:** SMS (primary), In-App (secondary)

| Trigger | Channel | Timing | Example Content |
|---------|---------|--------|-----------------|
| Morning reminder | SMS | User-set (default 8am) | "☀️ Breakfast time! Take 3 capsules with your meal. 💡 Tip: Vitamin D absorbs best with healthy fats." |
| Afternoon reminder | SMS | User-set (default 12pm) | "🌤️ Lunch reminder! Take 3 capsules with your meal." |
| Evening reminder | SMS | User-set (default 6pm) | "🌙 Dinner time! Take 3 capsules. 💡 Tip: Magnesium supports deep sleep." |
| Streak milestone | SMS + In-App | On achievement | "🔥 7-day streak! You're building a great habit. Keep it up!" |
| Streak broken | SMS | Day after miss | "We noticed you missed yesterday. No worries - today is a fresh start! 💪" |
| Weekly adherence summary | Email | Sunday 6pm | "Your week: 6/7 days ✅ | Streak: 13 days 🔥 | Top tip: [personalized]" |

### Category 3: Insights / Coaching (Engagement)

**Purpose:** Educate users and provide personalized value  
**Unsubscribable:** Yes  
**Channels:** Email (primary), In-App (secondary)

| Trigger | Channel | Cadence | Example Content |
|---------|---------|---------|-----------------|
| Formula deep dive | Email | 1x monthly | "Your Heart Support base: Why we included 1g Omega-3 and what it does for you." |
| Lab insight (if connected) | Email + In-App | On analysis | "Your Vitamin D went from 22 to 45 ng/mL! Your formula is working." |
| Wearable insight (if connected) | Email | 1x weekly | "Your HRV improved 15% this month - your Ashwagandha may be helping with stress." |
| Health tip digest | Email | 1x weekly | "3 tips for maximizing supplement absorption this week." |
| Seasonal optimization | Email | Quarterly | "Fall is coming: Why we recommend increasing Vitamin D." |

### Category 4: Lifecycle / Retention (Business Critical)

**Purpose:** Drive reorders, prevent churn, re-engage inactive users  
**Unsubscribable:** Partially (can reduce frequency)  
**Channels:** Email + SMS

| Trigger | Channel | Timing | Example Content |
|---------|---------|--------|-----------------|
| Reorder reminder | Email + SMS | 15 days before out | "📦 ~15 days of formula left. Reorder to avoid a gap: [link]" |
| Reorder urgent | Email + SMS | 5 days before out | "⚠️ Running low! Only ~5 days left. Order today for seamless delivery: [link]" |
| Inactive 7 days | Email | Day 7 | "We miss you! Your formula is waiting. Come back and continue your streak." |
| Inactive 14 days | Email | Day 14 | "Your streak was 12 days! Don't let all that progress go to waste." |
| Inactive 30 days | Email + SMS | Day 30 | "It's been a month. Want to chat about adjusting your formula?" |
| Re-engagement offer | Email | Day 45 | "We want you back: Get 20% off your next order. [link]" |
| Win-back (churned) | Email | Day 90 | "A lot has improved since you left. Here's what's new at ONES." |

### Category 5: Delight (Surprise & Value)

**Purpose:** Create memorable moments that drive referrals  
**Unsubscribable:** Yes  
**Channels:** Email, SMS, In-App

| Trigger | Channel | Example Content |
|---------|---------|-----------------|
| 100-day streak | Email + In-App | "🏆 100 DAYS! You're in the top 1% of ONES users. Here's a special gift..." |
| Anniversary (1 year) | Email | "It's been a year since your health journey began. Here's how far you've come." |
| Referral milestone | Email | "3 friends joined because of you! Here's $50 credit as a thank you." |
| Birthday | Email | "Happy Birthday! Enjoy free shipping on your next order." |
| Random act of delight | SMS | "Just checking in - hope you're feeling great today! 💚" |
| New feature announcement | In-App + Email | "🎉 Wearable integration is here! Connect your Oura Ring for personalized insights." |

---

## 📱 CHANNEL STRATEGY

### Channel Selection Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHANNEL DECISION TREE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Is it time-critical (payment failed, security alert)?                      │
│  └─ YES → Email + SMS immediately                                           │
│  └─ NO  ↓                                                                   │
│                                                                              │
│  Is it a habit/adherence reminder?                                          │
│  └─ YES → SMS only (if opted in) + In-App                                   │
│  └─ NO  ↓                                                                   │
│                                                                              │
│  Is it transactional (order, shipping)?                                     │
│  └─ YES → Email always + SMS if opted in                                    │
│  └─ NO  ↓                                                                   │
│                                                                              │
│  Is it educational/coaching?                                                 │
│  └─ YES → Email (1x weekly max) + In-App                                    │
│  └─ NO  ↓                                                                   │
│                                                                              │
│  Is it reactivation/retention?                                               │
│  └─ YES → Email primary, SMS only if 30+ days inactive                      │
│  └─ NO  ↓                                                                   │
│                                                                              │
│  Default → In-App only                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Channel-Specific Rules

#### Email
- **Max frequency:** 3/week (1 digest, 1 educational, 1 lifecycle)
- **Send window:** 9am-7pm user local time
- **Never on:** Friday 6pm - Sunday 6am
- **Unsubscribe:** Always visible, one-click
- **From address:** `hello@myones.ai` (transactional), `community@myones.ai` (marketing)

#### SMS
- **Max frequency:** 3/day (adherence only) + 1/week (urgent lifecycle)
- **Send window:** 7am-9pm user local time
- **Never before:** 7:00am local
- **Never after:** 9:00pm local
- **STOP instruction:** Always include opt-out path
- **Cost consideration:** SMS is $0.0075/msg - prioritize high-value

#### In-App
- **Max queue:** 50 notifications (auto-archive oldest)
- **Badge count:** Show unread count on bell icon
- **Priority display:** Critical > High > Medium > Low
- **Auto-mark read:** After 7 days if unactioned

#### Push (Future)
- **Prerequisite:** PWA or native app
- **Use cases:** Time-sensitive only (payment, streak about to break)
- **Frequency:** Max 2/day

---

## ⏰ CADENCE & PRIORITY RULES

### Daily Cadence

```
┌────────────────────────────────────────────────────────────────────────┐
│  TIME (User Local)  │  NOTIFICATION TYPE                              │
├────────────────────────────────────────────────────────────────────────┤
│  7:00-8:00 AM       │  Morning reminder (SMS) - if enabled            │
│  8:00-9:00 AM       │  Morning optimize brief (SMS) - if enabled      │
│  12:00-1:00 PM      │  Afternoon reminder (SMS) - if enabled          │
│  5:00-6:00 PM       │  Workout reminder (SMS) - if enabled            │
│  6:00-7:00 PM       │  Evening reminder (SMS) - if enabled            │
│  8:00-9:00 PM       │  Evening check-in (SMS) - if enabled            │
│                                                                        │
│  ANY TIME           │  Transactional (order, payment) - no delay      │
└────────────────────────────────────────────────────────────────────────┘
```

### Weekly Cadence

| Day | Notification | Channel | Notes |
|-----|--------------|---------|-------|
| Sunday 6pm | Weekly Summary | Email | Adherence stats, streak, tips |
| Monday 9am | Week Ahead Preview | In-App | Workout/nutrition plan overview |
| Wednesday 2pm | Mid-week Motivation | SMS (opt-in) | Only if streak active |
| Friday (none) | QUIET DAY | - | No marketing/lifecycle emails |

### Monthly Cadence

| Week | Notification | Channel |
|------|--------------|---------|
| Week 2 | Formula Deep Dive | Email |
| Week 3 | Reorder Reminder (if due) | Email + SMS |
| Week 4 | Monthly Progress Report | Email |

### Priority Levels

| Priority | Examples | Delivery SLA | Override Quiet Hours |
|----------|----------|--------------|---------------------|
| **CRITICAL** | Payment failed, Security alert | < 1 minute | YES |
| **HIGH** | Order shipped, Streak breaking | < 5 minutes | NO |
| **MEDIUM** | Reorder reminder, Weekly summary | < 1 hour | NO |
| **LOW** | Educational content, Delight | Batched daily | NO |

### Quiet Hours

```
Default Quiet Hours:
├── Night: 9:00pm - 7:00am (user local time)
├── Weekend: Friday 6:00pm - Sunday 12:00pm (reduced marketing only)
└── User Override: Custom quiet hours in settings

Exceptions:
├── CRITICAL priority bypasses all quiet hours
├── User-initiated reminders (pill times) respect user's own settings
└── Transactional (order shipped) delays to next morning if in quiet hours
```

---

## 🎛️ PERSONALIZATION & USER CONTROLS

### Personalization Signals

| Signal | How We Use It | Source |
|--------|---------------|--------|
| **Formula ingredients** | Tailor tips to user's specific supplements | `formulas` table |
| **Health profile** | Context for coaching (age, goals, conditions) | `health_profiles` table |
| **Streak data** | Adjust tone (encourage if struggling, celebrate if thriving) | `user_streaks` table |
| **Time zone** | Send at appropriate local time | `users.timezone` |
| **Engagement history** | Reduce frequency if low engagement | Analytics (future) |
| **Wearable data** | Personalized insights if connected | `biometric_data` table |
| **Lab results** | Track improvements over time | `lab_analyses` table |
| **Completion patterns** | Shift reminder times to match actual behavior | `daily_logs` table |

### Adaptive Timing

```typescript
// Example: Shift reminder time based on actual completion patterns
// If user consistently takes morning pills at 8:30am (not 8:00am),
// suggest shifting reminder to 8:25am

interface CompletionPattern {
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  averageCompletionTime: string; // e.g., "08:32"
  sampleSize: number;
}

// Auto-suggest adjustment if:
// 1. sampleSize >= 14 days
// 2. averageCompletionTime differs from reminderTime by > 15 minutes
// 3. User hasn't manually adjusted in last 30 days
```

### User-Facing Settings

#### Notification Intensity Levels

| Level | Description | Behavior |
|-------|-------------|----------|
| **Essential Only** | Transactional + critical only | Order updates, payment issues, security |
| **Balanced** (Default) | Transactional + adherence | + Daily reminders, weekly summary |
| **Coach Mode** | Full engagement | + Educational, insights, motivation, delight |

#### Settings UI Enhancement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION SETTINGS                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Intensity]                                                                 │
│  ○ Essential Only - Transactional & critical only                           │
│  ● Balanced - Add daily reminders & weekly summary (recommended)            │
│  ○ Coach Mode - Full engagement with tips, insights & motivation            │
│                                                                              │
│  [Channels]                                                                  │
│  Email: ✅ Enabled    |  SMS: ✅ Enabled    |  Push: Coming Soon             │
│                                                                              │
│  [Daily Reminders]                                                           │
│  ✅ Enabled                                                                  │
│  └── Morning:   [07:30] ▼                                                   │
│  └── Afternoon: [12:00] ▼                                                   │
│  └── Evening:   [18:30] ▼                                                   │
│                                                                              │
│  [Quiet Hours]                                                               │
│  From: [21:00] ▼  To: [07:00] ▼                                             │
│  ☐ Weekend quiet mode (reduce non-essential Sat/Sun)                        │
│                                                                              │
│  [Preferred Times]                                                           │
│  Best time for educational emails: ○ Morning  ● Afternoon  ○ Evening        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 KEY USER JOURNEYS

### Journey 1: New User Onboarding (Days 1-14)

```
DAY 1 - SIGNUP
├── [Immediately] In-App: Welcome message, formula preview
├── [+1 hour] Email: "Welcome to ONES - Here's what's next"
│   └── CTA: Complete health profile, connect wearables
└── [Evening] SMS (if opted in): "Your formula journey begins! Reply YES to enable daily reminders"

DAY 2 - FORMULA ORDERED
├── [On order] Email + SMS: "Order confirmed! Ships in 5-7 days"
├── [+2 hours] Email: "While you wait: How your formula was designed"
└── [Evening] In-App: Streak counter initialized (0 days)

DAY 3-6 - WAITING FOR DELIVERY
├── [Day 3] Email: "Meet your ingredients: Deep dive into your formula"
├── [Day 5] Email: "Preparing for your formula: Setting up for success"
└── [Shipping] Email + SMS: "Your formula shipped! Track: [link]"

DAY 7 - DELIVERY
├── [On delivery] Email + SMS: "Your formula arrived! Here's how to start"
│   └── Include: Dosage instructions, reminder setup link
├── [+4 hours] SMS: "Did you take your first dose? Reply YES to start your streak!"
└── [Evening] In-App: "Day 1 complete! 🎉 364 more to go!"

DAY 8-14 - HABIT FORMATION
├── [Daily] SMS: Pill reminders (3x/day) with personalized tips
├── [Day 7] Email: "Your first week with ONES - How are you feeling?"
│   └── CTA: Quick feedback survey
├── [Day 10] SMS: "🔥 10-day streak! You're building a habit!"
└── [Day 14] Email: "2 weeks in! Here's what's happening in your body"
```

### Journey 2: Daily Adherence Loop

```
MORNING (User-set time)
├── [Reminder time] SMS: "☀️ Breakfast time! Take 3 capsules. 💡 Tip: [personalized]"
├── [+30 min if not logged] SMS: "Quick reminder: Did you take your morning capsules?"
└── [On log] In-App: "✓ Morning dose logged"

AFTERNOON (User-set time)
├── [Reminder time] SMS: "🌤️ Lunch reminder! Take 3 capsules."
└── [On log] In-App: "✓ Afternoon dose logged"

EVENING (User-set time)
├── [Reminder time] SMS: "🌙 Dinner time! Take 3 capsules. 💡 Tip: [personalized]"
├── [On log] In-App: "✓ Evening dose logged"
└── [If all 3 logged] In-App: "🎉 Perfect day! Streak: [N] days"

END OF DAY
├── [If missed any] SMS: "You missed [N] doses today. Tomorrow is a fresh start! 💪"
└── [9pm] In-App: Daily summary card updated
```

### Journey 3: Weekly Health Summary

```
SUNDAY 6:00 PM (User local time)

Email: "Your Weekly ONES Summary 📊"
├── Adherence: "6/7 days ✅ (85% compliance)"
├── Streak: "Current: 13 days 🔥 | Best: 21 days"
├── Progress: "You've taken 63 capsules this week"
├── Insights (if wearable connected):
│   └── "Your sleep quality improved 12% - your Magnesium is helping!"
├── Tips for next week:
│   └── "Try taking morning capsules with eggs for better Vitamin D absorption"
└── CTA: "View full dashboard →"
```

### Journey 4: Reorder Cycle (3-Month Stack)

```
DAY 75 (15 days before running out)
├── Email: "📦 Time to Restock Your Formula"
│   └── Content: Current formula summary, last order date, ~15 days remaining
│   └── CTA: [Reorder Same Formula] [Update Formula First]
└── In-App: Notification card with reorder button

DAY 80 (10 days before)
├── SMS: "⚗️ ONES: ~10 days of formula left. Reorder: [link]"
└── In-App: Badge on formula page

DAY 85 (5 days before - URGENT)
├── Email: "⚠️ Running Low - Don't Break Your Streak!"
├── SMS: "⚠️ Only ~5 days left! Order today: [link]"
└── In-App: Prominent banner on dashboard

DAY 90 (Day of running out)
├── Email: "Last Call - Your Formula Supply Ends Today"
├── SMS: "🚨 Your ONES supply runs out today. Quick reorder: [link]"
└── In-App: Full-screen reminder

DAY 91+ (After running out)
├── [Daily for 3 days] SMS: "Missing your capsules? Reorder now: [link]"
└── [Day 7] Email: "We noticed you haven't reordered. Everything okay?"
```

### Journey 5: Reactivation Flow

```
INACTIVITY DETECTED (No app opens, no logs, no orders)

DAY 7 - GENTLE NUDGE
└── Email: "We miss you! Your formula is waiting"
    └── Content: Last streak achieved, progress made
    └── CTA: "Come back and continue →"

DAY 14 - CONCERN
└── Email: "Is everything okay? Your 12-day streak is waiting"
    └── Content: Personalized - mention specific ingredients
    └── CTA: "Resume your journey →"

DAY 21 - FEEDBACK REQUEST
└── Email: "We'd love your feedback"
    └── Content: Quick survey - why did you stop?
    └── CTA: "Tell us (2 min) →"

DAY 30 - HUMAN TOUCH
├── Email: "A personal note from the ONES team"
│   └── Content: Handwritten-style, founder signature
└── SMS: "Hey [Name], it's been a month. Chat with us? [link]"

DAY 45 - INCENTIVE
└── Email: "We want you back - 20% off your next order"
    └── Content: Discount code, expires in 7 days
    └── CTA: "Claim discount →"

DAY 60 - FORMULA UPDATE OFFER
└── Email: "A lot has changed - Let's update your formula"
    └── Content: Offer free AI consultation
    └── CTA: "Chat with AI →"

DAY 90 - WIN-BACK (LAST ATTEMPT)
└── Email: "Final goodbye (unless...)"
    └── Content: Emotional appeal, 30% discount
    └── CTA: "One more chance →"

DAY 91+ - ARCHIVE
└── Move to cold list, reduce to quarterly "What's new" emails only
```

### Journey 6: Lab Results Available

```
ON LAB ANALYSIS COMPLETE
├── [Immediately] In-App: "🔬 Lab analysis complete! View your results"
├── [+1 hour] Email: "Your Lab Results Are Ready"
│   └── Content: High-level summary, key findings
│   └── CTA: "View full analysis →"
└── [If critical findings] SMS: "Important: Your lab results need attention. Check your app."

IF RESULTS SHOW IMPROVEMENT
├── [+24 hours] Email: "Good news! Your [marker] improved by [X]%"
│   └── Content: Connect improvement to specific supplement
│   └── CTA: "See what's working →"

IF RESULTS SHOW CONCERN
├── [Immediately] In-App + Email: "Your results need attention"
│   └── Content: Recommendation to consult healthcare provider
│   └── Offer: Chat with AI to adjust formula
└── [If no action in 3 days] SMS: "Have you reviewed your lab results? [link]"
```

---

## 🛡️ GUARDRAILS & ANTI-ANNOYANCE RULES

### Maximum Frequencies

| Channel | Per Day | Per Week | Per Month | Hard Cap |
|---------|---------|----------|-----------|----------|
| Email (total) | 2 | 5 | 12 | No more than 2 in 24 hours |
| Email (marketing) | 1 | 3 | 8 | Never 2 days in a row |
| SMS (total) | 4 | 15 | 50 | No more than 4 in 24 hours |
| SMS (marketing) | 1 | 3 | 8 | Never before 8am or after 8pm |
| In-App | 10 | 50 | 150 | Auto-collapse if >5 unread |
| Push (future) | 2 | 7 | 20 | Never at night |

### Batching Rules

```typescript
interface BatchingRules {
  // Combine multiple low-priority notifications into digest
  batchWindow: '2 hours',
  
  // Don't batch these types
  neverBatch: ['payment_failed', 'security_alert', 'order_shipped'],
  
  // Combine into single email
  combineIntoDigest: [
    'educational_tip',
    'streak_update', 
    'feature_announcement',
    'community_update'
  ],
  
  // Daily digest timing
  digestSendTime: '9:00am user local time',
  
  // If more than N low-priority pending, batch into weekly digest
  weeklyDigestThreshold: 5
}
```

### Fatigue Detection

```typescript
interface FatigueSignals {
  // User is fatigued if ANY of these are true
  signals: {
    // Email
    openRateBelow: 0.10,     // Less than 10% opens in last 30 days
    unsubscribeClicked: true, // Clicked unsubscribe (even if didn't complete)
    spamReported: true,       // Reported as spam
    
    // SMS
    smsStopReceived: true,    // Replied STOP
    smsNoReplies: '14 days',  // No engagement for 14 days
    
    // In-App
    dismissedWithoutReading: 5, // 5 notifications in a row
    notificationsTurnedOff: true,
    
    // General
    noAppOpens: '7 days',
    noLogins: '14 days'
  },
  
  // Actions when fatigued
  fatigueActions: {
    immediate: 'Reduce to essential-only for 7 days',
    '7_days': 'Show in-app prompt asking about preferences',
    '14_days': 'Send single "checking in" email',
    '30_days': 'Move to minimal cadence (1 email/month max)'
  }
}
```

### Back-Off Algorithm

```
Notification Fatigue Score = 
  (1 - email_open_rate) * 0.3 +
  (1 - sms_response_rate) * 0.2 +
  (unread_in_app_notifications / 20) * 0.2 +
  (days_since_last_active / 30) * 0.3

If score > 0.7: FATIGUED
├── Reduce all marketing to 0
├── Keep transactional only
├── Show in-app "adjust preferences?" prompt

If score > 0.5: AT RISK
├── Reduce marketing by 50%
├── Delay low-priority by 24 hours
├── Add "too many emails?" footer link

If score < 0.3: ENGAGED
├── Normal cadence
├── Can send delight/educational
└── Eligible for new feature announcements
```

### Content Deduplication

```typescript
// Never send the same tip twice within 14 days
const recentTips = new Map<string, Date>(); // tipHash -> lastSent

// Never send same lifecycle email twice
const sentLifecycleEmails = new Map<string, string>(); // userId -> emailId

// Combine overlapping notifications
// e.g., "Order shipped" + "Reorder reminder" in same window = combine
const combineRules = {
  'order_shipped + reorder_reminder': 'order_shipped', // Skip reorder if just shipped
  'streak_broken + daily_reminder': 'daily_reminder',  // Include streak message in reminder
  'weekly_summary + monthly_report': 'monthly_report'  // Monthly includes weekly
};
```

---

## 🔧 IMPLEMENTATION ARCHITECTURE

### Event-Driven System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGERS                    NOTIFICATION ENGINE              CHANNELS       │
│  ─────────                   ──────────────────              ────────        │
│                                                                              │
│  ┌───────────────┐          ┌────────────────────┐                          │
│  │ Order Created │ ────────→│                    │                          │
│  └───────────────┘          │  Event Processor   │          ┌──────────┐   │
│  ┌───────────────┐          │                    │─────────→│  Email   │   │
│  │ Cron Schedule │ ────────→│  ┌──────────────┐  │          │(SendGrid)│   │
│  └───────────────┘          │  │  Preference  │  │          └──────────┘   │
│  ┌───────────────┐          │  │   Checker    │  │                          │
│  │ User Action   │ ────────→│  └──────────────┘  │          ┌──────────┐   │
│  └───────────────┘          │  ┌──────────────┐  │─────────→│   SMS    │   │
│  ┌───────────────┐          │  │   Fatigue    │  │          │ (Twilio) │   │
│  │ External Hook │ ────────→│  │   Detector   │  │          └──────────┘   │
│  │ (Stripe/Oura) │          │  └──────────────┘  │                          │
│  └───────────────┘          │  ┌──────────────┐  │          ┌──────────┐   │
│  ┌───────────────┐          │  │   Template   │  │─────────→│  In-App  │   │
│  │ Manual Admin  │ ────────→│  │   Renderer   │  │          │   (DB)   │   │
│  └───────────────┘          │  └──────────────┘  │          └──────────┘   │
│                             │  ┌──────────────┐  │                          │
│                             │  │  Rate Limit  │  │          ┌──────────┐   │
│                             │  │   & Batch    │  │─────────→│   Push   │   │
│                             │  └──────────────┘  │          │ (Future) │   │
│                             └────────────────────┘          └──────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Proposed Schema Updates

```sql
-- New: Notification events table (audit log)
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  notification_type VARCHAR NOT NULL,  -- 'order_shipped', 'daily_reminder', etc.
  channel VARCHAR NOT NULL,            -- 'email', 'sms', 'in_app', 'push'
  status VARCHAR NOT NULL,             -- 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed'
  external_id VARCHAR,                 -- SendGrid/Twilio message ID
  content_hash VARCHAR,                -- For deduplication
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

-- New: Notification schedule table
CREATE TABLE notification_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  notification_type VARCHAR NOT NULL,
  channel VARCHAR NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  priority VARCHAR DEFAULT 'medium',
  status VARCHAR DEFAULT 'pending',    -- 'pending', 'sent', 'cancelled', 'skipped'
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- New: User engagement metrics
CREATE TABLE user_engagement_metrics (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id),
  email_open_rate DECIMAL(3,2),        -- 0.00 to 1.00
  email_click_rate DECIMAL(3,2),
  sms_response_rate DECIMAL(3,2),
  in_app_engagement_rate DECIMAL(3,2),
  fatigue_score DECIMAL(3,2),
  last_email_open TIMESTAMP,
  last_sms_response TIMESTAMP,
  last_app_open TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced: notification_prefs
ALTER TABLE notification_prefs ADD COLUMN intensity_level VARCHAR DEFAULT 'balanced';
ALTER TABLE notification_prefs ADD COLUMN quiet_hours_start TIME DEFAULT '21:00';
ALTER TABLE notification_prefs ADD COLUMN quiet_hours_end TIME DEFAULT '07:00';
ALTER TABLE notification_prefs ADD COLUMN weekend_quiet_mode BOOLEAN DEFAULT false;
ALTER TABLE notification_prefs ADD COLUMN preferred_email_time VARCHAR DEFAULT 'morning';
```

### Service Structure

```
server/
├── notifications/
│   ├── index.ts              # Main export
│   ├── notificationEngine.ts # Core orchestrator
│   ├── channels/
│   │   ├── email.ts          # SendGrid wrapper
│   │   ├── sms.ts            # Twilio wrapper
│   │   ├── inApp.ts          # Database writes
│   │   └── push.ts           # Future: FCM/APNs
│   ├── templates/
│   │   ├── email/            # HTML templates
│   │   └── sms/              # SMS templates
│   ├── triggers/
│   │   ├── orderTriggers.ts  # Order-related notifications
│   │   ├── adherenceTriggers.ts # Daily reminders
│   │   ├── lifecycleTriggers.ts # Retention, reactivation
│   │   └── insightsTriggers.ts  # Lab, wearable
│   ├── preferences.ts        # User pref management
│   ├── fatigue.ts            # Fatigue detection
│   ├── scheduler.ts          # Cron job management
│   └── analytics.ts          # Track engagement
```

### Data to Track

| Metric | Purpose | Storage |
|--------|---------|---------|
| Email sent/delivered/opened/clicked | Calculate engagement rates | `notification_events` |
| SMS sent/delivered | Verify delivery | `notification_events` |
| In-app dismissed/clicked | Measure relevance | `notification_events` |
| Time of engagement | Optimize send times | `notification_events` |
| Tip shown → Tip engaged | Measure tip effectiveness | `notification_events.metadata` |
| Reminder sent → Dose logged | Measure adherence impact | Join with `daily_logs` |
| Reorder email → Order placed | Measure conversion | Join with `orders` |
| Streak milestone → Next day adherence | Measure motivation effect | Join with `user_streaks` |

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Core Transactional (Week 1-2)

| # | Notification | Channel | Trigger | Notes |
|---|--------------|---------|---------|-------|
| 1 | Order Confirmed | Email + SMS | Stripe `checkout.session.completed` | You build this |
| 2 | Payment Failed | Email + SMS | Stripe `payment_intent.payment_failed` | You build this |
| 3 | Shippo Integration | - | Admin creates shipment | Shippo handles all shipping emails |
| 4 | (Optional) Shippo Webhook | - | `track_updated` event | Update order status in DB |

> **Note:** Shipped/Delivered notifications are handled automatically by Shippo or EasyPost. No need to build email/SMS for these - the shipping platform sends professional tracking emails with carrier branding.

### Phase 2: Retention Critical (Week 3-4)

| # | Notification | Channel | Trigger |
|---|--------------|---------|---------|
| 5 | Reorder Reminder (15 days) | Email + SMS | 75 days post-delivery |
| 6 | Reorder Urgent (5 days) | Email + SMS | 85 days post-delivery |
| 7 | Weekly Summary | Email | Sunday 6pm cron |
| 8 | Streak Milestones | SMS + In-App | 7, 14, 30, 60, 100 days |

### Phase 3: Engagement (Month 2)

| # | Notification | Channel | Trigger |
|---|--------------|---------|---------|
| 9 | Inactive 7 days | Email | No login for 7 days |
| 10 | Inactive 14 days | Email | No login for 14 days |
| 11 | Reactivation offer | Email | No login for 45 days |
| 12 | Formula Deep Dive | Email | Monthly cron |

### Phase 4: Delight & Polish (Month 3+)

| # | Notification | Channel | Trigger |
|---|--------------|---------|---------|
| 13 | Birthday | Email | User birthdate |
| 14 | Anniversary | Email | 1 year since signup |
| 15 | Lab Insight | Email + In-App | Lab analysis complete |
| 16 | Wearable Insight | Email | Oura data shows improvement |

---

## 🔮 FUTURE CONSIDERATIONS

### Klaviyo Integration
- Offload marketing automation to Klaviyo for:
  - Onboarding email sequences
  - Win-back campaigns
  - A/B testing at scale
  - Advanced segmentation
- Keep transactional in-house (SendGrid)

### AI-Powered Personalization
- Use GPT to generate truly personalized tips
- Analyze user behavior to predict optimal send times
- Generate reorder timing based on usage patterns (not just 90 days)

### WhatsApp Channel
- Higher engagement than SMS in many regions
- Rich media support (images, buttons)
- Lower cost than SMS

### Native App Push
- When PWA or native app ships
- Time-critical only (payment, streak breaking)
- Rich notifications with actions

---

## ✅ IMMEDIATE NEXT STEPS

1. **Consolidate preferences:** Remove duplicates between `users` and `notification_prefs` tables
2. **Add engagement tracking:** Create `notification_events` table
3. **Implement order notifications:** Hook into Stripe webhooks
4. **Add reorder logic:** Calculate based on order date + 90 days
5. **Weekly summary cron:** New scheduler for Sunday 6pm digest
6. **Fatigue detection:** Track opens/clicks, implement back-off

---

*This strategy document is ready for implementation. All code changes should be made in a separate branch and tested thoroughly before deployment.*
