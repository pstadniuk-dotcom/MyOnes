/**
 * FormulaReviewBanner
 *
 * Displays an amber banner when the server detects formula drift (driftScore >= 40).
 * Shows the drift reasons and a "Review Now" CTA to the AI chat.
 * Includes an inline toggle for the auto-optimize preference.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import { Button } from '@/shared/components/ui/button';
import { apiRequest } from '@/shared/lib/queryClient';
import { useLocation } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewStatus {
    needsReview: boolean;
    autoOptimizeEnabled: boolean;
    reasons: string[];
    driftScore: number;
    formulaAgeDays: number | null;
    newLabSinceFormula: boolean;
    wearableDrift: {
        hrv: 'declining' | 'stable' | 'improving' | null;
        sleep: 'declining' | 'stable' | 'improving' | null;
        steps: 'declining' | 'stable' | 'improving' | null;
    };
    lastChecked: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FormulaReviewBanner() {
    const queryClient = useQueryClient();
    const [, navigate] = useLocation();

    // Fetch review status
    const { data: status, isLoading, error } = useQuery<ReviewStatus>({
        queryKey: ['/api/formulas/review-status'],
        queryFn: () => apiRequest('GET', '/api/formulas/review-status').then((r: Response) => r.json()),
        staleTime: 5 * 60 * 1000,   // 5 minutes
    });

    // Toggle auto-optimize
    const toggleMutation = useMutation({
        mutationFn: (enabled: boolean) =>
            apiRequest('PATCH', '/api/users/me/auto-optimize', { enabled }).then((r: Response) => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/formulas/review-status'] });
        },
    });

    const handleReviewNow = () => {
        navigate('/dashboard/chat?context=formula-review');
    };

    // Don't render if loading, error, or no review needed
    if (isLoading || error || !status) return null;
    if (!status.needsReview) return null;

    const urgentColor = status.driftScore >= 70
        ? 'border-red-300 bg-red-50'
        : 'border-amber-300 bg-amber-50';
    const iconColor = status.driftScore >= 70 ? 'text-red-500' : 'text-amber-500';
    const badgeColor = status.driftScore >= 70
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

    return (
        <div className={`rounded-xl border p-4 mb-4 ${urgentColor}`}>
            {/* Header row */}
            <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">
                            Formula review recommended
                        </h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                            Drift score: {status.driftScore}
                        </span>
                    </div>

                    {/* Reasons list */}
                    {status.reasons.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                            {status.reasons.map((r, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                                    {r}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* CTA button */}
                <Button
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={handleReviewNow}
                >
                    Review now
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Auto-optimize toggle row */}
            <div className="mt-3 pt-3 border-t border-current border-opacity-20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <div>
                        <p className="text-xs font-medium text-gray-800">Auto-optimize</p>
                        <p className="text-xs text-gray-500 leading-tight">
                            {status.autoOptimizeEnabled
                                ? 'Formula updates automatically when new data is detected'
                                : 'You\'ll be notified when a review is recommended'}
                        </p>
                    </div>
                </div>

                {toggleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                    <Switch
                        checked={status.autoOptimizeEnabled}
                        onCheckedChange={(enabled) => toggleMutation.mutate(enabled)}
                    />
                )}
            </div>
        </div>
    );
}
