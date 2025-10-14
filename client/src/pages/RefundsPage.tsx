export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-refunds">
          Refund Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Our Commitment</h2>
            <p className="text-muted-foreground">
              At ONES, we're committed to your satisfaction. We want you to be completely happy with your personalized supplements. If you're not satisfied, we're here to help.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">30-Day Money-Back Guarantee</h2>
            <p className="text-muted-foreground mb-4">
              We offer a 30-day money-back guarantee on your first order. If you're not satisfied with your personalized formula, you can request a full refund within 30 days of receiving your order.
            </p>
            <p className="text-muted-foreground">
              To be eligible for a refund under our guarantee, please contact our support team at support@ones.health with your order number and reason for the refund request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Subscription Refunds</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">Recurring Orders</h3>
            <p className="text-muted-foreground mb-4">
              For recurring subscription orders, you can cancel at any time before your next billing date. No refunds are provided for the current billing cycle, but you will not be charged again after cancellation.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">Cancellation Process</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Log into your account and go to Subscription Settings</li>
              <li>Click "Cancel Subscription"</li>
              <li>Confirm your cancellation</li>
              <li>You'll receive a confirmation email</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Damaged or Defective Products</h2>
            <p className="text-muted-foreground mb-4">
              If your order arrives damaged or defective, we'll replace it at no cost to you. Please contact us within 7 days of receiving your order with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your order number</li>
              <li>Photos of the damaged product</li>
              <li>Description of the issue</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Processing Time</h2>
            <p className="text-muted-foreground">
              Approved refunds will be processed within 5-7 business days and credited to your original payment method. Depending on your bank or credit card company, it may take an additional 3-5 business days for the credit to appear on your statement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Non-Refundable Items</h2>
            <p className="text-muted-foreground mb-4">
              The following items are not eligible for refunds:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Orders placed more than 30 days ago (except for damaged/defective products)</li>
              <li>Products that have been opened or used (except within the 30-day guarantee period)</li>
              <li>Gift cards and promotional codes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about our refund policy or need to request a refund, please contact us at:
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
