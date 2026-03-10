import { Link, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#ede8e2]/80 backdrop-blur-md border-b border-[#054700]/5">
      <div className="w-full px-8 md:px-16 lg:px-16 xl:px-20">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/">
            <img src="/ones-logo-light.svg" alt="Ones" className="h-7 cursor-pointer" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/#the-problem" onClick={() => handleNavClick("the-problem")}>
              <span className="text-[#054700]/60 hover:text-[#054700] transition-colors cursor-pointer text-sm">
                The Problem
              </span>
            </Link>
            <Link href="/#the-difference" onClick={() => handleNavClick("the-difference")}>
              <span className="text-[#054700]/60 hover:text-[#054700] transition-colors cursor-pointer text-sm">
                The Difference
              </span>
            </Link>
            <Link href="/#compare" onClick={() => handleNavClick("compare")}>
              <span className="text-[#054700]/60 hover:text-[#054700] transition-colors cursor-pointer text-sm">
                Compare
              </span>
            </Link>
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className="text-[#054700]/60 hover:text-[#054700] transition-colors cursor-pointer text-sm">
                How It Works
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className="text-[#054700]/60 hover:text-[#054700] transition-colors cursor-pointer text-sm">
                Pricing
              </span>
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full px-4">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" className="border-[#5a6623] text-[#5a6623] hover:bg-[#5a6623] hover:text-white rounded-full px-4">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-[#054700]/60 ml-2">
                  Hi, {user?.name?.split(' ')[0] || 'there'}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="text-[#054700] hover:text-[#053600] font-medium cursor-pointer">
                    Log In
                  </span>
                </Link>
                <Link href="/signup">
                  <Button className="bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full px-6">
                    Join Ones
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#054700]" />
            ) : (
              <Menu className="w-6 h-6 text-[#054700]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#ede8e2] border-t border-[#054700]/5">
          <div className="container mx-auto px-6 py-6 space-y-4">
            <Link href="/#the-problem" onClick={() => handleNavClick("the-problem")}>
              <span className="block text-[#054700]/60 hover:text-[#054700] py-2">
                The Problem
              </span>
            </Link>
            <Link href="/#the-difference" onClick={() => handleNavClick("the-difference")}>
              <span className="block text-[#054700]/60 hover:text-[#054700] py-2">
                The Difference
              </span>
            </Link>
            <Link href="/#compare" onClick={() => handleNavClick("compare")}>
              <span className="block text-[#054700]/60 hover:text-[#054700] py-2">
                Compare
              </span>
            </Link>
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className="block text-[#054700]/60 hover:text-[#054700] py-2">
                How It Works
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className="block text-[#054700]/60 hover:text-[#054700] py-2">
                Pricing
              </span>
            </Link>
            <div className="pt-4 border-t border-[#054700]/10 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" className="w-full border-[#5a6623] text-[#5a6623] hover:bg-[#5a6623] hover:text-white rounded-full mt-2">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <p className="text-center text-sm text-[#054700]/60 pt-2">
                    Logged in as {user?.name}
                  </p>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <span className="block text-[#054700] font-medium py-2">
                      Log In
                    </span>
                  </Link>
                  <Link href="/signup">
                    <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full">
                      Join Ones
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
