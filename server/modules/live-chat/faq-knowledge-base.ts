/**
 * Live Chat FAQ Knowledge Base
 *
 * Instant answers for common questions — matched by keywords.
 * When a user message matches, the bot responds immediately
 * without needing admin intervention.
 */

export interface FaqEntry {
  id: string;
  /** Keywords that trigger this FAQ (case-insensitive, OR logic) */
  keywords: string[];
  /** Phrases that MUST appear (AND logic) — optional for tighter matching */
  requiredPhrases?: string[];
  /** The bot's instant answer */
  answer: string;
  /** Category for grouping */
  category: 'orders' | 'formula' | 'account' | 'technical' | 'general';
  /** Priority — higher = matched first when multiple FAQs match */
  priority: number;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  // ─── Orders & Shipping ────────────────────────────────────────
  {
    id: 'shipping-time',
    keywords: ['shipping', 'ship', 'deliver', 'delivery', 'how long', 'when will', 'arrive', 'transit'],
    answer: `Great question! Once your order is placed, here's the typical timeline:\n\n📦 **Processing:** 3-5 business days (your formula is custom-made)\n🚚 **Shipping:** Free on all orders\n\nYou'll receive tracking info via email once your order ships. Is there anything else about your order?`,
    category: 'orders',
    priority: 10,
  },
  {
    id: 'order-status',
    keywords: ['order status', 'track', 'tracking', 'where is my order', 'my order', 'order update'],
    answer: `You can check your order status anytime from your **Dashboard → Orders** page. If your order has shipped, you'll find a tracking link in your confirmation email.\n\nIf you need specific help with an order, please share your order number and I'll have a team member look into it right away! 📋`,
    category: 'orders',
    priority: 10,
  },
  {
    id: 'refund-return',
    keywords: ['refund', 'return', 'money back', 'cancel order', 'cancellation', 'exchange'],
    answer: `Because every Ones formula is custom-manufactured specifically for you, **we cannot offer refunds or returns** once your order has been placed and production has begun.\n\n❌ **No refunds** — your formula is made-to-order and cannot be resold\n❌ **No returns** — custom products cannot be accepted back\n\nIf your order arrives **damaged or defective**, contact us within 7 days and we'll replace it at no cost.\n\nI'll connect you with a team member if you need further help!`,
    category: 'orders',
    priority: 9,
  },
  {
    id: 'pricing',
    keywords: ['price', 'cost', 'how much', 'pricing', 'expensive', 'affordable', 'subscription', 'monthly'],
    answer: `Great question! Here's how pricing works at Ones:\n\n🔑 **Membership:** $9/month (Founding Member rate for the first 250 members — locked for life!)\n- Includes unlimited AI consultations, lab analysis, wearable data integration, and ongoing formula updates\n- No supplement purchase required\n\n💊 **Supplements:** Priced based on your unique formula\n- Depends on daily milligrams, number of ingredients, and ingredient quality\n- Typical range: $100–$200/month\n- You see your exact price before ordering — no surprises\n- Ordered as a 2-month supply\n- Free shipping on all orders\n\nWant to get started? Your AI consultation is completely free! 🧬`,
    category: 'orders',
    priority: 8,
  },

  // ─── Formula & Supplements ────────────────────────────────────
  {
    id: 'how-formula-works',
    keywords: ['how does it work', 'how it works', 'what is ones', 'how does ones', 'personalized', 'custom formula'],
    answer: `Here's how Ones works:\n\n1️⃣ **AI Consultation** — Chat with our AI practitioner about your health goals, lifestyle, and any lab results\n2️⃣ **Custom Formula** — We create a personalized supplement blend from 200+ ingredients\n3️⃣ **Made for You** — Your formula is manufactured and shipped to your door\n4️⃣ **Optimize** — Upload new labs or chat again to refine your formula over time\n\nReady to start? Head to your **Dashboard → AI Consultation**! 🧬`,
    category: 'formula',
    priority: 10,
  },
  {
    id: 'change-formula',
    keywords: ['change formula', 'update formula', 'modify formula', 'adjust formula', 'different formula', 'new formula'],
    answer: `You can update your formula anytime! Just:\n\n1. Go to **Dashboard → AI Consultation**\n2. Tell the AI what you'd like to change (new goals, symptoms, lab results)\n3. The AI will create an updated formula version\n4. Review and approve the changes\n\nEach update is versioned so you can always compare with previous formulas. 🔄`,
    category: 'formula',
    priority: 9,
  },
  {
    id: 'ingredients-quality',
    keywords: ['ingredients', 'quality', 'safe', 'safety', 'tested', 'organic', 'natural'],
    answer: `Quality is our #1 priority:\n\n✅ **200+ premium ingredients** from trusted suppliers\n🧬 **Research-backed** dosing based on clinical studies\n💊 **Clinical-grade** bioavailable forms — not cheap fillers\n📊 **AI-selected** based on your health data and published research\n\nEvery ingredient in your formula is chosen specifically for you. Want to know more about a specific ingredient?`,
    category: 'formula',
    priority: 8,
  },
  {
    id: 'side-effects',
    keywords: ['side effect', 'side effects', 'interact', 'interaction', 'medication', 'safe to take', 'pregnant', 'nursing'],
    answer: `Your safety is our top priority. Important notes:\n\n⚕️ Our AI considers potential interactions during consultation\n💊 Always tell the AI about any medications you're taking\n🤰 If pregnant, nursing, or on medication, consult your doctor first\n📞 Our team can review your formula with you\n\nI'll connect you with a team member for a personalized safety review. They'll be with you shortly!`,
    category: 'formula',
    priority: 10,
  },

