import { ExternalLink, Users, Beaker } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ResearchCitation } from '@shared/schema';

interface ResearchCitationCardProps {
  citation: ResearchCitation;
}

const evidenceLevelColors = {
  strong: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  moderate: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  preliminary: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  limited: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

const studyTypeLabels = {
  rct: 'Randomized Trial',
  meta_analysis: 'Meta-Analysis',
  systematic_review: 'Systematic Review',
  observational: 'Observational',
  case_study: 'Case Study',
  review: 'Review'
};

export function ResearchCitationCard({ citation }: ResearchCitationCardProps) {
  return (
    <div 
      className="p-4 border rounded-lg space-y-3 hover-elevate"
      data-testid={`citation-card-${citation.id}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h5 className="font-medium text-sm leading-tight flex-1">
            {citation.citationTitle}
          </h5>
          <Badge 
            variant="outline" 
            className={`text-xs shrink-0 ${evidenceLevelColors[citation.evidenceLevel]}`}
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
          {studyTypeLabels[citation.studyType]}
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
