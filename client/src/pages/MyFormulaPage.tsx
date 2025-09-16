import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Clock, ArrowRight, ArrowLeft, GitBranch, Star, Shield, Zap,
  Heart, Brain, Activity, Target, Plus, Minus, RotateCcw, 
  ExternalLink, Copy, Users, Lightbulb, BookOpen, Award,
  Package, AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Types for Formula data matching backend schema
interface FormulaIngredient {
  ingredient: string;
  amount: number;
  unit: string;
}

interface Formula {
  id: string;
  userId: string;
  version: number;
  bases: FormulaIngredient[];
  additions: FormulaIngredient[];
  totalMg: number;
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
  const [activeTab, setActiveTab] = useState('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [revertReason, setRevertReason] = useState('');
  
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

  // Derived data
  const currentFormula = currentFormulaData?.formula;
  const formulaHistory = historyData?.history;

  // Safety calculations
  const safetyMetrics = useMemo(() => {
    if (!currentFormula) return null;
    
    const totalMg = currentFormula.totalMg;
    const safetyPercentage = Math.min((totalMg / 800) * 100, 100);
    const isOptimal = totalMg >= 600 && totalMg <= 800;
    const isOverLimit = totalMg > 800;
    
    return {
      totalMg,
      safetyPercentage,
      isOptimal,
      isOverLimit,
      remainingCapacity: Math.max(0, 800 - totalMg),
      status: isOverLimit ? 'danger' : isOptimal ? 'optimal' : 'safe'
    };
  }, [currentFormula]);

  // Ingredient filtering and searching
  const filteredIngredients = useMemo(() => {
    if (!currentFormula) return [];
    
    const allIngredients = [
      ...currentFormula.bases.map(ing => ({ ...ing, type: 'base' as const })),
      ...currentFormula.additions.map(ing => ({ ...ing, type: 'addition' as const }))
    ];

    return allIngredients.filter(ingredient => {
      const matchesSearch = ingredient.ingredient.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || 
                            (categoryFilter === 'bases' && ingredient.type === 'base') ||
                            (categoryFilter === 'additions' && ingredient.type === 'addition');
      return matchesSearch && matchesCategory;
    });
  }, [currentFormula, searchTerm, categoryFilter]);

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

  // Error states
  if (currentError || !currentFormula) {
    return <FormulaError error={currentError} />;
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
          <Badge variant="secondary" className="text-sm" data-testid="badge-formula-version">
            <FlaskConical className="w-3 h-3 mr-1" />
            Version {currentFormula.version}
          </Badge>
          <Button asChild className="gap-2" data-testid="button-discuss-formula">
            <Link href="/dashboard/consultation">
              <MessageSquare className="w-4 h-4" />
              Discuss with AI
            </Link>
          </Button>
        </div>
      </div>

      {/* Safety Status Card */}
      {safetyMetrics && (
        <Card className={`border-l-4 ${
          safetyMetrics.status === 'danger' ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' :
          safetyMetrics.status === 'optimal' ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' :
          'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
        }`} data-testid="section-safety-status">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${
                    safetyMetrics.status === 'danger' ? 'text-red-600' :
                    safetyMetrics.status === 'optimal' ? 'text-green-600' :
                    'text-blue-600'
                  }`} />
                  <h3 className="font-semibold">
                    Formula Safety: {safetyMetrics.status === 'optimal' ? 'Optimal' : safetyMetrics.status === 'danger' ? 'Over Limit' : 'Safe'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {safetyMetrics.totalMg}mg of 800mg maximum • {safetyMetrics.remainingCapacity}mg remaining capacity
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{Math.round(safetyMetrics.safetyPercentage)}%</div>
                <Progress value={safetyMetrics.safetyPercentage} className="w-24 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current" data-testid="tab-current-formula">Current</TabsTrigger>
          <TabsTrigger value="ingredients" data-testid="tab-ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Actions</TabsTrigger>
        </TabsList>

        {/* Current Formula Tab */}
        <TabsContent value="current" className="space-y-6">
          <CurrentFormulaDisplay formula={currentFormula} />
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
          <ActionsSection formula={currentFormula} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Current Formula Display Component
function CurrentFormulaDisplay({ formula }: { formula: Formula }) {
  const totalIngredients = formula.bases.length + formula.additions.length;
  
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
  ingredients: Array<FormulaIngredient & { type: 'base' | 'addition' }>;
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
  ingredient: FormulaIngredient & { type: 'base' | 'addition' };
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) {
  const { data: ingredientDetail, isLoading } = useQuery<IngredientDetail>({
    queryKey: ['/api/ingredients', encodeURIComponent(ingredient.ingredient)],
    enabled: isExpanded
  });

  return (
    <Card className={`border-l-4 ${ingredient.type === 'base' ? 'border-l-primary' : 'border-l-blue-500'}`} 
          data-testid={`card-ingredient-${ingredient.ingredient}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate" data-testid={`button-expand-${ingredient.ingredient}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{ingredient.ingredient}</CardTitle>
                  <Badge variant={ingredient.type === 'base' ? 'default' : 'outline'} data-testid={`badge-ingredient-type-${ingredient.ingredient}`}>
                    {ingredient.type === 'base' ? 'Base Formula' : 'Addition'}
                  </Badge>
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
            ) : ingredientDetail ? (
              <div className="space-y-6">
                {/* Benefits */}
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
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                Unable to load ingredient details
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
              Start New Consultation
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}