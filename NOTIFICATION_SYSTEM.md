# ONES Notification System - Simple & Essential

## Philosophy
**Only send notifications that add real value:**
1. User is NOT on the platform (no real-time chat notifications)
2. User needs to take action (payment failed, track shipment)
3. User benefits from a reminder (daily pills, reorder alert)

---

## 📬 All Notifications (8 Total)

### 1️⃣ DAILY REMINDERS

#### **Daily Pill Reminder + Personalized Tip**
- **Channel**: SMS only (no email)
- **Trigger**: Scheduled daily at user's preferred time (default 9:00 AM)
- **Status**: ⚠️ NOT IMPLEMENTED
- **Example**:
  ```
  ⚗️ ONES: Time for your 10 capsules!
  
  💡 Tip: Your Omega-3 absorbs better with fatty foods like eggs or avocado.
  ```

**Personalization:**
- Analyze user's current formula ingredients
- Generate 1 unique tip daily based on their specific blend:
  - Absorption tips ("Magnesium glycinate works best with food")
  - Timing tips ("Vitamin D pairs well with morning sunlight")
  - Synergy tips ("Your B-Complex supports your CoQ10's energy benefits")
- Rotate tips intelligently (never repeat within 7 days)

**User Controls (Settings Page):**
- Toggle: "Daily SMS Reminder" (ON/OFF) - maps to `smsConsultation` preference
- Time Picker: "Reminder Time" (9:00 AM default)

---

### 2️⃣ ORDERS & SHIPPING

#### **Order Confirmation**
- **Channels**: Email + SMS
- **Trigger**: Stripe checkout completed successfully
- **Status**: ⚠️ NOT IMPLEMENTED

**Email:** "Order Confirmed - Your Formula is Being Made ✅"
```
Thank you for your order!

Order #12345
Formula: Pete V2
Quantity: 3-month supply (900 capsules)
Price: $297.00

Your custom blend is being manufactured with pharmaceutical-grade ingredients.
Ships in 5-7 business days.
```

**SMS:**
```
✅ ONES Order #12345 confirmed! Your custom formula is being made. Ships in 5-7 days.
```

---

#### **Order Shipped**
- **Channels**: Email + SMS
- **Trigger**: Order status → "shipped" in database
- **Status**: ⚠️ NOT IMPLEMENTED

**Email:** "Your Formula Has Shipped! 📦"
```
Your personalized formula is on its way.

Order #12345
Tracking: [tracking link]
Estimated Delivery: [date]

What's Inside:
• 900 capsules (3-month supply)
• Formula card with ingredient breakdown
• Dosage instructions
```

**SMS:**
```
📦 ONES: Your formula shipped! Track: [short URL]
```

---

#### **Order Delivered**
- **Channels**: Email + SMS
- **Trigger**: Shipping carrier confirms delivery (webhook or daily sync)
- **Status**: ⚠️ NOT IMPLEMENTED

**Email:** "Your Formula Has Arrived! 🎉"
```
Your personalized supplement formula has been delivered!

Getting Started:
1. Take 10 capsules daily with food
2. Best split: 5 with breakfast, 5 with dinner
3. Enable daily SMS reminders in Settings
```

**SMS:**
```
🎉 ONES: Formula delivered! Start 10 capsules daily (5 breakfast, 5 dinner).
```

---

#### **Reorder Reminder - Standard**
- **Channels**: Email + SMS
- **Trigger**: 75 days after 3-month order delivered (15 days remaining)
- **Status**: ⚠️ NOT IMPLEMENTED

**Email:** "Time to Restock Your Formula 📦"
```
You're running low on your 3-month supply!

Current Formula: Pete V2
Last Order: [date]
Estimated Remaining: ~15 days

[Reorder V2 Button] [Update Formula Button]
```

**SMS:**
```
⚗️ ONES: ~15 days of formula left! Reorder V2: [link]
```

---

