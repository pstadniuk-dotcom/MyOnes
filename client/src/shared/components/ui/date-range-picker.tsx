import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  className?: string;
}

const presets = [
  { label: 'Today', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'YTD', days: 0 },
] as const;

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePreset = (preset: typeof presets[number]) => {
    const to = new Date();
    let from: Date;
    if (preset.days === 0) {
      from = startOfYear(to);
    } else {
      from = subDays(to, preset.days - 1);
    }
    onChange({ from, to });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  };

  const daysDiff = Math.ceil((value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {presets.map((preset) => {
        const isActive = preset.days > 0
          ? daysDiff === preset.days - 1 || daysDiff === preset.days
          : value.from.getTime() === startOfYear(new Date()).getTime();
        return (
          <Button
            key={preset.label}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn('h-7 px-2.5 text-xs', isActive && 'bg-[#054700] hover:bg-[#054700]/90')}
            onClick={() => handlePreset(preset)}
          >
            {preset.label}
          </Button>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
            <CalendarIcon className="h-3 w-3" />
            {format(value.from, 'MMM d')} - {format(value.to, 'MMM d, yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
