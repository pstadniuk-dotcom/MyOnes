import { useState, useEffect } from "react";
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
import { Plus, X, Sparkles, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IngredientInfo {
  name: string;
  doseMg: number;
  category: 'base' | 'individual';
  description?: string;
  benefits?: string[];
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
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);
  const [expandedSubIngredients, setExpandedSubIngredients] = useState<Record<number, boolean>>({});
  const [expandedIndividualIngredients, setExpandedIndividualIngredients] = useState<Record<number, boolean>>({});

  // Fetch ingredient catalog
  const { data: catalog, isLoading: catalogLoading } = useQuery<{
    baseFormulas: IngredientInfo[];
    individualIngredients: IngredientInfo[];
  }>({
    queryKey: ["/api/ingredients/catalog"],
    enabled: open,
  });

  // Fetch base formula details for ingredient breakdowns
  const { data: baseFormulaData, isLoading: baseDetailsLoading } = useQuery<{ baseFormulaDetails: Array<{
    name: string;
    doseMg: number;
    systemSupported: string;
    activeIngredients: Array<{ name: string; amount: string; description?: string; benefits?: string[] }>;
    suggestedDosage: string;
    description: string;
  }> }>({
    queryKey: ['/api/ingredients/base-details'],
    enabled: open
  });

  // Get breakdown for currently selected base formula
  const selectedBaseBreakdown = selectedBase ? baseFormulaData?.baseFormulaDetails.find(
    f => f.name === selectedBase
  ) : null;

  // Reset expansion state when selected base changes
  useEffect(() => {
    if (selectedBase) {
      setBreakdownExpanded(false);
      setExpandedSubIngredients({});
    }
  }, [selectedBase]);

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
                <SelectTrigger className="flex-1 h-auto min-h-[2.5rem] py-2" data-testid="select-base-formula">
                  <SelectValue placeholder="Select a base formula..." />
                </SelectTrigger>
                <SelectContent className="select-wide-dropdown max-h-[500px] overflow-y-auto">
                  {availableBases.map(base => (
                    <SelectItem key={base.name} value={base.name} className="py-4 h-auto">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="font-medium text-sm">{base.name} - {base.doseMg}mg</span>
                        {base.description && (
                          <span className="text-xs text-muted-foreground leading-relaxed whitespace-normal">
                            {base.description}
                          </span>
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

            {/* Show breakdown for selected base formula */}
            {selectedBase && selectedBaseBreakdown && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-primary">
                    {selectedBase} - Ingredient Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">System:</span>
                      <p className="font-medium">{selectedBaseBreakdown.systemSupported}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dosage:</span>
                      <p className="font-medium">{selectedBaseBreakdown.suggestedDosage}</p>
                    </div>
                  </div>
                  <div>
                    <Collapsible open={breakdownExpanded} onOpenChange={setBreakdownExpanded}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">
                          Contains ({selectedBaseBreakdown.activeIngredients.length} ingredients):
                        </p>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <span className="text-xs mr-1">
                              {breakdownExpanded ? "Show less" : "Show all"}
                            </span>
                            {breakdownExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <div className="space-y-1">
                        {/* Always show first 3 ingredients */}
                        {selectedBaseBreakdown.activeIngredients.slice(0, 3).map((ing, idx) => {
                          const hasBenefits = ing.benefits && ing.benefits.length > 0;
                          const isExpanded = expandedSubIngredients[idx] || false;
                          
                          return (
                            <div key={idx} className="bg-background rounded overflow-hidden">
                              <button
                                onClick={() => hasBenefits && setExpandedSubIngredients(prev => ({
                                  ...prev,
                                  [idx]: !prev[idx]
                                }))}
                                className={`w-full flex items-center justify-between text-xs p-1.5 ${hasBenefits ? 'hover-elevate cursor-pointer' : ''}`}
                                disabled={!hasBenefits}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{ing.name}</span>
                                  {hasBenefits && (
                                    <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">{ing.amount}</Badge>
                              </button>
                              {hasBenefits && isExpanded && ing.benefits && (
                                <div className="px-2 pb-2 pt-1 bg-primary/5">
                                  <div className="space-y-0.5">
                                    {ing.benefits.map((benefit: string, benefitIdx: number) => (
                                      <div key={benefitIdx} className="flex items-start gap-1 text-xs">
                                        <CheckCircle className="w-2.5 h-2.5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-xs">{benefit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Show remaining ingredients when expanded */}
                        <CollapsibleContent className="space-y-1">
                          {selectedBaseBreakdown.activeIngredients.slice(3).map((ing, idx) => {
                            const actualIdx = idx + 3;
                            const hasBenefits = ing.benefits && ing.benefits.length > 0;
                            const isExpanded = expandedSubIngredients[actualIdx] || false;
                            
                            return (
                              <div key={actualIdx} className="bg-background rounded overflow-hidden">
                                <button
                                  onClick={() => hasBenefits && setExpandedSubIngredients(prev => ({
                                    ...prev,
                                    [actualIdx]: !prev[actualIdx]
                                  }))}
                                  className={`w-full flex items-center justify-between text-xs p-1.5 ${hasBenefits ? 'hover-elevate cursor-pointer' : ''}`}
                                  disabled={!hasBenefits}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{ing.name}</span>
                                    {hasBenefits && (
                                      <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">{ing.amount}</Badge>
                                </button>
                                {hasBenefits && isExpanded && ing.benefits && (
                                  <div className="px-2 pb-2 pt-1 bg-primary/5">
                                    <div className="space-y-0.5">
                                      {ing.benefits.map((benefit: string, benefitIdx: number) => (
                                        <div key={benefitIdx} className="flex items-start gap-1 text-xs">
                                          <CheckCircle className="w-2.5 h-2.5 text-green-600 flex-shrink-0 mt-0.5" />
                                          <span className="text-xs">{benefit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Loading state for breakdown */}
            {selectedBase && baseDetailsLoading && (
              <Card className="p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Loading ingredient breakdown...
                </p>
              </Card>
            )}

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
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="secondary">{ingredient.doseMg}mg</Badge>
                        {ingredient.benefits && ingredient.benefits.length > 0 ? (
                          <Collapsible
                            open={expandedIndividualIngredients[index]}
                            onOpenChange={(open) => {
                              setExpandedIndividualIngredients(prev => ({ ...prev, [index]: open }));
                            }}
                            className="flex-1"
                          >
                            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover-elevate active-elevate-2 rounded px-2 py-1 -ml-2" data-testid={`trigger-individual-${index}`}>
                              <span>{ingredient.name}</span>
                              {expandedIndividualIngredients[index] ? (
                                <ChevronUp className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-primary/5 dark:bg-primary/10 rounded-md p-3 space-y-1.5">
                                {ingredient.benefits.map((benefit, bidx) => (
                                  <div key={bidx} className="flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground">{benefit}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <span className="text-sm">{ingredient.name}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIndividual(index)}
                        data-testid={`button-remove-individual-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
