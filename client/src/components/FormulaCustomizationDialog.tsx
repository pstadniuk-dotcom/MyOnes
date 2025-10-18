import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Sparkles } from "lucide-react";

interface IngredientInfo {
  name: string;
  doseMg: number;
  category: 'base' | 'individual';
  description?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulaId: string;
  existingBases: string[];
  existingIndividuals: string[];
}

export function FormulaCustomizationDialog({
  open,
  onOpenChange,
  formulaId,
  existingBases,
  existingIndividuals,
}: Props) {
  const { toast } = useToast();
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [addedBases, setAddedBases] = useState<IngredientInfo[]>([]);
  const [addedIndividuals, setAddedIndividuals] = useState<IngredientInfo[]>([]);

  // Fetch ingredient catalog
  const { data: catalog, isLoading: catalogLoading } = useQuery<{
    baseFormulas: IngredientInfo[];
    individualIngredients: IngredientInfo[];
  }>({
    queryKey: ["/api/ingredients/catalog"],
    enabled: open,
  });

  // Save customizations mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/users/me/formula/${formulaId}/customize`, {
        addedBases: addedBases.map(b => ({
          ingredient: b.name,
          amount: b.doseMg,
          unit: "mg"
        })),
        addedIndividuals: addedIndividuals.map(i => ({
          ingredient: i.name,
          amount: i.doseMg,
          unit: "mg"
        }))
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/formula/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/formula/history"] });
      toast({
        title: "Formula customized!",
        description: "Your customizations have been saved successfully.",
      });
      onOpenChange(false);
      // Reset state
      setAddedBases([]);
      setAddedIndividuals([]);
      setSelectedBase("");
      setSelectedIndividual("");
    },
    onError: (error: any) => {
      toast({
        title: "Customization failed",
        description: error.message || "Failed to save customizations",
        variant: "destructive",
      });
    },
  });

  // Filter out already selected and existing ingredients
  const availableBases = catalog?.baseFormulas.filter(
    b => !existingBases.includes(b.name) && !addedBases.some(ab => ab.name === b.name)
  ) || [];

  const availableIndividuals = catalog?.individualIngredients.filter(
    i => !existingIndividuals.includes(i.name) && !addedIndividuals.some(ai => ai.name === i.name)
  ) || [];

  const handleAddBase = () => {
    if (!selectedBase) return;
    const base = catalog?.baseFormulas.find(b => b.name === selectedBase);
    if (base) {
      setAddedBases([...addedBases, base]);
      setSelectedBase("");
    }
  };

  const handleAddIndividual = () => {
    if (!selectedIndividual) return;
    const individual = catalog?.individualIngredients.find(i => i.name === selectedIndividual);
    if (individual) {
      setAddedIndividuals([...addedIndividuals, individual]);
      setSelectedIndividual("");
    }
  };

  const handleRemoveBase = (index: number) => {
    setAddedBases(addedBases.filter((_, i) => i !== index));
  };

  const handleRemoveIndividual = (index: number) => {
    setAddedIndividuals(addedIndividuals.filter((_, i) => i !== index));
  };

  const totalAddedMg = [...addedBases, ...addedIndividuals].reduce(
    (sum, item) => sum + item.doseMg,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Customize Your Formula
          </DialogTitle>
          <DialogDescription>
            Add extra base formulations or individual ingredients to personalize your supplement formula.
            Only approved catalog ingredients can be added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Base Formulas */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Add Base Formulas</h3>
            <div className="flex gap-2">
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger className="flex-1" data-testid="select-base-formula">
                  <SelectValue placeholder="Select a base formula..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBases.map(base => (
                    <SelectItem key={base.name} value={base.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{base.name} - {base.doseMg}mg</span>
                        {base.description && (
                          <span className="text-xs text-muted-foreground">{base.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddBase}
                disabled={!selectedBase || catalogLoading}
                size="icon"
                data-testid="button-add-base"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {addedBases.length > 0 && (
              <div className="space-y-2">
                {addedBases.map((base, index) => (
                  <Card key={index} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{base.doseMg}mg</Badge>
                      <span className="text-sm">{base.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBase(index)}
                      data-testid={`button-remove-base-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add Individual Ingredients */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Add Individual Ingredients</h3>
            <div className="flex gap-2">
              <Select value={selectedIndividual} onValueChange={setSelectedIndividual}>
                <SelectTrigger className="flex-1" data-testid="select-individual-ingredient">
                  <SelectValue placeholder="Select an individual ingredient..." />
                </SelectTrigger>
                <SelectContent>
                  {availableIndividuals.map(ingredient => (
                    <SelectItem key={ingredient.name} value={ingredient.name}>
                      {ingredient.name} - {ingredient.doseMg}mg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddIndividual}
                disabled={!selectedIndividual || catalogLoading}
                size="icon"
                data-testid="button-add-individual"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {addedIndividuals.length > 0 && (
              <div className="space-y-2">
                {addedIndividuals.map((ingredient, index) => (
                  <Card key={index} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{ingredient.doseMg}mg</Badge>
                      <span className="text-sm">{ingredient.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIndividual(index)}
                      data-testid={`button-remove-individual-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {(addedBases.length > 0 || addedIndividuals.length > 0) && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Added Ingredients:</span>
                  <span className="font-medium">{addedBases.length + addedIndividuals.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Additional mg:</span>
                  <span className="font-medium">{totalAddedMg}mg</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-customization"
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={addedBases.length === 0 && addedIndividuals.length === 0}
            data-testid="button-save-customizations"
          >
            Save Customizations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
