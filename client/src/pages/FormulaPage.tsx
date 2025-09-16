import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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

// Mock formula data - in production this would come from APIs
const currentFormula = {
  version: 3,
  createdDate: '2024-09-15',
  totalMg: 1850,
  bases: [
    {
      name: 'Multivitamin Base',
      dose: '800mg',
      purpose: 'Essential vitamin and mineral foundation',
      ingredients: ['Vitamin D3 (2000 IU)', 'B-Complex', 'Magnesium Glycinate', 'Zinc Picolinate']
    },
    {
      name: 'Omega-3 Complex',
      dose: '500mg',
      purpose: 'Anti-inflammatory and cognitive support',
      ingredients: ['EPA (300mg)', 'DHA (200mg)']
    }
  ],
  additions: [
    {
      name: 'Vitamin D3 Boost',
      dose: '400mg',
      purpose: 'Addressing deficiency shown in recent labs',
      reason: 'Lab results showed levels at 28 ng/mL (optimal: 40-60)'
    },
    {
      name: 'Adaptogenic Blend',
      dose: '150mg', 
      purpose: 'Stress management and cortisol regulation',
      reason: 'User reported high stress levels and sleep issues'
    }
  ],
  warnings: [
    'Take with meals to optimize absorption',
    'Avoid taking with calcium supplements (separate by 2+ hours)',
    'Monitor for any digestive discomfort in first week'
  ],
  rationale: 'Formula optimized based on recent blood work showing Vitamin D deficiency and user-reported stress/energy concerns. The adaptogenic blend addresses cortisol dysregulation while maintaining foundational nutrition.',
  nextReview: '2024-11-15'
};

const formulaHistory = [
  {
    version: 3,
    date: '2024-09-15',
    changes: 'Added Vitamin D3 boost and adaptogenic blend',
    reason: 'Lab results analysis + stress management'
  },
  {
    version: 2,
    date: '2024-08-15',
    changes: 'Increased Omega-3 dosage, added B-Complex',
    reason: 'Cognitive enhancement request'
  },
  {
    version: 1,
    date: '2024-07-20',
    changes: 'Initial formula created',
    reason: 'Health assessment and initial consultation'
  }
];

export default function FormulaPage() {
  const [activeTab, setActiveTab] = useState('current');

  return (
    <div className="space-y-6" data-testid="page-formula">
      {/* Header */}
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
                    Created on {new Date(currentFormula.createdDate).toLocaleDateString()} • Total: {currentFormula.totalMg}mg
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
                          <h4 className="font-medium">{base.name}</h4>
                          <Badge variant="secondary">{base.dose}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{base.purpose}</p>
                        <div className="flex flex-wrap gap-1">
                          {base.ingredients.map((ingredient, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {ingredient}
                            </Badge>
                          ))}
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
                          <h4 className="font-medium">{addition.name}</h4>
                          <Badge variant="outline">{addition.dose}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{addition.purpose}</p>
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border-l-4 border-blue-400">
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            <strong>Why added:</strong> {addition.reason}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Formula Rationale */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Formula Rationale
                </h3>
                <p className="text-sm leading-relaxed">{currentFormula.rationale}</p>
              </div>

              {/* Important Notes */}
              {currentFormula.warnings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                    Important Usage Notes
                  </h3>
                  <div className="space-y-2">
                    {currentFormula.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span className="text-sm text-amber-800 dark:text-amber-300">{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Review */}
          <Card data-testid="section-next-review">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Next Review Scheduled</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(currentFormula.nextReview).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild data-testid="button-schedule-review">
                  <Link href="/dashboard/consultation">
                    <RefreshCw className="w-4 h-4 mr-2" />
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
                Breakdown of your formula composition and optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Dosage Distribution</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Base Formulas</span>
                        <span>70% (1,300mg)</span>
                      </div>
                      <Progress value={70} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Personalized Additions</span>
                        <span>30% (550mg)</span>
                      </div>
                      <Progress value={30} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Formula Focus Areas</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Foundational Nutrition</span>
                      <Badge variant="secondary">Primary</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Stress Management</span>
                      <Badge variant="outline">Added</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Vitamin D Support</span>
                      <Badge variant="outline">Corrective</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Optimization Score</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">95%</div>
                      <p className="text-sm text-muted-foreground">Lab Alignment</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">87%</div>
                      <p className="text-sm text-muted-foreground">Goal Match</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">92%</div>
                      <p className="text-sm text-muted-foreground">Safety Score</p>
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
                {formulaHistory.map((entry, idx) => (
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
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{entry.changes}</p>
                      <p className="text-xs text-muted-foreground">{entry.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}