import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FlaskConical, Calendar, TrendingUp, AlertTriangle, CheckCircle, Download,
  MessageSquare, RefreshCw, Info, Pill, Beaker, Search, Filter, Eye, 
  Share2, Archive, FileText, ShoppingCart, ChevronDown, ChevronUp,
  Clock, ArrowRight, ArrowLeft, GitBranch, Star, Zap,
  Heart, Brain, Activity, Target, Plus, Minus, RotateCcw, 
  ExternalLink, Copy, Users, Lightbulb, BookOpen, Award,
  Package, AlertCircle, Pencil, Sparkles
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FormulaCustomizationDialog } from '@/components/FormulaCustomizationDialog';

// Types for Formula data matching backend schema
interface FormulaIngredient {
  ingredient: string;
  amount: number;
  unit: string;
  purpose?: string;
}

interface Formula {
  id: string;
  userId: string;
  version: number;
  name?: string;
  bases: FormulaIngredient[];
  additions: FormulaIngredient[];
  userCustomizations?: {
    addedBases?: FormulaIngredient[];
    addedIndividuals?: FormulaIngredient[];
  };
  totalMg: number;
  rationale?: string;
  warnings?: string[];
  disclaimers?: string[];
  notes?: string;
  createdAt: Date;
  changes?: {
    id: string;
    summary: string;
    rationale: string;
    createdAt: Date;
  };
}

// API Response Types
interface CurrentFormulaResponse {
  formula: Formula;
  versionChanges?: Array<{
    id: string;
    summary: string;
    rationale: string;
    createdAt: string;
  }>;
}

interface FormulaHistoryResponse {
  history: Formula[];
}

interface IngredientDetail {
  name: string;
  dosage: number;
  benefits: string[];
  interactions: string[];
  category: string;
  dailyValuePercentage: number | null;
  sources: string[];
  qualityIndicators: string[];
  alternatives: string[];
  researchBacking: {
    studyCount: number;
    evidenceLevel: string;
  };
}

interface FormulaComparison {
  formula1: Formula;
  formula2: Formula;
  differences: {
    totalMgChange: number;
    basesAdded: FormulaIngredient[];
    basesRemoved: FormulaIngredient[];
    basesModified: FormulaIngredient[];
    additionsAdded: FormulaIngredient[];
    additionsRemoved: FormulaIngredient[];
    additionsModified: FormulaIngredient[];
  };
}