#### **🔮 FUTURE: AI-Optimized Reorder (with Oura Ring)**
- **Trigger**: 7-10 days before reorder needed
- **Process**:
  1. Pull 3 months of Oura Ring data (sleep, HRV, activity, recovery)
  2. AI analyzes trends + current formula
  3. Generate updated formula if beneficial changes identified
  4. Notify user: "Updated formula ready based on your Oura data"
- **Status**: 🚀 FUTURE FEATURE (requires Oura API integration)

**Email:** "Updated Formula Ready - Personalized with Your Oura Data 🔬"
```
I've analyzed 3 months of your Oura Ring data and optimized your formula:

Key Insights from Your Data:
• Sleep quality improving (+12% deep sleep)
• HRV trending up (stress decreasing)
• Recovery scores strong (avg 82/100)

Recommended Changes for Pete V3:
✅ Keep: Heart Support, Omega-3 (supporting your great HRV)
➕ Add: L-Theanine 200mg (to enhance your improving sleep)
➖ Reduce: Ashwagandha 300mg→150mg (stress already improving)

New Formula: Pete V3 (5,200mg / 11 capsules)
[Review & Order V3] [Keep Current V2]
```

**SMS:**
```
⚗️ ONES: Formula V3 ready! Optimized based on your Oura data (sleep +12%, HRV improving). Review: [link]
```

**Technical Requirements:**
- Oura Ring API integration
- Scheduled job: Check all users 7-10 days before reorder due
- If user has connected Oura:
  - Pull past 90 days of data
  - Send to AI with current formula + health profile
  - AI generates updated formula if warranted
  - Create notification with data-driven insights
- If no Oura or no beneficial changes: Send standard reorder reminder

---

### 3️⃣ ACCOUNT & BILLING

#### **Password Reset**
- **Channel**: Email only (security)
- **Trigger**: User requests password reset
- **Status**: ✅ PROBABLY IMPLEMENTED (standard auth)

**Email:** "Reset Your ONES Password 🔐"
```
Click to reset your password: [link - expires in 1 hour]

If you didn't request this, ignore this email.
```

---

#### **Payment Failed**
- **Channels**: Email + SMS
- **Trigger**: Stripe payment failure webhook
- **Status**: ⚠️ NOT IMPLEMENTED

**Email:** "Payment Issue - Update Your Card 💳"
```
We couldn't process your payment for Order #12345.

Amount: $297.00
Reason: [Card declined / Insufficient funds]

Update your payment method to complete your order.
[Update Payment Button]
```

**SMS:**
```
⚠️ ONES: Payment failed for order #12345. Update card: [link]
```

---

## 🎛️ User Preference Controls

Users control notifications via Settings page:

| Category | Email Default | SMS Default | Controls |
|----------|---------------|-------------|----------|
| **Daily Reminders** | ❌ OFF | ❌ OFF | Daily pill reminder + tip |
| **Orders & Shipping** | ✅ ON | ❌ OFF | Order, shipping, delivery, reorder |
| **Account & Billing** | ✅ ON | ❌ OFF | Password reset, payment issues |

**Database Fields:**
- `emailConsultation` - Controls daily reminders via email (not used currently)
- `smsConsultation` - Controls daily reminders via SMS
- `emailShipping` - Controls order/shipping emails
- `smsShipping` - Controls order/shipping SMS
- `emailBilling` - Controls account/billing emails
- `smsBilling` - Controls account/billing SMS

**Why SMS defaults OFF:**
- Requires phone number entry
- Requires user opt-in
- Twilio toll-free verification pending (3-5 days)

---

## 📊 What's NOT Notified (By Design)

### ❌ Formula Created/Updated During Chat
**Why**: User is already on the platform watching it happen in real-time. Sending an email/SMS would be redundant noise.

### ❌ Lab Results Analyzed
**Why**: Happens in real-time during chat. User sees results immediately.

### ❌ Welcome Email
**Why**: Will be handled by Klaviyo for better marketing automation + onboarding sequences.

