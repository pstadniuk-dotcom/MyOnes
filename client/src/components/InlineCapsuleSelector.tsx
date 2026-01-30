import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, TrendingDown, Loader2 } from 'lucide-react';
import { VALID_CAPSULE_COUNTS, CAPSULE_TIER_INFO, CAPSULE_PRICING, getCapsuleBudget, type CapsuleCount } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * FUTURE WORKFLOW (when manufacturer API is connected):
 * 
 * Current Flow (temporary):
 * 1. AI outputs capsule-recommendation → Shows selector with static pricing
 * 2. User selects capsule count → AI creates formula
 * 
 * Future Flow (with manufacturer API):
 * 1. AI finishes consultation, determines it's ready to create formula
 * 2. AI outputs formula JSON → Backend calls manufacturer API to get:
 *    - Ingredient availability
 *    - Per-ingredient pricing (based on weight/density)
 *    - Total formula cost calculation
 * 3. Backend stores formula with calculated pricing
 * 4. THEN shows capsule selector with ACTUAL pricing based on ingredients
 * 5. User selects → Formula is finalized with real costs
 * 
 * Key change: Pricing comes AFTER formula creation, not before.
 * The capsule selector should only appear once we know the actual cost.
 */

interface InlineCapsuleSelectorProps {
  recommendedCapsules: CapsuleCount;
  reasoning: string;
  priorities?: string[];
  estimatedAmazonCost?: number;
  onSelect: (capsuleCount: CapsuleCount) => void;
  isSelecting?: boolean;
  selectedCapsules?: CapsuleCount | null;
}

export function InlineCapsuleSelector({
  recommendedCapsules,
  reasoning,
  priorities = [],
  estimatedAmazonCost,
  onSelect,
  isSelecting = false,
  selectedCapsules = null,
}: InlineCapsuleSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<CapsuleCount | null>(null);

  // If already selected, show confirmation state
  if (selectedCapsules) {
    const pricing = CAPSULE_PRICING[selectedCapsules];
    const info = CAPSULE_TIER_INFO[selectedCapsules];
    return (
      <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-lg p-4 my-3">
        <div className="flex items-center gap-2 text-[#1B4332]">
          <Check className="w-5 h-5" />
          <span className="font-medium">
            Selected: {selectedCapsules} capsules/day ({info.label}) - ${pricing.monthlyPrice}/mo
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">Creating your personalized formula...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1B4332]/5 to-[#52796F]/5 border border-[#1B4332]/20 rounded-lg p-4 my-3">
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-[#1B4332] text-sm">Select Your Daily Protocol</h4>
        <p className="text-xs text-gray-600 mt-1">{reasoning}</p>
      </div>

      {/* Capsule Options - Horizontal on desktop, vertical on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {VALID_CAPSULE_COUNTS.map((count) => {
          const info = CAPSULE_TIER_INFO[count];
          const pricing = CAPSULE_PRICING[count];
          const isRecommended = count === recommendedCapsules;
          const isHovered = count === hoveredOption;

          return (
            <button
              key={count}
              onClick={() => onSelect(count)}
              onMouseEnter={() => setHoveredOption(count)}
              onMouseLeave={() => setHoveredOption(null)}
              disabled={isSelecting}
              className={cn(
                'relative p-3 rounded-lg border-2 transition-all text-left',
                isRecommended
                  ? 'border-[#1B4332] bg-[#1B4332]/10'
                  : 'border-gray-200 hover:border-[#1B4332]/50 hover:bg-gray-50',
                isSelecting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isRecommended && (
                <Badge className="absolute -top-2 -right-2 bg-[#1B4332] text-white text-[10px] px-1.5 py-0.5">
                  <Star className="w-2.5 h-2.5 mr-0.5" />
                  Best
                </Badge>
              )}
              
              <div className="text-center">
                <div className="text-lg font-bold text-[#1B4332]">{count}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{info.label}</div>
                <div className="text-sm font-semibold text-[#52796F] mt-1">${pricing.monthlyPrice}/mo</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Value proposition */}
      {estimatedAmazonCost && estimatedAmazonCost > 0 && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1.5">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>
            Save vs Amazon: These {priorities.length || 10}+ ingredients would cost ~${estimatedAmazonCost}/mo separately
          </span>
        </div>
      )}

      {isSelecting && (
        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-[#1B4332]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating your formula...</span>
        </div>
      )}
    </div>
  );
}
