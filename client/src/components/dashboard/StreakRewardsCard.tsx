import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy, Clock, ShoppingCart, AlertTriangle, Gift, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { format, differenceInDays, parseISO } from 'date-fns';

// Streak discount tiers
const STREAK_TIERS = [
  { days: 7, discount: 5, badge: '🥉', label: 'Consistent' },
  { days: 14, discount: 8, badge: '🥈', label: 'Committed' },
  { days: 30, discount: 10, badge: '🥇', label: 'Dedicated' },
  { days: 60, discount: 15, badge: '💎', label: 'Loyal' },
  { days: 90, discount: 20, badge: '👑', label: 'Champion' },
];

export interface StreakRewardsData {
  currentStreak: number;
  discountEarned: number;
  discountTier: string;
  lastOrderDate: string | null;
  reorderWindowStart: string | null;
  reorderDeadline: string | null;
  streakStatus: 'building' | 'ready' | 'warning' | 'grace' | 'lapsed';
  daysUntilReorderWindow: number | null;
  daysUntilDeadline: number | null;
}

interface StreakRewardsCardProps {
  data?: StreakRewardsData;
  isLoading?: boolean;
}

function getCurrentTier(streak: number) {
  // Find the highest tier the user has reached
  let currentTier = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.days) {
      currentTier = tier;
    }
  }
  return currentTier;
}

function getNextTier(streak: number) {
  for (const tier of STREAK_TIERS) {
    if (streak < tier.days) {
      return tier;
    }
  }
  return null; // Already at max tier
}

function getProgressToNextTier(streak: number) {
  const nextTier = getNextTier(streak);
  if (!nextTier) return 100; // Max tier reached
  
  const currentTier = getCurrentTier(streak);
  const prevDays = currentTier?.days || 0;
  const progress = ((streak - prevDays) / (nextTier.days - prevDays)) * 100;
  return Math.min(progress, 100);
}

export function StreakRewardsCard({ data, isLoading }: StreakRewardsCardProps) {
  if (isLoading) {
    return <StreakRewardsCardSkeleton />;
  }

  if (!data) {
    return <StreakRewardsCardEmpty />;
  }

  const { 
    currentStreak, 
    discountEarned, 
    streakStatus,
    daysUntilReorderWindow,
    daysUntilDeadline,
  } = data;

  const currentTier = getCurrentTier(currentStreak);
  const nextTier = getNextTier(currentStreak);
  const progress = getProgressToNextTier(currentStreak);
  
  const isInReorderWindow = streakStatus === 'ready' || streakStatus === 'warning' || streakStatus === 'grace';
  const isUrgent = streakStatus === 'warning' || streakStatus === 'grace';

  return (
    <Card className={cn(
      "bg-white border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all overflow-hidden",
      isUrgent && "border-amber-300 bg-gradient-to-br from-amber-50/50 to-white"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#1B4332] flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Streak Rewards
          </CardTitle>
          {discountEarned > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              {discountEarned}% OFF
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Current Streak Display */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
            <Flame className={cn(
              "h-7 w-7",
              currentStreak > 0 ? "text-orange-500" : "text-gray-300"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1B4332]">
                {currentStreak}
              </span>
              <span className="text-sm text-[#52796F]">
                day{currentStreak !== 1 ? 's' : ''}
              </span>
              {currentTier && (
                <span className="text-lg ml-1">{currentTier.badge}</span>
              )}
            </div>
            {currentTier ? (
              <p className="text-sm text-[#52796F]">
                {currentTier.label} · {currentTier.discount}% discount earned
              </p>
            ) : (
              <p className="text-sm text-[#52796F]">
                {7 - currentStreak} more days to unlock 5% off
              </p>
            )}
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#52796F]">Next: {nextTier.badge} {nextTier.label}</span>
              <span className="text-[#1B4332] font-medium">{nextTier.discount}% off</span>
            </div>
            <Progress value={progress} className="h-2 bg-[#1B4332]/10" />
            <p className="text-xs text-[#52796F]">
              {nextTier.days - currentStreak} more days to unlock
            </p>
          </div>
        )}

        {/* Tier Preview */}
        <div className="flex items-center justify-between py-2 px-3 bg-[#1B4332]/5 rounded-lg">
          <div className="flex items-center gap-1.5">
            {STREAK_TIERS.map((tier) => (
              <div
                key={tier.days}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  currentStreak >= tier.days
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
                title={`${tier.days} days: ${tier.discount}% off`}
              >
                {tier.badge}
              </div>
            ))}
          </div>
          <span className="text-xs text-[#52796F]">Max: 20%</span>
        </div>

        {/* Reorder Window Status */}
        {isInReorderWindow ? (
          <div className={cn(
            "p-3 rounded-lg",
            isUrgent ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"
          )}>
            <div className="flex items-start gap-2">
              {isUrgent ? (
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Gift className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  isUrgent ? "text-amber-800" : "text-green-800"
                )}>
                  {isUrgent 
                    ? `Reorder soon! ${daysUntilDeadline} days left`
                    : "Your discount is ready!"
                  }
                </p>
                <p className={cn(
                  "text-xs mt-0.5",
                  isUrgent ? "text-amber-600" : "text-green-600"
                )}>
                  {isUrgent
                    ? "Order before deadline to keep your streak"
                    : `Save ${discountEarned}% on your next order`
                  }
                </p>
              </div>
            </div>
            <Link href="/dashboard/orders">
              <Button 
                size="sm" 
                className={cn(
                  "w-full mt-3",
                  isUrgent 
                    ? "bg-amber-500 hover:bg-amber-600" 
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Reorder Now – Save {discountEarned}%
              </Button>
            </Link>
          </div>
        ) : daysUntilReorderWindow !== null && daysUntilReorderWindow > 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#52796F] py-2">
            <Clock className="h-4 w-4" />
            <span>Reorder window opens in {daysUntilReorderWindow} days</span>
          </div>
        ) : null}

        {/* Lapsed State */}
        {streakStatus === 'lapsed' && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600">
              Your streak has reset. Order now to start building again!
            </p>
            <Link href="/dashboard/orders">
              <Button size="sm" variant="outline" className="w-full mt-2">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Restart Your Streak
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StreakRewardsCardSkeleton() {
  return (
    <Card className="bg-white border-[#1B4332]/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StreakRewardsCardEmpty() {
  return (
    <Card className="bg-white border-[#1B4332]/10 border-dashed">
      <CardContent className="py-8 text-center">
        <Trophy className="h-10 w-10 text-amber-300 mx-auto mb-3" />
        <p className="text-[#1B4332] font-medium">
          Start Your Streak
        </p>
        <p className="text-[#52796F]/70 text-sm mt-1 max-w-[200px] mx-auto">
          Take your supplements daily to earn discounts on future orders
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#52796F]">
          <span>7 days</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-green-600 font-medium">5% off</span>
        </div>
      </CardContent>
    </Card>
  );
}
