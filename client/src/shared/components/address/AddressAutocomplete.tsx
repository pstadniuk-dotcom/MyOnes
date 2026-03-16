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
  const components: Array<{ long_name: string; short_name: string; types: string[] }> = place?.address_components ?? [];

  const findShort = (type: string) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.short_name ?? '';
  const findLong = (type: string) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.long_name ?? '';

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
    typeof place?.formatted_address === 'string' ? place.formatted_address.split(',')[0]?.trim() : '';

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
  const placesServiceRef = useRef<any>(null);
  const autoCompleteServiceRef = useRef<any>(null);

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

        autoCompleteServiceRef.current = new googleAny.maps.places.AutocompleteService();
        placesServiceRef.current = new googleAny.maps.places.PlacesService(document.createElement('div'));
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
    if (!autoCompleteServiceRef.current) return;

    const q = query.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }

    const handle = setTimeout(() => {
      const service = autoCompleteServiceRef.current;
      const request: any = { input: q, types: ['address'] };
      if (countryRestriction) request.componentRestrictions = { country: countryRestriction };

      service.getPlacePredictions(request, (results: any, status: any) => {
        const googleAny = (window as any).google;
        const ok = status === googleAny?.maps?.places?.PlacesServiceStatus?.OK;
        setPredictions(ok && Array.isArray(results) ? results : []);
      });
    }, 250);

    return () => clearTimeout(handle);
  }, [enabled, query, countryRestriction]);

  const selectPrediction = (prediction: Prediction) => {
    const service = placesServiceRef.current;
    if (!service) return;

    setIsLoading(true);
    setError(null);

    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address'],
      },
      (place: any, status: any) => {
        const googleAny = (window as any).google;
        const ok = status === googleAny?.maps?.places?.PlacesServiceStatus?.OK;
        if (!ok || !place) {
          setError('Could not load that address. Please try another.');
          setIsLoading(false);
          return;
        }

        const parsed = parseAddressFromPlace(place);
        props.onSelectAddress(parsed);
        setQuery(typeof place.formatted_address === 'string' ? place.formatted_address : prediction.description);
        setPredictions([]);
        setIsOpen(false);
        setIsLoading(false);
      }
    );
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
