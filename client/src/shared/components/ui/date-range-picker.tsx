import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { differenceInCalendarDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  className?: string;
  fromYear?: number;
  toYear?: number;
  requireConfirm?: boolean;
  confirmLabel?: string;
}

const presets = [
  { label: 'Today', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

export function DateRangePicker({ 
  value, 
  onChange, 
  className,
  fromYear = 2020,
  toYear = new Date().getFullYear(),
  requireConfirm = false,
  confirmLabel = 'Confirm',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [fromMonth, setFromMonth] = React.useState<Date>(value.from);
  const [toMonth, setToMonth] = React.useState<Date>(value.to);
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  React.useEffect(() => {
    setFromMonth(value.from);
    setToMonth(value.to);
    setDraftRange({ from: value.from, to: value.to });
  }, [value.from, value.to]);

  React.useEffect(() => {
    if (open) {
      setDraftRange({ from: value.from, to: value.to });
    }
  }, [open, value.from, value.to]);

  const handleFromMonthChange = (month: Date) => {
    setFromMonth(month);
    if (month >= toMonth) {
      setToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    }
  };

  const handleToMonthChange = (month: Date) => {
    setToMonth(month);
    if (month <= fromMonth) {
      setFromMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    }
  };

  const normalizeAndCommitRange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return;

    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);

    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);

    onChange({ from, to });
    setOpen(false);
  };

  const handlePreset = (preset: typeof presets[number]) => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, preset.days - 1));
    onChange({ from, to });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (requireConfirm) {
      setDraftRange(range);
      return;
    }

    normalizeAndCommitRange(range);
  };

  const selectedRange = requireConfirm ? draftRange : { from: value.from, to: value.to };
  const canConfirm = Boolean(draftRange?.from && draftRange?.to);

  const selectedDays = Math.max(1, differenceInCalendarDays(value.to, value.from) + 1);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {presets.map((preset) => {
        const isActive = selectedDays === preset.days;
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

      <Select 
        value={value.from.getMonth() === 0 && value.from.getDate() === 1 ? value.from.getFullYear().toString() : undefined}
        onValueChange={(yearStr) => {
          const year = parseInt(yearStr, 10);
          const to = endOfDay(new Date());
          const from = startOfDay(new Date(year, 0, 1));
          onChange({ from, to });
        }}
      >
        <SelectTrigger 
          className={cn(
            'h-7 w-[80px] text-xs px-2.5', 
            (value.from.getMonth() === 0 && value.from.getDate() === 1) ? 'bg-[#054700] text-primary-foreground hover:bg-[#054700]/90 border-transparent' : ''
          )}
        >
          <SelectValue placeholder="YTD" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: new Date().getFullYear() - fromYear + 1 }, (_, i) => new Date().getFullYear() - i).map((year) => (
            <SelectItem key={year} value={year.toString()} className="text-xs">
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
            <CalendarIcon className="h-3 w-3" />
            {format(value.from, 'MMM d')} - {format(value.to, 'MMM d, yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex divide-x">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              month={fromMonth}
              onMonthChange={handleFromMonthChange}
              disabled={{ after: new Date() }}
              captionLayout="dropdown-buttons"
              fromYear={fromYear}
              toYear={toYear}
            />
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              month={toMonth}
              onMonthChange={handleToMonthChange}
              disabled={{ after: new Date() }}
              captionLayout="dropdown-buttons"
              fromYear={fromYear}
              toYear={toYear}
            />
          </div>
          {requireConfirm && (
            <div className="flex items-center justify-end border-t px-3 py-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setDraftRange({ from: value.from, to: value.to });
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!canConfirm}
                  onClick={() => normalizeAndCommitRange(draftRange)}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
