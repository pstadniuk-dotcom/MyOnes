# ONES Platform - Notification System Overview

## Notification Architecture

### Delivery Channels
- **Email** (SendGrid) - Always available for all users
- **SMS** (Twilio) - Optional, requires phone number + user opt-in

### Notification Types & Preference Mapping

| Type | Category | Email Preference | SMS Preference | Use Cases |
|------|----------|------------------|----------------|-----------|
| `formula_update` | Consultation | `emailConsultation` | `smsConsultation` | Formula created/updated, lab results analyzed, AI insights |
| `order_update` | Shipping | `emailShipping` | `smsShipping` | Order confirmed, payment success, shipped, delivered |
| `system` | Billing | `emailBilling` | `smsBilling` | Account created, password reset, payment issues |
| `consultation_reminder` | Consultation | `emailConsultation` | `smsConsultation` | Follow-up reminders (not yet implemented) |

---

## 📋 Complete Notification Catalog

### 1️⃣ FORMULA & CONSULTATION (formula_update)

#### ✅ When AI Creates First Formula
**Trigger**: AI extracts formula from chat response  
**Timing**: Immediately after formula saved to database  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Your Personalized ONES Formula is Ready! 🎯"  
**Content**:
```
Great news! I've created your personalized supplement formula based on our conversation.

Formula: Pete V1
Total Daily Dose: 4,850mg (10 capsules)
Key Ingredients: Heart Support, Immune Support, Vitamin D3, Omega-3

Your formula is ready to review and customize in your dashboard.
```
**SMS** (if enabled):
```
⚗️ ONES: Your personalized formula V1 is ready! Review & customize: https://ones.app/my-formula
```

---

#### ✅ When AI Updates/Revises Formula
**Trigger**: AI creates new formula version (V2, V3, etc.)  
**Timing**: Immediately after new version saved  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Formula Update: ONES V2 Now Available 🔄"  
**Content**:
```
I've updated your supplement formula based on [reason: new lab results / your feedback / symptom changes].

What's New in V2:
• Added: Magnesium Glycinate (400mg) for better sleep
• Adjusted: Reduced Vitamin D3 from 5000 IU to 2000 IU
• Removed: Iron (your levels are optimal)

New Total: 5,100mg (11 capsules daily)
```
**SMS**:
```
⚗️ ONES: Formula updated to V2! [Key change]. Review: https://ones.app/my-formula
```

---

#### ✅ When Lab Results Are Analyzed
**Trigger**: User uploads blood test PDF/image AND AI extracts data  
**Timing**: Immediately after file analysis completes  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Lab Results Analyzed - Insights Ready 🔬"  
**Content**:
```
I've analyzed your lab results from [date].

Key Findings:
• Vitamin D: 28 ng/mL (Low - optimal is 40-60)
• Ferritin: 45 ng/mL (Borderline - optimal is 50-150)
• B12: 650 pg/mL (Optimal)

I recommend updating your formula to address these findings. Ready to discuss?
```
**SMS**:
```
⚗️ ONES: Lab results analyzed. Found 2 areas to optimize. Chat with me: https://ones.app/chat
```

---

#### ✅ Health Insights / Check-in Reminder
**Trigger**: 30 days after last formula update  
**Timing**: Scheduled daily batch job  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "How Are You Feeling? Let's Check In 💬"  
**Content**:
```
It's been 30 days since your last formula update. I'd love to hear how you're feeling!

Quick Check-in:
• How's your energy?
• Any changes in symptoms?
• New lab results to share?

Chat with me to optimize your formula.
```
**SMS**:
```
⚗️ ONES: Time for a check-in! How are you feeling on your current formula? Chat: https://ones.app/chat
```

---

### 2️⃣ ORDER & SHIPPING (order_update)