export default function MyFormulaPage() {
  // State management
  const [activeTab, setActiveTab] = useState('formulas');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [revertReason, setRevertReason] = useState('');
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [renamingFormulaId, setRenamingFormulaId] = useState<string | null>(null);
  const [newFormulaName, setNewFormulaName] = useState('');
  const [expandedIndividualIngredients, setExpandedIndividualIngredients] = useState<Record<string, boolean>>({});
  
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries - using default queryFn pattern with proper typing
  const { data: currentFormulaData, isLoading: isLoadingCurrent, error: currentError } = useQuery<CurrentFormulaResponse>({
    queryKey: ['/api/users/me/formula/current'],
    enabled: !!user?.id
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery<FormulaHistoryResponse>({
    queryKey: ['/api/users/me/formula/history'],
    enabled: !!user?.id
  });

  const { data: comparisonData } = useQuery<FormulaComparison>({
    queryKey: ['/api/users/me/formula/compare', selectedVersions[0], selectedVersions[1]],
    enabled: selectedVersions.length === 2
  });

  // Fetch ingredient catalog for individual ingredient benefits
  const { data: ingredientCatalog } = useQuery<{
    baseFormulas: Array<{ name: string; doseMg: number; category: string; description?: string; benefits?: string[] }>;
    individualIngredients: Array<{ name: string; doseMg: number; category: string; description?: string; benefits?: string[] }>;
  }>({
    queryKey: ['/api/ingredients/catalog'],
    enabled: !!user?.id
  });

  // Helper function to get individual ingredient details with benefits
  const getIndividualIngredientDetails = useCallback((ingredientName: string) => {
    return ingredientCatalog?.individualIngredients?.find(ing => ing.name === ingredientName);
  }, [ingredientCatalog]);

  // Mutations - using apiRequest pattern
  const revertFormulaMutation = useMutation({
    mutationFn: ({ formulaId, reason }: { formulaId: string, reason: string }) =>
      apiRequest('POST', '/api/users/me/formula/revert', { formulaId, reason }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/history'] });
      toast({
        title: 'Formula reverted successfully',
        description: 'Your formula has been reverted to the selected version.'
      });
      setRevertReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error reverting formula',
        description: error.message || 'Failed to revert formula',
        variant: 'destructive'
      });
    }
  });

  const renameFormulaMutation = useMutation({
    mutationFn: ({ formulaId, name }: { formulaId: string, name: string }) =>
      apiRequest('PATCH', `/api/users/me/formula/${formulaId}/rename`, { name }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/history'] });
      toast({
        title: 'Formula renamed successfully',
        description: 'Your formula name has been updated.'
      });
      setRenamingFormulaId(null);
      setNewFormulaName('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error renaming formula',
        description: error.message || 'Failed to rename formula',
        variant: 'destructive'
      });
    }
  });

  // Derived data
  const currentFormula = currentFormulaData?.formula;
  const formulaHistory = historyData?.history;
  
  // Combine current formula with history to ensure all formulas are shown
  // History API may or may not include the current formula
  const allFormulas = useMemo(() => {
    if (!formulaHistory) return currentFormula ? [currentFormula] : [];
    
    // Check if currentFormula is already in history
    const hasCurrentInHistory = currentFormula && formulaHistory.some(f => f.id === currentFormula.id);
    
    // If current formula exists and isn't in history, prepend it
    if (currentFormula && !hasCurrentInHistory) {
      return [currentFormula, ...formulaHistory];
    }
    
    return formulaHistory;
  }, [currentFormula, formulaHistory]);
  
  // Get selected formula (either from history or current)
  const selectedFormula = useMemo(() => {
    if (!selectedFormulaId) return currentFormula;
    return allFormulas.find(f => f.id === selectedFormulaId) || currentFormula;
  }, [selectedFormulaId, currentFormula, allFormulas]);
  
  // Auto-select newest formula on load
  useEffect(() => {
    if (currentFormula && !selectedFormulaId) {
      setSelectedFormulaId(currentFormula.id);
    }
  }, [currentFormula, selectedFormulaId]);

  // Ingredient filtering and searching
  const filteredIngredients = useMemo(() => {
    if (!selectedFormula) return [];
    
    const allIngredients = [
      ...selectedFormula.bases.map(ing => ({ ...ing, type: 'base' as const, source: 'ai' as const })),
      ...selectedFormula.additions.map(ing => ({ ...ing, type: 'addition' as const, source: 'ai' as const })),
      // Include user-added customizations
      ...(selectedFormula.userCustomizations?.addedBases?.map(ing => ({ ...ing, type: 'base' as const, source: 'user' as const })) || []),
      ...(selectedFormula.userCustomizations?.addedIndividuals?.map(ing => ({ ...ing, type: 'addition' as const, source: 'user' as const })) || [])
    ];

    return allIngredients.filter(ingredient => {
      const matchesSearch = ingredient.ingredient.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || 
                            (categoryFilter === 'bases' && ingredient.type === 'base') ||
                            (categoryFilter === 'additions' && ingredient.type === 'addition');
      return matchesSearch && matchesCategory;
    });
  }, [selectedFormula, searchTerm, categoryFilter]);

  // Event handlers
  const toggleIngredientExpansion = useCallback((ingredientName: string) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  }, []);

  const handleVersionSelection = useCallback((versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  }, []);

  const handleRevertFormula = useCallback((formulaId: string) => {
    if (!revertReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for reverting the formula.',
        variant: 'destructive'
      });
      return;
    }
    
    revertFormulaMutation.mutate({ formulaId, reason: revertReason });
  }, [revertReason, revertFormulaMutation, toast]);

  // Loading states
  if (isLoadingCurrent) {
    return <FormulaSkeleton />;
  }

  // Check if it's a "no formula found" (404) vs a real error
  const isNoFormulaError = currentError && 
    (currentError.message?.includes('No formula found') || 
     currentError.message?.includes('404'));

  // No formula yet (empty state) - either no data or 404 error
  if (!currentFormula && (isNoFormulaError || !currentError)) {
    return <FormulaEmptyState />;
  }

  // Real error states (network errors, server errors, etc.)
  if (currentError && !isNoFormulaError) {
    return <FormulaError error={currentError} />;
  }

  // Shouldn't normally reach here, but safety fallback
  if (!currentFormula) {
    return <FormulaEmptyState />;
  }

  return (
    <div className="space-y-6" data-testid="page-my-formula">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-formula-title">
            My Formula
          </h1>
          <p className="text-muted-foreground">
            Your personalized supplement formula, optimized by ONES AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedFormula && (
            <Badge variant="secondary" className="text-sm" data-testid="badge-formula-version">
              <FlaskConical className="w-3 h-3 mr-1" />
              Version {selectedFormula.version}
              {selectedFormula.id === currentFormula?.id && ' (Newest)'}
            </Badge>
          )}
          <Button 
            variant="default" 
            className="gap-2 bg-primary hover:bg-primary/90" 
            data-testid="button-order-formula"
            disabled={!selectedFormula}
            onClick={() => setShowOrderConfirmation(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            Order Your Formula
          </Button>
          <Button asChild variant="outline" className="gap-2" data-testid="button-discuss-formula">
            <Link href="/dashboard/consultation">
              <MessageSquare className="w-4 h-4" />
              Discuss with AI
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formulas" data-testid="tab-my-formulas">My Formulas</TabsTrigger>
          <TabsTrigger value="ingredients" data-testid="tab-ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Actions</TabsTrigger>
        </TabsList>

        {/* My Formulas Tab - Grid of all formulas */}
        <TabsContent value="formulas" className="space-y-6">
          {isLoadingHistory || isLoadingCurrent ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : allFormulas && allFormulas.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allFormulas.map((formula) => (
                <FormulaCard
                  key={formula.id}
                  formula={formula}
                  isSelected={selectedFormulaId === formula.id}
                  isExpanded={expandedFormulaId === formula.id}
                  isNewest={formula.id === currentFormula?.id}
                  onSelect={() => setSelectedFormulaId(formula.id)}
                  onToggleExpand={() => setExpandedFormulaId(
                    expandedFormulaId === formula.id ? null : formula.id
                  )}
                  onRename={(id, currentName) => {
                    setRenamingFormulaId(id);
                    setNewFormulaName(currentName || '');
                  }}
                  getIndividualIngredientDetails={getIndividualIngredientDetails}
                  expandedIndividualIngredients={expandedIndividualIngredients}
                  setExpandedIndividualIngredients={setExpandedIndividualIngredients}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No formulas found. Start a consultation to create your first formula.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients" className="space-y-6">
          <IngredientsSection 
            ingredients={filteredIngredients}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            expandedIngredients={expandedIngredients}
            toggleIngredientExpansion={toggleIngredientExpansion}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <HistorySection 
            history={formulaHistory}
            isLoading={isLoadingHistory}
            selectedVersions={selectedVersions}
            onVersionSelection={handleVersionSelection}
            comparisonData={comparisonData}
            onRevert={handleRevertFormula}
            revertReason={revertReason}
            setRevertReason={setRevertReason}
            isReverting={revertFormulaMutation.isPending}
          />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          {selectedFormula && (
            <>
              {/* Customization Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Customize Your Formula
                  </CardTitle>
                  <CardDescription>
                    Add extra base formulations or individual ingredients to personalize your formula
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setShowCustomizationDialog(true)}
                    className="w-full"
                    data-testid="button-open-customization"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredients
                  </Button>
                </CardContent>
              </Card>
              
              <ActionsSection formula={selectedFormula} />
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Order Confirmation Dialog */}
      <Dialog open={showOrderConfirmation} onOpenChange={setShowOrderConfirmation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShoppingCart className="w-6 h-6" />
              Confirm Your Formula Order
            </DialogTitle>
            <DialogDescription>
              Review your selected formula before proceeding to checkout
            </DialogDescription>
          </DialogHeader>
          
          {selectedFormula && (
            <div className="space-y-4 py-4">
              {/* Formula Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    Formula Version {selectedFormula.version}
                    {selectedFormula.id === currentFormula?.id && (
                      <Badge variant="secondary" className="ml-2">Newest</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(selectedFormula.createdAt).toLocaleDateString()} • 
                    {selectedFormula.bases.length + selectedFormula.additions.length + (selectedFormula.userCustomizations?.addedBases?.length || 0) + (selectedFormula.userCustomizations?.addedIndividuals?.length || 0)} ingredients • 
                    {selectedFormula.totalMg}mg total
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Base Formulas */}
                  {selectedFormula.bases.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Beaker className="w-4 h-4" />
                        Base Formulas ({selectedFormula.bases.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedFormula.bases.map((base, idx) => (
                          <div key={idx} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="font-medium">{base.ingredient} - {base.amount}{base.unit}</div>
                            {base.purpose && <div className="text-muted-foreground text-xs mt-1">{base.purpose}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Custom Additions */}
                  {selectedFormula.additions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        AI-Recommended Additions ({selectedFormula.additions.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedFormula.additions.map((addition, idx) => (
                          <div key={idx} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="font-medium">{addition.ingredient} - {addition.amount}{addition.unit}</div>
                            {addition.purpose && <div className="text-muted-foreground text-xs mt-1">{addition.purpose}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* User Customizations */}
                  {((selectedFormula.userCustomizations?.addedBases?.length || 0) > 0 || (selectedFormula.userCustomizations?.addedIndividuals?.length || 0) > 0) && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-600 dark:text-purple-400">Your Customizations ({(selectedFormula.userCustomizations?.addedBases?.length || 0) + (selectedFormula.userCustomizations?.addedIndividuals?.length || 0)})</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedFormula.userCustomizations?.addedBases?.map((base, idx) => (
                          <div key={`base-${idx}`} className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded text-sm border border-purple-200 dark:border-purple-800">
                            <div className="font-medium text-purple-900 dark:text-purple-100">{base.ingredient} - {base.amount}{base.unit}</div>
                          </div>
                        ))}
                        {selectedFormula.userCustomizations?.addedIndividuals?.map((ind, idx) => {
                          const ingredientDetails = getIndividualIngredientDetails(ind.ingredient);
                          const expandKey = `order-ind-${idx}`;
                          return (
                            <div key={`ind-${idx}`} className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded text-sm border border-purple-200 dark:border-purple-800">
                              {ingredientDetails?.benefits && ingredientDetails.benefits.length > 0 ? (
                                <Collapsible
                                  open={expandedIndividualIngredients[expandKey]}
                                  onOpenChange={(open) => {
                                    setExpandedIndividualIngredients(prev => ({ ...prev, [expandKey]: open }));
                                  }}
                                >
                                  <CollapsibleTrigger className="w-full hover-elevate active-elevate-2 rounded p-1 -m-1">
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium text-purple-900 dark:text-purple-100">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                                      {expandedIndividualIngredients[expandKey] ? (
                                        <ChevronUp className="w-3 h-3 text-purple-600" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-purple-600" />
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="bg-primary/5 dark:bg-primary/10 rounded-md p-2 space-y-1">
                                      {ingredientDetails.benefits.map((benefit, bidx) => (
                                        <div key={bidx} className="flex items-start gap-2">
                                          <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="text-xs text-muted-foreground">{benefit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ) : (
                                <div className="font-medium text-purple-900 dark:text-purple-100">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {selectedFormula.warnings && selectedFormula.warnings.length > 0 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-orange-800 dark:text-orange-400">
                        <AlertTriangle className="w-4 h-4" />
                        Important Warnings
                      </h4>
                      <ul className="space-y-1">
                        {selectedFormula.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-orange-700 dark:text-orange-300">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowOrderConfirmation(false)}
              data-testid="button-cancel-order"
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowOrderConfirmation(false);
                toast({
                  title: "Redirecting to checkout...",
                  description: "Checkout page coming soon!",
                });
              }}
              data-testid="button-proceed-checkout"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Customization Dialog */}
      {selectedFormula && (
        <FormulaCustomizationDialog
          open={showCustomizationDialog}
          onOpenChange={setShowCustomizationDialog}
          formulaId={selectedFormula.id}
          existingBases={[
            ...selectedFormula.bases.map(b => b.ingredient),
            ...(selectedFormula.userCustomizations?.addedBases?.map(b => b.ingredient) || [])
          ]}
          existingIndividuals={[
            ...selectedFormula.additions.map(a => a.ingredient),
            ...(selectedFormula.userCustomizations?.addedIndividuals?.map(i => i.ingredient) || [])
          ]}
        />
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renamingFormulaId} onOpenChange={(open) => {
        if (!open) {
          setRenamingFormulaId(null);
          setNewFormulaName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Formula</DialogTitle>
            <DialogDescription>
              Give your formula a custom name to make it easier to identify
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFormulaName}
              onChange={(e) => setNewFormulaName(e.target.value)}
              placeholder="e.g., My Morning Formula"
              maxLength={100}
              data-testid="input-formula-name"
            />
            <p className="text-xs text-muted-foreground">
              {newFormulaName.length}/100 characters
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRenamingFormulaId(null);
                setNewFormulaName('');
              }}
              data-testid="button-cancel-rename"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingFormulaId && newFormulaName.trim()) {
                  renameFormulaMutation.mutate({
                    formulaId: renamingFormulaId,
                    name: newFormulaName.trim()
                  });
                }
              }}
              disabled={!newFormulaName.trim() || renameFormulaMutation.isPending}
              data-testid="button-save-rename"
            >
              {renameFormulaMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Formula Card Component for Grid Display
interface FormulaCardProps {
  formula: Formula;
  isSelected: boolean;
  isExpanded: boolean;
  isNewest: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onRename: (formulaId: string, currentName?: string) => void;
  getIndividualIngredientDetails: (ingredientName: string) => { name: string; doseMg: number; category: string; description?: string; benefits?: string[] } | undefined;
  expandedIndividualIngredients: Record<string, boolean>;
  setExpandedIndividualIngredients: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function FormulaCard({ formula, isSelected, isExpanded, isNewest, onSelect, onToggleExpand, onRename, getIndividualIngredientDetails, expandedIndividualIngredients, setExpandedIndividualIngredients }: FormulaCardProps) {
  const userAddedCount = (formula.userCustomizations?.addedBases?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0);
  const totalIngredients = formula.bases.length + formula.additions.length + userAddedCount;
  const createdDate = new Date(formula.createdAt).toLocaleDateString();
  
  return (
    <Card 
      className={`relative transition-all ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover-elevate'
      }`}
      data-testid={`card-formula-${formula.version}`}
    >
      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-2">
        {isNewest && (
          <Badge variant="default" className="text-xs">
            <Star className="w-3 h-3 mr-1" />
            Newest
          </Badge>
        )}
        {isSelected && (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Selected
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-3">
        <div className="pr-20 pt-2">
          <CardTitle className="text-lg flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4" />
            <span>{formula.name || `Version ${formula.version}`}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onRename(formula.id, formula.name);
              }}
              data-testid={`button-rename-formula-${formula.version}`}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </CardTitle>
          {formula.name && (
            <p className="text-xs text-muted-foreground mt-1">Version {formula.version}</p>
          )}
        </div>
        <CardDescription className="text-xs">
          {createdDate} • {totalIngredients} ingredients
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="font-bold text-primary">
              {formula.bases.length + (formula.userCustomizations?.addedBases?.length || 0)}
            </div>
            <div className="text-xs text-muted-foreground">Base Formulas</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="font-bold text-blue-600">
              {formula.additions.length + (formula.userCustomizations?.addedIndividuals?.length || 0)}
            </div>
            <div className="text-xs text-muted-foreground">Additions</div>
          </div>
        </div>
        
        {/* Total Dosage */}
        <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
          <span className="text-sm text-muted-foreground">Total Daily:</span>
          <span className="font-bold">{formula.totalMg}mg</span>
        </div>
        
        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {/* Base Formulas */}
            {formula.bases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Beaker className="w-3 h-3" />
                  Base Formulas
                </h4>
                <div className="space-y-1">
                  {formula.bases.map((base, idx) => (
                    <div key={idx} className="text-xs p-2 bg-muted/20 rounded">
                      <div className="font-medium">{base.ingredient} - {base.amount}{base.unit}</div>
                      {base.purpose && <div className="text-muted-foreground mt-1">{base.purpose}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Additions */}
            {formula.additions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  AI-Recommended Additions
                </h4>
                <div className="space-y-1">
                  {formula.additions.map((addition, idx) => (
                    <div key={idx} className="text-xs p-2 bg-muted/20 rounded">
                      <div className="font-medium">{addition.ingredient} - {addition.amount}{addition.unit}</div>
                      {addition.purpose && <div className="text-muted-foreground mt-1">{addition.purpose}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* User Customizations */}
            {((formula.userCustomizations?.addedBases?.length || 0) > 0 || (formula.userCustomizations?.addedIndividuals?.length || 0) > 0) && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-600" />
                  <span className="text-purple-600 dark:text-purple-400">Your Customizations</span>
                </h4>
                <div className="space-y-1">
                  {formula.userCustomizations?.addedBases?.map((base, idx) => (
                    <div key={`base-${idx}`} className="text-xs p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                      <div className="font-medium text-purple-900 dark:text-purple-100">{base.ingredient} - {base.amount}{base.unit}</div>
                    </div>
                  ))}
                  {formula.userCustomizations?.addedIndividuals?.map((ind, idx) => {
                    const ingredientDetails = getIndividualIngredientDetails(ind.ingredient);
                    const expandKey = `card-ind-${formula.id}-${idx}`;
                    return (
                      <div key={`ind-${idx}`} className="text-xs p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                        {ingredientDetails?.benefits && ingredientDetails.benefits.length > 0 ? (
                          <Collapsible
                            open={expandedIndividualIngredients[expandKey]}
                            onOpenChange={(open) => {
                              setExpandedIndividualIngredients(prev => ({ ...prev, [expandKey]: open }));
                            }}
                          >
                            <CollapsibleTrigger className="w-full hover-elevate active-elevate-2 rounded p-1 -m-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-purple-900 dark:text-purple-100">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                                {expandedIndividualIngredients[expandKey] ? (
                                  <ChevronUp className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-purple-600" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-primary/5 dark:bg-primary/10 rounded-md p-2 space-y-1">
                                {ingredientDetails.benefits.map((benefit, bidx) => (
                                  <div key={bidx} className="flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground">{benefit}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <div className="font-medium text-purple-900 dark:text-purple-100">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Rationale */}
            {formula.rationale && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Rationale
                </h4>
                <p className="text-xs text-muted-foreground">{formula.rationale}</p>
              </div>
            )}
            
            {/* Warnings */}
            {formula.warnings && formula.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  Warnings
                </h4>
                <ul className="space-y-1">
                  {formula.warnings.map((warning, idx) => (
                    <li key={idx} className="text-xs text-orange-600 dark:text-orange-400">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Select Button */}
        <Button 
          variant={isSelected ? "secondary" : "default"}
          size="sm"
          className="w-full"
          onClick={onSelect}
          data-testid={`button-select-formula-${formula.version}`}
        >
          {isSelected ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Selected
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Select This Formula
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Current Formula Display Component
function CurrentFormulaDisplay({ formula }: { formula: Formula }) {
  const userAddedCount = (formula.userCustomizations?.addedBases?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0);
  const totalIngredients = formula.bases.length + formula.additions.length + userAddedCount;
  
  return (
    <div className="space-y-6">
      {/* Formula Overview */}
      <Card data-testid="section-formula-overview">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="w-5 h-5" />
                Current Formula v{formula.version}
              </CardTitle>
              <CardDescription>
                Created {new Date(formula.createdAt).toLocaleDateString()} • {totalIngredients} ingredients • {formula.totalMg}mg total
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-base-formulas">
              <div className="text-2xl font-bold text-primary">{formula.bases.length}</div>
              <p className="text-sm text-muted-foreground">Base Formulas</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-custom-additions">
              <div className="text-2xl font-bold text-blue-600">{formula.additions.length}</div>
              <p className="text-sm text-muted-foreground">Custom Additions</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-total-dosage">
              <div className="text-2xl font-bold text-green-600">{formula.totalMg}mg</div>
              <p className="text-sm text-muted-foreground">Total Dosage</p>
            </div>
          </div>

          <Separator />

          {/* Base Formulas */}
          {formula.bases.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Base Formulas ({formula.bases.length})
              </h3>
              <div className="grid gap-4">
                {formula.bases.map((base, idx) => (
                  <Card key={idx} className="border-l-4 border-l-primary" data-testid={`card-base-${idx}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{base.ingredient}</h4>
                        <Badge variant="secondary">{base.amount}{base.unit}</Badge>
                      </div>
                      {base.purpose && (
                        <p className="text-sm text-muted-foreground mb-3">{base.purpose}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FlaskConical className="w-3 h-3" />
                          Pre-formulated blend
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Evidence-based ratios
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {formula.bases.length > 0 && formula.additions.length > 0 && <Separator />}

          {/* Custom Additions */}
          {formula.additions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Personalized Additions ({formula.additions.length})
              </h3>
              <div className="grid gap-4">
                {formula.additions.map((addition, idx) => (
                  <Card key={idx} className="border-l-4 border-l-blue-500" data-testid={`card-addition-${idx}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{addition.ingredient}</h4>
                        <Badge variant="outline">{addition.amount}{addition.unit}</Badge>
                      </div>
                      {addition.purpose && (
                        <p className="text-sm text-muted-foreground mb-3">{addition.purpose}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          AI-recommended
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Personalized for you
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Formula Rationale */}
          {formula.rationale && (
            <>
              <Separator />
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-400">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Lightbulb className="w-5 h-5" />
                  Why This Formula
                </h3>
                <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-400">{formula.rationale}</p>
              </div>
            </>
          )}

          {/* Warnings */}
          {formula.warnings && formula.warnings.length > 0 && (
            <>
              <Separator />
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-l-4 border-amber-400">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                  Important Warnings
                </h3>
                <ul className="space-y-1">
                  {formula.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <span className="text-amber-600 mt-0.5 font-bold">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Disclaimers */}
          {formula.disclaimers && formula.disclaimers.length > 0 && (
            <>
              <Separator />
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Medical Disclaimers</h3>
                <ul className="space-y-1">
                  {formula.disclaimers.map((disclaimer, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">• {disclaimer}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Formula Notes */}
          {formula.notes && (
            <>
              <Separator />
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Formula Notes
                </h3>
                <p className="text-sm leading-relaxed">{formula.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ingredients Section Component
function IngredientsSection({ 
  ingredients, 
  searchTerm, 
  setSearchTerm, 
  categoryFilter, 
  setCategoryFilter,
  expandedIngredients,
  toggleIngredientExpansion
}: {
  ingredients: Array<FormulaIngredient & { type: 'base' | 'addition'; source: 'ai' | 'user' }>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  expandedIngredients: Set<string>;
  toggleIngredientExpansion: (ingredientName: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card data-testid="section-ingredient-controls">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-ingredient-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" data-testid="select-ingredient-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ingredients</SelectItem>
                <SelectItem value="bases">Base Formulas</SelectItem>
                <SelectItem value="additions">Custom Additions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients List */}
      <div className="space-y-4">
        {ingredients.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No ingredients found matching your search criteria.
            </CardContent>
          </Card>
        ) : (
          ingredients.map((ingredient, idx) => (
            <IngredientCard 
              key={`${ingredient.ingredient}-${idx}`}
              ingredient={ingredient}
              isExpanded={expandedIngredients.has(ingredient.ingredient)}
              onToggleExpansion={() => toggleIngredientExpansion(ingredient.ingredient)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual Ingredient Card Component
function IngredientCard({ 
  ingredient, 
  isExpanded, 
  onToggleExpansion 
}: {
  ingredient: FormulaIngredient & { type: 'base' | 'addition'; source: 'ai' | 'user' };
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) {
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});

  const { data: ingredientDetail, isLoading } = useQuery<IngredientDetail>({
    queryKey: ['/api/ingredients', encodeURIComponent(ingredient.ingredient)],
    enabled: isExpanded
  });

  // Fetch base formula details if this is a base formula type
  const { data: baseFormulaData } = useQuery<{ baseFormulaDetails: Array<{
    name: string;
    doseMg: number;
    systemSupported: string;
    activeIngredients: Array<{ name: string; amount: string; description?: string; benefits?: string[] }>;
    suggestedDosage: string;
    description: string;
  }> }>({
    queryKey: ['/api/ingredients/base-details'],
    enabled: ingredient.type === 'base' && isExpanded
  });

  const formulaBreakdown = baseFormulaData?.baseFormulaDetails.find(
    f => f.name === ingredient.ingredient
  );

  return (
    <Card className={`border-l-4 ${ingredient.type === 'base' ? 'border-l-primary' : 'border-l-blue-500'}`} 
          data-testid={`card-ingredient-${ingredient.ingredient}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate" data-testid={`button-expand-${ingredient.ingredient}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">{ingredient.ingredient}</CardTitle>
                  <Badge variant={ingredient.type === 'base' ? 'default' : 'outline'} data-testid={`badge-ingredient-type-${ingredient.ingredient}`}>
                    {ingredient.type === 'base' ? 'Base Formula' : 'Addition'}
                  </Badge>
                  {ingredient.source === 'user' && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                      <Users className="w-3 h-3 mr-1" />
                      You Added
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-1">
                  {ingredient.amount}{ingredient.unit} dose
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid={`badge-ingredient-amount-${ingredient.ingredient}`}>{ingredient.amount}{ingredient.unit}</Badge>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Base Formula Breakdown - Show for base formulas */}
                {ingredient.type === 'base' && formulaBreakdown && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                      <Beaker className="w-4 h-4" />
                      Formula Breakdown
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">System:</span>
                          <p className="font-medium">{formulaBreakdown.systemSupported}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dosage:</span>
                          <p className="font-medium">{formulaBreakdown.suggestedDosage}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Active Ingredients:</p>
                        <div className="space-y-2">
                          {formulaBreakdown.activeIngredients.map((subIng, idx) => {
                            const hasExpanded = expandedIngredients[`${ingredient.ingredient}-${idx}`] || false;
                            const hasBenefits = subIng.benefits && subIng.benefits.length > 0;
                            
                            return (
                              <div key={idx} className="bg-background rounded overflow-hidden">
                                <button
                                  onClick={() => hasBenefits && setExpandedIngredients(prev => ({
                                    ...prev,
                                    [`${ingredient.ingredient}-${idx}`]: !prev[`${ingredient.ingredient}-${idx}`]
                                  }))}
                                  className={`w-full flex items-start justify-between p-2 text-sm ${hasBenefits ? 'hover-elevate cursor-pointer' : ''}`}
                                  disabled={!hasBenefits}
                                  data-testid={`button-expand-subingredient-${idx}`}
                                >
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium">{subIng.name}</span>
                                      {hasBenefits && (
                                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${hasExpanded ? 'rotate-180' : ''}`} />
                                      )}
                                    </div>
                                    {subIng.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{subIng.description}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                                    {subIng.amount}
                                  </Badge>
                                </button>
                                
                                {hasBenefits && hasExpanded && subIng.benefits && (
                                  <div className="px-3 pb-3 pt-1 bg-primary/5">
                                    <p className="text-xs font-medium mb-1.5 text-primary">Health Benefits:</p>
                                    <div className="space-y-1">
                                      {subIng.benefits.map((benefit: string, benefitIdx: number) => (
                                        <div key={benefitIdx} className="flex items-start gap-1.5 text-xs">
                                          <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                                          <span>{benefit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {ingredientDetail && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Health Benefits
                    </h4>
                    <div className="space-y-1">
                      {ingredientDetail.benefits.map((benefit: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional ingredient details - only show if available */}
                {ingredientDetail && (
                  <>
                    {/* Dosage Information */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          Dosage Info
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>Amount: {ingredient.amount}{ingredient.unit}</p>
                          {ingredientDetail.dailyValuePercentage && (
                            <p>Daily Value: {ingredientDetail.dailyValuePercentage}%</p>
                          )}
                          <p>Category: {ingredientDetail.category}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-500" />
                          Research
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>Studies: {ingredientDetail.researchBacking.studyCount}+</p>
                          <p>Evidence: {ingredientDetail.researchBacking.evidenceLevel}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sources */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-500" />
                        Sources & Quality
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {ingredientDetail.sources.map((source: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">{source}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ingredientDetail.qualityIndicators.map((indicator: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Interactions */}
                    {ingredientDetail.interactions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Interactions & Warnings
                        </h4>
                        <div className="space-y-2">
                          {ingredientDetail.interactions.map((interaction: string, idx: number) => (
                            <div key={idx} className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded border-l-4 border-orange-400">
                              <p className="text-sm text-orange-800 dark:text-orange-300">{interaction}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternatives */}
                    {ingredientDetail.alternatives.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-blue-500" />
                          Alternatives
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {ingredientDetail.alternatives.map((alternative: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">{alternative}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// History Section Component  
function HistorySection({ 
  history, 
  isLoading,
  selectedVersions,
  onVersionSelection,
  comparisonData,
  onRevert,
  revertReason,
  setRevertReason,
  isReverting
}: {
  history?: Formula[];
  isLoading: boolean;
  selectedVersions: string[];
  onVersionSelection: (versionId: string) => void;
  comparisonData?: FormulaComparison;
  onRevert: (formulaId: string) => void;
  revertReason: string;
  setRevertReason: (reason: string) => void;
  isReverting: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No formula history available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Tools */}
      {selectedVersions.length > 0 && (
        <Card data-testid="section-comparison-tools">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Version Comparison
            </CardTitle>
            <CardDescription>
              {selectedVersions.length === 1 
                ? 'Select another version to compare' 
                : 'Comparing 2 selected versions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedVersions.length === 2 && comparisonData ? (
              <FormulaComparison comparison={comparisonData} />
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Select 2 versions from the history below to compare changes
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Timeline */}
      <Card data-testid="section-formula-timeline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Formula Timeline
          </CardTitle>
          <CardDescription>
            {history.length} versions • Click versions to select for comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.map((formula, idx) => (
              <div key={formula.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onVersionSelection(formula.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium hover-elevate ${
                      idx === 0 ? 'bg-primary text-primary-foreground' :
                      selectedVersions.includes(formula.id) ? 'bg-blue-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}
                    data-testid={`button-select-version-${formula.version}`}
                  >
                    v{formula.version}
                  </button>
                  {idx < history.length - 1 && (
                    <div className="w-px h-16 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">Version {formula.version}</h4>
                      {idx === 0 && <Badge data-testid={`badge-current-${formula.version}`}>Current</Badge>}
                      {selectedVersions.includes(formula.id) && (
                        <Badge variant="outline" data-testid={`badge-selected-${formula.version}`}>Selected</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(formula.createdAt).toLocaleDateString()}</span>
                      {idx > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-revert-${formula.id}`}>
                              <RotateCcw className="w-3 h-3" />
                              Revert
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revert to Version {formula.version}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will create a new version based on the selected formula. 
                                Please provide a reason for this change.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                              placeholder="Why are you reverting to this version?"
                              value={revertReason}
                              onChange={(e) => setRevertReason(e.target.value)}
                              className="my-4"
                              data-testid={`input-revert-reason-${formula.id}`}
                            />
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`button-cancel-revert-${formula.id}`}>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onRevert(formula.id)}
                                disabled={!revertReason.trim() || isReverting}
                                data-testid={`button-confirm-revert-${formula.id}`}
                              >
                                {isReverting ? 'Reverting...' : 'Revert Formula'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{formula.bases.length} bases, {formula.additions.length} additions • {formula.totalMg}mg total</p>
                    {formula.changes && (
                      <p className="italic">{formula.changes.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Formula Comparison Component
function FormulaComparison({ comparison }: { comparison: FormulaComparison }) {
  const { formula1, formula2, differences } = comparison;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid={`comparison-version-${formula1.version}`}>
          <div className="text-lg font-semibold">Version {formula1.version}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(formula1.createdAt).toLocaleDateString()}
          </div>
          <div className="text-lg font-bold mt-2">{formula1.totalMg}mg</div>
        </div>
        <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid={`comparison-version-${formula2.version}`}>
          <div className="text-lg font-semibold">Version {formula2.version}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(formula2.createdAt).toLocaleDateString()}
          </div>
          <div className="text-lg font-bold mt-2">{formula2.totalMg}mg</div>
        </div>
      </div>

      {/* Changes Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-3">Changes Summary</h4>
        <div className="space-y-2 text-sm">
          <p>Total dosage change: {differences.totalMgChange > 0 ? '+' : ''}{differences.totalMgChange}mg</p>
          {differences.basesAdded.length > 0 && (
            <p className="text-green-600">+ {differences.basesAdded.length} base(s) added</p>
          )}
          {differences.basesRemoved.length > 0 && (
            <p className="text-red-600">- {differences.basesRemoved.length} base(s) removed</p>
          )}
          {differences.additionsAdded.length > 0 && (
            <p className="text-green-600">+ {differences.additionsAdded.length} addition(s) added</p>
          )}
          {differences.additionsRemoved.length > 0 && (
            <p className="text-red-600">- {differences.additionsRemoved.length} addition(s) removed</p>
          )}
        </div>
      </div>

      {/* Detailed Changes */}
      {(differences.basesAdded.length > 0 || differences.basesRemoved.length > 0 || 
        differences.additionsAdded.length > 0 || differences.additionsRemoved.length > 0) && (
        <div className="space-y-4">
          <h4 className="font-medium">Detailed Changes</h4>
          
          {differences.basesAdded.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-600 mb-2">Added Bases</h5>
              {differences.basesAdded.map((base, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Plus className="w-3 h-3 text-green-600" />
                  {base.ingredient} ({base.amount}{base.unit})
                </div>
              ))}
            </div>
          )}

          {differences.basesRemoved.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-600 mb-2">Removed Bases</h5>
              {differences.basesRemoved.map((base, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Minus className="w-3 h-3 text-red-600" />
                  {base.ingredient} ({base.amount}{base.unit})
                </div>
              ))}
            </div>
          )}

          {differences.additionsAdded.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-600 mb-2">Added Additions</h5>
              {differences.additionsAdded.map((addition, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Plus className="w-3 h-3 text-green-600" />
                  {addition.ingredient} ({addition.amount}{addition.unit})
                </div>
              ))}
            </div>
          )}

          {differences.additionsRemoved.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-600 mb-2">Removed Additions</h5>
              {differences.additionsRemoved.map((addition, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Minus className="w-3 h-3 text-red-600" />
                  {addition.ingredient} ({addition.amount}{addition.unit})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Actions Section Component
function ActionsSection({ formula }: { formula: Formula }) {
  const { toast } = useToast();

  const handleDownload = () => {
    // In a real implementation, this would generate and download a PDF
    toast({
      title: 'Download started',
      description: 'Your formula report is being generated and will download shortly.'
    });
  };

  const handleShare = () => {
    // In a real implementation, this would generate a shareable link or PDF
    navigator.clipboard?.writeText(`https://ones.ai/formula/${formula.id}`);
    toast({
      title: 'Link copied',
      description: 'Shareable formula link copied to clipboard.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      <Card data-testid="section-primary-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common actions for your current formula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="gap-2 h-auto p-4 flex-col" data-testid="button-action-update">
              <Link href="/dashboard/consultation">
                <MessageSquare className="w-6 h-6 mb-2" />
                <span className="font-medium">Update Formula</span>
                <span className="text-xs opacity-80">Chat with AI</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="gap-2 h-auto p-4 flex-col" data-testid="button-action-order">
              <ShoppingCart className="w-6 h-6 mb-2" />
              <span className="font-medium">Order Now</span>
              <span className="text-xs opacity-80">Monthly supply</span>
            </Button>
            
            <Button variant="outline" onClick={handleDownload} className="gap-2 h-auto p-4 flex-col" data-testid="button-action-download">
              <Download className="w-6 h-6 mb-2" />
              <span className="font-medium">Download</span>
              <span className="text-xs opacity-80">PDF Report</span>
            </Button>
            
            <Button variant="outline" onClick={handleShare} className="gap-2 h-auto p-4 flex-col" data-testid="button-action-share">
              <Share2 className="w-6 h-6 mb-2" />
              <span className="font-medium">Share</span>
              <span className="text-xs opacity-80">With provider</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Management Actions */}
      <Card data-testid="section-management-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Formula Management
          </CardTitle>
          <CardDescription>
            Advanced formula management and backup options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Export Formula Data</h4>
                <p className="text-sm text-muted-foreground">Download complete formula history as JSON</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-data">
                <FileText className="w-4 h-4" />
                Export
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Schedule Review</h4>
                <p className="text-sm text-muted-foreground">Set up automatic formula review with AI</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-schedule-review">
                <Calendar className="w-4 h-4" />
                Schedule
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Healthcare Provider Access</h4>
                <p className="text-sm text-muted-foreground">Generate shareable link for your doctor</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-provider-access">
                <ExternalLink className="w-4 h-4" />
                Generate Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Information */}
      <Card data-testid="section-support-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Support & Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Formula last reviewed: {new Date(formula.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">All ingredients are third-party tested</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm">Need help? Contact our support team</span>
            </div>
          </div>
          
          <Button asChild variant="ghost" className="mt-4 p-0 h-auto justify-start" data-testid="button-contact-support">
            <Link href="/dashboard/support">
              Questions about your formula? Get help →
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading Skeleton Component
function FormulaSkeleton() {
  return (
    <div className="space-y-6" data-testid="skeleton-formula-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      <Skeleton className="h-24 w-full" />
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// Empty State Component - shown when user has no formula yet
function FormulaEmptyState() {
  return (
    <div className="space-y-6" data-testid="empty-formula-page">
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <FlaskConical className="w-16 h-16 text-primary mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3">Start Your Personalized Journey</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Begin a conversation with ONES AI to receive your first personalized supplement formula tailored to your unique health profile.
          </p>
          <Button asChild size="lg" data-testid="button-start-consultation">
            <Link href="/dashboard/consultation">
              <MessageSquare className="w-4 h-4 mr-2" />
              Start AI Consultation
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Error Component
function FormulaError({ error }: { error: any }) {
  return (
    <div className="space-y-6" data-testid="error-formula-page">
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to load formula</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'There was an error loading your formula data.'}
          </p>
          <Button asChild data-testid="button-retry-formula">
            <Link href="/dashboard/consultation">
              <MessageSquare className="w-4 h-4 mr-2" />
              Try Again
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}