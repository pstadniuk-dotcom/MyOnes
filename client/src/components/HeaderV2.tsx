import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function HeaderV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    
    // If we're on the home page, scroll to section
    if (location === "/" || location === "") {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    // If we're on another page, the Link will navigate to /#section
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#1B4332]/5">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-2xl font-semibold text-[#1B4332] tracking-tight">
                ONES
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                How It Works
              </span>
            </Link>
            <Link href="/#personalization" onClick={() => handleNavClick("personalization")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                Personalization
              </span>
            </Link>
            <Link href="/#science" onClick={() => handleNavClick("science")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                Science
              </span>
            </Link>
            <Link href="/#testimonials" onClick={() => handleNavClick("testimonials")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                Testimonials
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                Pricing
              </span>
            </Link>
            <Link href="/#faq" onClick={() => handleNavClick("faq")}>
              <span className="text-[#52796F] hover:text-[#1B4332] transition-colors cursor-pointer text-sm">
                FAQ
              </span>
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white rounded-full px-4">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#D4A574] hover:text-white rounded-full px-4">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-[#52796F] ml-2">
                  Hi, {user?.name?.split(' ')[0] || 'there'}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="text-[#1B4332] hover:text-[#143728] font-medium cursor-pointer">
                    Log In
                  </span>
                </Link>
                <Link href="/signup">
                  <Button className="bg-[#1B4332] hover:bg-[#143728] text-white rounded-full px-6">
                    Join ONES
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#1B4332]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1B4332]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF7F2] border-t border-[#1B4332]/5">
          <div className="container mx-auto px-6 py-6 space-y-4">
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                How It Works
              </span>
            </Link>
            <Link href="/#personalization" onClick={() => handleNavClick("personalization")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                Personalization
              </span>
            </Link>
            <Link href="/#science" onClick={() => handleNavClick("science")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                Science
              </span>
            </Link>
            <Link href="/#testimonials" onClick={() => handleNavClick("testimonials")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                Testimonials
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                Pricing
              </span>
            </Link>
            <Link href="/#faq" onClick={() => handleNavClick("faq")}>
              <span className="block text-[#52796F] hover:text-[#1B4332] py-2">
                FAQ
              </span>
            </Link>
            <div className="pt-4 border-t border-[#1B4332]/10 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button className="w-full bg-[#1B4332] hover:bg-[#143728] text-white rounded-full">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" className="w-full border-[#D4A574] text-[#D4A574] hover:bg-[#D4A574] hover:text-white rounded-full mt-2">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <p className="text-center text-sm text-[#52796F] pt-2">
                    Logged in as {user?.name}
                  </p>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <span className="block text-[#1B4332] font-medium py-2">
                      Log In
                    </span>
                  </Link>
                  <Link href="/signup">
                    <Button className="w-full bg-[#1B4332] hover:bg-[#143728] text-white rounded-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
