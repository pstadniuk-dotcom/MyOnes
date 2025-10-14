import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const footerLinks = {
    product: [
      { name: 'How it Works', href: '#how-it-works', isSection: true },
      { name: 'Science', href: '#science', isSection: true },
      { name: 'Pricing', href: '#pricing', isSection: true },
      { name: 'Ingredients', href: '#ingredients', isSection: true }
    ],
    company: [
      { name: 'About Us', href: '/about', isSection: false },
      { name: 'Blog', href: '/blog', isSection: false },
      { name: 'Careers', href: '/careers', isSection: false },
      { name: 'Press', href: '/press', isSection: false }
    ],
    support: [
      { name: 'Help Center', href: '/help', isSection: false },
      { name: 'Contact Us', href: '/contact', isSection: false },
      { name: 'Returns', href: '/returns', isSection: false },
      { name: 'Shipping', href: '/shipping', isSection: false }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy', isSection: false },
      { name: 'Terms of Service', href: '/terms', isSection: false },
      { name: 'Refund Policy', href: '/refunds', isSection: false },
      { name: 'Medical Disclaimer', href: '/disclaimer', isSection: false }
    ]
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiRequest('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: "Subscribed!",
        description: "You'll receive health tips and updates in your inbox.",
      });
      setEmail('');
    } catch (error: any) {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSectionClick = (href: string) => {
    // Remove the # from href
    const sectionId = href.replace('#', '');
    
    // Try to scroll to the section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If section doesn't exist, show a toast
      toast({
        title: "Coming Soon",
        description: "This section is not available yet.",
      });
    }
  };

  return (
    <footer className="bg-background border-t border-border" data-testid="footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-serif font-bold text-primary mb-4" data-testid="text-footer-brand">
              ONES
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm" data-testid="text-footer-description">
              Personalized supplements powered by AI. Transforming health one formula at a time.
            </p>
            
            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Get health tips & updates</h3>
              <form onSubmit={handleEmailSubmit} className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-newsletter-email"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isSubmitting}
                  data-testid="button-newsletter-submit"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  {link.isSection ? (
                    <button
                      onClick={() => handleSectionClick(link.href)}
                      className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                      data-testid={`link-footer-product-${index}`}
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm" data-testid={`link-footer-product-${index}`}>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  {link.isSection ? (
                    <button
                      onClick={() => handleSectionClick(link.href)}
                      className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                      data-testid={`link-footer-company-${index}`}
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm" data-testid={`link-footer-company-${index}`}>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  {link.isSection ? (
                    <button
                      onClick={() => handleSectionClick(link.href)}
                      className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                      data-testid={`link-footer-support-${index}`}
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm" data-testid={`link-footer-support-${index}`}>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  {link.isSection ? (
                    <button
                      onClick={() => handleSectionClick(link.href)}
                      className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                      data-testid={`link-footer-legal-${index}`}
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm" data-testid={`link-footer-legal-${index}`}>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
              © 2024 ONES. All rights reserved.
            </p>
            
            {/* Social Proof */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>1,000+ optimizing their health</span>
              </span>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <span className="text-primary font-bold text-xs">FDA</span>
              </div>
              <span>FDA Registered</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <span className="text-primary font-bold text-xs">✓</span>
              </div>
              <span>3rd party tested</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <span className="text-primary font-bold text-xs">USA</span>
              </div>
              <span>Made in USA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}