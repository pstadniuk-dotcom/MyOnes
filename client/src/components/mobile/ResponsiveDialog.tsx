import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'bottom' | 'top' | 'left' | 'right';
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

interface ResponsiveDialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

/**
 * ResponsiveDialog - A component that renders as a Dialog on desktop and a Sheet on mobile.
 * 
 * Usage is identical to shadcn Dialog:
 * <ResponsiveDialog>
 *   <ResponsiveDialogTrigger>Open</ResponsiveDialogTrigger>
 *   <ResponsiveDialogContent>
 *     <ResponsiveDialogHeader>
 *       <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
 *       <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
 *     </ResponsiveDialogHeader>
 *     ...content...
 *     <ResponsiveDialogFooter>
 *       <ResponsiveDialogClose>Cancel</ResponsiveDialogClose>
 *     </ResponsiveDialogFooter>
 *   </ResponsiveDialogContent>
 * </ResponsiveDialog>
 */

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({ isMobile: false });

export function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <ResponsiveDialogContext.Provider value={{ isMobile: true }}>
        <Sheet open={open} onOpenChange={onOpenChange}>
          {children}
        </Sheet>
      </ResponsiveDialogContext.Provider>
    );
  }
  
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger({ children, asChild, className }: ResponsiveDialogTriggerProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetTrigger asChild={asChild} className={className}>{children}</SheetTrigger>;
  }
  return <DialogTrigger asChild={asChild} className={className}>{children}</DialogTrigger>;
}

export function ResponsiveDialogContent({ 
  children, 
  className,
  side = 'bottom' 
}: ResponsiveDialogContentProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return (
      <SheetContent 
        side={side}
        className={cn(
          "max-h-[90dvh] overflow-y-auto safe-bottom",
          side === 'bottom' && "rounded-t-[16px]",
          className
        )}
      >
        {children}
      </SheetContent>
    );
  }
  
  return (
    <DialogContent className={cn("max-h-[85vh] overflow-y-auto", className)}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({ children, className }: ResponsiveDialogHeaderProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetHeader className={className}>{children}</SheetHeader>;
  }
  return <DialogHeader className={className}>{children}</DialogHeader>;
}

export function ResponsiveDialogTitle({ children, className }: ResponsiveDialogTitleProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetTitle className={className}>{children}</SheetTitle>;
  }
  return <DialogTitle className={className}>{children}</DialogTitle>;
}

export function ResponsiveDialogDescription({ children, className }: ResponsiveDialogDescriptionProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetDescription className={className}>{children}</SheetDescription>;
  }
  return <DialogDescription className={className}>{children}</DialogDescription>;
}

export function ResponsiveDialogFooter({ children, className }: ResponsiveDialogFooterProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetFooter className={cn("mt-4", className)}>{children}</SheetFooter>;
  }
  return <DialogFooter className={className}>{children}</DialogFooter>;
}

export function ResponsiveDialogClose({ children, asChild, className }: ResponsiveDialogCloseProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  
  if (isMobile) {
    return <SheetClose asChild={asChild} className={className}>{children}</SheetClose>;
  }
  return <DialogClose asChild={asChild} className={className}>{children}</DialogClose>;
}
