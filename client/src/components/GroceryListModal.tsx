import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShoppingBasket, Check, RefreshCw, Share2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface GroceryItem {
  item: string;
  amount: number | string;
  unit: string;
  category: string;
  checked: boolean;
}

interface GroceryList {
  id: string;
  items: GroceryItem[];
  generatedAt: string;
}

interface GroceryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroceryListModal({ open, onOpenChange }: GroceryListModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groceryList, isLoading } = useQuery<GroceryList | null>({
    queryKey: ['/api/optimize/grocery-list'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: open,
  });

  const generateList = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/optimize/grocery-list/generate', {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/grocery-list'] });
      toast({
        title: 'List Generated',
        description: 'Your grocery list has been created from your meal plan.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    },
  });

  const updateList = useMutation({
    mutationFn: async (updatedList: GroceryList) => {
      const res = await apiRequest('PATCH', `/api/optimize/grocery-list/${updatedList.id}`, {
        items: updatedList.items
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/grocery-list'] });
    },
  });

  const handleToggleItem = (index: number) => {
    if (!groceryList) return;
    
    const newItems = [...groceryList.items];
    newItems[index] = { ...newItems[index], checked: !newItems[index].checked };
    
    // Optimistic update
    queryClient.setQueryData(['/api/optimize/grocery-list'], {
      ...groceryList,
      items: newItems
    });
    
    updateList.mutate({ ...groceryList, items: newItems });
  };

  const handleShare = async () => {
    if (!groceryList) return;

    // Group for text output
    const groupedForShare = groceryList.items.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    let text = "🛒 ONES Grocery List\n";
    Object.entries(groupedForShare).forEach(([category, items]) => {
      text += `\n${category}:\n`;
      items.forEach(item => {
        text += `- [${item.checked ? 'x' : ' '}] ${item.item} (${item.amount} ${item.unit})\n`;
      });
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ONES Grocery List',
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied to Clipboard',
          description: 'Grocery list copied to your clipboard.',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Copy Failed',
          description: 'Could not copy to clipboard.',
        });
      }
    }
  };

  // Group items by category
  const groupedItems = groceryList?.items.reduce((acc, item, index) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...item, originalIndex: index });
    return acc;
  }, {} as Record<string, (GroceryItem & { originalIndex: number })[]>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-green-600" />
            Smart Grocery List
          </DialogTitle>
          <DialogDescription>
            Ingredients aggregated from your 7-day meal plan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !groceryList ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">No active grocery list found.</p>
              <Button onClick={() => generateList.mutate()} disabled={generateList.isPending}>
                {generateList.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Generate from Meal Plan
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.originalIndex} 
                          className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox 
                            id={`item-${item.originalIndex}`} 
                            checked={item.checked}
                            onCheckedChange={() => handleToggleItem(item.originalIndex)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`item-${item.originalIndex}`}
                              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                item.checked ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.item}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {item.amount} {item.unit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between items-center border-t pt-4">
          <div className="text-xs text-muted-foreground">
            {groceryList ? `${groceryList.items.filter(i => i.checked).length}/${groceryList.items.length} items checked` : ''}
          </div>
          <div className="flex gap-2">
            {groceryList && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  title="Share List"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateList.mutate()}
                  disabled={generateList.isPending}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Regenerate
                </Button>
              </>
            )}
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
