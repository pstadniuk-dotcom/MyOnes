export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-privacy">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              At ONES, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our personalized supplement platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Information We Collect</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name, email address, and contact information</li>
              <li>Health profile information and wellness goals</li>
              <li>Blood test results and biomarker data (with your consent)</li>
              <li>Dietary preferences and supplement history</li>
              <li>Payment and shipping information</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Automatically Collected Information</h3>
            <p className="text-muted-foreground">
              We automatically collect certain information about your device and how you interact with our platform, including browser type, IP address, and usage patterns.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Create personalized supplement formulas based on your health profile</li>
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your subscription and health journey</li>
              <li>Improve our AI algorithms and product recommendations</li>
              <li>Comply with legal obligations and protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, access controls, and audit logging. However, please note that ONES is not HIPAA compliant. We maintain strong security practices but are not certified for HIPAA compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Information Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Service providers who assist in our operations (e.g., payment processing, shipping)</li>
              <li>Professional advisors (e.g., lawyers, auditors)</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our data practices, please contact us at privacy@ones.health.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
