import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FlaskConical, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  MessageSquare,
  RefreshCw,
  Info,
  Pill,
  Beaker
} from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { Formula } from '@shared/schema';

// Helper function to format dates
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Loading skeleton component
function FormulaSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FormulaPage() {
  const [activeTab, setActiveTab] = useState('current');
  const { user } = useAuth();
  
  // Fetch current formula
  const { data: currentFormula, isLoading: formulaLoading, error: formulaError } = useQuery<Formula>({
    queryKey: ['/api/formulas/current'],
    enabled: !!user,
  });
  
  // Fetch formula history
  const { data: formulaHistoryData, isLoading: historyLoading } = useQuery<{history: Formula[]}>({
    queryKey: ['/api/formulas/history'],
    enabled: !!user,
  });
  
  const formulaHistory = formulaHistoryData?.history || [];
  
  if (formulaLoading) {
    return <FormulaSkeleton />;
  }
  
  if (formulaError || !currentFormula) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6">
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Formula Found</h3>
            <p className="text-muted-foreground">You haven't created a personalized formula yet.</p>
            <Button asChild>
              <Link href="/dashboard/consultation">
                <MessageSquare className="w-4 h-4 mr-2" />
                Start Consultation
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-formula">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-formula-title">
            My Formula
          </h1>
          <p className="text-muted-foreground">
            Your personalized supplement formula, optimized by Ones AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            <FlaskConical className="w-3 h-3 mr-1" />
            Version {currentFormula.version}
          </Badge>
          <Button asChild data-testid="button-discuss-formula">
            <Link href="/dashboard/consultation">
              <MessageSquare className="w-4 h-4 mr-2" />
              Discuss with AI
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" data-testid="tab-current-formula">Current Formula</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-formula-analysis">Analysis</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-formula-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Current Formula Overview */}
          <Card data-testid="section-formula-overview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Beaker className="w-5 h-5" />
                    Current Formula v{currentFormula.version}
                  </CardTitle>
                  <CardDescription>
                    Created on {new Date(currentFormula.createdAt).toLocaleDateString()} • Total: {currentFormula.totalMg}mg
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" data-testid="button-download-formula">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base Formulas */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Base Formulas</h3>
                <div className="grid gap-4">
                  {currentFormula.bases.map((base, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{base.ingredient}</h4>
                          <Badge variant="secondary">{base.amount}{base.unit}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {base.ingredient}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Additional Ingredients */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Personalized Additions</h3>
                <div className="grid gap-4">
                  {currentFormula.additions.map((addition, idx) => (
                    <Card key={idx} className="border-l-4 border-l-blue-400">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{addition.ingredient}</h4>
                          <Badge variant="outline">{addition.amount}{addition.unit}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {addition.ingredient}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Formula Notes */}
              {currentFormula.notes && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Formula Notes
                  </h3>
                  <p className="text-sm leading-relaxed">{currentFormula.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Formula Review */}
          <Card data-testid="section-request-review">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Need Changes to Your Formula?</h3>
                    <p className="text-sm text-muted-foreground">
                      Discuss updates with our AI based on new health insights
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild data-testid="button-schedule-review">
                  <Link href="/dashboard/consultation">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Review
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card data-testid="section-formula-analysis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Formula Analysis
              </CardTitle>
              <CardDescription>
                Breakdown of your formula composition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Dosage Distribution</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Base Ingredients</span>
                        <span>
                          {currentFormula.bases.reduce((sum, base) => sum + base.amount, 0)}{currentFormula.bases[0]?.unit || 'mg'}
                        </span>
                      </div>
                      <Progress value={Math.round((currentFormula.bases.reduce((sum, base) => sum + base.amount, 0) / currentFormula.totalMg) * 100)} />
                    </div>
                    {currentFormula.additions.length > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Additional Supplements</span>
                          <span>
                            {currentFormula.additions.reduce((sum, addition) => sum + addition.amount, 0)}{currentFormula.additions[0]?.unit || 'mg'}
                          </span>
                        </div>
                        <Progress value={Math.round((currentFormula.additions.reduce((sum, addition) => sum + addition.amount, 0) / currentFormula.totalMg) * 100)} />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Ingredient Summary</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Ingredients</span>
                      <Badge variant="secondary">{currentFormula.bases.length + currentFormula.additions.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Base Formulas</span>
                      <Badge variant="outline">{currentFormula.bases.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Added Supplements</span>
                      <Badge variant="outline">{currentFormula.additions.length}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Formula Details</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">v{currentFormula.version}</div>
                      <p className="text-sm text-muted-foreground">Version</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{currentFormula.totalMg}mg</div>
                      <p className="text-sm text-muted-foreground">Total Daily</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {new Date(currentFormula.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <p className="text-sm text-muted-foreground">Created</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card data-testid="section-formula-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Formula History
              </CardTitle>
              <CardDescription>
                Track changes and improvements to your formula over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formulaHistory.length > 0 ? formulaHistory.map((entry, idx) => (
                  <div key={entry.version} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        v{entry.version}
                      </div>
                      {idx < formulaHistory.length - 1 && (
                        <div className="w-px h-16 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Version {entry.version}</h4>
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Total: {entry.totalMg}mg
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Previous Versions</h3>
                    <p className="text-sm text-muted-foreground">
                      This is your first personalized formula
                    </p>
                  </div>
                )}}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}