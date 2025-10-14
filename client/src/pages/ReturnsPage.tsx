export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-returns">
          Returns Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Our Returns Process</h2>
            <p className="text-muted-foreground">
              We want you to be completely satisfied with your ONES experience. If you need to return a product, we've made the process simple and straightforward.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">30-Day Return Window</h2>
            <p className="text-muted-foreground mb-4">
              You may return your order within 30 days of receipt for a full refund. This applies to your first order with our money-back guarantee. For subsequent orders, please see our Refund Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">How to Initiate a Return</h2>
            <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
              <li>
                <strong>Contact Support:</strong> Email support@ones.health with your order number and reason for return
              </li>
              <li>
                <strong>Receive Return Authorization:</strong> We'll send you a return authorization number and shipping instructions
              </li>
              <li>
                <strong>Package Your Return:</strong> Securely package the product in its original packaging if possible
              </li>
              <li>
                <strong>Ship Your Return:</strong> Use the prepaid shipping label we provide (for US returns)
              </li>
              <li>
                <strong>Receive Your Refund:</strong> Once we receive and inspect your return, we'll process your refund within 5-7 business days
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Return Conditions</h2>
            <p className="text-muted-foreground mb-4">To be eligible for a return, your item must be:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Returned within 30 days of receipt</li>
              <li>In its original condition and packaging when possible</li>
              <li>Accompanied by proof of purchase</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We understand that you may need to open the product to try it. Opened products are accepted for return under our 30-day guarantee.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Return Shipping</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">United States</h3>
            <p className="text-muted-foreground mb-4">
              For returns within the US, we provide a prepaid return shipping label at no cost to you. Simply print the label and drop off your package at any authorized shipping location.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">International Returns</h3>
            <p className="text-muted-foreground">
              International customers are responsible for return shipping costs. We recommend using a trackable shipping service to ensure your return reaches us safely.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Damaged or Defective Products</h2>
            <p className="text-muted-foreground mb-4">
              If your order arrives damaged or defective, we'll replace it immediately at no cost. Please contact us within 7 days of receipt with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your order number</li>
              <li>Clear photos of the damaged or defective product</li>
              <li>Description of the issue</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              In most cases, we won't require you to return damaged or defective items. We'll send a replacement immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Exchanges</h2>
            <p className="text-muted-foreground">
              We don't offer direct exchanges. If you'd like a different product or formula adjustment, please return your current order for a refund and place a new order. Our AI health assessment can be updated anytime to create a new personalized formula.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Non-Returnable Items</h2>
            <p className="text-muted-foreground mb-4">
              The following items cannot be returned:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Gift cards</li>
              <li>Digital products or downloadable content</li>
              <li>Products returned after 30 days (except damaged/defective)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Questions?</h2>
            <p className="text-muted-foreground">
              If you have questions about returns or need assistance, our support team is here to help:
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
