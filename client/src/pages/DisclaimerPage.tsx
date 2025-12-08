import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      <div className="container mx-auto px-6 pt-32 pb-24 max-w-4xl">
        <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
          Legal
        </span>
        <h1 className="text-4xl md:text-5xl font-light text-[#1B4332] mb-4" data-testid="heading-disclaimer">
          Medical Disclaimer
        </h1>
        <p className="text-sm text-[#52796F] mb-12">Last updated: March 2024</p>

        <div className="space-y-8">
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="text-xl font-medium text-amber-900 mb-3">Important Notice</h2>
            <p className="text-amber-800 leading-relaxed">
              The information provided by Ones is for informational purposes only and is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Not Medical Advice</h2>
            <p className="text-[#52796F] mb-4 leading-relaxed">
              Ones is a personalized supplement platform powered by artificial intelligence. Our AI system provides supplement recommendations based on the information you provide, but these recommendations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Are not medical advice, diagnosis, or treatment</li>
              <li>Should not replace consultation with healthcare professionals</li>
              <li>Are based solely on the information you provide to our platform</li>
              <li>May not account for all relevant medical factors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Consult Your Healthcare Provider</h2>
            <p className="text-[#52796F] mb-4 leading-relaxed">
              Before starting any new supplement regimen, including those recommended by Ones, you should:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#52796F]">
              <li>Consult with your physician or healthcare provider</li>
              <li>Discuss any existing medical conditions</li>
              <li>Review potential interactions with current medications</li>
              <li>Disclose all supplements and vitamins you currently take</li>
              <li>Consider your individual health circumstances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">FDA Disclaimer</h2>
            <p className="text-[#52796F] leading-relaxed">
              These statements have not been evaluated by the Food and Drug Administration. Ones products are not intended to diagnose, treat, cure, or prevent any disease. Dietary supplements are intended to supplement the diet and should not be considered a replacement for a varied and balanced diet and healthy lifestyle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Not HIPAA Compliant</h2>
            <p className="text-[#52796F] leading-relaxed">
              Ones is not HIPAA compliant. While we implement strong security measures including encryption, access controls, and audit logging, we are not certified for HIPAA compliance. Do not use Ones for storing or transmitting protected health information (PHI) that requires HIPAA compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Individual Results May Vary</h2>
            <p className="text-[#52796F] leading-relaxed">
              Results from using Ones supplements may vary significantly between individuals. Factors affecting results include genetics, lifestyle, diet, exercise, existing health conditions, and adherence to the supplement regimen. Any testimonials or success stories should not be considered typical results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Allergies and Sensitivities</h2>
            <p className="text-[#52796F] leading-relaxed">
              While we ask about allergies during your health assessment, you are responsible for reviewing all ingredients in your personalized formula. If you have known allergies or sensitivities, carefully review your formula and consult with your healthcare provider before use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Pregnancy and Nursing</h2>
            <p className="text-[#52796F] leading-relaxed">
              If you are pregnant, nursing, or planning to become pregnant, consult your healthcare provider before using any supplements, including those from Ones. Certain ingredients may not be safe during pregnancy or while breastfeeding.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Medical Emergencies</h2>
            <p className="text-[#52796F] leading-relaxed">
              If you experience a medical emergency, call 911 or seek immediate medical attention. Ones is not designed for emergency health situations and our AI system cannot provide emergency medical advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Accuracy of Information</h2>
            <p className="text-[#52796F] leading-relaxed">
              While we strive to provide accurate and up-to-date information, nutritional science is constantly evolving. We make no warranties or representations about the accuracy, completeness, or timeliness of the content provided by our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-[#1B4332] mb-4">Questions or Concerns</h2>
            <p className="text-[#52796F] leading-relaxed">
              If you have questions about our products, recommendations, or this medical disclaimer, please contact us at support@myones.ai or consult with your healthcare provider.
            </p>
          </section>
        </div>
      </div>
      <FooterV2 />
    </div>
  );
}
