import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8" data-testid="heading-returns">
          Returns Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: November 2025</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">No Returns on Custom Orders</h2>
            <p className="text-muted-foreground mb-4">
              At Ones, every supplement formula is custom-made specifically for your unique health profile. Each order is manufactured to your exact specifications based on your health data, lab results, and individual needs.
            </p>
            <p className="text-muted-foreground">
              Due to the personalized and made-to-order nature of our products, <strong className="text-primary">we do not accept returns or exchanges</strong> on any orders. Once your custom formula is manufactured, it cannot be resold or used by another customer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Why Custom Products Cannot Be Returned</h2>
            <p className="text-muted-foreground mb-4">
              Your Ones formula is unique to you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Personalized formulation</strong> - Created from your specific biomarkers and health conditions</li>
              <li><strong>Made to order</strong> - Production begins immediately after order confirmation</li>
              <li><strong>Cannot be resold</strong> - Your formula is designed for you and cannot be used by others</li>
              <li><strong>Third-party tested</strong> - Each batch is quality controlled and safety verified</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              This custom approach ensures you get the most effective, personalized supplement possible, but it also means we cannot accept returns or offer refunds on manufactured orders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Review Your Order Carefully</h2>
            <p className="text-muted-foreground mb-4">
              Before confirming your order, please carefully review:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your personalized formula and all ingredients</li>
              <li>Total daily dosage and capsule count</li>
              <li>Supply duration (3, 6, or 12 months)</li>
              <li>Shipping address accuracy</li>
              <li>Any potential interactions with current medications</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Our support team is available to answer any questions before you place your order. We want you to feel confident in your purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Damaged or Defective Products</h2>
            <p className="text-muted-foreground mb-4">
              While we do not accept returns, we stand behind the quality of every order. If your product arrives damaged, defective, or does not match your confirmed formula specifications, we will replace it at no cost.
            </p>
            <p className="text-muted-foreground mb-4">
              To request a replacement, contact us within 7 days of receiving your order with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your order number</li>
              <li>Clear photos showing the damage or defect</li>
              <li>Description of the issue</li>
              <li>Photo of the formula label (if the ingredients are incorrect)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We will review your case within 1-2 business days. If the issue is confirmed, we'll ship a replacement immediately at no charge. In most cases, you won't need to return the damaged product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Shipping Address Errors</h2>
            <p className="text-muted-foreground mb-4">
              If we ship your order to the wrong address due to an error on our part, we will reship at no additional cost.
            </p>
            <p className="text-muted-foreground">
              However, if an incorrect address was provided by you during checkout, we cannot offer a replacement or refund. Please verify your shipping address carefully before completing your purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Formula Adjustments</h2>
            <p className="text-muted-foreground mb-4">
              If you need to adjust your formula after trying it:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Upload new lab results to get updated recommendations</li>
              <li>Start a new AI consultation to discuss your experience</li>
              <li>Place a new order with your refined formula when ready</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We recommend ordering a 3-month supply initially so you can assess how the formula works for you before committing to a larger supply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">One-Time Purchases, Not Subscriptions</h2>
            <p className="text-muted-foreground mb-4">
              All Ones orders are one-time purchases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>3-Month Supply</strong> - Single payment, delivered once</li>
              <li><strong>6-Month Supply</strong> - Single payment, delivered once</li>
              <li><strong>12-Month Supply</strong> - Single payment, delivered once</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              There are no recurring charges or automatic shipments. When you're ready for your next supply, simply place a new order with your updated health profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Questions Before Ordering?</h2>
            <p className="text-muted-foreground mb-4">
              Before placing your order, carefully review your personalized formula and consider:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your personalized formula and ingredient selection</li>
              <li>Potential interactions with medications</li>
              <li>Expected results and timeline</li>
              <li>Choosing the right supply duration</li>
              <li>Our third-party testing and quality standards</li>
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
