import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');

  const footerLinks = {
    product: [
      { name: 'How it Works', href: '#how-it-works' },
      { name: 'Science', href: '#science' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Ingredients', href: '#ingredients' }
    ],
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Blog', href: '#blog' },
      { name: 'Careers', href: '#careers' },
      { name: 'Press', href: '#press' }
    ],
    support: [
      { name: 'Help Center', href: '#help' },
      { name: 'Contact Us', href: '#contact' },
      { name: 'Returns', href: '#returns' },
      { name: 'Shipping', href: '#shipping' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Refund Policy', href: '#refunds' },
      { name: 'Medical Disclaimer', href: '#disclaimer' }
    ]
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email signup:', email);
    setEmail('');
  };

  const handleLinkClick = (href: string) => {
    console.log('Footer link clicked:', href);
  };

  return (
    <footer className="bg-card border-t border-border/50" data-testid="footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight" data-testid="text-footer-brand">
              ONES
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed" data-testid="text-footer-description">
              Personalized supplements powered by AI. Transforming health one formula at a time.
            </p>
            
            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Get health tips & updates</h3>
              <form onSubmit={handleEmailSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-background/50"
                  data-testid="input-newsletter-email"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  data-testid="button-newsletter-submit"
                >
                  Subscribe
                </Button>
              </form>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm"
                    data-testid={`link-footer-product-${index}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm"
                    data-testid={`link-footer-company-${index}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm"
                    data-testid={`link-footer-support-${index}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm"
                    data-testid={`link-footer-legal-${index}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p data-testid="text-footer-copyright">
            © {new Date().getFullYear()} ONES. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => handleLinkClick('#twitter')}
              className="hover:text-foreground transition-colors"
              data-testid="link-footer-twitter"
            >
              Twitter
            </button>
            <button 
              onClick={() => handleLinkClick('#instagram')}
              className="hover:text-foreground transition-colors"
              data-testid="link-footer-instagram"
            >
              Instagram
            </button>
            <button 
              onClick={() => handleLinkClick('#linkedin')}
              className="hover:text-foreground transition-colors"
              data-testid="link-footer-linkedin"
            >
              LinkedIn
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
