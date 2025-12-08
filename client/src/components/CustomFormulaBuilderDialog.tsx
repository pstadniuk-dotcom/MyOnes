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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Beaker, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IngredientInfo {
  name: string;
  doseMg: number;
  doseRangeMin?: number;
  doseRangeMax?: number;
  category: 'base' | 'individual';
  description?: string;
  benefits?: string[];
}

interface AddedIngredient extends IngredientInfo {
  selectedDose: number; // The actual dose selected by the user
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_DOSAGE = 5500;
const WARNING_THRESHOLD = 4950; // 90% of max

export function CustomFormulaBuilderDialog({
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();
  const [formulaName, setFormulaName] = useState("");
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [selectedIndividualDose, setSelectedIndividualDose] = useState<number>(0);
  const [addedBases, setAddedBases] = useState<AddedIngredient[]>([]);
  const [addedIndividuals, setAddedIndividuals] = useState<AddedIngredient[]>([]);
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);
  const [expandedSubIngredients, setExpandedSubIngredients] = useState<Record<number, boolean>>({});
  const [expandedIndividualIngredients, setExpandedIndividualIngredients] = useState<Record<number, boolean>>({});

  // Fetch ingredient catalog
  const { data: catalog, isLoading: catalogLoading } = useQuery<{
    systemSupports: IngredientInfo[];
    individualIngredients: IngredientInfo[];
  }>({
    queryKey: ["/api/ingredients/catalog"],
    enabled: open,
  });

  // Fetch system support details for ingredient breakdowns
  const { data: systemSupportData, isLoading: baseDetailsLoading } = useQuery<{ systemSupportDetails: Array<{
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

  // Get breakdown for currently selected system support
  const selectedBaseBreakdown = selectedBase ? systemSupportData?.systemSupportDetails.find(
    f => f.name === selectedBase
  ) : null;

  // Reset expansion state when selected base changes
  useEffect(() => {
    if (selectedBase) {
      setBreakdownExpanded(false);
      setExpandedSubIngredients({});
    }
  }, [selectedBase]);

  // Update selected dose when individual ingredient changes - start at 0
  useEffect(() => {
    if (selectedIndividual) {
      setSelectedIndividualDose(0);
    } else {
      setSelectedIndividualDose(0);
    }
  }, [selectedIndividual]);

  // Calculate total dosage
  const totalDosage = [...addedBases, ...addedIndividuals].reduce(
    (sum, item) => sum + item.selectedDose,
    0
  );

  const dosagePercent = (totalDosage / MAX_DOSAGE) * 100;
  const isNearLimit = totalDosage >= WARNING_THRESHOLD;
  const isAtLimit = totalDosage >= MAX_DOSAGE;

  // Save custom formula mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/users/me/formula/custom`, {
        name: formulaName || undefined,
        bases: addedBases.map(b => ({
          ingredient: b.name,
          amount: b.selectedDose,
          unit: "mg"
        })),
        individuals: addedIndividuals.map(i => ({
          ingredient: i.name,
          amount: i.selectedDose,
          unit: "mg"
        }))
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/formula/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/formula/history"] });
      toast({
        title: "Custom formula created!",
        description: "Your custom formula has been saved successfully.",
      });
      onOpenChange(false);
      // Reset state
      setFormulaName("");
      setAddedBases([]);
      setAddedIndividuals([]);
      setSelectedBase("");
      setSelectedIndividual("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create formula",
        description: error.message || "Failed to save custom formula",
        variant: "destructive",
      });
    },
  });

  // Filter out already added ingredients
  const availableBases = catalog?.systemSupports.filter(
    b => !addedBases.some(ab => ab.name === b.name)
  ) || [];

  const availableIndividuals = catalog?.individualIngredients.filter(
    i => !addedIndividuals.some(ai => ai.name === i.name)
  ) || [];

  const handleAddBase = () => {
    if (!selectedBase) return;
    const base = catalog?.systemSupports.find(b => b.name === selectedBase);
    if (base) {
      const newTotal = totalDosage + base.doseMg;
      if (newTotal > MAX_DOSAGE) {
        toast({
          title: "Cannot add ingredient",
          description: `Adding ${base.name} (${base.doseMg}mg) would exceed the ${MAX_DOSAGE}mg limit.`,
          variant: "destructive",
        });
        return;
      }
      setAddedBases([...addedBases, { ...base, selectedDose: base.doseMg }]);
      setSelectedBase("");
    }
  };

  const handleAddIndividual = () => {
    if (!selectedIndividual || selectedIndividualDose <= 0) return;
    const individual = catalog?.individualIngredients.find(i => i.name === selectedIndividual);
    if (individual) {
      const newTotal = totalDosage + selectedIndividualDose;
      if (newTotal > MAX_DOSAGE) {
        toast({
          title: "Cannot add ingredient",
          description: `Adding ${individual.name} (${selectedIndividualDose}mg) would exceed the ${MAX_DOSAGE}mg limit.`,
          variant: "destructive",
        });
        return;
      }
      setAddedIndividuals([...addedIndividuals, { ...individual, selectedDose: selectedIndividualDose }]);
      setSelectedIndividual("");
      setSelectedIndividualDose(0);
    }
  };

  const handleRemoveBase = (index: number) => {
    setAddedBases(addedBases.filter((_, i) => i !== index));
  };

  const handleRemoveIndividual = (index: number) => {
    setAddedIndividuals(addedIndividuals.filter((_, i) => i !== index));
  };

  const canSave = (addedBases.length > 0 || addedIndividuals.length > 0) && totalDosage <= MAX_DOSAGE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-purple-600" />
            Build Custom Formula
          </DialogTitle>
          <DialogDescription>
            Create your own formula from scratch using approved catalog ingredients.
            Build exactly what you want without AI assistance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formula Name */}
          <div className="space-y-2">
            <Label htmlFor="formula-name">Formula Name (Optional)</Label>
            <Input
              id="formula-name"
              placeholder="e.g., My Morning Stack, Athletic Performance Formula"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              maxLength={100}
              data-testid="input-custom-formula-name"
            />
            <p className="text-xs text-muted-foreground">
              {formulaName.length}/100 characters
            </p>
          </div>

          {/* Dosage Progress */}
          <Card className={`p-4 ${isNearLimit ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : isAtLimit ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Dosage</span>
                <span className={`text-lg font-bold ${isNearLimit ? 'text-amber-600' : isAtLimit ? 'text-red-600' : ''}`}>
                  {totalDosage} / {MAX_DOSAGE} mg
                </span>
              </div>
              <Progress value={dosagePercent} className="h-2" />
              {isAtLimit && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Maximum dosage reached. Remove ingredients to add more.</span>
                </div>
              )}
              {isNearLimit && !isAtLimit && (
                <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Approaching maximum dosage limit.</span>
                </div>
              )}
            </div>
          </Card>

          {/* Add System Supports */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Add System Supports</h3>
            <div className="flex gap-2">
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger className="flex-1 h-auto min-h-[2.5rem] py-2" data-testid="select-system-support">
                  <SelectValue placeholder="Select a system support..." />
                </SelectTrigger>
                <SelectContent className="select-wide-dropdown max-h-[300px] overflow-y-auto">
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
                disabled={!selectedBase || catalogLoading || isAtLimit}
                size="icon"
                data-testid="button-add-base"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Show breakdown for selected system support */}
            {selectedBase && selectedBaseBreakdown && (
              <Card className="p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
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
                                <div className="px-2 pb-2 pt-1 bg-purple-100 dark:bg-purple-900/30">
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
                                  <div className="px-2 pb-2 pt-1 bg-purple-100 dark:bg-purple-900/30">
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
                  <Card key={index} className="p-3 flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-600 text-white">{base.selectedDose}mg</Badge>
                      <span className="text-sm font-medium">{base.name}</span>
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
                <SelectTrigger className="flex-1 h-auto min-h-[2.5rem] py-2" data-testid="select-individual-ingredient">
                  <SelectValue placeholder="Select an individual ingredient..." />
                </SelectTrigger>
                <SelectContent className="select-wide-dropdown max-h-[300px] overflow-y-auto">
                  {availableIndividuals.map(ingredient => (
                    <SelectItem key={ingredient.name} value={ingredient.name} className="py-4 h-auto">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="font-medium text-sm">
                          {ingredient.name} - up to {ingredient.doseRangeMax || ingredient.doseMg}mg
                        </span>
                        {ingredient.benefits && ingredient.benefits.length > 0 && (
                          <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                            {ingredient.benefits.slice(0, 2).map((benefit, idx) => (
                              <p key={idx} className="whitespace-normal text-left">• {benefit}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dose Slider - Show when ingredient is selected */}
            {selectedIndividual && (() => {
              const ingredient = catalog?.individualIngredients.find(i => i.name === selectedIndividual);
              if (!ingredient) return null;
              const min = 0;
              const max = ingredient.doseRangeMax || ingredient.doseMg;
              const hasRange = max > 0;
              // Dynamic step: 5mg for max < 500, 10mg for larger doses
              const step = max < 500 ? 5 : 10;
              
              return (
                <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{ingredient.name}</span>
                      <Badge variant="secondary" className="bg-blue-600 text-white">
                        {selectedIndividualDose}mg
                      </Badge>
                    </div>
                    
                    {hasRange ? (
                      <div className="space-y-2">
                        <Slider
                          value={[selectedIndividualDose]}
                          onValueChange={(values) => setSelectedIndividualDose(values[0])}
                          min={min}
                          max={max}
                          step={step}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{min}mg</span>
                          <span>{max}mg max</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Fixed dose: {min}mg
                      </p>
                    )}
                    
                    <Button
                      onClick={handleAddIndividual}
                      disabled={catalogLoading || isAtLimit}
                      className="w-full"
                      data-testid="button-add-individual"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {ingredient.name} ({selectedIndividualDose}mg)
                    </Button>
                  </div>
                </Card>
              );
            })()}

            {addedIndividuals.length > 0 && (
              <div className="space-y-2">
                {addedIndividuals.map((ingredient, index) => (
                  <Card key={index} className="p-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="secondary" className="bg-purple-600 text-white">{ingredient.selectedDose}mg</Badge>
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
                              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-md p-3 space-y-1.5">
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
                          <span className="text-sm font-medium">{ingredient.name}</span>
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

          {/* Empty State */}
          {addedBases.length === 0 && addedIndividuals.length === 0 && (
            <Card className="p-6 bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">
                No ingredients added yet. Start building your custom formula by selecting ingredients above.
              </p>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-custom"
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-save-custom"
          >
            {saveMutation.isPending ? "Creating..." : "Create Custom Formula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