#### ✅ Order Confirmation
**Trigger**: Stripe checkout session completed successfully  
**Timing**: Immediately after payment confirmation  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Order Confirmed - Your ONES Formula is Being Made ✅"  
**Content**:
```
Thank you for your order!

Order #12345
Formula: Pete V2
Quantity: 3-month supply (900 capsules)
Price: $297.00

Your custom blend is being manufactured with pharmaceutical-grade ingredients. We'll notify you when it ships (typically 5-7 business days).

Manufacturing Timeline:
Day 1-3: Quality ingredient sourcing
Day 4-6: Precision blending & encapsulation
Day 7: Quality testing & packaging
```
**SMS**:
```
✅ ONES Order #12345 confirmed! Your custom formula is being made. Ships in 5-7 days.
```

---

#### ✅ Order Shipped
**Trigger**: Order status updated to "shipped" in database  
**Timing**: When admin/system marks order shipped  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Your ONES Formula Has Shipped! 📦"  
**Content**:
```
Great news! Your personalized formula is on its way.

Order #12345
Tracking: [USPS/UPS tracking number]
Estimated Delivery: [Date]

What's Inside:
• 900 capsules (3-month supply)
• Formula card with ingredient breakdown
• Dosage instructions: 10 capsules daily with meals

Track your package: [tracking URL]
```
**SMS**:
```
📦 ONES: Your formula shipped! Track: [tracking URL]
```

---

#### ✅ Order Delivered
**Trigger**: Shipping carrier confirms delivery  
**Timing**: Via shipping webhook or daily sync  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Your ONES Formula Has Arrived! 🎉"  
**Content**:
```
Your personalized supplement formula has been delivered!

Getting Started:
1. Take 10 capsules daily with food
2. Best split: 5 with breakfast, 5 with dinner
3. Set a reminder to stay consistent
4. Check in with me in 2 weeks

Questions? I'm here to help optimize your routine.
```
**SMS**:
```
🎉 ONES: Formula delivered! Start taking 10 capsules daily. Questions? Chat: https://ones.app/chat
```

---

### 3️⃣ ACCOUNT & BILLING (system)

#### ✅ Welcome Email
**Trigger**: New user completes registration  
**Timing**: Immediately after account created  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Welcome to ONES - Let's Build Your Formula 🚀"  
**Content**:
```
Welcome to ONES, [Name]!

I'm your AI supplement consultant. My job is to create a personalized formula tailored to YOUR unique health profile.

Getting Started:
1. Chat with me about your health goals
2. Share your latest lab results (optional but recommended)
3. Get your custom formula in minutes
4. Order when you're ready

Let's start: [Chat Now button]
```
**SMS**: Not sent for welcome (avoid spam)

---

#### ✅ Password Reset
**Trigger**: User requests password reset  
**Timing**: Immediately  
**Status**: ✅ LIKELY IMPLEMENTED (standard auth flow)  
**Email Subject**: "Reset Your ONES Password 🔐"  
**Content**:
```
You requested to reset your password.

Click here to reset: [Reset link - expires in 1 hour]

If you didn't request this, ignore this email.
```
**SMS**: Not sent for security reasons

---

#### ✅ Payment Failed
**Trigger**: Stripe payment fails  
**Timing**: Immediately after failed charge  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Payment Issue - Update Your Card 💳"  
**Content**:
```
We couldn't process your payment for Order #12345.

Amount: $297.00
Reason: [Card declined / Insufficient funds / Expired card]

Please update your payment method to complete your order.

Update Payment: [Link to update card]
```
**SMS**:
```
⚠️ ONES: Payment failed for order #12345. Update card: https://ones.app/orders/12345
```

---

#### ✅ Re-order Reminder (3-Month Supply Running Low)
**Trigger**: 75 days after previous 3-month order delivered  
**Timing**: Scheduled daily batch job  
**Status**: ⚠️ NOT IMPLEMENTED  
**Email Subject**: "Time to Restock Your ONES Formula 📦"  
**Content**:
```
You're running low on your 3-month supply!

Current Formula: Pete V2
Last Order: [Date]
Estimated Remaining: ~15 days

Want to reorder the same formula or update it based on how you're feeling?

[Reorder V2] [Chat to Update Formula]
```
**SMS**:
```
⚗️ ONES: Running low on your formula! Reorder or update: https://ones.app/reorder
```

---

## 🔧 Implementation Status

