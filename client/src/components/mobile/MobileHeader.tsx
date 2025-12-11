import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { Link } from 'wouter';

export function MobileHeader() {
  return (
    <header 
      className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#1B4332]/10 safe-top"
      data-testid="mobile-header"
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 touch-feedback"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-[#1B4332]" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-[280px] p-0 bg-[#FAF7F2]"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation menu with links to all sections of the app
            </SheetDescription>
            <AppSidebar />
          </SheetContent>
        </Sheet>
        
        {/* Logo - centered */}
        <Link href="/dashboard" className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <img src="/ones-logo-icon.svg" alt="" className="h-7 w-7" aria-hidden="true" />
          <span className="font-semibold text-[#1B4332] text-lg">ONES</span>
        </Link>
        
        {/* Notifications */}
        <NotificationsDropdown />
      </div>
    </header>
  );
}
