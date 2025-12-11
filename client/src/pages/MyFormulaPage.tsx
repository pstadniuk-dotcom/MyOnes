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
import { CustomFormulaBuilderDialog } from '@/components/CustomFormulaBuilderDialog';
import { ResearchCitationCard, ResearchSummaryDialog } from '@/components/ResearchCitationCard';
import { ReviewScheduleCard } from '@/components/ReviewScheduleCard';
import { calculateDosage } from '@/lib/utils';
import type { ResearchCitation } from '@shared/schema';
import { generateFormulaPDF, type FormulaForPDF } from '@shared/pdf-generator';

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
  userCreated?: boolean;
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
  const [showCustomBuilderDialog, setShowCustomBuilderDialog] = useState(false);
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
    systemSupports: Array<{ name: string; doseMg: number; category: string; description?: string; benefits?: string[] }>;
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
    <div className="w-full px-4 py-4 md:px-0 space-y-4 md:space-y-6" data-testid="page-my-formula">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight" data-testid="text-formula-title">
            My Formula
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Your personalized supplement formula
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {selectedFormula && (
            <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-formula-version">
              <FlaskConical className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">{selectedFormula.name || `Version ${selectedFormula.version}`}</span>
              <span className="sm:hidden">v{selectedFormula.version}</span>
              {selectedFormula.id === currentFormula?.id && ' (New)'}
            </Badge>
          )}
          <Button 
            variant="default" 
            className="gap-1.5 sm:gap-2 bg-primary hover:bg-primary/90 text-xs sm:text-sm" 
            size="sm"
            data-testid="button-order-formula"
            disabled={!selectedFormula}
            onClick={() => setShowOrderConfirmation(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Order Your Formula</span>
            <span className="sm:hidden">Order</span>
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formulas" className="text-xs sm:text-sm" data-testid="tab-my-formulas">
            <span className="hidden sm:inline">My Formulas</span>
            <span className="sm:hidden">Formulas</span>
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="text-xs sm:text-sm" data-testid="tab-ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm" data-testid="tab-actions">Actions</TabsTrigger>
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
              {/* Quick Actions Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Build Custom Formula Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Beaker className="w-5 h-5 text-purple-600" />
                      Build Custom Formula
                    </CardTitle>
                    <CardDescription>
                      Create a completely custom formula from scratch using our ingredient catalog
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline"
                      className="w-full gap-2 border-purple-600 text-purple-600 hover:bg-purple-50" 
                      data-testid="button-custom-formula"
                      onClick={() => setShowCustomBuilderDialog(true)}
                    >
                      <Beaker className="w-4 h-4" />
                      Start Building
                    </Button>
                  </CardContent>
                </Card>

                {/* Discuss with AI Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Discuss with AI
                    </CardTitle>
                    <CardDescription>
                      Chat with our AI to refine your formula or ask health-related questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full gap-2" 
                      data-testid="button-discuss-formula"
                    >
                      <Link href="/dashboard/consultation">
                        <MessageSquare className="w-4 h-4" />
                        Open Consultation
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Customization Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Customize Your Formula
                  </CardTitle>
                  <CardDescription>
                    Add extra system supports or individual ingredients to personalize your formula
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
              
              <ActionsSection formula={selectedFormula} onOrderClick={() => setShowOrderConfirmation(true)} />
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
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    <FlaskConical className="w-5 h-5" />
                    {selectedFormula.name || `Formula Version ${selectedFormula.version}`}
                    {selectedFormula.userCreated && (
                      <Badge className="ml-2 bg-purple-600 text-white">Custom Built</Badge>
                    )}
                    {selectedFormula.id === currentFormula?.id && (
                      <Badge variant="secondary" className="ml-2">Newest</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedFormula.name && `Version ${selectedFormula.version} • `}
                    Created {new Date(selectedFormula.createdAt).toLocaleDateString()} • 
                    {selectedFormula.bases.length + selectedFormula.additions.length + (selectedFormula.userCustomizations?.addedBases?.length || 0) + (selectedFormula.userCustomizations?.addedIndividuals?.length || 0)} ingredients • 
                    {selectedFormula.totalMg}mg total
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Daily Dosage Instructions */}
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        Daily Dosage Instructions
                      </h4>
                      <span className="font-medium text-base" data-testid="text-order-dosage">
                        {calculateDosage(selectedFormula.totalMg).display}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Take {calculateDosage(selectedFormula.totalMg).perMeal} capsules with each meal (morning, lunch, dinner) • 
                      {calculateDosage(selectedFormula.totalMg).total} capsules per day
                    </p>
                  </div>
                  
                  <Separator />
                  {/* System Supports */}
                  {selectedFormula.bases.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Beaker className="w-4 h-4" />
                        System Supports ({selectedFormula.bases.length})
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
                        <span className="text-purple-600">Your Customizations ({(selectedFormula.userCustomizations?.addedBases?.length || 0) + (selectedFormula.userCustomizations?.addedIndividuals?.length || 0)})</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedFormula.userCustomizations?.addedBases?.map((base, idx) => (
                          <div key={`base-${idx}`} className="p-2 bg-purple-50 rounded text-sm border border-purple-200">
                            <div className="font-medium text-purple-900">{base.ingredient} - {base.amount}{base.unit}</div>
                          </div>
                        ))}
                        {selectedFormula.userCustomizations?.addedIndividuals?.map((ind, idx) => {
                          const ingredientDetails = getIndividualIngredientDetails(ind.ingredient);
                          const expandKey = `order-ind-${idx}`;
                          return (
                            <div key={`ind-${idx}`} className="p-2 bg-purple-50 rounded text-sm border border-purple-200">
                              {ingredientDetails?.benefits && ingredientDetails.benefits.length > 0 ? (
                                <Collapsible
                                  open={expandedIndividualIngredients[expandKey]}
                                  onOpenChange={(open) => {
                                    setExpandedIndividualIngredients(prev => ({ ...prev, [expandKey]: open }));
                                  }}
                                >
                                  <CollapsibleTrigger className="w-full hover-elevate active-elevate-2 rounded p-1 -m-1">
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium text-purple-900">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                                      {expandedIndividualIngredients[expandKey] ? (
                                        <ChevronUp className="w-3 h-3 text-purple-600" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-purple-600" />
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="bg-primary/5 rounded-md p-2 space-y-1">
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
                                <div className="font-medium text-purple-900">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {selectedFormula.warnings && selectedFormula.warnings.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="w-4 h-4" />
                        Important Warnings
                      </h4>
                      <ul className="space-y-1">
                        {selectedFormula.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-orange-700">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Medical Disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">Medical Disclaimer</p>
                <p>
                  This personalized formula is a supplement recommendation, not medical advice. 
                  Consult your healthcare provider before starting any new supplement regimen, 
                  especially if you have medical conditions or take medications. See our{' '}
                  <Link href="/disclaimer" className="underline">Medical Disclaimer</Link> for full details.
                </p>
              </div>
            </div>
          </div>
          
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

      {/* Custom Formula Builder Dialog */}
      <CustomFormulaBuilderDialog
        open={showCustomBuilderDialog}
        onOpenChange={setShowCustomBuilderDialog}
      />

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
      className={`relative transition-all flex flex-col ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover-elevate'
      }`}
      data-testid={`card-formula-${formula.version}`}
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
        {formula.userCreated && (
          <Badge className="text-xs shadow-sm bg-purple-600 hover:bg-purple-700 text-white">
            <Beaker className="w-3 h-3 mr-1" />
            Custom Built
          </Badge>
        )}
        {isNewest && (
          <Badge variant="default" className="text-xs shadow-sm">
            <Star className="w-3 h-3 mr-1" />
            Newest
          </Badge>
        )}
        {isSelected && (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 shadow-sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Selected
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-4">
        <div className="pr-24 min-h-[56px] flex flex-col justify-start">
          <CardTitle className="text-lg flex items-center gap-1.5 flex-wrap">
            <FlaskConical className="w-4 h-4 flex-shrink-0" />
            <span className="break-words">{formula.name || `Version ${formula.version}`}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRename(formula.id, formula.name);
              }}
              data-testid={`button-rename-formula-${formula.version}`}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </CardTitle>
          {formula.name ? (
            <p className="text-xs text-muted-foreground mt-1.5">Version {formula.version}</p>
          ) : (
            <div className="h-[18px]" />
          )}
        </div>
        <CardDescription className="text-xs mt-1.5">
          {createdDate} • {totalIngredients} ingredients
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg min-h-[72px]">
            <div className="font-bold text-lg text-primary leading-none mb-1.5">
              {formula.bases.length + (formula.userCustomizations?.addedBases?.length || 0)}
            </div>
            <div className="text-xs text-muted-foreground text-center leading-tight">System Supports</div>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg min-h-[72px]">
            <div className="font-bold text-lg text-blue-600 leading-none mb-1.5">
              {formula.additions.length + (formula.userCustomizations?.addedIndividuals?.length || 0)}
            </div>
            <div className="text-xs text-muted-foreground text-center leading-tight">Additions</div>
          </div>
        </div>
        
        {/* Daily Dosage */}
        <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Daily Dosage:</span>
            <span className="font-medium text-sm tabular-nums" data-testid={`text-formula-dosage-${formula.version}`}>
              {calculateDosage(formula.totalMg).display}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-center tabular-nums">
            {calculateDosage(formula.totalMg).total} capsules/day • {formula.totalMg}mg total
          </div>
        </div>
        
        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />
        
        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {/* System Supports */}
            {formula.bases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Beaker className="w-3 h-3" />
                  System Supports
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
                  <span className="text-purple-600">Your Customizations</span>
                </h4>
                <div className="space-y-1">
                  {formula.userCustomizations?.addedBases?.map((base, idx) => (
                    <div key={`base-${idx}`} className="text-xs p-2 bg-purple-50 rounded border border-purple-200">
                      <div className="font-medium text-purple-900">{base.ingredient} - {base.amount}{base.unit}</div>
                    </div>
                  ))}
                  {formula.userCustomizations?.addedIndividuals?.map((ind, idx) => {
                    const ingredientDetails = getIndividualIngredientDetails(ind.ingredient);
                    const expandKey = `card-ind-${formula.id}-${idx}`;
                    return (
                      <div key={`ind-${idx}`} className="text-xs p-2 bg-purple-50 rounded border border-purple-200">
                        {ingredientDetails?.benefits && ingredientDetails.benefits.length > 0 ? (
                          <Collapsible
                            open={expandedIndividualIngredients[expandKey]}
                            onOpenChange={(open) => {
                              setExpandedIndividualIngredients(prev => ({ ...prev, [expandKey]: open }));
                            }}
                          >
                            <CollapsibleTrigger className="w-full hover-elevate active-elevate-2 rounded p-1 -m-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-purple-900">{ind.ingredient} - {ind.amount}{ind.unit}</div>
                                {expandedIndividualIngredients[expandKey] ? (
                                  <ChevronUp className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-purple-600" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-primary/5 rounded-md p-2 space-y-1">
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
                          <div className="font-medium text-purple-900">{ind.ingredient} - {ind.amount}{ind.unit}</div>
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
                    <li key={idx} className="text-xs text-orange-600">• {warning}</li>
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
            <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-system-supports">
              <div className="text-2xl font-bold text-primary">{formula.bases.length}</div>
              <p className="text-sm text-muted-foreground">System Supports</p>
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

          {/* System Supports */}
          {formula.bases.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                System Supports ({formula.bases.length})
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
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-blue-800">
                  <Lightbulb className="w-5 h-5" />
                  Why This Formula
                </h3>
                <p className="text-sm leading-relaxed text-blue-700">{formula.rationale}</p>
              </div>
            </>
          )}

          {/* Warnings */}
          {formula.warnings && formula.warnings.length > 0 && (
            <>
              <Separator />
              <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                  Important Warnings
                </h3>
                <ul className="space-y-1">
                  {formula.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
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
                <SelectItem value="bases">System Supports</SelectItem>
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
    queryKey: ['/api/ingredients', ingredient.ingredient],
    enabled: isExpanded,
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch system support details if this is a system support type
  const { data: systemSupportData } = useQuery<{ systemSupportDetails: Array<{
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

  // Fetch research citations for this ingredient - includes summary, benefits, and safety data
  // Only fetch for individual ingredients, NOT system supports (which are proprietary blends)
  const { data: researchData, isLoading: isLoadingResearch } = useQuery<{ 
    ingredientName: string;
    summary: string | null;
    keyBenefits: string[];
    safetyProfile: string | null;
    recommendedFor: string[];
    citations: Array<{
      id: string;
      citationTitle: string;
      journal: string;
      publicationYear: number;
      authors?: string | null;
      findings: string;
      sampleSize?: number | null;
      pubmedUrl?: string | null;
      evidenceLevel: 'strong' | 'moderate' | 'preliminary' | 'limited';
      studyType: 'rct' | 'meta_analysis' | 'systematic_review' | 'observational' | 'case_study' | 'review';
    }>; 
    totalCitations: number;
  }>({
    queryKey: ['/api/ingredients', ingredient.ingredient, 'research'],
    enabled: isExpanded && ingredient.type !== 'base', // Skip research for system supports (proprietary blends)
    staleTime: 0, // Always fetch fresh data
  });

  const researchCitations = researchData?.citations || [];

  const formulaBreakdown = systemSupportData?.systemSupportDetails.find(
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
                    {ingredient.type === 'base' ? 'System Support' : 'Addition'}
                  </Badge>
                  {ingredient.source === 'user' && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
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
                {/* System Support Breakdown - Show for system supports */}
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
                {ingredientDetail && ingredientDetail.benefits && ingredientDetail.benefits.length > 0 && (
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
                          {ingredient.type === 'base' ? 'Proprietary Blend' : 'Research'}
                        </h4>
                        {ingredient.type === 'base' ? (
                          <p className="text-sm text-muted-foreground">
                            This is a proprietary blend of multiple synergistic ingredients.
                          </p>
                        ) : ingredientDetail.researchBacking && (
                          <div className="space-y-1 text-sm">
                            <p>Studies: {ingredientDetail.researchBacking.studyCount}+</p>
                            <p>Evidence: {ingredientDetail.researchBacking.evidenceLevel}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sources */}
                    {ingredientDetail.sources && ingredientDetail.sources.length > 0 && (
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
                      {ingredientDetail.qualityIndicators && ingredientDetail.qualityIndicators.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ingredientDetail.qualityIndicators.map((indicator: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                      )}
                    </div>
                    )}

                    {/* Interactions */}
                    {ingredientDetail.interactions && ingredientDetail.interactions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Interactions & Warnings
                        </h4>
                        <div className="space-y-2">
                          {ingredientDetail.interactions.map((interaction: string, idx: number) => (
                            <div key={idx} className="p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                              <p className="text-sm text-orange-800">{interaction}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternatives */}
                    {ingredientDetail.alternatives && ingredientDetail.alternatives.length > 0 && (
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

                {/* Research Summary & Citations Section */}
                {researchData && (researchData.summary || researchCitations.length > 0) && (
                  <div className="space-y-4">
                    {/* Research Overview Card */}
                    {researchData.summary && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-800">
                          <Sparkles className="w-4 h-4" />
                          Research Overview
                        </h4>
                        <p className="text-sm text-blue-900 leading-relaxed line-clamp-3">{researchData.summary}</p>
                        
                        {/* Key benefits from research */}
                        {researchData.keyBenefits && researchData.keyBenefits.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-2">Research-Backed Benefits:</p>
                            <ul className="space-y-1">
                              {researchData.keyBenefits.slice(0, 3).map((benefit, idx) => (
                                <li key={idx} className="text-xs text-blue-800 flex items-start gap-1.5">
                                  <span className="text-green-600 mt-0.5">✓</span>
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* View Full Research Button */}
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <ResearchSummaryDialog
                            ingredientName={ingredient.ingredient}
                            summary={researchData.summary}
                            keyBenefits={researchData.keyBenefits || []}
                            safetyProfile={researchData.safetyProfile}
                            recommendedFor={researchData.recommendedFor || []}
                            citations={researchCitations}
                            totalCitations={researchData.totalCitations}
                          />
                        </div>
                      </div>
                    )}

                    {/* Individual Citation Cards - show first 2, rest in popup */}
                    {!researchData.summary && researchCitations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          Published Research ({researchData.totalCitations} studies)
                        </h4>
                        <div className="space-y-3" data-testid={`research-citations-${ingredient.ingredient}`}>
                          {researchCitations.slice(0, 2).map((citation) => (
                            <ResearchCitationCard key={citation.id} citation={citation} />
                          ))}
                          {researchCitations.length > 2 && (
                            <div className="text-center pt-2">
                              <ResearchSummaryDialog
                                ingredientName={ingredient.ingredient}
                                summary={researchData.summary}
                                keyBenefits={researchData.keyBenefits || []}
                                safetyProfile={researchData.safetyProfile}
                                recommendedFor={researchData.recommendedFor || []}
                                citations={researchCitations}
                                totalCitations={researchData.totalCitations}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading state for research citations */}
                {isLoadingResearch && (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex flex-col">
                        <h4 className="font-medium">{formula.name || `Version ${formula.version}`}</h4>
                        {formula.name && (
                          <p className="text-xs text-muted-foreground">Version {formula.version}</p>
                        )}
                      </div>
                      {formula.userCreated && (
                        <Badge className="bg-purple-600 text-white" data-testid={`badge-custom-${formula.version}`}>
                          Custom Built
                        </Badge>
                      )}
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
                              <AlertDialogTitle>Revert to {formula.name || `Version ${formula.version}`}?</AlertDialogTitle>
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
          <div className="text-lg font-semibold">{formula1.name || `Version ${formula1.version}`}</div>
          {formula1.name && (
            <div className="text-xs text-muted-foreground">Version {formula1.version}</div>
          )}
          <div className="text-sm text-muted-foreground">
            {new Date(formula1.createdAt).toLocaleDateString()}
          </div>
          <div className="text-lg font-bold mt-2">{formula1.totalMg}mg</div>
        </div>
        <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid={`comparison-version-${formula2.version}`}>
          <div className="text-lg font-semibold">{formula2.name || `Version ${formula2.version}`}</div>
          {formula2.name && (
            <div className="text-xs text-muted-foreground">Version {formula2.version}</div>
          )}
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
function ActionsSection({ formula, onOrderClick }: { formula: Formula; onOrderClick: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  const handleDownload = async () => {
    try {
      console.log('Starting PDF download...');
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
      
      if (pdfMake && pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
      }

      const pdfFormula: FormulaForPDF = {
        id: formula.id,
        version: formula.version,
        name: formula.name || undefined,
        createdAt: formula.createdAt.toString(),
        totalMg: formula.totalMg,
        bases: formula.bases,
        additions: formula.additions,
        userCustomizations: formula.userCustomizations,
        warnings: formula.warnings || undefined,
        userCreated: formula.userCreated,
      };

      console.log('Generating PDF with formula:', pdfFormula);

      const docDefinition = generateFormulaPDF(pdfFormula, {
        userName: user?.name || user?.email || 'ONES User',
        userEmail: user?.email || '',
      });

      console.log('PDF definition generated, creating PDF...');

      const fileName = formula.name
        ? `${formula.name.replace(/[^a-z0-9]/gi, '_')}_v${formula.version}.pdf`
        : `ONES_Formula_v${formula.version}.pdf`;

      pdfMake.createPdf(docDefinition).download(fileName);

      console.log('PDF download initiated:', fileName);

      toast({
        title: 'PDF Downloaded',
        description: `Your formula report "${fileName}" has been downloaded successfully.`,
      });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error message:', error?.message);
      toast({
        title: 'Download Failed',
        description: error?.message || 'There was an error generating your PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/shared/formula/${formula.id}`;
    navigator.clipboard?.writeText(shareLink);
    toast({
      title: 'Link Copied',
      description: 'Shareable formula link copied to clipboard.',
    });
  };

  const handleEmailShare = () => {
    if (!shareEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address to share with.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Share Feature Coming Soon',
      description: `Email sharing to ${shareEmail} will be available soon.`,
    });
    setShareDialogOpen(false);
    setShareEmail('');
  };

  return (
    <>
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
            <div className="grid gap-4 md:grid-cols-3">
              <Button onClick={onOrderClick} className="gap-2 h-auto p-4 flex-col" data-testid="button-action-order">
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

      {/* Review Schedule */}
      <ReviewScheduleCard formulaId={formula.id} />

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

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Formula
            </DialogTitle>
            <DialogDescription>
              Share your formula with your healthcare provider or family
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Share via Link</label>
              <div className="flex gap-2">
                <Input 
                  value={`${window.location.origin}/shared/formula/${formula.id}`}
                  readOnly 
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleCopyLink} data-testid="button-copy-share-link">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view (but not edit) your formula
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Share via Email (Coming Soon)</label>
              <Input 
                type="email"
                placeholder="doctor@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                data-testid="input-share-email"
              />
              <Button 
                onClick={handleEmailShare} 
                className="w-full"
                disabled
                data-testid="button-send-email-share"
              >
                Send Formula via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
            Begin a conversation with Ones AI to receive your first personalized supplement formula tailored to your unique health profile.
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