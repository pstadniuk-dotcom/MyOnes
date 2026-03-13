import { Link } from "wouter";

const footerLinks = {
  product: [
    { label: "The Problem", href: "/#the-problem" },
    { label: "The Difference", href: "/#the-difference" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Compare", href: "/#compare" },
    { label: "Pricing", href: "/#pricing" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Partnerships", href: "/partnerships" },
    { label: "Contact Us", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Refunds", href: "/refunds" },
    { label: "Returns", href: "/returns" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

export default function FooterV2() {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#")) {
      const id = href.replace("/#", "");
      const element = document.getElementById(id);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-[#ede8e2] border-t border-[#054700]/10">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/">
              <img src="/ones-logo-light.svg" alt="Ones" className="h-7 cursor-pointer" />
            </Link>
            <p className="mt-4 text-[#054700]/60 text-sm leading-relaxed">
              Personalized supplements powered by AI. Built from your unique biology.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium text-[#054700] mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={(e) => handleLinkClick(e, link.href)}>
                    <span className="text-[#054700]/60 hover:text-[#054700] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#054700] mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={(e) => handleLinkClick(e, link.href)}>
                    <span className="text-[#054700]/60 hover:text-[#054700] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#054700] mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={(e) => handleLinkClick(e, link.href)}>
                    <span className="text-[#054700]/60 hover:text-[#054700] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[#054700]/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#054700]/60 text-sm">
            © {new Date().getFullYear()} Ones Health. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-[#054700]/60">
            <span>Clinical-Grade Ingredients</span>
            <span>•</span>
            <span>Made in USA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
