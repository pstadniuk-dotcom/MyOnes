export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-terms">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using ONES, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Use of Service</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">Eligibility</h3>
            <p className="text-muted-foreground mb-4">
              You must be at least 18 years old to use ONES. By using our service, you represent and warrant that you meet this requirement.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">Account Responsibilities</h3>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Personalized Supplements</h2>
            <p className="text-muted-foreground mb-4">
              Our AI-powered system creates personalized supplement recommendations based on the information you provide. By using our service, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Supplement recommendations are based on the accuracy of information you provide</li>
              <li>ONES does not provide medical advice or replace consultation with healthcare professionals</li>
              <li>You should consult with your doctor before starting any new supplement regimen</li>
              <li>Individual results may vary based on numerous factors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Subscription & Payments</h2>
            <p className="text-muted-foreground mb-4">
              By subscribing to ONES, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Recurring monthly charges to your payment method</li>
              <li>Automatic renewal until you cancel your subscription</li>
              <li>Our refund policy as outlined in our Refund Policy page</li>
              <li>Price changes with 30 days advance notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of ONES, including our AI algorithms, formulation system, and platform design, are owned by ONES and protected by intellectual property laws. You may not copy, modify, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              ONES shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid for the service in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and access to our services immediately, without prior notice, for any breach of these Terms of Service. You may cancel your subscription at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms of Service on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              Questions about these Terms of Service should be sent to legal@ones.health.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
