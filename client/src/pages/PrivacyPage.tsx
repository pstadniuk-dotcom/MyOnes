import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      <div className="container mx-auto px-6 pt-32 pb-24 max-w-4xl">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
          Legal
        </span>
        <h1 className="text-4xl md:text-5xl font-light text-[#054700] mb-4" data-testid="heading-privacy">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#5a6623] mb-12">Last updated: March 2026</p>

        <div className="space-y-8">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">1. Introduction</h2>
            <p className="text-[#5a6623] leading-relaxed">
              At Ones AI, Inc. ("Ones," "we," "us," or "our"), we take your privacy seriously. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our personalized supplement platform and related services (the "Service"). By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-[#054700] mb-3">Information You Provide</h3>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              We collect information you provide directly, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Name, email address, and contact information</li>
              <li>Health profile information, wellness goals, and medical history you choose to share</li>
              <li>Blood test results, biomarker data, and uploaded lab reports (PDFs and images)</li>
              <li>Dietary preferences, supplement history, and symptom logs</li>
              <li>Payment and shipping information (processed by our payment provider; we do not store full card numbers)</li>
              <li>Messages and conversations with our AI health assistant</li>
            </ul>

            <h3 className="text-xl font-medium text-[#054700] mb-3 mt-6">Wearable Device Data</h3>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              If you connect a wearable device (e.g., Fitbit, Oura, Whoop), we collect biometric data made available through that device's API, which may include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Heart rate, heart rate variability (HRV), and resting heart rate</li>
              <li>Sleep duration, stages, and quality scores</li>
              <li>Activity and exercise metrics (steps, calories, strain)</li>
              <li>Body temperature and blood oxygen levels (where available)</li>
            </ul>
            <p className="text-[#5a6623] mt-3 leading-relaxed">
              You can disconnect your wearable at any time through your account settings, which stops future data collection from that device.
            </p>

            <h3 className="text-xl font-medium text-[#054700] mb-3 mt-6">Automatically Collected Information</h3>
            <p className="text-[#5a6623] leading-relaxed">
              We automatically collect certain technical information when you use the Service, including IP address, browser type, device identifiers, operating system, referring URLs, pages viewed, and usage patterns (e.g., features used, session duration).
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">3. How We Use Your Information</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Personalization:</strong> Create and refine AI-generated supplement formulas based on your health profile, lab results, wearable data, and conversation history</li>
              <li><strong>AI Processing:</strong> Analyze your health data using artificial intelligence and machine learning models to generate recommendations (see Section 4)</li>
              <li><strong>Order Fulfillment:</strong> Process, manufacture, and ship your personalized supplement orders</li>
              <li><strong>Communication:</strong> Send transactional emails, subscription updates, pill reminders, and — with your consent — marketing communications</li>
              <li><strong>Service Improvement:</strong> Improve our AI algorithms, platform features, and user experience through aggregated and anonymized analytics</li>
              <li><strong>Safety &amp; Compliance:</strong> Detect fraud, enforce our Terms of Service, and comply with legal obligations</li>
            </ul>
          </section>

          {/* 4. AI Processing of Health Data */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">4. AI Processing of Health Data</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              Core to our Service is the use of AI models (including third-party large language models from OpenAI and Anthropic) to analyze your health data and generate personalized supplement recommendations. When you interact with our AI assistant:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Your health profile, lab data, wearable metrics, and conversation context are sent to AI model providers for processing</li>
              <li>We transmit only the data necessary for generating your recommendations — we do not share your name, email, or payment information with AI providers</li>
              <li>AI providers process data according to their own privacy policies and data processing agreements with us</li>
              <li>We do not use your individual health data to train general-purpose AI models</li>
            </ul>
          </section>

          {/* 5. Lab Report & File Uploads */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">5. Lab Report &amp; File Uploads</h2>
            <p className="text-[#5a6623] leading-relaxed">
              Lab reports and other files you upload are stored securely using encrypted cloud storage with access controls. Files are accessible only to you and authorized administrators. All file operations are logged in our audit trail. You may request deletion of uploaded files at any time by contacting info@myones.ai.
            </p>
          </section>

          {/* 6. Cookies & Tracking */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">6. Cookies &amp; Tracking Technologies</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Essential cookies:</strong> Maintain your session and authentication state</li>
              <li><strong>Analytics cookies:</strong> Understand how users interact with the Service to improve functionality</li>
              <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-[#5a6623] mt-3 leading-relaxed">
              You can control cookies through your browser settings. Disabling essential cookies may prevent parts of the Service from functioning properly.
            </p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">7. Data Security</h2>
            <p className="text-[#5a6623] leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest, access controls, secure credential storage, and audit logging. Wearable OAuth tokens are encrypted before storage. However, no method of electronic transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security. Ones is not HIPAA-certified, but we follow strong security best practices appropriate for a wellness platform.
            </p>
          </section>

          {/* 8. Data Retention */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">8. Data Retention</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide the Service. Specific retention periods:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Account data:</strong> Retained while your account is active and for 30 days after deletion request</li>
              <li><strong>Health &amp; formula data:</strong> Retained while your account is active to support formula history and optimization</li>
              <li><strong>Wearable data:</strong> Retained while your account is active; deleted upon wearable disconnection or account deletion</li>
              <li><strong>Audit logs:</strong> Retained for up to 3 years for security and compliance purposes</li>
              <li><strong>Payment records:</strong> Retained as required by tax and financial regulations</li>
            </ul>
          </section>

          {/* 9. Information Sharing */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">9. Information Sharing</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>AI model providers</strong> (OpenAI, Anthropic) — limited health context for generating recommendations (see Section 4)</li>
              <li><strong>Service providers</strong> — payment processors, shipping partners, cloud hosting, email/SMS delivery services</li>
              <li><strong>Wearable platforms</strong> — API calls to retrieve your data from connected devices (data flows from them to us, not the reverse)</li>
              <li><strong>Professional advisors</strong> — lawyers, auditors, and consultants under confidentiality agreements</li>
              <li><strong>Law enforcement</strong> — when required by law, subpoena, court order, or to protect rights and safety</li>
              <li><strong>Business transfers</strong> — in the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction</li>
            </ul>
          </section>

          {/* 10. Your Rights */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">10. Your Rights</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              Depending on your jurisdiction, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
              <li><strong>Portability:</strong> Request your data in a structured, commonly used format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time via the link in any email</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent for data processing where consent is the legal basis</li>
            </ul>
            <p className="text-[#5a6623] mt-3 leading-relaxed">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:info@myones.ai" className="text-[#054700] underline underline-offset-2 hover:text-[#054700]/80">info@myones.ai</a>.
              We will respond within 30 days.
            </p>
          </section>

          {/* 11. California Privacy Rights (CCPA/CPRA) */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">11. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Right to Know:</strong> You may request disclosure of the categories and specific pieces of personal information we have collected about you</li>
              <li><strong>Right to Delete:</strong> You may request that we delete your personal information, subject to certain exceptions</li>
              <li><strong>Right to Opt-Out of Sale:</strong> We do not sell personal information. If this changes, we will provide a "Do Not Sell My Personal Information" link</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
              <li><strong>Sensitive Personal Information:</strong> Health data you provide is considered sensitive. We use it only for the purposes disclosed in this policy and you may limit its use</li>
            </ul>
          </section>

          {/* 12. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">12. Children's Privacy</h2>
            <p className="text-[#5a6623] leading-relaxed">
              The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information promptly. If you believe a child has provided us with personal information, please contact us at info@myones.ai.
            </p>
          </section>

          {/* 13. International Data Transfers */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">13. International Data Transfers</h2>
            <p className="text-[#5a6623] leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence, including the United States, where our servers and service providers are located. These countries may have data protection laws that differ from your jurisdiction. By using the Service, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your data remains protected in accordance with this Privacy Policy.
            </p>
          </section>

          {/* 14. Do Not Track */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">14. Do Not Track Signals</h2>
            <p className="text-[#5a6623] leading-relaxed">
              Some browsers transmit "Do Not Track" (DNT) signals. There is currently no industry standard for how companies should respond to DNT signals. At this time, we do not respond to DNT signals, but you can control tracking through your browser's cookie settings.
            </p>
          </section>

          {/* 15. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">15. Changes to This Policy</h2>
            <p className="text-[#5a6623] leading-relaxed">
              We may update this Privacy Policy from time to time. Material changes will be communicated via email or a prominent notice on the Service. The "Last updated" date at the top of this page indicates when the policy was last revised. Your continued use of the Service after changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          {/* 16. Contact Us */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">16. Contact Us</h2>
            <p className="text-[#5a6623] leading-relaxed">
              If you have questions about this Privacy Policy, our data practices, or wish to exercise your privacy rights, please contact us at{' '}
              <a href="mailto:info@myones.ai" className="text-[#054700] underline underline-offset-2 hover:text-[#054700]/80">info@myones.ai</a>.
            </p>
          </section>
        </div>
      </div>
      <FooterV2 />
    </div>
  );
}
