import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Check, Loader2, Sparkles, Pill, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { VALID_CAPSULE_COUNTS, CAPSULE_TIER_INFO, type CapsuleCount } from '@/shared/lib/utils';
import { cn } from '@/shared/lib/utils';

/**
 * CAPSULE SELECTOR - Shows coverage levels with ONES recommendation
 * 
 * Redesigned for better visual hierarchy and mobile responsiveness
 */

interface InlineCapsuleSelectorProps {
  recommendedCapsules: CapsuleCount;
  reasoning: string;
  priorities?: string[];
  onSelect: (capsuleCount: CapsuleCount) => void;
  isSelecting?: boolean;
  selectedCapsules?: CapsuleCount | null;
}

function normalizeRecommendationCopy(text: string): string {
  return String(text || '')
    .replace(/Clinical protocol engine recommends/gi, 'Clinical protocol engine suggests')
    .replace(/\(high-confidence\)/gi, '(high confidence)')
    .replace(/\(moderate-confidence\)/gi, '(moderate confidence)')
    .replace(
      /Cardiometabolic risk pattern present; avoid under-dosing with 6-capsule protocol\./gi,
      'Cardiometabolic risk pattern present; a 9-capsule protocol offers more complete support than a 6-capsule baseline.'
    );
}

function toUserCenteredReason(reason: string): string {
  const normalized = normalizeRecommendationCopy(reason).trim();

  if (/Cardiometabolic risk pattern present/i.test(normalized)) {
    return 'Your cardiometabolic lab pattern suggests you benefit from stronger daily support than a baseline-only protocol.';
  }
  if (/Moderate biomarker\/complexity burden supports a 9-capsule targeted protocol/i.test(normalized)) {
    return 'Multiple out-of-range markers and overall profile complexity support a targeted daily protocol.';
  }
  if (/Low-complexity baseline profile supports foundational 6-capsule protocol/i.test(normalized)) {
    return 'Your current profile appears lower complexity, so a foundational protocol is appropriate to start.';
  }

  return normalized;
}

function buildDataBasedReasons(reasoning: string, priorities: string[]): string[] {
  if (priorities.length > 0) {
    const transformed = priorities
      .map((reason) => toUserCenteredReason(reason))
      .filter((reason, index, arr) => reason.length > 0 && arr.indexOf(reason) === index);
    if (transformed.length > 0) {
      return transformed.slice(0, 4);
    }
  }

  return reasoning
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => !/clinical protocol engine suggests/i.test(part))
    .map((part) => toUserCenteredReason(part))
    .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index)
    .slice(0, 3);
}

export function InlineCapsuleSelector({
  recommendedCapsules,
  reasoning,
  priorities = [],
  onSelect,
  isSelecting = false,
  selectedCapsules = null,
}: InlineCapsuleSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<CapsuleCount | null>(null);
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);
  const normalizedReasoning = normalizeRecommendationCopy(reasoning);
  const normalizedPriorities = priorities.map((priority) => normalizeRecommendationCopy(priority));
  const dataBasedReasons = buildDataBasedReasons(normalizedReasoning, normalizedPriorities);
  const conciseReasoning = normalizedReasoning.split(/(?<=\.)\s+/)[0] || normalizedReasoning;

  // If already selected, show confirmation state
  if (selectedCapsules) {
    const info = CAPSULE_TIER_INFO[selectedCapsules];
    return (
      <div className="bg-gradient-to-br from-[#1B4332]/5 to-[#52796F]/5 border border-[#1B4332]/30 rounded-xl p-5 my-4 shadow-sm">
        <div className="flex items-center gap-3 text-[#1B4332]">
          <div className="w-10 h-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-[#1B4332]" />
          </div>
          <div>
            <span className="font-semibold text-base">
              {selectedCapsules} capsules/day selected
            </span>
            <p className="text-sm text-gray-600">{info.label} Protocol</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#1B4332]/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating your personalized formula...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm my-4 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D5A45] px-5 py-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Pill className="w-5 h-5" />
          <h4 className="font-semibold text-base">Select Your Daily Protocol</h4>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{conciseReasoning}</p>
        <button
          type="button"
          onClick={() => setShowRecommendationDetails(prev => !prev)}
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-white/90 hover:text-white"
        >
          <Info className="w-3.5 h-3.5" />
          What in your data supports {recommendedCapsules} capsules/day?
          {showRecommendationDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showRecommendationDetails && (
          <div className="mt-3 rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs text-white/90 leading-relaxed">Based on your current labs and health profile:</p>
            {dataBasedReasons.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {dataBasedReasons.map((reason) => (
                  <li key={reason} className="text-xs text-white/85 leading-relaxed">
                    • {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Capsule Options */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {VALID_CAPSULE_COUNTS.map((count) => {
            const info = CAPSULE_TIER_INFO[count];
            const isRecommended = count === recommendedCapsules;
            const isHovered = hoveredOption === count;

            return (
              <button
                key={count}
                onClick={() => onSelect(count)}
                onMouseEnter={() => setHoveredOption(count)}
                onMouseLeave={() => setHoveredOption(null)}
                disabled={isSelecting}
                className={cn(
                  'relative flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  'flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-2',
                  isRecommended
                    ? 'border-[#1B4332] bg-[#1B4332]/5 shadow-md'
                    : 'border-gray-200 hover:border-[#1B4332]/40 hover:bg-gray-50',
                  isSelecting && 'opacity-50 cursor-not-allowed',
                  !isSelecting && 'hover:shadow-md cursor-pointer'
                )}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#1B4332] hover:bg-[#1B4332] text-white text-[10px] px-3 py-1 shadow-sm whitespace-nowrap">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Recommended
                    </Badge>
                  </div>
                )}

                {/* Capsule Count - Large number */}
                <div className={cn(
                  'flex items-center justify-center',
                  'w-16 h-16 sm:w-20 sm:h-20 rounded-full',
                  isRecommended
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-gray-100 text-[#1B4332]',
                  'transition-colors duration-200'
                )}>
                  <span className="text-2xl sm:text-3xl font-bold">{count}</span>
                </div>

                {/* Info Section */}
                <div className="flex-1 sm:flex-none text-left sm:text-center">
                  <div className={cn(
                    'text-sm font-semibold uppercase tracking-wide',
                    isRecommended ? 'text-[#1B4332]' : 'text-gray-700'
                  )}>
                    {info.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {info.description}
                  </div>

                  {/* Per meal info */}
                  <div className={cn(
                    'mt-2 text-xs font-medium',
                    isRecommended ? 'text-[#1B4332]/70' : 'text-gray-400'
                  )}>
                    {count / 3} caps × 3 meals
                  </div>
                </div>

                {/* Mobile: Arrow indicator */}
                <div className="sm:hidden text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center mt-4 px-2">
          Final pricing calculated after your personalized formula is created
        </p>
      </div>

      {/* Loading state */}
      {isSelecting && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-sm text-[#1B4332]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating your formula...</span>
          </div>
        </div>
      )}
    </div>
  );
}
