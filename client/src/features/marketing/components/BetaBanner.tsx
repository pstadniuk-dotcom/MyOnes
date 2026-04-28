import { Link } from "wouter";
import { Sparkles } from "lucide-react";

/**
 * Closed Beta announcement bar shown above the main header.
 * Used to drive ad traffic into the first 50 founding member spots.
 */
export default function BetaBanner() {
  return (
    <div
      className="w-full bg-[#054700] text-[#ede8e2]"
      data-testid="banner-beta"
      role="region"
      aria-label="Closed beta announcement"
    >
      <Link href="/signup">
        <div className="cursor-pointer hover:bg-[#053600] transition-colors">
          <div className="w-full px-4 sm:px-8 lg:px-16 xl:px-20">
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-2.5 text-center">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4A574] flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium leading-tight">
                <span className="hidden sm:inline">
                  Closed Beta — Now accepting our first{" "}
                  <span className="text-[#D4A574] font-semibold">50 founding members</span>.{" "}
                </span>
                <span className="sm:hidden">
                  Closed Beta — First{" "}
                  <span className="text-[#D4A574] font-semibold">50 spots</span>.{" "}
                </span>
                <span className="underline underline-offset-2 decoration-[#D4A574]/60 hover:decoration-[#D4A574]">
                  Claim your spot →
                </span>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
