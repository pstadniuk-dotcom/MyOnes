import { db } from './infrastructure/database/db';
import { helpArticles, faqItems } from '../shared/schema';

const helpArticlesData = [
  {
    category: 'Getting Started',
    title: 'Creating Your Account and Setting Up Your Profile',
    content: `Welcome to Ones AI! Creating your account takes just a few minutes. The more complete your profile, the better your personalized supplement recommendations will be.

CREATING YOUR ACCOUNT

Visit myones.ai and click "Get Started". Enter your name, email address, and create a password. We recommend adding your phone number for order tracking and optional pill reminders.

After signing up, check your email for a verification link. Click it to activate your account. If you don't see the email, check your spam folder.

SETTING UP YOUR HEALTH PROFILE

Once logged in, the AI guides you through a health assessment. This takes 10-15 minutes and covers important areas of your health.

The AI asks about your age, sex, height, and weight to calculate safe dosages. You'll share lifestyle details like sleep hours, exercise frequency, stress levels, smoking status, and alcohol consumption.

Most importantly, list all medications you take, allergies you have, and current health conditions. This is critical - the AI never recommends anything that could interact with your medications or trigger allergies.

Finally, describe your health goals and symptoms you want to address. Be specific about what you hope to achieve.

UPLOADING LAB RESULTS

Lab results are optional but highly recommended. They allow the AI to see your exact nutrient levels instead of making educated guesses.

Upload PDF files or clear photos of your blood work. The AI automatically extracts biomarker values and adjusts recommendations based on your results.

If you don't have recent labs, you can ask your doctor or use direct-to-consumer services like Function Health.

NEED HELP?

Email support@myones.ai for assistance with account setup or profile questions.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'How to Start Your First AI Consultation',
    content: `Your AI consultation is where your personalized formula gets created. The AI analyzes your health profile, reviews research, and creates a custom supplement blend tailored to your needs.

BEFORE YOU START

Complete your health profile including all medications, allergies, and health conditions. Upload lab results if you have them - this significantly improves accuracy.

If you're currently taking supplements, have their names and dosages ready. The AI needs to know what you're already taking.

STARTING THE CONSULTATION

Log into your dashboard and click "Consultation" in the sidebar. The AI will greet you and begin the conversation.

The consultation is conversational and typically takes 10-20 minutes. You can pause and resume anytime.

WHAT TO EXPECT

The AI reviews your profile and asks clarifying questions about your health goals and symptoms. Be specific and thorough in your responses.

If you have lab results, the AI analyzes them to identify deficiencies and create precise dosage recommendations.

The AI considers your medications to avoid interactions and checks for any contraindications based on your health conditions.

GETTING YOUR FORMULA

After gathering all necessary information, the AI creates your personalized formula. This combines ingredients from our catalog of 32 system supports and 29 individual ingredients.

You'll see exactly what's in your formula, why each ingredient was included, and the recommended dosage. The AI explains the science behind each recommendation.

Review your formula carefully. If you have questions or want adjustments, just ask the AI. You can request changes anytime.

NEXT STEPS

Once you're satisfied with your formula, you can place your first order. Choose from 1-month, 3-month, or 6-month supplies.

You can return to the consultation anytime to request formula adjustments or ask health questions.

NEED HELP?

Email support@myones.ai if you have trouble with the consultation process.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Understanding Your Personalized Formula',
    content: `Your formula is a custom blend created specifically for you. Every ingredient and dosage is chosen based on your unique health profile.

HOW YOUR FORMULA IS CREATED

The AI analyzes your health data including age, weight, medical conditions, medications, lab results, and health goals. It reviews scientific research on ingredient effectiveness and safety.

Your formula combines system supports and individual ingredients from our approved catalog. The AI calculates precise dosages based on your body and needs.

Every formula is validated against safety limits. Maximum total dosage is 5500mg per day, with minimum 50mg per ingredient.

READING YOUR FORMULA

Each ingredient in your formula includes its name, dosage amount, and why it was included for you. system supports show their total amount (for example, "Heart Support - 450mg").

The formula view shows all ingredients, safety metrics, and detailed information about each component.

FORMULA VERSIONS

Each time you request changes, a new formula version is created. Your previous versions are saved and you can view or order any past formula.

The newest formula is selected by default, but you can switch between versions anytime.

ADJUSTING YOUR FORMULA

Return to the AI consultation whenever you want to make changes. Tell the AI what you want to add, remove, or adjust.

Upload new lab results to get updated recommendations. The AI automatically adjusts dosages based on your latest biomarker values.

SAFETY AND QUALITY

All ingredients meet pharmaceutical-grade quality standards. Your formula is manufactured in certified facilities following strict quality protocols.

The AI continuously monitors for medication interactions and contraindications. If you add new medications to your profile, review your formula for potential issues.

QUESTIONS ABOUT YOUR FORMULA?

Ask the AI to explain any ingredient or dosage. You can also email support@myones.ai with specific questions.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Uploading and Understanding Lab Results',
    content: `Lab results dramatically improve the accuracy of your personalized formula. They show your exact nutrient levels and help the AI create precise recommendations.

WHY UPLOAD LABS

Without labs, the AI makes educated guesses based on symptoms and health profile. With labs, it sees your actual biomarker values.

This allows the AI to identify specific deficiencies, calculate exact dosages needed to reach optimal levels, and track your progress over time.

WHAT LAB RESULTS TO UPLOAD

Any standard blood panel works - LabCorp, Quest Diagnostics, Function Health, or your doctor's lab results.

Common useful tests include complete blood count, comprehensive metabolic panel, lipid panel, vitamin D, B12, folate, iron/ferritin, and thyroid hormones.

HOW TO UPLOAD

Go to your dashboard and navigate to Profile > Lab Reports. Click "Upload Lab Results" and select your PDF file or photo of paper results.

The AI processes your upload in 10-30 seconds, automatically extracting all biomarker values using advanced OCR technology.

WHAT HAPPENS AFTER UPLOAD

The AI extracts biomarker values and flags anything outside optimal ranges. It analyzes patterns and connections between related markers.

Your formula recommendations update immediately based on the new data. You can review all extracted values and make corrections if needed.

GETTING LABS IF YOU DON'T HAVE ANY

Ask your doctor to order comprehensive bloodwork during your next visit. Or use direct-to-consumer services like Function Health that don't require doctor orders.

PRIVACY AND SECURITY

All lab data is encrypted and stored securely. We never share your health information with third parties.

QUESTIONS?

Email support@myones.ai for help with lab uploads or questions about your results.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Ingredient Safety and Quality Standards',
    content: `Your safety is our top priority. Every ingredient in your formula meets strict quality and safety standards.

OUR INGREDIENT CATALOG

We offer 32 system supports and 29 individual ingredients. Every ingredient has been carefully selected based on scientific research and safety data.

system supports support specific body systems like adrenal function, digestion, cardiovascular health, and immune function. Individual ingredients include targeted nutrients and botanicals.

QUALITY STANDARDS

All ingredients are pharmaceutical-grade and tested for purity, potency, and contaminants. We source from certified suppliers who follow Good Manufacturing Practices.

Each batch is tested to verify it meets label claims and contains no harmful substances.

SAFETY VALIDATION

Before creating your formula, the AI checks every potential ingredient against your medications for interactions. It verifies dosages are within safe ranges for your age, weight, and health conditions.

The system enforces a maximum total daily dosage of 5500mg and minimum 50mg per ingredient to ensure both safety and effectiveness.

INGREDIENT INTERACTIONS

The AI analyzes how ingredients work together. It avoids combinations that could interfere with each other or cause adverse effects.

Your formula is designed so all ingredients complement each other and support your health goals.

IF YOU HAVE CONCERNS

Always consult your doctor before starting any new supplement, especially if you take prescription medications or have serious health conditions.

Share your formula details with your healthcare provider. You can download a complete ingredient list from your dashboard.

REPORTING ISSUES

If you experience any side effects, stop taking your formula and contact support@myones.ai immediately. The AI can adjust your formula to remove problematic ingredients.

QUESTIONS?

Email support@myones.ai for detailed ingredient information or safety questions.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'How to Adjust Your Formula Over Time',
    content: `Your health needs change over time. Ones AI makes it easy to adjust your formula as your goals, health status, or lab results change.

WHEN TO ADJUST YOUR FORMULA

Consider adjustments when you upload new lab results, start or stop medications, achieve your initial health goals, or develop new health concerns.

You can also adjust if you're not seeing expected results or experience any side effects.

HOW TO REQUEST CHANGES

Return to the AI consultation anytime. Simply tell the AI what you want to change - add ingredients, remove ingredients, adjust dosages, or address new health goals.

The AI creates a new formula version incorporating your requested changes while maintaining safety and effectiveness.

UPDATING WITH NEW LAB RESULTS

When you upload new labs, the AI analyzes changes in your biomarkers. If nutrient levels have improved, it may reduce those dosages. If new deficiencies appear, it adds appropriate support.

The AI shows you what changed and why, helping you understand your health progress.

FORMULA VERSION HISTORY

Every formula change creates a new version. All previous versions are saved so you can see your formula evolution over time.

You can view, compare, or reorder any previous formula version from your dashboard.

OPTIMIZING YOUR FORMULA

After 60-90 days on a formula, consider uploading new labs to assess progress. The AI can fine-tune dosages based on how your body responded.

If certain symptoms improved, you might reduce those ingredients. If progress is slower than expected, the AI might increase dosages or add complementary ingredients.

SAFETY WITH FORMULA CHANGES

Every formula adjustment goes through the same safety checks as your original formula. The AI verifies medication interactions, dosage safety, and ingredient compatibility.

QUESTIONS ABOUT ADJUSTMENTS?

Email support@myones.ai for guidance on when and how to adjust your formula.`,
    displayOrder: 4,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Understanding the Science Behind Your Recommendations',
    content: `Every ingredient in your formula is backed by scientific research. The AI doesn't guess - it analyzes evidence from thousands of clinical studies.

HOW THE AI ANALYZES RESEARCH

The AI reviews peer-reviewed studies on ingredient effectiveness for specific health conditions. It considers study quality, sample sizes, and clinical outcomes.

Dosage recommendations come from research showing what amounts produce meaningful health benefits. The AI matches these to your specific needs and health profile.

EVIDENCE-BASED FORMULATION

Each ingredient in your formula has published research supporting its use for your health goals. The AI cross-references this with your biomarker levels and symptoms.

For example, if your lab results show low vitamin D and you report fatigue, the AI considers research linking vitamin D deficiency to low energy. It calculates the dosage needed to raise your levels to the optimal range.

ASKING ABOUT THE SCIENCE

You can ask the AI to explain the research behind any ingredient or dosage. It will cite specific studies and explain the evidence in simple terms.

The AI can also discuss potential benefits, typical timeframes for results, and what the research says about safety.

PERSONALIZATION BEYOND RESEARCH

While research guides ingredient selection, your formula is personalized to your body. The AI adjusts research-based dosages for your age, weight, sex, and other individual factors.

It also considers how ingredients interact with your medications and health conditions, even if those specific combinations aren't in published studies.

LIMITATIONS AND REALISTIC EXPECTATIONS

Supplements support health but aren't miracle cures. The AI sets realistic expectations based on what research shows is achievable.

Results take time. Most ingredients require 30-60 days of consistent use to produce noticeable benefits.

QUESTIONS ABOUT THE SCIENCE?

Ask the AI to explain the research for any recommendation. You can also email support@myones.ai for detailed scientific references.`,
    displayOrder: 5,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Managing Side Effects and Interactions',
    content: `While most ingredients are well-tolerated, some people experience side effects. Here's how to manage them and when to seek help.

COMMON MILD SIDE EFFECTS

Some ingredients may cause temporary digestive changes, especially when starting. Taking supplements with food usually helps.

Headaches or mild discomfort sometimes occur as your body adjusts. These typically resolve within a few days.

REDUCING SIDE EFFECTS

Start with half your recommended dose for the first few days, then gradually increase. This helps your body adjust.

Take supplements with meals to minimize digestive discomfort. Splitting your daily dose across multiple times can also help.

WHEN TO STOP

Stop taking your formula immediately if you experience severe allergic reactions, persistent nausea or vomiting, unusual bleeding or bruising, or any severe or concerning symptoms.

Contact your doctor if symptoms are serious. Email support@myones.ai to report the issue and request formula adjustments.

MEDICATION INTERACTIONS

The AI automatically checks your medications for interactions when creating your formula. However, you should always consult your doctor before starting supplements, especially if you take blood thinners, blood pressure medications, diabetes medications, thyroid medications, or immunosuppressants.

If you start new medications, update your profile and have the AI review your formula for potential interactions.

ADJUSTING YOUR FORMULA

If specific ingredients cause problems, tell the AI which ones. It can remove them and substitute alternatives that provide similar benefits without the side effects.

The AI maintains your health benefits while removing problematic ingredients.

WORKING WITH YOUR DOCTOR

Share your complete formula details with your healthcare provider. Download the ingredient list from your dashboard to bring to appointments.

Your doctor can help monitor how supplements affect your health conditions and medications.

QUESTIONS OR CONCERNS?

Email support@myones.ai to report side effects or ask about ingredient concerns. We take all safety issues seriously.`,
    displayOrder: 6,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Understanding Pricing and Payment Options',
    content: `Ones AI offers flexible, transparent pricing with no subscriptions or hidden fees. You make one-time purchases and control exactly when you order.

HOW PRICING WORKS

Your formula price depends on which ingredients it contains and the total amount. Some ingredients cost more than others based on sourcing and quality.

You'll see the exact price before checkout with no surprises. Pricing is transparent and based on the actual cost of your custom formula.

SUPPLY OPTIONS

Choose from three supply lengths:

1-month supply at standard pricing
3-month supply saves 10%
6-month supply saves 15% plus free shipping

Longer supplies offer better value and ensure you don't run out.

NO SUBSCRIPTIONS

Ones AI is NOT a subscription service. We never auto-charge you or send unexpected shipments.

When you're running low, simply log in and place a new order. You decide when and what to buy.

PAYMENT METHODS

We accept all major credit cards and debit cards. Payments are processed securely through Stripe.

Your payment information is encrypted and never stored on our servers.

DISCOUNTS AND PROMOTIONS

Watch for promotional offers via email. We occasionally offer discounts on larger supply orders or for new customers.

WHAT'S INCLUDED IN THE PRICE

Your formula price includes all ingredients, custom manufacturing, quality testing, and packaging. Shipping is free on 6-month supplies or standard rates apply for smaller orders.

PRICE CHANGES

If you change your formula, the price may change depending on which ingredients are added or removed. You'll see the new price before confirming any order.

QUESTIONS ABOUT PRICING?

Email support@myones.ai for help understanding your formula pricing or payment options.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Tracking Your Order and Delivery',
    content: `Once you place your order, we'll keep you updated every step of the way from manufacturing to your doorstep.

ORDER PROCESSING

Custom formulas are made fresh for you. Manufacturing takes 2-3 business days after you place your order.

You'll receive an email confirmation immediately after ordering with your order number and details.

SHIPPING NOTIFICATION

When your order ships, you'll receive tracking information via email and SMS (if you provided a phone number).

The tracking link lets you see exactly where your package is and when it will arrive.

DELIVERY TIMEFRAME

Standard shipping takes 5-7 business days via USPS or UPS after your order ships. Total time from order to delivery is typically 7-10 business days.

6-month supplies include free shipping. Expedited shipping options are available at checkout for faster delivery.

TRACKING YOUR ORDER

Log into your dashboard and go to Orders to see all your order history. Click any order to view its current status and tracking information.

The tracking number works with USPS or UPS tracking websites for detailed delivery updates.

DELIVERY ISSUES

If your package shows delivered but you didn't receive it, check with neighbors or your building's mail room. Sometimes carriers mark packages delivered before they actually arrive.

Contact support@myones.ai within 7 days if your package doesn't arrive. We'll investigate and send a replacement if needed.

ADDRESS CHANGES

You can update your shipping address before your order ships. Go to your profile settings to change your default address.

If your order already shipped, contact support@myones.ai immediately. We may be able to redirect it.

INTERNATIONAL SHIPPING

Currently we only ship within the United States. International shipping may be available in the future.

QUESTIONS?

Email support@myones.ai for help tracking your order or delivery questions.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Refunds, Returns, and Replacements',
    content: `Ones AI formulas are custom-made specifically for you. Understanding our policies helps set proper expectations.

OUR REFUND POLICY

Custom formulas are made to order and cannot be resold. We generally cannot offer refunds for change of mind or if you decide you don't want the formula.

However, we provide full refunds for manufacturing defects, shipping errors where you received the wrong product, or products damaged in transit.

DAMAGED OR DEFECTIVE PRODUCTS

If you receive damaged capsules, defective packaging, missing doses, or products with quality issues, contact support@myones.ai within 30 days.

Provide your order number and photos of the issue. We'll send a free replacement immediately. No return shipping needed.

FORMULA NOT WORKING?

If your formula isn't producing the expected results, don't request a refund. Instead, return to the AI consultation to request adjustments.

The AI can modify your formula to better address your needs. We're committed to getting your formula right, even if it takes several iterations.

REPLACEMENT PROCESS

Email support@myones.ai with your order number and description of the issue. Include photos if relevant.

We typically respond within 24 hours. Approved replacements ship within 2-3 business days.

WHAT'S NOT COVERED

We cannot refund or replace products if you changed your mind after ordering, found a different formula you prefer, experienced mild side effects, or didn't see results as quickly as hoped.

For these situations, we offer formula adjustments through the AI consultation instead.

SATISFACTION COMMITMENT

While we can't refund custom orders, we're committed to creating formulas that work for you. The AI will adjust your formula as many times as needed to achieve your health goals.

QUESTIONS ABOUT OUR POLICY?

Email support@myones.ai to discuss specific situations or concerns.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Troubleshooting Login and Account Access Issues',
    content: `Having trouble accessing your account? Here are solutions to common login problems.

FORGOT PASSWORD

On the login page, click "Forgot Password". Enter your email address and check your inbox for a reset link.

Click the link to create a new password. Check your spam folder if you don't see the email within 10 minutes.

Your password must be at least 8 characters and include letters and numbers.

EMAIL NOT RECOGNIZED

If the system says your email isn't found, check for typos in the email address. Try any alternate email addresses you might have used.

If you're sure the email is correct but it's not recognized, you may need to create a new account. Contact support@myones.ai if you believe you have an existing account but can't access it.

RESET EMAIL NOT ARRIVING

Check your spam and junk folders. Add support@myones.ai to your contacts to prevent future emails from being filtered.

Wait 5-10 minutes before requesting another reset. If still no email, try a different browser or device.

ACCOUNT LOCKED

After 5 failed login attempts, your account locks for 30 minutes as a security measure.

Wait 30 minutes and try again, use the password reset feature, or contact support@myones.ai if you need immediate access.

BROWSER ISSUES

Clear your browser cache and cookies, then restart your browser and try again.

Try a different browser. Chrome, Firefox, Safari, and Edge all work well with Ones AI. Internet Explorer is not supported.

TWO-FACTOR AUTHENTICATION

If you enabled two-factor authentication, you'll need your authentication code to log in. Use your authenticator app to get the current code.

Lost access to your authenticator? Contact support@myones.ai for help recovering your account.

STILL CAN'T LOG IN?

Email support@myones.ai with your email address and description of the problem. Include any error messages you're seeing. We'll respond within 24 hours.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'File Upload Issues and Solutions',
    content: `Having trouble uploading lab results? Here are solutions to common upload problems.

SUPPORTED FILE TYPES

We accept PDF files, JPG images, and PNG images. Maximum file size is 10MB.

If you have a different format, convert it to PDF or take a clear photo and save as JPG.

FILE TOO LARGE

If your file exceeds 10MB, use an online tool to compress it. Search for "compress PDF" or "reduce image size" to find free tools.

For photos, reduce the image quality or resolution before uploading.

UPLOAD NOT WORKING

Refresh the page and try again. Clear your browser cache if refreshing doesn't help.

Try a different browser. Chrome tends to work best for uploads.

Disable any ad blockers or browser extensions that might interfere. Try incognito or private browsing mode.

UPLOAD FREEZING OR STUCK

If the upload bar doesn't move, wait 2-3 minutes. Large files take time to process.

Check your internet connection. Slow or unstable connections can cause upload failures.

Close other tabs and programs to free up system resources, then try again.

OCR NOT READING YOUR FILE

For PDF files, ensure it's a text-based PDF, not a scanned image saved as PDF. Try re-exporting from the original source.

For photos, ensure good lighting with no glare or shadows. Hold your camera steady and capture the entire page. Use high resolution and make sure all text is readable.

Avoid photos taken at an angle. Position the document flat and photograph straight-on.

MOBILE UPLOADS

On mobile, use your device's back camera for better quality. Ensure good lighting and hold the phone steady.

Connect to WiFi for faster, more reliable uploads.

Take clear photos of each page separately if you have multi-page results.

STILL HAVING PROBLEMS?

Email support@myones.ai with a screenshot of any error message. Include details about your file type, size, and what browser you're using.

We'll help troubleshoot the issue and may be able to process your labs manually if needed.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Browser Compatibility and Requirements',
    content: `Ones AI works best on modern browsers with up-to-date software. Here's what you need to know.

RECOMMENDED BROWSERS

Chrome 90 or newer (recommended)
Firefox 88 or newer
Safari 14 or newer
Edge 90 or newer

We recommend keeping your browser updated to the latest version for the best experience and security.

INTERNET EXPLORER NOT SUPPORTED

Internet Explorer is outdated and not supported. If you're using IE, please switch to a modern browser like Chrome, Firefox, Safari, or Edge.

MOBILE BROWSERS

Both mobile Chrome and Safari are fully supported on iOS and Android devices.

The Ones AI interface is responsive and works well on phones and tablets.

BROWSER FEATURES REQUIRED

JavaScript must be enabled (it's enabled by default in most browsers).

Cookies must be allowed for login and session management.

Pop-up blockers shouldn't interfere, but disable them if you experience issues.

RECOMMENDED SETTINGS

Clear your browser cache periodically if you notice slowness or display issues.

Allow notifications if you want to receive real-time updates about your orders or messages.

Enable automatic browser updates to ensure you always have the latest security patches and features.

SCREEN RESOLUTION

Ones AI works on all screen sizes. For the best experience on desktop, use a resolution of at least 1024x768.

On mobile devices, both portrait and landscape orientations are supported.

INTERNET CONNECTION

A stable internet connection is required. Minimum recommended speed is 1 Mbps, but faster is better for uploading lab results and files.

WiFi or cellular data both work fine.

TROUBLESHOOTING BROWSER ISSUES

If you experience display problems, try clearing your browser cache and cookies.

If features aren't working, disable browser extensions temporarily to see if one is causing conflicts.

Try an incognito or private browsing window to rule out cache or extension issues.

NEED HELP?

Email support@myones.ai if you're having browser-related problems. Let us know which browser and version you're using.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Data Privacy and Account Security',
    content: `Your health information is private and protected. We take security seriously and follow industry-leading practices.

HOW WE PROTECT YOUR DATA

All data is encrypted in transit using 256-bit SSL encryption. Your health information is stored on SOC 2 certified servers with strict access controls.

Only essential staff have access to user data, and all access is logged and audited. We use multi-factor authentication and regular security testing to protect against breaches.

WHAT DATA WE COLLECT

We collect only the information needed to create your personalized formula: health profile, medical history, medications, lab results, and order information.

We also collect usage data to improve our AI and user experience, but this is anonymized and not linked to your identity.

HOW WE USE YOUR DATA

Your data is used only to create personalized recommendations, process orders, provide customer support, and improve our AI (using anonymized data).

We never sell your data to third parties. We never share your health information without your explicit consent.

DATA SHARING

We share data only when required by law, with your explicit consent, or with service providers under strict confidentiality agreements (like payment processors and shipping providers).

We never share with marketing companies, data brokers, social media platforms, insurance companies, or employers.

YOUR PRIVACY RIGHTS

You can view all data we have about you, request corrections to your data, download your complete data file, or delete your account and all associated data anytime.

To exercise these rights, email privacy@myones.ai.

ACCOUNT SECURITY BEST PRACTICES

Use a strong, unique password. Consider using a password manager.

Enable two-factor authentication when available.

Never share your account credentials. Log out on shared or public devices.

Be cautious of phishing emails. We'll never ask for your password via email.

REPORTING SECURITY CONCERNS

If you notice suspicious activity on your account or suspect a security issue, email security@myones.ai immediately.

We take all security reports seriously and investigate promptly.

COMPLIANCE AND CERTIFICATIONS

We maintain SOC 2 Type II certification, GDPR compliance for EU users, CCPA compliance for California residents, and PCI-DSS compliance for payment processing.

QUESTIONS ABOUT PRIVACY?

Email privacy@myones.ai for questions about how we handle your data or to exercise your privacy rights.`,
    displayOrder: 4,
    isPublished: true
  }
];
const faqData = [
  {
    category: 'Getting Started',
    question: 'How does Ones AI create personalized supplement formulas?',
    answer: 'Ones AI analyzes your health profile, lab results, medications, and health goals using advanced AI algorithms. It reviews scientific research on thousands of ingredients, then creates a custom formula tailored specifically to your needs. The AI considers dosage safety, ingredient interactions, and evidence-based effectiveness to ensure you get exactly what your body needs.',
    displayOrder: 1
  },
  {
    category: 'Getting Started',
    question: 'Do I need to upload lab results to use Ones AI?',
    answer: 'No, lab results are optional but highly recommended. Without labs, the AI creates formulas based on your health profile, symptoms, and goals. With lab results, recommendations become much more precise because the AI can see your exact nutrient levels, biomarkers, and potential deficiencies. Upload labs anytime to improve your formula accuracy.',
    displayOrder: 2
  },
  {
    category: 'Getting Started',
    question: 'How long does it take to see results from my formula?',
    answer: 'Results vary by individual and ingredient. Some benefits (like energy support) may be noticed within 1-2 weeks. Others (like improving vitamin D levels or reducing inflammation) typically take 30-60 days of consistent use. The AI provides specific timing expectations for your formula based on your goals and the ingredients included.',
    displayOrder: 3
  },
  {
    category: 'Formula & Health',
    question: 'Can I change my formula after ordering?',
    answer: 'Yes! Return to the AI consultation anytime to request changes. Tell the AI what you want to add, remove, or adjust. Each change creates a new formula version (your previous versions are saved). You can order the new formula immediately or continue using your current supply while the new one ships.',
    displayOrder: 1
  },
  {
    category: 'Formula & Health',
    question: 'Are the ingredients in my formula safe to take together?',
    answer: 'Yes, safety is our top priority. Before creating your formula, the AI checks for: (1) Interactions between ingredients, (2) Interactions with your medications, (3) Maximum safe dosages for each ingredient, (4) Combined effects of similar nutrients. Every formula is validated against safety limits. If you have concerns, always consult your healthcare provider.',
    displayOrder: 2
  },
  {
    category: 'Formula & Health',
    question: 'What if I experience side effects from my formula?',
    answer: 'Most ingredients are well-tolerated, but individual responses vary. Common mild effects include digestive changes (take with food to help). If you experience side effects: (1) Reduce your dose by half temporarily, (2) Contact the AI to discuss adjustments, (3) Stop immediately if you have severe reactions. The AI can modify your formula to remove problematic ingredients while maintaining your health benefits.',
    displayOrder: 3
  },
  {
    category: 'Formula & Health',
    question: 'Can I take my formula if I\'m on prescription medications?',
    answer: 'The AI automatically checks for drug interactions based on your medication list. However, you should ALWAYS consult your doctor before starting any new supplement, especially if you take: blood thinners, blood pressure medications, diabetes medications, thyroid medications, or immunosuppressants. Share your formula PDF with your doctor for their review.',
    displayOrder: 4
  },
  {
    category: 'Billing & Subscription',
    question: 'Is this a subscription service? Will I be charged automatically?',
    answer: 'No, Ones AI is NOT a subscription service. You make one-time purchases for 1, 3, or 6-month supplies. We NEVER auto-charge you. When you\'re running low, simply log in and place a new order. You control exactly when and what you buy.',
    displayOrder: 1
  },
  {
    category: 'Billing & Subscription',
    question: 'Can I get a refund if I don\'t like my formula?',
    answer: 'Custom formulas are made-to-order specifically for you and cannot be resold, so we generally cannot offer refunds for change of mind. However, we DO provide full refunds for: manufacturing defects, shipping errors, or damaged products. If your formula isn\'t working well, the AI can adjust it - we\'re committed to getting your formula right.',
    displayOrder: 2
  },
  {
    category: 'Billing & Subscription',
    question: 'How much do custom formulas cost?',
    answer: 'Pricing depends on your specific formula ingredients and total amount. Some ingredients cost more than others. You\'ll see the exact price before checkout. Supply options: 1-month (standard pricing), 3-month (save 10%), 6-month (save 15% + free shipping). There are no hidden fees.',
    displayOrder: 3
  },
  {
    category: 'Billing & Subscription',
    question: 'When will my order ship and how can I track it?',
    answer: 'Orders ship within 2-3 business days after placement (custom formulas are made fresh for you). You\'ll receive tracking information via email and SMS when it ships. Standard delivery takes 5-7 business days via USPS or UPS. Track your order anytime in Dashboard > Orders.',
    displayOrder: 4
  },
  {
    category: 'Technical Support',
    question: 'What browsers work best with Ones AI?',
    answer: 'Ones AI works best on: Google Chrome 90+, Mozilla Firefox 88+, Safari 14+, and Microsoft Edge 90+. We recommend keeping your browser updated for the best experience. Mobile browsers (Chrome, Safari on iOS/Android) are fully supported. Internet Explorer is NOT supported.',
    displayOrder: 1
  },
  {
    category: 'Technical Support',
    question: 'I\'m having trouble uploading my lab results. What should I do?',
    answer: 'Common solutions: (1) Ensure file is PDF, JPG, or PNG format under 10MB, (2) Try a different browser (Chrome works best), (3) Clear your browser cache, (4) For images, ensure good lighting and the text is readable. If issues persist, contact support@myones.ai with a screenshot of the error.',
    displayOrder: 2
  },
  {
    category: 'Technical Support',
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot Password?" Enter your email address and check your inbox (and spam folder) for a reset link. Click the link to create a new password. If you don\'t receive the email within 10 minutes, try requesting again or contact support@myones.ai.',
    displayOrder: 3
  },
  {
    category: 'Technical Support',
    question: 'Is my health data safe and private?',
    answer: 'Yes, absolutely. We use HIPAA-level security standards including 256-bit encryption, SOC 2 certified hosting, and strict access controls. Your health data is NEVER sold to third parties. We only share data when required by law or with your explicit consent (like sharing with your doctor). You can delete your account and all data anytime.',
    displayOrder: 4
  }
];

async function seedData() {
  console.log('🌱 Starting support data seeding...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.delete(faqItems);
    await db.delete(helpArticles);
    console.log('  ✓ Cleared existing help articles and FAQ items');

    // Seed help articles
    console.log('📚 Creating help articles...');
    for (const article of helpArticlesData) {
      await db.insert(helpArticles).values(article);
      console.log(`  ✓ Created: "${article.title}"`);
    }

    // Seed FAQ items
    console.log('❓ Creating FAQ items...');
    for (const faq of faqData) {
      await db.insert(faqItems).values(faq);
      console.log(`  ✓ Created: "${faq.question}"`);
    }

    console.log('✅ Support data seeding complete!');
    console.log(`   - ${helpArticlesData.length} help articles created`);
    console.log(`   - ${faqData.length} FAQ items created`);

  } catch (error) {
    console.error('❌ Error seeding support data:', error);
    throw error;
  }
}

// Run the seeding
seedData()
  .then(() => {
    console.log('✨ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
