import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

type IngredientPricingRow = {
  id: string;
  ingredientKey: string;
  ingredientName: string;
  typicalCapsuleMg: number;
  typicalBottleCapsules: number;
  typicalRetailPriceCents: number;
  isActive: boolean;
  updatedAt: string;
};

export default function RetailComparisonPricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pricingRows, isLoading, error } = useQuery<IngredientPricingRow[]>({
    queryKey: ['/api/admin/ingredient-pricing'],
  });

  const [drafts, setDrafts] = useState<Record<string, IngredientPricingRow>>({});

  useEffect(() => {
    if (pricingRows?.length) {
      const nextDrafts: Record<string, IngredientPricingRow> = {};
      pricingRows.forEach((row) => {
        nextDrafts[row.id] = { ...row };
      });
      setDrafts(nextDrafts);
    }
  }, [pricingRows]);

  const originalById = useMemo(() => {
    const map = new Map<string, IngredientPricingRow>();
    (pricingRows || []).forEach((row) => map.set(row.id, row));
    return map;
  }, [pricingRows]);

  const updateMutation = useMutation({
    mutationFn: async (row: IngredientPricingRow) => {
      const res = await apiRequest('PATCH', `/api/admin/ingredient-pricing/${row.id}`, {
        ingredientName: row.ingredientName,
        typicalCapsuleMg: row.typicalCapsuleMg,
        typicalBottleCapsules: row.typicalBottleCapsules,
        typicalRetailPriceCents: row.typicalRetailPriceCents,
        isActive: row.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-pricing'] });
      toast({ title: 'Ingredient pricing updated' });
    },
    onError: (e: any) => {
      toast({
        title: 'Failed to update ingredient pricing',
        description: e?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const updateDraft = <K extends keyof IngredientPricingRow>(
    id: string,
    key: K,
    value: IngredientPricingRow[K],
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || (originalById.get(id) as IngredientPricingRow)),
        [key]: value,
      },
    }));
  };

  const hasChanges = (id: string) => {
    const original = originalById.get(id);
    const draft = drafts[id];
    if (!original || !draft) return false;
    return (
      original.ingredientName !== draft.ingredientName ||
      original.typicalCapsuleMg !== draft.typicalCapsuleMg ||
      original.typicalBottleCapsules !== draft.typicalBottleCapsules ||
      original.typicalRetailPriceCents !== draft.typicalRetailPriceCents ||
      original.isActive !== draft.isActive
    );
  };

  const formatDollars = (cents: number) => `$${(Math.max(0, cents || 0) / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="h-8 w-8 text-muted-foreground mt-1" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Retail Comparison Pricing</h1>
            <p className="text-muted-foreground mt-1">
              Reference values used to estimate the equivalent retail stack cost shown at checkout.
              Adjust typical retail prices, capsule sizes, and bottle counts to keep comparisons accurate.
            </p>
          </div>
        </div>

        {/* Pricing Table */}
        <Card data-testid="card-ingredient-pricing">
          <CardHeader>
            <CardTitle>Ingredient Pricing Assumptions</CardTitle>
            <CardDescription>
              These values power the "equivalent retail stack" estimate — showing users how much they'd
              pay buying each ingredient separately vs. their ONES formula.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Failed to load ingredient pricing.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Capsule mg</TableHead>
                    <TableHead>Bottle caps</TableHead>
                    <TableHead>Retail (cents)</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pricingRows || []).map((row) => {
                    const draft = drafts[row.id] || row;
                    const rowHasChanges = hasChanges(row.id);

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={draft.ingredientName}
                            onChange={(e) => updateDraft(row.id, 'ingredientName', e.target.value)}
                            className="min-w-[180px]"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.ingredientKey}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={draft.typicalCapsuleMg}
                            onChange={(e) => updateDraft(row.id, 'typicalCapsuleMg', Number(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={draft.typicalBottleCapsules}
                            onChange={(e) => updateDraft(row.id, 'typicalBottleCapsules', Number(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min={1}
                              value={draft.typicalRetailPriceCents}
                              onChange={(e) =>
                                updateDraft(row.id, 'typicalRetailPriceCents', Number(e.target.value) || 0)
                              }
                              className="w-28"
                            />
                            <p className="text-xs text-muted-foreground">
                              {formatDollars(draft.typicalRetailPriceCents)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={draft.isActive}
                            onCheckedChange={(checked) => updateDraft(row.id, 'isActive', checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={!rowHasChanges || updateMutation.isPending}
                            onClick={() => updateMutation.mutate(draft)}
                          >
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
