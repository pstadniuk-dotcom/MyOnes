import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Calendar, FileQuestion, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';

/**
 * Modal that lets a user confirm or correct the AI-extracted collection
 * date for a lab report. The PDF is rendered inline on the left (via the
 * existing /api/files/:id/preview endpoint), decision panel on the right.
 *
 * On-brand palette: forest green #054700 primary, olive #5a6623 accent,
 * cream #ede8e2 surface.
 */

interface Props {
    open: boolean;
    onClose: () => void;
    report: {
        id: string;
        fileName: string;
        mimeType: string;
        testDate: string | null;
        testDateSource?: string | null;
        testDateConfidence?: 'high' | 'medium' | 'low' | 'none' | null;
    };
}

function fmtLongDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return iso;
    }
}

function sourceLabel(source?: string | null): string {
    if (!source) return 'unknown source';
    const s = source.toLowerCase();
    if (s.includes('filename')) return 'from filename';
    if (s.includes('upload')) return 'from upload date';
    if (s.includes('user') || s.includes('verified')) return 'verified by you';
    if (s.includes('not found')) return 'not found';
    if (s.includes('collection') || s.includes('specimen') || s.includes('drawn')) return 'from report';
    if (s.includes('rescue')) return 'from report (rescue)';
    return 'from report';
}