  // ─── Account & Technical ──────────────────────────────────────
  {
    id: 'reset-password',
    keywords: ['password', 'reset password', 'forgot password', 'can\'t login', 'cant login', 'locked out', 'sign in'],
    answer: `To reset your password:\n\n1. Go to the **Login** page\n2. Click **"Forgot Password?"**\n3. Enter your email address\n4. Check your inbox for the reset link\n\n📧 Don't see the email? Check your spam folder. If you're still having trouble, I'll get a team member to help you right away!`,
    category: 'account',
    priority: 9,
  },
  {
    id: 'delete-account',
    keywords: ['delete account', 'remove account', 'close account', 'deactivate', 'privacy', 'data deletion', 'gdpr'],
    answer: `We respect your data privacy. To manage your account:\n\n🔒 **Data export:** Available in Account Settings\n❌ **Account deletion:** Contact our team and we'll process it within 48 hours\n📋 **Privacy policy:** Available at ones.health/privacy\n\nI'll connect you with a team member who can assist with your request.`,
    category: 'account',
    priority: 8,
  },
  {
    id: 'upload-labs',
    keywords: ['upload', 'lab', 'labs', 'blood test', 'blood work', 'test results', 'pdf', 'report'],
    answer: `You can upload lab results directly in your AI consultation! Here's how:\n\n1. Go to **Dashboard → AI Consultation**\n2. Click the **📎 upload button** in the chat\n3. Select your PDF or image file\n4. The AI will automatically analyze your results\n\nWe support PDF, JPG, and PNG formats. Your data is encrypted and stored securely. 🔐`,
    category: 'technical',
    priority: 9,
  },
  {
    id: 'wearable-connect',
    keywords: ['wearable', 'fitbit', 'oura', 'whoop', 'apple watch', 'garmin', 'sync', 'connect device'],
    answer: `We support several wearable integrations:\n\n⌚ **Fitbit** — Activity, sleep, heart rate\n💍 **Oura Ring** — Sleep, readiness, activity\n🏋️ **Whoop** — Strain, recovery, sleep\n\nConnect your device: **Dashboard → Wearables**\n\nYour biometric data helps our AI fine-tune your formula based on real-world health metrics! 📊`,
    category: 'technical',
    priority: 8,
  },

  // ─── General ──────────────────────────────────────────────────
  {
    id: 'contact-human',
    keywords: ['talk to human', 'real person', 'agent', 'representative', 'speak to someone', 'talk to someone', 'human'],
    answer: `Absolutely! I'm connecting you with a team member right now. They'll be with you shortly.\n\nIn the meantime, feel free to share more details about what you need help with — it'll help them assist you faster! 🙋`,
    category: 'general',
    priority: 10,
  },
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    answer: `Hey there! 👋 Welcome to Ones support. I'm here to help!\n\nHere are some things I can help with:\n• 📦 Order status & shipping\n• 🧬 Formula questions\n• 🔧 Account & technical help\n• 💬 Connect you with our team\n\nWhat can I help you with today?`,
    category: 'general',
    priority: 5,
  },
  {
    id: 'thanks',
    keywords: ['thank', 'thanks', 'thank you', 'thx', 'appreciate', 'helpful'],
    answer: `You're welcome! 😊 Happy to help. Is there anything else I can assist you with?\n\nIf not, feel free to close this chat anytime. Have a great day!`,
    category: 'general',
    priority: 3,
  },
];

/**
 * Quick-start topic buttons shown when chat opens.
 */
export interface QuickTopic {
  id: string;
  label: string;
  emoji: string;
  message: string;
}

export const QUICK_TOPICS: QuickTopic[] = [
  { id: 'order', label: 'Order Status', emoji: '📦', message: "I'd like to check on my order status." },
  { id: 'formula', label: 'Formula Questions', emoji: '🧬', message: "I have a question about my supplement formula." },
  { id: 'account', label: 'Account Help', emoji: '👤', message: "I need help with my account." },
  { id: 'technical', label: 'Technical Issue', emoji: '🔧', message: "I'm experiencing a technical issue." },
  { id: 'consultation', label: 'AI Consultation', emoji: '🤖', message: "I'd like help with my AI consultation." },
  { id: 'other', label: 'Something Else', emoji: '💬', message: "I need help with something else." },
];

/**
 * Match a user message against the FAQ knowledge base.
 * Returns the best-matching FAQ entry, or null if no match.
 */
export function matchFaq(userMessage: string): FaqEntry | null {
  const lower = userMessage.toLowerCase().trim();

  // Skip very short messages (greetings are handled separately)
  if (lower.length < 2) return null;

  let bestMatch: FaqEntry | null = null;
  let bestScore = 0;

  for (const faq of FAQ_ENTRIES) {
    // Check required phrases first (AND logic)
    if (faq.requiredPhrases) {
      const allPresent = faq.requiredPhrases.every(phrase =>
        lower.includes(phrase.toLowerCase())
      );
      if (!allPresent) continue;
    }

    // Count matching keywords
    let matchCount = 0;
    for (const keyword of faq.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Score = keyword matches * priority (more matches + higher priority = better)
      const score = matchCount * faq.priority;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }
  }

  return bestMatch;
}
