import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    console.log('Mobile menu toggled:', !isMenuOpen);
  };

  const handleNavClick = (section: string) => {
    console.log('Navigation clicked:', section);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-serif font-bold text-primary" data-testid="text-logo">
              ONES
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => handleNavClick('how-it-works')}
              className="text-foreground hover:text-primary transition-colors duration-200"
              data-testid="link-how-it-works"
            >
              How it Works
            </button>
            <button 
              onClick={() => handleNavClick('science')}
              className="text-foreground hover:text-primary transition-colors duration-200"
              data-testid="link-science"
            >
              Science
            </button>
            <button 
              onClick={() => handleNavClick('pricing')}
              className="text-foreground hover:text-primary transition-colors duration-200"
              data-testid="link-pricing"
            >
              Pricing
            </button>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex">
            <Button 
              onClick={() => console.log('Start consultation clicked')}
              data-testid="button-start-consultation"
            >
              Start Consultation
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              data-testid="button-mobile-menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border" data-testid="menu-mobile">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => handleNavClick('how-it-works')}
                className="text-foreground hover:text-primary transition-colors duration-200 text-left"
                data-testid="link-mobile-how-it-works"
              >
                How it Works
              </button>
              <button 
                onClick={() => handleNavClick('science')}
                className="text-foreground hover:text-primary transition-colors duration-200 text-left"
                data-testid="link-mobile-science"
              >
                Science
              </button>
              <button 
                onClick={() => handleNavClick('pricing')}
                className="text-foreground hover:text-primary transition-colors duration-200 text-left"
                data-testid="link-mobile-pricing"
              >
                Pricing
              </button>
              <Button 
                onClick={() => console.log('Start consultation clicked')}
                className="w-full mt-4"
                data-testid="button-mobile-start-consultation"
              >
                Start Consultation
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}