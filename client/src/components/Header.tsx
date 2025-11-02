import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, User } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    console.log('Mobile menu toggled:', !isMenuOpen);
  };

  const handleNavClick = (section: string) => {
    console.log('Navigation clicked:', section);
    setIsMenuOpen(false);
    
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-serif font-bold text-primary" data-testid="text-logo">
              Ones
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

          {/* Auth & CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" data-testid="button-dashboard">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.name}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" data-testid="button-login">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button 
                    className="micro-bounce micro-glow transition-all duration-300"
                    data-testid="button-start-consultation"
                  >
                    Start Consultation
                  </Button>
                </Link>
              </>
            )}
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
              {isAuthenticated ? (
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full mt-4" data-testid="button-mobile-dashboard">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full mt-4" data-testid="button-mobile-login">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" className="w-full">
                    <Button 
                      className="w-full mt-2"
                      data-testid="button-mobile-start-consultation"
                    >
                      Start Consultation
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}