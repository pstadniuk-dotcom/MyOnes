import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

interface ChecklistItem {
  label: string;
  complete: boolean;
  route: string;
}

interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

interface ProfileCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileCompleteness: number;
  checklist: ChecklistCategory[];
}

export function ProfileCompletionDialog({
  open,
  onOpenChange,
  profileCompleteness,
  checklist
}: ProfileCompletionDialogProps) {
  const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = checklist.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.complete).length,
    0
  );
  const incompleteItems = totalItems - completedItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-profile-completion">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">Complete Your Profile</DialogTitle>
              <DialogDescription>
                {profileCompleteness === 100 
                  ? "You've completed your entire health profile!" 
                  : `${incompleteItems} ${incompleteItems === 1 ? 'item' : 'items'} remaining to reach 100%`
                }
              </DialogDescription>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedItems} of {totalItems} completed
              </span>
              <span className="font-semibold text-primary">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2" />
          </div>
        </DialogHeader>

        {/* Checklist */}
        <div className="space-y-6 pt-4">
          {checklist.map((category, catIndex) => {
            const categoryComplete = category.items.every(item => item.complete);
            const categoryIncomplete = category.items.filter(item => !item.complete).length;

            return (
              <div key={catIndex} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category.category}
                  </h3>
                  {categoryComplete && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Complete
                    </span>
                  )}
                  {!categoryComplete && categoryIncomplete > 0 && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {categoryIncomplete} remaining
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        item.complete
                          ? 'bg-muted/30 border-muted'
                          : 'bg-card border-card-border hover-elevate'
                      }`}
                      data-testid={`checklist-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                            item.complete
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {item.complete && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span
                          className={`text-sm ${
                            item.complete ? 'text-muted-foreground' : 'font-medium'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>

                      {!item.complete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-1"
                          onClick={() => onOpenChange(false)}
                          data-testid={`button-complete-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Link href={item.route}>
                            Add
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {profileCompleteness === 100 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary">
                <Check className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Profile Complete!</p>
                <p className="text-xs text-muted-foreground">
                  You've unlocked the most accurate AI formula recommendations
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
