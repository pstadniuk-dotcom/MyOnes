import { Mail, Phone, Smartphone, Clock } from 'lucide-react';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Contact
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#054700] mb-6" data-testid="heading-contact-hero">
              Get in Touch
            </h1>
            <p className="text-xl text-[#5a6623] max-w-2xl mx-auto" data-testid="text-contact-description">
              Have questions? We're here to help. Reach out to us by email, phone, or text and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Email */}
            <div className="bg-[#ede8e2] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#054700]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail className="w-8 h-8 text-[#054700]" />
              </div>
              <h3 className="text-xl font-semibold text-[#054700] mb-2">Email Us</h3>
              <p className="text-sm text-[#5a6623] mb-4">
                Send us an email and we'll get back to you within 24 hours
              </p>
              <a
                href="mailto:support@ones.health"
                className="text-[#054700] font-medium hover:underline text-lg"
              >
                support@ones.health
              </a>
            </div>

            {/* Phone */}
            <div className="bg-[#ede8e2] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#054700]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Phone className="w-8 h-8 text-[#054700]" />
              </div>
              <h3 className="text-xl font-semibold text-[#054700] mb-2">Call Us</h3>
              <p className="text-sm text-[#5a6623] mb-4">
                Speak with our team Monday–Friday, 9am–5pm EST
              </p>
              <a
                href="tel:+13414443914"
                className="text-[#054700] font-medium hover:underline text-lg"
              >
                (341) 444-3914
              </a>
            </div>

            {/* Text */}
            <div className="bg-[#ede8e2] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#054700]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Smartphone className="w-8 h-8 text-[#054700]" />
              </div>
              <h3 className="text-xl font-semibold text-[#054700] mb-2">Text Us</h3>
              <p className="text-sm text-[#5a6623] mb-4">
                Send a text for quick questions — we usually reply within minutes
              </p>
              <a
                href="sms:+13414443914"
                className="text-[#054700] font-medium hover:underline text-lg"
              >
                (341) 444-3914
              </a>
            </div>
          </div>

          {/* Response time note */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-[#ede8e2] rounded-full px-6 py-3">
              <Clock className="w-5 h-5 text-[#054700]" />
              <span className="text-sm text-[#5a6623]">We typically respond within a few hours during business days</span>
            </div>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
