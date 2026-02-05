import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Remove default padding - useful for full-bleed content */
  noPadding?: boolean;
  /** Maximum width constraint - set to 'none' for full width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
}

/**
 * MobilePageWrapper - Standardized container for mobile pages
 * Ensures consistent padding, width, and spacing across all mobile views
 */
export function MobilePageWrapper({
  children,
  className,
  noPadding = false,
  maxWidth = 'none'
}: MobilePageWrapperProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    none: 'max-w-none'
  };

  return (
    <div
      className={cn(
        "w-full",
        maxWidthClasses[maxWidth],
        !noPadding && "px-0", // No extra padding - DashboardLayout handles it
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * MobilePageHeader - Consistent header for mobile pages
 */
export function MobilePageHeader({
  title,
  subtitle,
  action,
  className
}: MobilePageHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1B4332] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#52796F] mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * MobileSection - Section wrapper with optional title
 */
export function MobileSection({ children, title, className }: MobileSectionProps) {
  return (
    <section className={cn("mb-5", className)}>
      {title && (
        <h2 className="text-sm font-semibold text-[#52796F] uppercase tracking-wider mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

interface MobileFullWidthCardProps {
  children: React.ReactNode;
  className?: string;
  /** Extend card to viewport edges (negative margin) */
  bleed?: boolean;
}

/**
 * MobileFullWidthCard - Card that fills the full width on mobile
 */
export function MobileFullWidthCard({
  children,
  className,
  bleed = false
}: MobileFullWidthCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-[#1B4332]/10 shadow-sm overflow-hidden",
        bleed && "-mx-4 rounded-none border-x-0",
        className
      )}
    >
      {children}
    </div>
  );
}
