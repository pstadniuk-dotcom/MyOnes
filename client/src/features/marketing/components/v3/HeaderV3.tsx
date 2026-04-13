import { Link, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/shared/lib/utils";

export default function HeaderV3() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  // Scroll-shrink detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      if (window.scrollY < 100) setActiveSection("");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section tracking
  useEffect(() => {
    if (location !== "/" && location !== "/v2" && location !== "") return;
    const sections = ["the-problem", "the-difference", "compare", "how-it-works", "pricing"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { root: null, rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [location]);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location === "/" || location === "/v2" || location === "") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navItems = [
    { id: "the-problem", label: "The Problem" },
    { id: "the-difference", label: "The Difference" },
    { id: "compare", label: "Compare" },
    { id: "how-it-works", label: "How It Works" },
    { id: "pricing", label: "Pricing" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
        scrolled
          ? "bg-[#ede8e2]/90 backdrop-blur-xl border-b border-[#054700]/8 shadow-[0_1px_12px_rgba(5,71,0,0.04)]"
          : "bg-[#ede8e2]/80 backdrop-blur-md border-b border-[#054700]/5"
      )}
    >
      <div className="w-full px-8 md:px-16 lg:px-16 xl:px-20">
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-500",
            scrolled ? "h-16" : "h-20"
          )}
        >
          {/* Logo */}
          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img
              src="/ones-logo-light.svg"
              alt="Ones"
              className={cn(
                "cursor-pointer transition-all duration-500",
                scrolled ? "h-6" : "h-7"
              )}
            />
          </Link>

          {/* Desktop Navigation with animated underline */}
          <nav className="hidden lg:flex items-center gap-1 relative">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Link key={item.id} href={`/#${item.id}`} onClick={() => handleNavClick(item.id)}>
                  <span
                    className={cn(
                      "relative px-4 py-2 text-sm transition-all duration-300 cursor-pointer rounded-full",
                      isActive
                        ? "text-[#054700] font-medium bg-[#054700]/[0.05]"
                        : "text-[#054700]/55 hover:text-[#054700] hover:bg-[#054700]/[0.03]"
                    )}
                  >
                    {item.label}
                    {/* Animated underline dot */}
                    <span
                      className={cn(
                        "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-[#054700] transition-all duration-300",
                        isActive ? "w-1 h-1 opacity-100" : "w-0 h-0 opacity-0"
                      )}
                    />
                  </span>
                </Link>
              );
            })}
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
                  Hi, {user?.name?.split(" ")[0] || "there"}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="text-[#054700]/70 hover:text-[#054700] font-medium cursor-pointer text-sm transition-colors">
                    Log In
                  </span>
                </Link>
                <Link href="/signup">
                  <Button className="bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full px-6 shadow-lg shadow-[#054700]/10 hover:shadow-xl hover:shadow-[#054700]/15 transition-all duration-300 btn-shimmer">
                    Join Ones
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-[#054700]" /> : <Menu className="w-6 h-6 text-[#054700]" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#ede8e2]/95 backdrop-blur-xl border-t border-[#054700]/5">
          <div className="container mx-auto px-6 py-6 space-y-4">
            {navItems.map((item) => (
              <Link key={item.id} href={`/#${item.id}`} onClick={() => handleNavClick(item.id)}>
                <span className={cn(
                  "block py-2 transition-colors",
                  activeSection === item.id ? "text-[#054700] font-semibold" : "text-[#054700]/60 hover:text-[#054700]"
                )}>
                  {item.label}
                </span>
              </Link>
            ))}
            <div className="pt-4 border-t border-[#054700]/10 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full">
                      <User className="w-4 h-4 mr-2" /> Dashboard
                    </Button>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" className="w-full border-[#5a6623] text-[#5a6623] hover:bg-[#5a6623] hover:text-white rounded-full mt-2">
                        <Shield className="w-4 h-4 mr-2" /> Admin
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login"><span className="block text-[#054700] font-medium py-2">Log In</span></Link>
                  <Link href="/signup">
                    <Button className="w-full bg-[#054700] hover:bg-[#053600] text-[#ede8e2] rounded-full">Join Ones</Button>
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
