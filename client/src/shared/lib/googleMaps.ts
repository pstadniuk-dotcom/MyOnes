type GoogleMapsLoaderOptions = {
  apiKey: string;
  libraries?: string[];
};

declare global {
  interface Window {
    google?: unknown;
    __googleMapsScriptLoadingPromise?: Promise<void>;
  }
}

export function loadGoogleMapsScript({ apiKey, libraries = [] }: GoogleMapsLoaderOptions): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const googleAny = (window as any).google;
  if (googleAny?.maps) return Promise.resolve();

  if (window.__googleMapsScriptLoadingPromise) return window.__googleMapsScriptLoadingPromise;

  window.__googleMapsScriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    const libs = libraries.length > 0 ? `&libraries=${encodeURIComponent(libraries.join(','))}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${libs}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return window.__googleMapsScriptLoadingPromise;
}

