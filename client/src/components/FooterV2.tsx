import { Link } from "wouter";

const footerLinks = {
  product: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Science", href: "/science" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Partnerships", href: "/partnerships" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

export default function FooterV2() {
  return (
    <footer className="bg-[#FAF7F2] border-t border-[#1B4332]/10">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/">
              <span className="text-2xl font-semibold text-[#1B4332] tracking-tight cursor-pointer">
                ONES
              </span>
            </Link>
            <p className="mt-4 text-[#52796F] text-sm leading-relaxed">
              Personalized supplements powered by AI. Built from your unique biology.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[#1B4332]/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#52796F] text-sm">
            © {new Date().getFullYear()} ONES Health. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-[#52796F]">
            <span>HIPAA Compliant</span>
            <span>•</span>
            <span>GMP Certified</span>
            <span>•</span>
            <span>Made in USA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
