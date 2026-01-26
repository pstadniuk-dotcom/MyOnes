import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  FlaskConical, 
  Pill, 
  Sparkles, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FormulaInsightsData {
  totalFormulas: number;
  averageIngredients: number;
  averageTotalMg: number;
  popularBases: Array<{ name: string; count: number; percentage: number }>;
  popularAdditions: Array<{ name: string; count: number; percentage: number }>;
  customizationRate: number;
  unusedSystemSupports: string[];
  unusedIndividuals: string[];
  totalAvailableSystemSupports: number;
  totalAvailableIndividuals: number;
}

export function FormulaInsightsWidget() {
  const [showUnusedBases, setShowUnusedBases] = useState(false);
  const [showUnusedIndividuals, setShowUnusedIndividuals] = useState(false);
  
  const { data, isLoading, error } = useQuery<FormulaInsightsData>({
    queryKey: ['/api/admin/analytics/formula-insights'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Formula Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load formula insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="formula-insights-widget">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Formula Insights
        </CardTitle>
        <CardDescription>
          Popular ingredients and customization trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xl md:text-2xl font-bold">{data.totalFormulas}</p>
            <p className="text-xs text-muted-foreground">Total Formulas</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xl md:text-2xl font-bold">{data.averageIngredients}</p>
            <p className="text-xs text-muted-foreground">Avg Ingredients</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xl md:text-2xl font-bold">{(data.averageTotalMg / 1000).toFixed(1)}g</p>
            <p className="text-xs text-muted-foreground">Avg Formula Size</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xl md:text-2xl font-bold">{data.customizationRate}%</p>
            <p className="text-xs text-muted-foreground">Customized</p>
          </div>
        </div>

        {/* Popular Ingredients */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Popular Bases */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Pill className="h-4 w-4" />
              Popular System Supports
            </h4>
            <div className="space-y-2">
              {data.popularBases.slice(0, 5).map((base, index) => (
                <div key={base.name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-sm truncate">{base.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {base.percentage}%
                      </Badge>
                    </div>
                    <Progress value={base.percentage} className="h-1" />
                  </div>
                </div>
              ))}
              {data.popularBases.length === 0 && (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </div>

          {/* Popular Additions */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" />
              Popular Individual Ingredients
            </h4>
            <div className="space-y-2">
              {data.popularAdditions.slice(0, 5).map((addition, index) => (
                <div key={addition.name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-sm truncate">{addition.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {addition.percentage}%
                      </Badge>
                    </div>
                    <Progress value={addition.percentage} className="h-1" />
                  </div>
                </div>
              ))}
              {data.popularAdditions.length === 0 && (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Unused Ingredients Section */}
        {(data.unusedSystemSupports?.length > 0 || data.unusedIndividuals?.length > 0) && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-4 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Unused Ingredients
              <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
                {(data.unusedSystemSupports?.length || 0) + (data.unusedIndividuals?.length || 0)} unused
              </Badge>
            </h4>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Unused System Supports */}
              {data.unusedSystemSupports && data.unusedSystemSupports.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    onClick={() => setShowUnusedBases(!showUnusedBases)}
                  >
                    <span className="text-xs font-medium text-amber-700">
                      System Supports ({data.unusedSystemSupports.length}/{data.totalAvailableSystemSupports})
                    </span>
                    {showUnusedBases ? (
                      <ChevronUp className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-amber-600" />
                    )}
                  </Button>
                  {showUnusedBases && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {data.unusedSystemSupports.map((name) => (
                        <div key={name} className="text-xs text-amber-800 py-0.5">
                          • {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Unused Individuals */}
              {data.unusedIndividuals && data.unusedIndividuals.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    onClick={() => setShowUnusedIndividuals(!showUnusedIndividuals)}
                  >
                    <span className="text-xs font-medium text-amber-700">
                      Individual Ingredients ({data.unusedIndividuals.length}/{data.totalAvailableIndividuals})
                    </span>
                    {showUnusedIndividuals ? (
                      <ChevronUp className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-amber-600" />
                    )}
                  </Button>
                  {showUnusedIndividuals && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {data.unusedIndividuals.map((name) => (
                        <div key={name} className="text-xs text-amber-800 py-0.5">
                          • {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
