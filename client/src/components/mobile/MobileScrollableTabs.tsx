import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileScrollableTabsProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
}

/**
 * A wrapper component that makes TabsList horizontally scrollable on mobile
 * with optional navigation arrows when content overflows.
 */
export function MobileScrollableTabs({ 
  children, 
  className,
  showArrows = false 
}: MobileScrollableTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkArrows();
    const handleResize = () => checkArrows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Left fade/arrow indicator */}
      {showArrows && showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 backdrop-blur-sm border rounded-full shadow-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onScroll={checkArrows}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory",
          "-mx-4 px-4 md:mx-0 md:px-0", // Extend to viewport edges on mobile
          showArrows && showLeftArrow && "pl-10",
          showArrows && showRightArrow && "pr-10"
        )}
      >
        {children}
      </div>

      {/* Right fade/arrow indicator */}
      {showArrows && showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 backdrop-blur-sm border rounded-full shadow-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Gradient fades to indicate more content */}
      {showLeftArrow && !showArrows && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      )}
      {showRightArrow && !showArrows && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
}
