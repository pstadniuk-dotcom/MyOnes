import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      <div className="container mx-auto px-6 pt-32 pb-24 max-w-4xl">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
          Legal
        </span>
        <h1 className="text-4xl md:text-5xl font-light text-[#054700] mb-4" data-testid="heading-terms">
          Terms of Service
        </h1>
        <p className="text-sm text-[#5a6623] mb-12">Last updated: March 2026</p>

        <div className="space-y-8">
          {/* 1. Agreement */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">1. Agreement to Terms</h2>
            <p className="text-[#5a6623] leading-relaxed">
              By accessing or using the Ones platform ("Service"), you agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree with any of these Terms, you are prohibited from using our Service. These Terms constitute a legally binding agreement between you and Ones AI, Inc. ("Ones," "we," "us," or "our").
            </p>
          </section>

          {/* 2. Eligibility & Account */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">2. Eligibility &amp; Account</h2>
            <h3 className="text-xl font-medium text-[#054700] mb-3">Eligibility</h3>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              You must be at least 18 years old and legally able to enter into binding contracts to use Ones. By creating an account, you represent and warrant that you meet these requirements and that all information you provide is accurate, current, and complete.
            </p>

            <h3 className="text-xl font-medium text-[#054700] mb-3">Account Responsibilities</h3>
            <p className="text-[#5a6623] leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at info@myones.ai of any unauthorized use. We are not liable for losses arising from unauthorized account access that is not caused by our negligence.
            </p>
          </section>

          {/* 3. Health & FDA Disclaimer */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">3. Health &amp; FDA Disclaimer</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
              <p className="text-[#5a6623] leading-relaxed font-medium mb-3">
                IMPORTANT: PLEASE READ THIS SECTION CAREFULLY.
              </p>
              <p className="text-[#5a6623] leading-relaxed mb-3">
                The statements made on this platform have not been evaluated by the U.S. Food and Drug Administration (FDA). Our products are not intended to diagnose, treat, cure, or prevent any disease.
              </p>
              <p className="text-[#5a6623] leading-relaxed mb-3">
                Ones is a wellness platform, not a medical provider. The AI-generated supplement recommendations, health insights, biomarker analyses, and any other content provided through the Service are for informational and educational purposes only and do not constitute medical advice, diagnosis, or treatment.
              </p>
              <p className="text-[#5a6623] leading-relaxed">
                Always consult a qualified healthcare professional before starting, stopping, or modifying any supplement, medication, or health regimen — especially if you are pregnant, nursing, have a medical condition, or are taking prescription medication.
              </p>
            </div>
          </section>

          {/* 4. AI-Powered Recommendations */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">4. AI-Powered Recommendations</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              Our platform uses artificial intelligence to create personalized supplement formulas based on information you provide, including health profiles, lab results, wearable device data, and conversation history. By using the Service, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Recommendations are only as accurate as the information you provide — inaccurate or incomplete inputs may lead to unsuitable suggestions</li>
              <li>AI-generated recommendations are not a substitute for professional medical advice or laboratory interpretation by a licensed clinician</li>
              <li>You should consult with your physician or a qualified healthcare provider before starting any supplement regimen</li>
              <li>Individual results vary based on genetics, lifestyle, pre-existing conditions, and other factors outside our control</li>
              <li>We do not guarantee any specific health outcome from following our recommendations</li>
              <li>The AI may occasionally produce errors or suboptimal recommendations — you are ultimately responsible for decisions about your own health</li>
            </ul>
          </section>

          {/* 5. Wearable Device Integrations */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">5. Wearable Device Integrations</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              Ones may integrate with third-party wearable devices and platforms (e.g., Fitbit, Oura, Whoop). By connecting a wearable device, you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Authorize Ones to access and retrieve biometric data (e.g., heart rate, sleep, activity) from your connected device via its API</li>
              <li>Acknowledge that wearable data accuracy depends on the device manufacturer and is outside our control</li>
              <li>Understand that you may disconnect your wearable at any time through your account settings</li>
              <li>Agree that Ones is not responsible for any issues related to third-party wearable services or data availability</li>
            </ul>
          </section>

          {/* 6. Lab Report Uploads */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">6. Lab Report Uploads</h2>
            <p className="text-[#5a6623] leading-relaxed">
              You may upload lab reports (e.g., blood test results) to receive AI-powered analysis and formula optimization. By uploading lab data, you represent that you are authorized to share that information and consent to its processing by our AI systems. Lab report analysis is for informational purposes only and does not replace interpretation by a licensed healthcare provider.
            </p>
          </section>

          {/* 7. Subscription & Payments */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">7. Subscription &amp; Payments</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              By subscribing to Ones, you agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li>Recurring charges will be billed to your payment method on a monthly basis</li>
              <li>Subscriptions renew automatically until you cancel through your account settings or by contacting us</li>
              <li>Cancellation takes effect at the end of the current billing period — no partial-month refunds are issued for the current cycle</li>
              <li>We may change pricing with at least 30 days' advance notice via email; continued use after the effective date constitutes acceptance</li>
              <li>Refund requests for product issues should be directed to info@myones.ai and will be reviewed on a case-by-case basis</li>
            </ul>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">8. Intellectual Property</h2>
            <p className="text-[#5a6623] leading-relaxed">
              All content, features, and functionality of the Service — including our AI algorithms, formulation engine, branding, platform design, text, graphics, and software — are owned by Ones AI, Inc. or its licensors and are protected by copyright, trademark, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or create derivative works based on any part of the Service without our prior written permission.
            </p>
          </section>

          {/* 9. Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-[#5a6623] leading-relaxed uppercase text-sm font-medium">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY LAW, ONES DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">10. Limitation of Liability</h2>
            <p className="text-[#5a6623] leading-relaxed mb-3">
              To the maximum extent permitted by applicable law, Ones and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including but not limited to loss of profits, data, health outcomes, or goodwill — resulting from your use of or inability to use the Service.
            </p>
            <p className="text-[#5a6623] leading-relaxed">
              Our total aggregate liability for all claims arising out of or related to these Terms or the Service shall not exceed the total amount you paid to Ones in the twelve (12) months immediately preceding the event giving rise to the claim.
            </p>
          </section>

          {/* 11. Indemnification */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">11. Indemnification</h2>
            <p className="text-[#5a6623] leading-relaxed">
              You agree to indemnify, defend, and hold harmless Ones AI, Inc. and its officers, directors, employees, contractors, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any health decisions you make based on information obtained through the Service.
            </p>
          </section>

          {/* 12. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">12. Dispute Resolution</h2>
            <p className="text-[#5a6623] mb-4 leading-relaxed">
              Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration shall take place in Delaware or, at your election, online.
            </p>
            <p className="text-[#5a6623] mb-4 leading-relaxed font-medium">
              CLASS ACTION WAIVER: You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If this waiver is found unenforceable, the entirety of this arbitration provision shall be null and void.
            </p>
            <p className="text-[#5a6623] leading-relaxed">
              Notwithstanding the above, either party may seek injunctive or equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.
            </p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">13. Governing Law</h2>
            <p className="text-[#5a6623] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict-of-law provisions. Any legal proceedings not subject to arbitration shall be brought exclusively in the state or federal courts located in Delaware.
            </p>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">14. Termination</h2>
            <p className="text-[#5a6623] leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we determine, in our sole discretion, violates these Terms or is harmful to other users, us, or third parties. You may cancel your subscription at any time through your account settings. Upon termination, your right to use the Service ceases immediately, though provisions that by their nature should survive (including disclaimers, limitations of liability, indemnification, and dispute resolution) will remain in effect.
            </p>
          </section>

          {/* 15. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">15. Changes to Terms</h2>
            <p className="text-[#5a6623] leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email or a prominent notice on the Service at least 15 days before taking effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service and cancel your account.
            </p>
          </section>

          {/* 16. General Provisions */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">16. General Provisions</h2>
            <ul className="list-disc pl-6 space-y-2 text-[#5a6623]">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Ones regarding the Service and supersede all prior agreements.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</li>
              <li><strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent. We may assign our rights without restriction.</li>
              <li><strong>Force Majeure:</strong> Ones shall not be liable for any failure or delay in performance resulting from circumstances beyond our reasonable control, including natural disasters, pandemics, supply-chain disruptions, or government actions.</li>
            </ul>
          </section>

          {/* 17. Contact */}
          <section>
            <h2 className="text-2xl font-medium text-[#054700] mb-4">17. Contact Information</h2>
            <p className="text-[#5a6623] leading-relaxed">
              Questions or concerns about these Terms of Service should be sent to{' '}
              <a href="mailto:info@myones.ai" className="text-[#054700] underline underline-offset-2 hover:text-[#054700]/80">info@myones.ai</a>.
            </p>
          </section>
        </div>
      </div>
      <FooterV2 />
    </div>
  );
}
