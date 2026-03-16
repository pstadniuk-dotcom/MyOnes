import { Link, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Menu, X, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/shared/lib/utils";

export default function HeaderV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    // Only track if we're on the home page
    if (location !== "/" && location !== "") return;

    const sections = ["the-problem", "the-difference", "compare", "how-it-works", "pricing"];
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px", // Adjust for better trigger point
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    // Special case for scrolling to top
    const handleScroll = () => {
      if (window.scrollY < 100) {
        setActiveSection("");
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location]);

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
          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/ones-logo-light.svg" alt="Ones" className="h-7 cursor-pointer" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/#the-problem" onClick={() => handleNavClick("the-problem")}>
              <span className={cn(
                "transition-colors cursor-pointer text-sm",
                activeSection === "the-problem" ? "text-[#054700] font-medium" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                The Problem
              </span>
            </Link>
            <Link href="/#the-difference" onClick={() => handleNavClick("the-difference")}>
              <span className={cn(
                "transition-colors cursor-pointer text-sm",
                activeSection === "the-difference" ? "text-[#054700] font-medium" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                The Difference
              </span>
            </Link>
            <Link href="/#compare" onClick={() => handleNavClick("compare")}>
              <span className={cn(
                "transition-colors cursor-pointer text-sm",
                activeSection === "compare" ? "text-[#054700] font-medium" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                Compare
              </span>
            </Link>
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className={cn(
                "transition-colors cursor-pointer text-sm",
                activeSection === "how-it-works" ? "text-[#054700] font-medium" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                How It Works
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className={cn(
                "transition-colors cursor-pointer text-sm",
                activeSection === "pricing" ? "text-[#054700] font-medium" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
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
              <span className={cn(
                "block py-2 transition-colors",
                activeSection === "the-problem" ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                The Problem
              </span>
            </Link>
            <Link href="/#the-difference" onClick={() => handleNavClick("the-difference")}>
              <span className={cn(
                "block py-2 transition-colors",
                activeSection === "the-difference" ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                The Difference
              </span>
            </Link>
            <Link href="/#compare" onClick={() => handleNavClick("compare")}>
              <span className={cn(
                "block py-2 transition-colors",
                activeSection === "compare" ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                Compare
              </span>
            </Link>
            <Link href="/#how-it-works" onClick={() => handleNavClick("how-it-works")}>
              <span className={cn(
                "block py-2 transition-colors",
                activeSection === "how-it-works" ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
                How It Works
              </span>
            </Link>
            <Link href="/#pricing" onClick={() => handleNavClick("pricing")}>
              <span className={cn(
                "block py-2 transition-colors",
                activeSection === "pricing" ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
              )}>
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
