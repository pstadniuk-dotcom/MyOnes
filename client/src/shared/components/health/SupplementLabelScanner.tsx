import { useState, useRef } from 'react';
import { Camera, Loader2, X, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';

interface ScannedIngredient {
  name: string;
  dose?: string | null;
  unit?: string | null;
  percentDailyValue?: string | null;
}

interface ScannedLabel {
  productName?: string | null;
  brand?: string | null;
  servingSize?: string | null;
  servingsPerContainer?: string | null;
  ingredients: ScannedIngredient[];
  notes?: string | null;
}

interface SupplementLabelScannerProps {
  /** Called with the list of supplement strings the user confirmed (e.g. "Vitamin D3 1000 iu") */
  onConfirm: (supplements: string[]) => void;
  /** Existing supplements list — used to skip duplicates */
  existing: string[];
}

function formatIngredient(i: ScannedIngredient): string {
  const dose = [i.dose, i.unit].filter(Boolean).join(' ').trim();
  return dose ? `${i.name} ${dose}` : i.name;
}

export function SupplementLabelScanner({ onConfirm, existing }: SupplementLabelScannerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScannedLabel | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [productNameSelected, setProductNameSelected] = useState(false);

  function reset() {
    setResult(null);
    setSelected({});
    setProductNameSelected(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 12MB.', variant: 'destructive' });
      return;
    }

    reset();
    setOpen(true);
    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(buildApiUrl('/api/users/me/health-profile/scan-supplement-label'), {
        method: 'POST',
        headers: { ...getAuthHeaders() }, // do NOT set Content-Type; browser sets multipart boundary
        body: formData,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Scan failed (${res.status})`);
      }

      const data: ScannedLabel = await res.json();
      setResult(data);

      // Pre-select all ingredients that aren't already in the list
      const existingLower = new Set(existing.map((s) => s.toLowerCase()));
      const initialSelected: Record<number, boolean> = {};
      data.ingredients.forEach((ing, idx) => {
        const formatted = formatIngredient(ing).toLowerCase();
        initialSelected[idx] = !existingLower.has(formatted) && !existingLower.has(ing.name.toLowerCase());
      });
      setSelected(initialSelected);

      if (data.ingredients.length === 0) {
        toast({
          title: 'No ingredients detected',
          description: data.notes || 'Try a clearer photo of the Supplement Facts panel.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan label';
      toast({ title: 'Scan failed', description: message, variant: 'destructive' });
      setResult(null);
    } finally {
      setScanning(false);
    }
  }

  function handleConfirm() {
    if (!result) return;
    const toAdd: string[] = [];

    if (productNameSelected && result.productName) {
      toAdd.push(result.productName);
    }
    result.ingredients.forEach((ing, idx) => {
      if (selected[idx]) toAdd.push(formatIngredient(ing));
    });

    // Dedupe against existing (case-insensitive)
    const existingLower = new Set(existing.map((s) => s.toLowerCase()));
    const deduped = toAdd.filter((s) => {
      const lower = s.toLowerCase();
      if (existingLower.has(lower)) return false;
      existingLower.add(lower);
      return true;
    });

    if (deduped.length > 0) {
      onConfirm(deduped);
      toast({ title: 'Added', description: `Added ${deduped.length} item${deduped.length === 1 ? '' : 's'} to your supplements.` });
    }
    close();
  }

  const selectedCount =
    Object.values(selected).filter(Boolean).length + (productNameSelected ? 1 : 0);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // Reset so the same file can be re-selected
          e.target.value = '';
        }}
        data-testid="supplement-label-file-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        data-testid="button-scan-supplement-label"
      >
        <Camera className="mr-2 h-4 w-4" />
        Scan label
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan supplement label</DialogTitle>
            <DialogDescription>
              We&apos;ll read the Supplement Facts panel and let you pick which ingredients to add.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewUrl && (
              <div className="rounded-md overflow-hidden border bg-muted">
                <img
                  src={previewUrl}
                  alt="Supplement label preview"
                  className="w-full max-h-64 object-contain"
                />
              </div>
            )}

            {scanning && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Reading label... this can take 15–30 seconds.
              </div>
            )}

            {!scanning && result && (
              <div className="space-y-4">
                {(result.productName || result.brand) && (
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="select-product-name"
                        checked={productNameSelected}
                        onCheckedChange={(v) => setProductNameSelected(!!v)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="select-product-name" className="font-medium cursor-pointer">
                          Add product name as a single entry
                        </Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {result.brand && <span className="mr-2">{result.brand}</span>}
                          {result.productName}
                        </div>
                        {result.servingSize && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Serving: {result.servingSize}
                            {result.servingsPerContainer ? ` • ${result.servingsPerContainer} servings` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {result.ingredients.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        Detected ingredients ({result.ingredients.length})
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const all: Record<number, boolean> = {};
                            result.ingredients.forEach((_, idx) => (all[idx] = true));
                            setSelected(all);
                          }}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected({})}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                      {result.ingredients.map((ing, idx) => {
                        const formatted = formatIngredient(ing);
                        const isDuplicate = existing.some(
                          (s) => s.toLowerCase() === formatted.toLowerCase() ||
                                 s.toLowerCase() === ing.name.toLowerCase(),
                        );
                        return (
                          <div
                            key={`${ing.name}-${idx}`}
                            className="flex items-center gap-3 p-2 hover:bg-accent rounded-sm"
                          >
                            <Checkbox
                              id={`ingredient-${idx}`}
                              checked={!!selected[idx]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [idx]: !!v }))}
                            />
                            <Label
                              htmlFor={`ingredient-${idx}`}
                              className="flex-1 cursor-pointer text-sm font-normal"
                            >
                              <span className="font-medium">{ing.name}</span>
                              {(ing.dose || ing.unit) && (
                                <span className="ml-2 text-muted-foreground">
                                  {[ing.dose, ing.unit].filter(Boolean).join(' ')}
                                </span>
                              )}
                              {ing.percentDailyValue && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({ing.percentDailyValue} DV)
                                </span>
                              )}
                            </Label>
                            {isDuplicate && (
                              <Badge variant="outline" className="text-xs">Already added</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {result.notes && (
                  <div className="text-xs text-muted-foreground italic">{result.notes}</div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={scanning || selectedCount === 0}
              data-testid="button-confirm-scanned-supplements"
            >
              <Check className="mr-2 h-4 w-4" />
              Add {selectedCount > 0 ? `${selectedCount} ` : ''}selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
