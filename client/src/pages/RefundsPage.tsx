import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      <div className="container mx-auto px-6 pt-32 pb-24 max-w-4xl">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block text-center">
          Policies
        </span>
        <h1 className="text-4xl md:text-5xl font-light text-[#1B4332] mb-6 text-center" data-testid="heading-refunds">
          Refund Policy
        </h1>
        <p className="text-sm text-[#52796F] mb-12 text-center">Last updated: November 2025</p>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm space-y-8">
          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Custom-Made Products</h2>
            <p className="text-[#52796F] mb-4">
              At Ones, every formula is custom-made specifically for you based on your unique health profile, lab results, and individual needs. Each order is manufactured to your exact specifications after you place your order.
            </p>
            <p className="text-[#52796F]">
              Due to the personalized and custom-made nature of our products, <strong className="text-[#1B4332]">we do not offer refunds, returns, or cancellations</strong> on any orders once they have been placed and manufactured.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Why No Refunds?</h2>
            <p className="text-[#52796F] mb-4">
              Unlike mass-produced supplements, your Ones formula is:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li><strong className="text-[#1B4332]">Personalized to your health data</strong> - Created based on your specific biomarkers, health conditions, and goals</li>
              <li><strong className="text-[#1B4332]">Made to order</strong> - Manufactured specifically for you after your order is confirmed</li>
              <li><strong className="text-[#1B4332]">Cannot be resold</strong> - Your custom formula cannot be sold to another customer</li>
              <li><strong className="text-[#1B4332]">Quality controlled</strong> - Each batch is third-party tested and quality verified for your safety</li>
            </ul>
            <p className="text-[#52796F] mt-4">
              This ensures you receive the highest quality, most personalized supplement possible, but it also means we cannot accept returns or offer refunds on custom orders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Order Carefully</h2>
            <p className="text-[#52796F] mb-4">
              Before placing your order, please:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Review your personalized formula carefully</li>
              <li>Verify your shipping address is correct</li>
              <li>Confirm your supply duration (3, 6, or 12 months)</li>
              <li>Ask our support team any questions before ordering</li>
            </ul>
            <p className="text-[#52796F] mt-4">
              Once your order is confirmed, it enters production immediately and cannot be modified or cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Damaged or Defective Products</h2>
            <p className="text-[#52796F] mb-4">
              While we cannot offer refunds, we stand behind the quality of our products. If your order arrives damaged, defective, or does not match your confirmed formula specifications, we will replace it at no cost to you.
            </p>
            <p className="text-[#52796F] mb-4">
              To request a replacement for damaged or defective products, please contact us within 7 days of receiving your order with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Your order number</li>
              <li>Clear photos of the damaged product or defect</li>
              <li>Description of the issue</li>
              <li>Photo of the formula label showing ingredients (if formula is incorrect)</li>
            </ul>
            <p className="text-[#52796F] mt-4">
              We will review your case within 1-2 business days and ship a replacement if the issue is confirmed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Shipping Errors</h2>
            <p className="text-[#52796F] mb-4">
              If your order was shipped to the wrong address due to an error on our part, we will reship your order at no additional cost. However, if the incorrect address was provided by you during checkout, we cannot offer a replacement or refund.
            </p>
            <p className="text-[#52796F]">
              Please double-check your shipping address before placing your order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Supply Duration</h2>
            <p className="text-[#52796F] mb-4">
              Ones offers 3-month, 6-month, and 12-month supplies. These are one-time purchases, not subscriptions:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li><strong className="text-[#1B4332]">3-Month Supply</strong> - Single payment, delivered once</li>
              <li><strong className="text-[#1B4332]">6-Month Supply</strong> - Single payment, delivered once</li>
              <li><strong className="text-[#1B4332]">12-Month Supply</strong> - Single payment, delivered once</li>
            </ul>
            <p className="text-[#52796F] mt-4">
              There are no recurring charges or automatic renewals. When you're ready for your next supply, simply create a new order with your updated health profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#1B4332] mb-4">Questions Before Ordering</h2>
            <p className="text-[#52796F] mb-4">
              We want you to feel confident in your purchase. Before placing your order, carefully review your personalized formula and consider questions about:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Your personalized formula and ingredients</li>
              <li>Expected timeline for results</li>
              <li>Interactions with medications or other supplements</li>
              <li>Choosing the right supply duration for your needs</li>
              <li>Ingredient sourcing and third-party testing</li>
            </ul>
          </section>
        </div>
      </div>
      <FooterV2 />
    </div>
  );
}
