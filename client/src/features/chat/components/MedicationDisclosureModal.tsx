import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { X, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';

interface MedicationDisclosureModalProps {
  open: boolean;
}

/**
 * Blocking modal — no close button.
 * User must disclose medications (or confirm none) before accessing the consultation.
 * The response is saved permanently as a HIPAA consent record.
 */
export default function MedicationDisclosureModal({ open }: MedicationDisclosureModalProps) {
  const [medications, setMedications] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [noMedications, setNoMedications] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canSubmit = noMedications || medications.length > 0;

  const addMedication = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications(prev => [...prev, trimmed]);
      setNoMedications(false);
    }
    setInputValue('');
  };

  const removeMedication = (med: string) => {
    setMedications(prev => prev.filter(m => m !== med));
  };

  const handleNoMedicationsChange = (checked: boolean) => {
    setNoMedications(checked);
    if (checked) {
      setMedications([]);
      setInputValue('');
    }
  };

  const disclosureMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/users/me/health-profile/medication-disclosure', {
        medications: noMedications ? [] : medications,
        noMedications,
      });
      if (!response.ok) throw new Error('Failed to save disclosure');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/health-profile'] });
      toast({
        title: 'Disclosure saved',
        description: 'Your medication information has been securely recorded.',
      });
    },
    onError: () => {
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} modal>
      {/* No DialogTrigger — controlled externally. No close button. */}
      <DialogContent
        className="max-w-lg"
        // Prevent closing via Escape key or outside click
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        // Hide the default shadcn X close button
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-[#054700]" />
            <DialogTitle className="text-[#054700]">Medication Safety Check</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 leading-relaxed">
            Before we build your formula, we need to know if you take any prescription medications.
            Many supplements interact with common drugs — this information is stored securely and used
            to keep your formula safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Medication input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              List any prescription medications you currently take
            </Label>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. Warfarin, Metformin, Synthroid…"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setNoMedications(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMedication(); } }}
                disabled={noMedications}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                disabled={!inputValue.trim() || noMedications}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {medications.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {medications.map(med => (
                  <Badge key={med} variant="secondary" className="gap-1 pr-1">
                    {med}
                    <button
                      type="button"
                      onClick={() => removeMedication(med)}
                      className="ml-1 rounded-full hover:bg-gray-300 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="flex-1 border-t" />
            <span>or</span>
            <div className="flex-1 border-t" />
          </div>

          {/* No medications checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
            <Checkbox
              id="no-medications"
              checked={noMedications}
              onCheckedChange={handleNoMedicationsChange}
              className="mt-0.5"
            />
            <Label htmlFor="no-medications" className="text-sm leading-snug cursor-pointer">
              I confirm I do not currently take any prescription medications, blood thinners, immunosuppressants,
              chemotherapy agents, or other high-risk drugs.
            </Label>
          </div>

          {/* Legal notice */}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Your response is recorded with a timestamp as part of your health record. If you start a new
              medication in the future, please update your profile. ONES AI uses this information to flag
              potential supplement–drug interactions in your formula.
            </p>
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-[#054700] hover:bg-[#054700]/90 text-white"
            disabled={!canSubmit || disclosureMutation.isPending}
            onClick={() => disclosureMutation.mutate()}
          >
            {disclosureMutation.isPending ? 'Saving…' : 'Save & Continue to Consultation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