### ✅ Currently Working
- Notification database schema (4 types)
- Email delivery via SendGrid
- SMS delivery via Twilio
- User preference controls (email + SMS toggles)
- Test notification endpoint

### ⚠️ Not Yet Implemented
- Formula creation notifications
- Formula update notifications
- Lab analysis notifications
- Order confirmation notifications
- Shipping notifications
- Delivery notifications
- Welcome email
- Payment failure notifications
- Reorder reminders
- Check-in reminders

---

## 📊 Notification Preferences (User Control)

Users control notifications via Settings page with 3 categories × 2 channels = 6 toggles:

| Category | Email Default | SMS Default |
|----------|---------------|-------------|
| **Formula & Consultations** | ✅ ON | ❌ OFF |
| **Orders & Shipping** | ✅ ON | ❌ OFF |
| **Account & Billing** | ✅ ON | ❌ OFF |

**Why SMS defaults to OFF:**
- Requires phone number entry
- Toll-free verification required (3-5 days)
- Users opt-in explicitly for SMS

---

## 🚀 Implementation Priority

### Phase 1 (Critical - Revenue Impact)
1. **Order Confirmation** - Customer expects immediate confirmation
2. **Order Shipped** - Reduces "where's my order" support
3. **Formula Created (First Time)** - Core product experience

### Phase 2 (High Value)
4. **Formula Updated** - Keeps users engaged
5. **Lab Results Analyzed** - Unique value prop
6. **Welcome Email** - Sets expectations

### Phase 3 (Retention)
7. **Reorder Reminder** - Drives repeat purchases
8. **Delivery Confirmation** - Encourages first use
9. **Payment Failed** - Recovers lost revenue

### Phase 4 (Nice to Have)
10. **Check-in Reminders** - Increases engagement
11. **Health Insights** - Proactive recommendations

---

## 🛠️ Technical Implementation Guide

### Adding a New Notification

1. **Trigger Point** (in routes.ts):
```typescript
// After creating formula
const formula = await storage.createFormula(formulaData);

// Create notification
const notification = await storage.createNotification({
  userId,
  type: 'formula_update',
  title: `Your Personalized Formula V${formula.version} is Ready!`,
  content: `I've created your custom blend with ${formula.bases.length} ingredients...`,
  formulaId: formula.id,
  metadata: { 
    actionUrl: '/my-formula',
    icon: 'beaker',
    priority: 'high'
  }
});

// Send via email/SMS based on user preferences
const user = await storage.getUser(userId);
await sendNotificationsForUser(notification, user);
```

2. **Helper Function Handles Everything**:
   - Checks user preferences (email/SMS toggles)
   - Maps notification type to preference category
   - Sends email if enabled
   - Sends SMS if enabled + phone number exists
   - Logs skipped channels

3. **No Additional Code Needed** - Just call `sendNotificationsForUser()`

---

## 📱 SMS Delivery Notes

- **Toll-Free Number**: +18553890981 (requires verification)
- **Verification Status**: Pending (3-5 business days)
- **Character Limit**: 160 chars (or 1600 for concatenated)
- **Emoji Support**: ✅ Supported
- **Formatting**: Plain text only, include URL at end
- **Branding**: Always start with "⚗️ ONES:" for recognition

**SMS Best Practices:**
- Keep under 160 characters
- Include clear action + short URL
- Use emojis sparingly (1-2 max)
- Don't send more than 1 SMS per hour per user
- Always include opt-out language in Settings page

---

## 🎨 Email Template Guidelines

All emails use the same branded template with:
- ONES logo/branding
- Clean, minimal design
- Mobile-responsive
- Clear CTA button
- Footer with: Unsubscribe | Settings | Support

**Tone**: Friendly, conversational, health-focused  
**From**: ONES <notifications@ones.com>  
**Reply-To**: support@ones.com

---

## Next Steps

1. Implement Phase 1 notifications (order + formula creation)
2. Add Stripe webhook handlers for payment events
3. Create scheduled jobs for reminders
4. Add admin interface to trigger manual notifications
5. Build notification analytics dashboard