### ❌ Health Check-ins
**Why**: Unnecessary noise. Users can chat anytime. Let them initiate, don't nag.

### ❌ "Formula Insights" or "Proactive Tips"
**Why**: Too spammy. Daily reminder tip is enough personalization.

---

## 🚀 Implementation Priority

### **Phase 1: Core Transactions** (Do First)
1. Order confirmation - Customer expects this immediately
2. Order shipped - Reduces "where is it?" support tickets
3. Payment failed - Recovers revenue

### **Phase 2: Retention**
4. Order delivered - Encourages first dose
5. Reorder reminder (standard) - Drives repeat purchases
6. Daily pill reminder - Habit formation

### **Phase 3: Future Innovation**
7. AI-optimized reorder with Oura Ring integration

---

## 🛠️ Technical Implementation

### Existing Infrastructure
✅ SendGrid configured & working  
✅ Twilio configured & working (pending toll-free verification)  
✅ `sendNotificationsForUser()` helper function  
✅ Preference checking logic  
✅ Database schema supports all notification types  

### Adding a New Notification

Example: Order Confirmation

```typescript
// In routes.ts - After Stripe checkout success
app.post('/api/checkout/success', async (req, res) => {
  const { sessionId } = req.body;
  
  // ... create order in database ...
  
  const order = await storage.createOrder({
    userId,
    formulaId,
    quantity,
    price,
    status: 'processing'
  });
  
  // Create notification
  const notification = await storage.createNotification({
    userId,
    type: 'order_update',
    title: 'Order Confirmed',
    content: `Thank you for your order! Your custom formula is being made. Ships in 5-7 days.`,
    orderId: order.id,
    metadata: { 
      actionUrl: `/orders/${order.id}`,
      orderNumber: order.orderNumber
    }
  });
  
  // Send email + SMS (based on user preferences)
  const user = await storage.getUser(userId);
  await sendNotificationsForUser(notification, user);
  
  res.json({ success: true });
});
```

**That's it!** The `sendNotificationsForUser()` function handles:
- Fetching user preferences
- Checking if email/SMS enabled for `order_update` type
- Sending via SendGrid/Twilio
- Logging what was sent/skipped

---

## 📝 Daily Reminder Implementation Notes

### Scheduled Job Requirements
- **Cron job**: Runs every minute (checks all users)
- **Logic**:
  1. Find all users with `smsConsultation = true`
  2. Check their `reminderTime` preference
  3. If current time matches their reminder time:
     - Get user's current formula
     - Generate personalized tip based on ingredients
     - Send SMS (not email)
     - Track last sent date to avoid duplicates

### Tip Generation
Use OpenAI API to generate tips:
```typescript
const tipPrompt = `
User's formula ingredients: ${formula.bases.map(b => b.ingredient).join(', ')}

Generate ONE short, actionable health tip (max 100 chars) about their specific ingredients.
Focus on absorption, timing, or synergies. Keep it fresh and helpful.
`;

const tip = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: tipPrompt }],
  max_tokens: 50
});
```

### Settings Page Updates Needed
1. Add "Daily Reminder" section
2. Add toggle: "Enable Daily SMS Reminder"
3. Add time picker: "Reminder Time" (default 9:00 AM)
4. Store in user preferences table

---

## Next Steps

**To implement Phase 1 (Core Transactions):**
1. Add Stripe webhook handlers
2. Hook into order creation flow
3. Hook into shipping status updates
4. Test with real Stripe test mode transactions

**To implement Daily Reminders:**
1. Set up cron job (node-cron or external scheduler)
2. Add tip generation logic
3. Update Settings UI with time picker
4. Test SMS delivery (once Twilio verified)

**For Oura Integration (Future):**
1. Research Oura Ring API
2. Add OAuth flow for connecting Oura account
3. Build data sync + analysis pipeline
4. Integrate into reorder logic
