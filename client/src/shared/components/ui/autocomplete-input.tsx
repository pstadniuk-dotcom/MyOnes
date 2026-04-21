import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { Input } from '@/shared/components/ui/input';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  /** Full vocabulary to suggest from */
  options: string[];
  placeholder?: string;
  id?: string;
  testId?: string;
  /** Max suggestions to show in dropdown */
  maxSuggestions?: number;
  /** Min characters before suggestions appear */
  minChars?: number;
  /** Disable freeform values not in options? Defaults to false. */
  strict?: boolean;
}

/**
 * Lightweight typeahead input for tag-style fields (medications, supplements, etc).
 *
 * - Filters `options` against the current `value` (case-insensitive substring match).
 * - Pressing Enter on a highlighted suggestion calls `onSelect` with that suggestion.
 * - Pressing Enter with no highlight calls `onSelect` with the typed value
 *   (unless `strict` is true and value is not in options).
 * - Arrow keys navigate suggestions; Escape closes them.
 *
 * No external deps (no cmdk, no popover library).
 */
export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  id,
  testId,
  maxSuggestions = 8,
  minChars = 1,
  strict = false,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < minChars) return [];
    // Prioritise prefix matches, then substring matches
    const prefix: string[] = [];
    const substring: string[] = [];
    for (const opt of options) {
      const lower = opt.toLowerCase();
      if (lower === q) continue; // skip exact match (already typed)
      if (lower.startsWith(q)) prefix.push(opt);
      else if (lower.includes(q)) substring.push(opt);
      if (prefix.length + substring.length >= maxSuggestions * 2) break;
    }
    return [...prefix, ...substring].slice(0, maxSuggestions);
  }, [value, options, maxSuggestions, minChars]);

  // Reset highlight when suggestions change
  useEffect(() => { setHighlight(0); }, [suggestions.length]);

  // Click outside to close
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function commit(val: string) {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (strict && !options.some(o => o.toLowerCase() === trimmed.toLowerCase())) return;
    onSelect(trimmed);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestions[highlight]) {
        commit(suggestions[highlight]);
      } else {
        commit(value);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Tab' && open && suggestions[highlight]) {
      // Tab autocompletes (does NOT submit) — just fills the input with the suggestion
      e.preventDefault();
      onChange(suggestions[highlight]);
    }
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        data-testid={testId}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-64 overflow-auto"
          role="listbox"
        >
          {suggestions.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                idx === highlight ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
