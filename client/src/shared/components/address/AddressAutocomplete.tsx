import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { loadGoogleMapsScript } from '@/shared/lib/googleMaps';

type AddressFields = {
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type Prediction = {
  description: string;
  place_id: string;
};

type AddressAutocompleteProps = {
  id?: string;
  placeholder?: string;
  countryCode?: string;
  onSelectAddress: (fields: AddressFields) => void;
  disabled?: boolean;
  'data-testid'?: string;
};

function normalizeCountryRestriction(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  const trimmed = countryCode.trim();
  if (!/^[A-Za-z]{2}$/.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

function parseAddressFromPlace(place: any): AddressFields {
  const components: Array<{ longText: string; shortText: string; types: string[] }> = place?.addressComponents ?? [];

  const findShort = (type: string) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.shortText ?? '';
  const findLong = (type: string) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.longText ?? '';

  const streetNumber = findLong('street_number');
  const route = findLong('route');
  const addressLine1 = `${streetNumber} ${route}`.trim();

  const city =
    findLong('locality') ||
    findLong('postal_town') ||
    findLong('sublocality') ||
    findLong('administrative_area_level_2') ||
    '';

  const state = findShort('administrative_area_level_1');
  const postalCode = findLong('postal_code');
  const country = findShort('country');

  const fallbackLine1 =
    typeof place?.formattedAddress === 'string' ? place.formattedAddress.split(',')[0]?.trim() : '';

  return {
    addressLine1: addressLine1 || fallbackLine1 || undefined,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
  };
}

export function AddressAutocomplete(props: AddressAutocompleteProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const enabled = Boolean(apiKey) && !props.disabled;

  const countryRestriction = useMemo(() => normalizeCountryRestriction(props.countryCode), [props.countryCode]);

  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    loadGoogleMapsScript({ apiKey: apiKey!, libraries: ['places'] })
      .then(() => {
        if (cancelled) return;
        const googleAny = (window as any).google;
        if (!googleAny?.maps?.places) throw new Error('Google Places library is not available');
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || 'Address lookup is unavailable');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, apiKey]);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const q = query.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }

    const handle = setTimeout(() => {
      const googleAny = (window as any).google;
      if (!googleAny?.maps?.places?.AutocompleteSuggestion) return;

      const request: any = { input: q };
      if (countryRestriction) request.includedRegionCodes = [countryRestriction.toUpperCase()];

      googleAny.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        .then((response: any) => {
          if (cancelled) return;
          if (response && response.suggestions) {
            const results = response.suggestions.map((s: any) => ({
              description: s.placePrediction.text.text,
              place_id: s.placePrediction.placeId
            }));
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        })
        .catch((e: any) => {
          console.error('Autocomplete API error:', e);
          if (!cancelled) setPredictions([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [enabled, query, countryRestriction]);

  const selectPrediction = (prediction: Prediction) => {
    const googleAny = (window as any).google;
    if (!googleAny?.maps?.places?.Place) return;

    setIsLoading(true);
    setError(null);

    const place = new googleAny.maps.places.Place({ id: prediction.place_id });
    place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] })
      .then(() => {
        const parsed = parseAddressFromPlace(place);
        props.onSelectAddress(parsed);
        setQuery(typeof place.formattedAddress === 'string' ? place.formattedAddress : prediction.description);
        setPredictions([]);
        setIsOpen(false);
        setIsLoading(false);
      })
      .catch((e: any) => {
        console.error('Place Details API error:', e);
        setError('Could not load that address. Please try another.');
        setIsLoading(false);
      });
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={props.id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={enabled ? (props.placeholder ?? 'Start typing your address') : 'Address search is unavailable'}
        disabled={!enabled}
        data-testid={props['data-testid']}
      />

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {enabled && isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <ul className="max-h-64 overflow-auto py-1">
            {predictions.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPrediction(p)}
                >
                  {p.description}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {enabled && isLoading && <p className="mt-2 text-xs text-muted-foreground">Loading address suggestions…</p>}
    </div>
  );
}
