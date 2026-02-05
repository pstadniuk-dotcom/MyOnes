import { ExternalLink, Users, Beaker, BookOpen, Info } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import type { ResearchCitation } from '@shared/schema';

// Evidence level type matching schema
export type EvidenceLevel = 'strong' | 'moderate' | 'preliminary' | 'limited';
export type StudyType = 'rct' | 'meta_analysis' | 'systematic_review' | 'observational' | 'case_study' | 'review';

// Extended type for pre-built research data
export interface ExtendedResearchCitation extends Partial<ResearchCitation> {
  id: string;
  citationTitle: string;
  journal: string;
  publicationYear: number;
  authors?: string | null;
  findings: string;
  sampleSize?: number | null;
  pubmedUrl?: string | null;
  evidenceLevel: EvidenceLevel;
  studyType: StudyType;
}

interface ResearchCitationCardProps {
  citation: ExtendedResearchCitation;
}

interface ResearchSummaryDialogProps {
  ingredientName: string;
  summary: string | null;
  keyBenefits: string[];
  safetyProfile: string | null;
  recommendedFor: string[];
  citations: ExtendedResearchCitation[];
  totalCitations: number;
}

const evidenceLevelColors: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  strong: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  moderate: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  emerging: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  preliminary: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  limited: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

const studyTypeLabels: Record<string, string> = {
  rct: 'Randomized Trial',
  'meta-analysis': 'Meta-Analysis',
  meta_analysis: 'Meta-Analysis',
  systematic_review: 'Systematic Review',
  review: 'Review',
  cohort: 'Cohort Study',
  'clinical-trial': 'Clinical Trial',
  observational: 'Observational',
  case_study: 'Case Study'
};

export function ResearchCitationCard({ citation }: ResearchCitationCardProps) {
  const evidenceColor = evidenceLevelColors[citation.evidenceLevel] || evidenceLevelColors.limited;
  const studyLabel = studyTypeLabels[citation.studyType] || citation.studyType;
  
  return (
    <div 
      className="p-4 border rounded-lg space-y-3 hover-elevate bg-white"
      data-testid={`citation-card-${citation.id}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h5 className="font-medium text-sm leading-tight flex-1">
            {citation.citationTitle}
          </h5>
          <Badge 
            variant="outline" 
            className={`text-xs shrink-0 ${evidenceColor}`}
          >
            {citation.evidenceLevel}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{citation.journal}</span>
          <span>•</span>
          <span>{citation.publicationYear}</span>
          {citation.sampleSize && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>n={citation.sampleSize.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {citation.authors && (
          <p className="text-xs text-muted-foreground italic">
            {citation.authors}
          </p>
        )}
      </div>

      <p className="text-sm leading-relaxed">
        {citation.findings}
      </p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <Badge variant="secondary" className="text-xs">
          <Beaker className="w-3 h-3 mr-1" />
          {studyLabel}
        </Badge>
        
        {citation.pubmedUrl && (
          <a
            href={citation.pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            data-testid={`link-pubmed-${citation.id}`}
          >
            View on PubMed
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// Research Summary Dialog - Shows full research overview with all studies
export function ResearchSummaryDialog({ 
  ingredientName, 
  summary, 
  keyBenefits, 
  safetyProfile, 
  recommendedFor,
  citations,
  totalCitations 
}: ResearchSummaryDialogProps) {
  if (!summary && citations.length === 0) {
    return null;
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="w-4 h-4" />
          View Research ({totalCitations} studies)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Research on {ingredientName}
          </DialogTitle>
          <DialogDescription>
            Scientific evidence and published studies
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Research Summary */}
          {summary && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold text-sm mb-2 text-primary">Research Summary</h4>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
          )}
          
          {/* Key Benefits from Research */}
          {keyBenefits.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Key Research-Backed Benefits
              </h4>
              <ul className="space-y-2">
                {keyBenefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommended For */}
          {recommendedFor.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Recommended For</h4>
              <div className="flex flex-wrap gap-2">
                {recommendedFor.map((use, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {use}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Safety Profile */}
          {safetyProfile && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2 text-amber-800">
                <Info className="w-4 h-4" />
                Safety Profile
              </h4>
              <p className="text-sm text-amber-900">{safetyProfile}</p>
            </div>
          )}
          
          {/* Published Studies */}
          {citations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-blue-500" />
                Published Studies ({citations.length})
              </h4>
              <div className="space-y-3">
                {citations.map((citation) => (
                  <ResearchCitationCard key={citation.id} citation={citation} />
                ))}
              </div>
            </div>
          )}
          
          {/* No research available */}
          {!summary && citations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No research data available for this ingredient yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
