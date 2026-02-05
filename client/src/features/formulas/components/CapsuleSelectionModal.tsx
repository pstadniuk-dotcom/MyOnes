import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Pill, Check, Star, TrendingDown, Shield, Sparkles, Leaf } from 'lucide-react';
import { VALID_CAPSULE_COUNTS, CAPSULE_TIER_INFO, CAPSULE_PRICING, getCapsuleBudget, type CapsuleCount } from '@/shared/lib/utils';
import { cn } from '@/shared/lib/utils';

interface CapsuleSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendedCapsules?: CapsuleCount;
  currentCapsules?: CapsuleCount;
  onSelect: (capsuleCount: CapsuleCount) => void;
  reasoning?: string;
  amazonComparison?: {
    amazonPrice: number;
    ingredientCount: number;
  };
}

export function CapsuleSelectionModal({
  open,
  onOpenChange,
  recommendedCapsules = 9,
  currentCapsules,
  onSelect,
  reasoning,
  amazonComparison,
}: CapsuleSelectionModalProps) {
  const [selected, setSelected] = useState<CapsuleCount>(currentCapsules || recommendedCapsules);

  const handleConfirm = () => {
    onSelect(selected);
    onOpenChange(false);
  };

  const selectedPricing = CAPSULE_PRICING[selected];
  const savings = amazonComparison
    ? Math.round(((amazonComparison.amazonPrice - selectedPricing.monthlyPrice) / amazonComparison.amazonPrice) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1B4332]">
            <Pill className="w-5 h-5" />
            Choose Your Daily Protocol
          </DialogTitle>
          <DialogDescription>
            {reasoning || 'Select your daily capsule count. More capsules allow for more comprehensive, personalized support.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {VALID_CAPSULE_COUNTS.map((count) => {
            const info = CAPSULE_TIER_INFO[count];
            const pricing = CAPSULE_PRICING[count];
            const budgetMg = getCapsuleBudget(count);
            const perMeal = Math.ceil(count / 3);
            const isRecommended = count === recommendedCapsules;
            const isSelected = count === selected;

            return (
              <button
                key={count}
                onClick={() => setSelected(count)}
                className={cn(
                  'w-full p-4 rounded-lg border-2 transition-all text-left',
                  isSelected
                    ? 'border-[#1B4332] bg-[#1B4332]/5'
                    : 'border-gray-200 hover:border-[#1B4332]/50 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'border-[#1B4332] bg-[#1B4332]'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1B4332]">
                          {count} capsules/day
                        </span>
                        <span className="text-sm text-gray-500">({info.label})</span>
                        {isRecommended && (
                          <Badge className="bg-[#1B4332] text-white text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{info.description}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {info.features.map((feature, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-bold text-[#1B4332]">
                      ${pricing.monthlyPrice}/mo
                    </div>
                    <div className="text-xs text-gray-500">
                      ${pricing.perCapsule.toFixed(2)}/capsule
                    </div>
                    <div className="text-xs text-[#52796F]">
                      {budgetMg.toLocaleString()}mg total
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-[#1B4332]/10 to-[#52796F]/10 rounded-lg p-4">
          <h4 className="font-semibold text-[#1B4332] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Why ONES vs. Buying Separately
          </h4>

          {amazonComparison && savings && savings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-bold text-green-700">Save {savings}%</span>
                  <span className="text-green-600 text-sm ml-2">
                    vs. ${amazonComparison.amazonPrice}/mo for {amazonComparison.ingredientCount} supplements on Amazon
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#1B4332] mt-0.5 flex-shrink-0" />
              <span className="text-gray-700"><strong>Medical-grade</strong> ingredients, no fillers</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#1B4332] mt-0.5 flex-shrink-0" />
              <span className="text-gray-700"><strong>Personalized</strong> to your health data</span>
            </div>
            <div className="flex items-start gap-2">
              <Leaf className="w-4 h-4 text-[#1B4332] mt-0.5 flex-shrink-0" />
              <span className="text-gray-700"><strong>All-in-one</strong> daily pack, no pill chaos</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-[#1B4332] mt-0.5 flex-shrink-0" />
              <span className="text-gray-700"><strong>Evolves</strong> with your health over time</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-[#1B4332] hover:bg-[#143728] text-white"
          >
            Continue with {selected} Capsules (${CAPSULE_PRICING[selected].monthlyPrice}/mo)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
