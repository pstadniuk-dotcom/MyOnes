import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface CategoryChipProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CategoryChip({ label, checked, onChange, disabled }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-[#054700]/20 focus:ring-offset-1',
        checked
          ? 'bg-[#054700] text-white shadow-sm'
          : 'bg-transparent border border-[#054700]/30 text-[#054700] hover:border-[#054700]/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {checked && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}