export function VerifyLabDateModal({ open, onClose, report }: Props) {
    const { toast } = useToast();
    const [mode, setMode] = useState<'confirm' | 'pick'>('confirm');
    const [pickValue, setPickValue] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Reset state whenever modal opens for a different report
    useEffect(() => {
        if (open) {
            setMode('confirm');
            setPickValue(report.testDate || '');
            setSaving(false);
        }
    }, [open, report.id, report.testDate]);

    const previewUrl = useMemo(
        () => buildApiUrl(`/api/files/${report.id}/preview`),
        [report.id]
    );

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const dateLooksValid = /^\d{4}-\d{2}-\d{2}$/.test(pickValue) && pickValue <= todayIso;

    async function saveDate(dateIso: string) {
        setSaving(true);
        try {
            await apiRequest('PATCH', `/api/files/${report.id}/verify-date`, {
                testDate: dateIso,
            });
            await queryClient.invalidateQueries({ queryKey: ['/api/labs/dashboard'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/files'] });
            toast({
                title: 'Date verified',
                description: `Collection date set to ${fmtLongDate(dateIso)}.`,
            });
            onClose();
        } catch (err: any) {
            toast({
                title: 'Could not save date',
                description: err?.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }

    const isPdf = report.mimeType === 'application/pdf';
    const isImage = report.mimeType?.startsWith('image/');

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-5xl w-[95vw] max-h-[88vh] p-0 bg-[#fdfbf7] border border-[#054700]/10 rounded-2xl overflow-hidden">
                <DialogTitle className="sr-only">
                    Verify collection date for {report.fileName}
                </DialogTitle>

                {/* Header */}
                <div className="px-6 py-4 border-b border-[#054700]/10 flex items-start justify-between bg-[#fdfbf7]">
                    <div className="min-w-0">
                        <h2 className="font-semibold text-base text-[#054700] flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Verify collection date
                        </h2>
                        <p className="text-xs text-[#5a6623] mt-0.5 truncate max-w-[60ch]" title={report.fileName}>
                            {report.fileName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[#5a6623] hover:bg-[#ede8e2] transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Split pane */}
                <div className="grid md:grid-cols-[1.4fr_1fr] grid-cols-1 min-h-[520px] max-h-[calc(88vh-64px)]">
                    {/* Preview */}
                    <div className="bg-[#ede8e2]/40 md:border-r border-b md:border-b-0 border-[#054700]/10 p-4 overflow-hidden flex flex-col">
                        <div className="flex-1 rounded-lg border border-[#054700]/10 bg-white overflow-hidden shadow-sm">
                            {isPdf ? (
                                <iframe
                                    src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                                    className="w-full h-full min-h-[440px]"
                                    title={`Preview of ${report.fileName}`}
                                />
                            ) : isImage ? (
                                <img
                                    src={previewUrl}
                                    alt={report.fileName}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full p-8 text-center text-[#5a6623] text-sm">
                                    <FileQuestion className="h-8 w-8 mr-2" />
                                    Preview not available for this file type.
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-[#5a6623] mt-2 text-center">
                            💡 Look for <span className="font-medium">"Collection Date"</span> or{' '}
                            <span className="font-medium">"Specimen Collected"</span> near the top.
                        </p>
                    </div>

                    {/* Decision panel */}
                    <div className="px-6 py-6 flex flex-col gap-5 bg-[#fdfbf7] overflow-y-auto">
                        {mode === 'confirm' ? (
                            <>
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest text-[#5a6623] font-medium">
                                        Our best guess
                                    </p>
                                    <p className="font-semibold text-3xl text-[#054700] mt-1 leading-tight">
                                        {report.testDate ? fmtLongDate(report.testDate) : 'Unknown'}
                                    </p>
                                    <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-900 border border-amber-200">
                                        {sourceLabel(report.testDateSource)}
                                    </span>
                                </div>

                                <div className="h-px bg-[#054700]/10" />

                                <p className="text-[#054700] font-medium">Is that right?</p>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        disabled={!report.testDate || saving}
                                        onClick={() => report.testDate && saveDate(report.testDate)}
                                        className="bg-[#054700] hover:bg-[#054700]/90 text-white h-11 text-sm font-medium justify-start px-4"
                                    >
                                        {saving ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        Looks right
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={saving}
                                        onClick={() => setMode('pick')}
                                        className="border-[#054700] text-[#054700] hover:bg-[#ede8e2] h-11 text-sm font-medium justify-start px-4"
                                    >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Pick a different date
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={saving}
                                        onClick={onClose}
                                        className="text-[#5a6623] hover:bg-[#ede8e2] h-11 text-sm justify-start px-4"
                                    >
                                        <FileQuestion className="h-4 w-4 mr-2" />
                                        I can't tell from the report
                                    </Button>
                                </div>

                                <p className="text-xs text-[#5a6623] mt-auto leading-relaxed">
                                    Once confirmed, this date is locked and we'll never overwrite it during re-analysis.
                                </p>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest text-[#5a6623] font-medium">
                                        Enter the collection date
                                    </p>
                                    <p className="text-sm text-[#054700]/80 mt-1">
                                        Use the date the blood was drawn, not the report or print date.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#5a6623] uppercase tracking-wide font-medium">
                                        Collection date
                                    </label>
                                    <input
                                        type="date"
                                        max={todayIso}
                                        value={pickValue}
                                        onChange={(e) => setPickValue(e.target.value)}
                                        className="h-11 px-3 rounded-lg border border-[#5a6623]/30 bg-white text-[#054700] text-base focus:outline-none focus:ring-2 focus:ring-[#054700]/20 focus:border-[#054700]"
                                        autoFocus
                                    />
                                    {pickValue && !dateLooksValid && (
                                        <p className="text-xs text-red-600">
                                            Date must be today or earlier.
                                        </p>
                                    )}
                                    {dateLooksValid && (
                                        <p className="text-xs text-[#5a6623]">
                                            Will save as <span className="font-medium text-[#054700]">{fmtLongDate(pickValue)}</span>.
                                        </p>
                                    )}
                                </div>

                                <div className="h-px bg-[#054700]/10" />

                                <div className="flex flex-col gap-2">
                                    <Button
                                        disabled={!dateLooksValid || saving}
                                        onClick={() => saveDate(pickValue)}
                                        className="bg-[#054700] hover:bg-[#054700]/90 text-white h-11 text-sm font-medium"
                                    >
                                        {saving ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        Save date
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={saving}
                                        onClick={() => setMode('confirm')}
                                        className="text-[#5a6623] hover:bg-[#ede8e2] h-11 text-sm"
                                    >
                                        Back
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Source chip (used inline in report rows & elsewhere) ───────────────

export interface DateSourceChipProps {
    source?: string | null;
    confidence?: 'high' | 'medium' | 'low' | 'none' | null;
    verifiedAt?: string | null;
    onClick?: () => void;
    className?: string;
}

export function DateSourceChip({
    source,
    confidence,
    verifiedAt,
    onClick,
    className = '',
}: DateSourceChipProps) {
    const isVerified = Boolean(verifiedAt);
    const isFilenameFallback = (source || '').toLowerCase().includes('filename');
    const isUploadFallback = (source || '').toLowerCase().includes('upload');
    const isLowConfidence = confidence === 'low' || confidence === 'none';
    const needsAttention = !isVerified && (isUploadFallback || isLowConfidence);

    const style = isVerified
        ? 'bg-[#5a6623]/15 text-[#5a6623] border-[#5a6623]/30'
        : needsAttention
            ? 'bg-orange-50 text-orange-800 border-orange-200 animate-[pulse_2.8s_ease-in-out_infinite]'
            : isFilenameFallback
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-[#054700]/10 text-[#054700] border-[#054700]/20';

    const label = isVerified
        ? 'verified ✓'
        : needsAttention
            ? 'verify date'
            : isFilenameFallback
                ? 'from filename'
                : 'from report';

    const clickable = Boolean(onClick);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${style} ${clickable ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'} ${className}`}
            title={
                isVerified
                    ? 'You verified this date'
                    : needsAttention
                        ? 'Click to verify the collection date'
                        : `Source: ${source || 'report'}`
            }
        >
            {label}
        </button>
    );
}
