import { User } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { NotificationsDropdown } from '@/features/notifications/components/NotificationsDropdown';
import { Link } from 'wouter';

export function MobileHeader() {
  return (
    <header 
      className="sticky top-0 z-40 bg-[#ede8e2]/95 backdrop-blur-md border-b border-[#054700]/10 safe-top"
      data-testid="mobile-header"
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo - left aligned */}
        <Link href="/dashboard" className="flex items-center">
          <img src="/ones-logo-light.svg" alt="Ones" className="h-6" />
        </Link>
        
        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <NotificationsDropdown />
          <Link href="/dashboard/profile">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 touch-feedback"
              aria-label="Profile"
            >
              <User className="h-5 w-5 text-[#054700]" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
