import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Download
} from 'lucide-react';
import { calculateDosage } from '@/lib/utils';
import { BASE_FORMULA_DETAILS, findIngredientByName } from '@shared/ingredients';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SharedFormulaPage() {
  const [, params] = useRoute('/shared/formula/:id');
  const formulaId = params?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/formulas/shared', formulaId],
    queryFn: async () => {
      const response = await fetch(`/api/formulas/shared/${formulaId}`);
      if (!response.ok) {
        throw new Error('Formula not found');
      }
      return response.json();
    },
    enabled: !!formulaId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading formula...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Formula Not Found
            </CardTitle>
            <CardDescription>
              This formula link may have expired or been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { formula, user } = data;
  const allIngredients = [
    ...(formula.bases || []),
    ...(formula.additions || [])
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Ones</h1>
              <p className="text-sm text-muted-foreground">Personalized Supplement Platform</p>
            </div>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener noreferrer">
                Visit Ones <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Formula Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {formula.name || `Custom Formula v${formula.version}`}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Shared by {user.name} on {new Date(formula.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  v{formula.version}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Total Ingredients</div>
                    <div className="text-lg font-semibold">{allIngredients.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Total Dosage</div>
                    <div className="text-lg font-semibold">{formula.totalMg.toLocaleString()} mg</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Capsule Count</div>
                    <div className="text-lg font-semibold">{Math.ceil(formula.totalMg / 500)} per day</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {formula.warnings && formula.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {formula.warnings.map((warning: string, idx: number) => (
                    <div key={idx}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Ingredients Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Formula Ingredients</CardTitle>
              <CardDescription>
                Complete breakdown of all active ingredients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Base Formulas */}
                {formula.bases && formula.bases.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Base Formulas
                    </h3>
                    <div className="space-y-3">
                      {formula.bases.map((base: { ingredient: string; mg: number }, idx: number) => {
                        const baseFormula = Object.values(BASE_FORMULA_DETAILS).find(
                          (f) => f.name === base.ingredient
                        );
                        return (
                          <div key={idx} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium">{base.ingredient}</div>
                                {baseFormula?.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {baseFormula.description}
                                  </div>
                                )}
                              </div>
                              <Badge variant="secondary">{base.mg} mg</Badge>
                            </div>
                            {baseFormula?.activeIngredients && baseFormula.activeIngredients.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium mb-2">Active Ingredients:</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {baseFormula.activeIngredients.map((ing, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {typeof ing === 'string' ? ing : ing.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Individual Additions */}
                {formula.additions && formula.additions.length > 0 && (
                  <>
                    {formula.bases && formula.bases.length > 0 && <Separator />}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Individual Ingredients
                      </h3>
                      <div className="space-y-2">
                        {formula.additions.map((addition: { ingredient: string; mg: number }, idx: number) => {
                          const ingDetails = findIngredientByName(addition.ingredient);
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{addition.ingredient}</div>
                                {ingDetails?.suggestedUse && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {ingDetails.suggestedUse}
                                  </div>
                                )}
                              </div>
                              <Badge variant="secondary">{addition.mg} mg</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dosage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Dosage Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium mb-2">Recommended Intake</div>
                  <p className="text-sm text-muted-foreground">
                    Take {Math.ceil(formula.totalMg / 500)} capsule{Math.ceil(formula.totalMg / 500) > 1 ? 's' : ''} daily with food and water.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>• Store in a cool, dry place away from direct sunlight</p>
                  <p>• Keep out of reach of children</p>
                  <p>• Consult your healthcare provider before starting any new supplement regimen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-muted-foreground/20">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Medical Disclaimer</p>
                <p>
                  This formula is personalized for the individual user and shared for informational purposes only. 
                  It is not intended to diagnose, treat, cure, or prevent any disease. Always consult with a qualified 
                  healthcare professional before making any changes to your supplement regimen or health routine.
                </p>
                <p className="pt-2 text-center">
                  © {new Date().getFullYear()} ONES - Personalized AI Supplement Platform
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
