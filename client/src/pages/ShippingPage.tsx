export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-shipping">
          Shipping Information
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Shipping Methods & Timing</h2>
            <p className="text-muted-foreground mb-6">
              We offer several shipping options to get your personalized supplements to you as quickly as possible.
            </p>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-md p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Standard Shipping (Free)</h3>
                <p className="text-muted-foreground mb-2">5-7 business days</p>
                <p className="text-sm text-muted-foreground">
                  Free on all orders. Your personalized formula is carefully packaged and shipped via USPS or UPS Ground.
                </p>
              </div>

              <div className="bg-card border border-border rounded-md p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Express Shipping</h3>
                <p className="text-muted-foreground mb-2">2-3 business days - $9.99</p>
                <p className="text-sm text-muted-foreground">
                  Expedited delivery via UPS or FedEx for when you need your supplements sooner.
                </p>
              </div>

              <div className="bg-card border border-border rounded-md p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Overnight Shipping</h3>
                <p className="text-muted-foreground mb-2">1 business day - $24.99</p>
                <p className="text-sm text-muted-foreground">
                  Next-day delivery available for orders placed before 2pm EST on business days.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Processing Time</h2>
            <p className="text-muted-foreground mb-4">
              Your personalized supplements are formulated specifically for you when you place your order. Here's our timeline:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Formula Creation:</strong> 24-48 hours for AI analysis and formula preparation</li>
              <li><strong>Encapsulation:</strong> 1-2 business days to create your custom capsules</li>
              <li><strong>Quality Control:</strong> Final inspection and packaging</li>
              <li><strong>Shipping:</strong> Handed off to carrier within 3-4 business days of order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Shipping Locations</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">United States</h3>
            <p className="text-muted-foreground mb-4">
              We ship to all 50 states, including Alaska and Hawaii. PO Boxes are accepted for standard shipping only.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">International Shipping</h3>
            <p className="text-muted-foreground mb-4">
              We currently ship to Canada, UK, Australia, and select European countries. International shipping rates and times vary by location:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Canada:</strong> 7-14 business days, starting at $15</li>
              <li><strong>UK & Europe:</strong> 10-21 business days, starting at $25</li>
              <li><strong>Australia:</strong> 14-28 business days, starting at $30</li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
              Note: International customers are responsible for any customs fees, duties, or taxes imposed by their country.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Order Tracking</h2>
            <p className="text-muted-foreground mb-4">
              Once your order ships, you'll receive:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Email confirmation with tracking number</li>
              <li>Text message updates (if opted in)</li>
              <li>Real-time tracking through your Ones account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Subscription Deliveries</h2>
            <p className="text-muted-foreground mb-4">
              If you have a monthly subscription:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Automatic shipments processed on the same day each month</li>
              <li>Receive reminder email 3 days before shipment</li>
              <li>Skip or reschedule deliveries anytime through your account</li>
              <li>Update shipping address before your next billing date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Shipping Issues</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">Lost or Stolen Packages</h3>
            <p className="text-muted-foreground mb-4">
              If your tracking shows delivered but you haven't received your order, please:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Check with neighbors and building management</li>
              <li>Verify the shipping address in your account</li>
              <li>Wait 24 hours (sometimes carriers mark as delivered early)</li>
              <li>Contact us at support@ones.health - we'll help resolve the issue</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Damaged in Transit</h3>
            <p className="text-muted-foreground">
              If your package arrives damaged, keep all packaging materials and contact us immediately. We'll send a replacement at no cost.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about shipping? Our support team is here to help:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> support@ones.health<br />
              <strong>Phone:</strong> 1-800-ONES-HELP<br />
              <strong>Hours:</strong> Monday-Friday, 9am-6pm PST
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
