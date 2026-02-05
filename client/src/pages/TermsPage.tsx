import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      <div className="container mx-auto px-6 pt-32 pb-24 max-w-4xl">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
          Legal
        </span>
        <h1 className="text-4xl md:text-5xl font-light text-[#1B4332] mb-4" data-testid="heading-terms">
          Terms of Service
        </h1>
        <p className="text-sm text-[#52796F] mb-12">Last updated: March 2024</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Agreement to Terms</h2>
            <p className="text-[#52796F] leading-relaxed">
              By accessing or using Ones, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Use of Service</h2>
            <h3 className="text-xl font-medium text-[#1B4332] mb-3">Eligibility</h3>
            <p className="text-[#52796F] mb-4 leading-relaxed">
              You must be at least 18 years old to use Ones. By using our service, you represent and warrant that you meet this requirement.
            </p>

            <h3 className="text-xl font-medium text-[#1B4332] mb-3">Account Responsibilities</h3>
            <p className="text-[#52796F] leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Personalized Supplements</h2>
            <p className="text-[#52796F] mb-4 leading-relaxed">
              Our AI-powered system creates personalized supplement recommendations based on the information you provide. By using our service, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Supplement recommendations are based on the accuracy of information you provide</li>
              <li>ONES does not provide medical advice or replace consultation with healthcare professionals</li>
              <li>You should consult with your doctor before starting any new supplement regimen</li>
              <li>Individual results may vary based on numerous factors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Subscription & Payments</h2>
            <p className="text-[#52796F] mb-4 leading-relaxed">
              By subscribing to Ones, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Recurring monthly charges to your payment method</li>
              <li>Automatic renewal until you cancel your subscription</li>
              <li>Our refund policy as outlined in our Refund Policy page</li>
              <li>Price changes with 30 days advance notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Intellectual Property</h2>
            <p className="text-[#52796F] leading-relaxed">
              All content, features, and functionality of Ones, including our AI algorithms, formulation system, and platform design, are owned by Ones and protected by intellectual property laws. You may not copy, modify, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Limitation of Liability</h2>
            <p className="text-[#52796F] leading-relaxed">
              Ones shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid for the service in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Termination</h2>
            <p className="text-[#52796F] leading-relaxed">
              We may terminate or suspend your account and access to our services immediately, without prior notice, for any breach of these Terms of Service. You may cancel your subscription at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Changes to Terms</h2>
            <p className="text-[#52796F] leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms of Service on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Contact Information</h2>
            <p className="text-[#52796F] leading-relaxed">
              Questions about these Terms of Service should be sent to info@myones.ai.
            </p>
          </section>
        </div>
      </div>
      <FooterV2 />
    </div>
  );
}
