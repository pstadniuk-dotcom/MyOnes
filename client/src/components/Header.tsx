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
  };

  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-logo">
              ONES
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleNavClick('how-it-works')}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium"
              data-testid="link-how-it-works"
            >
              How it Works
            </button>
            <button 
              onClick={() => handleNavClick('science')}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium"
              data-testid="link-science"
            >
              Science
            </button>
            <button 
              onClick={() => handleNavClick('pricing')}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium"
              data-testid="link-pricing"
            >
              Pricing
            </button>
          </nav>

          {/* Auth & CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" data-testid="button-dashboard">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {user?.name?.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-login">
                    Login
                  </Button>
                </Link>
                <Button 
                  onClick={() => {
                    console.log('Start consultation clicked');
                    const aiChatElement = document.querySelector('[data-testid="card-ai-chat"]') as HTMLElement;
                    if (aiChatElement) {
                      aiChatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      aiChatElement.style.transform = 'scale(1.02)';
                      aiChatElement.style.transition = 'transform 0.3s ease';
                      setTimeout(() => {
                        aiChatElement.style.transform = 'scale(1)';
                      }, 600);
                    }
                  }}
                  size="sm"
                  data-testid="button-start-consultation"
                >
                  Get Started
                </Button>
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
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-border/50" data-testid="menu-mobile">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => handleNavClick('how-it-works')}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-left text-sm font-medium"
                data-testid="link-mobile-how-it-works"
              >
                How it Works
              </button>
              <button 
                onClick={() => handleNavClick('science')}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-left text-sm font-medium"
                data-testid="link-mobile-science"
              >
                Science
              </button>
              <button 
                onClick={() => handleNavClick('pricing')}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-left text-sm font-medium"
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
                  <Button 
                    onClick={() => console.log('Start consultation clicked')}
                    className="w-full mt-2"
                    data-testid="button-mobile-start-consultation"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
