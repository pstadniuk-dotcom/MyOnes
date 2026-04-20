/**
 * CollectJSCheckout — Inline payment form using EasyPayDirect Collect.js
 *
 * Collect.js loads from the EPD gateway and renders secure card fields
 * inside iframes (PCI-compliant). When the user submits, it tokenizes
 * the card and returns a one-time `payment_token` that we send to our
 * backend for processing.
 *
 * Usage:
 *   <CollectJSCheckout onToken={(token) => handleCheckout(token)} loading={isSubmitting} />
 */

import { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Loader2, CreditCard, Lock } from 'lucide-react';

declare global {
  interface Window {
    CollectJS?: {
      configure: (config: any) => void;
      startPaymentRequest: () => void;
    };
  }
}

interface CollectJSCheckoutProps {
  onToken: (token: string) => void;
  loading?: boolean;
  disabled?: boolean;
  buttonText?: string;
  totalAmount?: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  onShippingChange?: (address: CollectJSCheckoutProps['shippingAddress']) => void;
  showShipping?: boolean;
}

const TOKENIZATION_KEY = import.meta.env.VITE_EPD_TOKENIZATION_KEY;
// const COLLECTJS_URL = 'https://secure.easypaydirectgateway.com/collect/v1/collectjs.js';
const COLLECTJS_URL = `https://secure.easypaydirectgateway.com/token/Collect.js`;

export default function CollectJSCheckout({
  onToken,
  loading = false,
  disabled = false,
  buttonText = 'Pay Now',
  totalAmount,
  shippingAddress,
  onShippingChange,
  showShipping = true,
}: CollectJSCheckoutProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const configuredRef = useRef(false);
  const callbackRef = useRef(onToken);

  // Keep callback ref current
  callbackRef.current = onToken;

  // Load Collect.js script
  useEffect(() => {
    if (!TOKENIZATION_KEY) {
      setScriptError('Payment system not configured. Please contact support.');
      return;
    }

    // Check if already loaded
    if (window.CollectJS) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existing = document.querySelector(`script[src*="collectjs.js"]`);
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      existing.addEventListener('error', () => setScriptError('Failed to load payment form'));
      return;
    }

    const script = document.createElement('script');
    script.src = COLLECTJS_URL;
    script.setAttribute('data-tokenization-key', TOKENIZATION_KEY);
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError('Failed to load payment form. Please refresh and try again.');
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount — Collect.js doesn't like being reloaded
    };
  }, []);

  // Configure Collect.js once loaded
  useEffect(() => {
    if (!scriptLoaded || !window.CollectJS || configuredRef.current) return;
    configuredRef.current = true;

    window.CollectJS.configure({
      variant: 'inline',
      styleSniffer: true,
      fields: {
        ccnumber: {
          selector: '#epd-ccnumber',
          title: 'Card Number',
          placeholder: '•••• •••• •••• ••••',
        },
        ccexp: {
          selector: '#epd-ccexp',
          title: 'Expiration',
          placeholder: 'MM / YY',
        },
        cvv: {
          selector: '#epd-cvv',
          title: 'CVV',
          placeholder: '•••',
        },
      },
      fieldsAvailableCallback: () => {
        setFieldsReady(true);
      },
      validationCallback: (_field: string, valid: boolean, message: string) => {
        if (!valid) {
          setValidationError(message || 'Please check your card details');
        } else {
          setValidationError(null);
        }
      },
      timeoutDuration: 10000,
      timeoutCallback: () => {
        setValidationError('Payment form timed out. Please refresh and try again.');
      },
      callback: (response: any) => {
        if (response.token) {
          setValidationError(null);
          callbackRef.current(response.token);
        } else {
          setValidationError('Failed to process card. Please try again.');
        }
      },
    });
  }, [scriptLoaded]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!window.CollectJS || loading || disabled) return;
      setValidationError(null);
      window.CollectJS.startPaymentRequest();
    },
    [loading, disabled],
  );

  if (scriptError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">{scriptError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping address */}
      {showShipping && onShippingChange && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Shipping Address
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ship-first">First Name</Label>
                <Input
                  id="ship-first"
                  value={shippingAddress?.firstName || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onShippingChange({ ...shippingAddress!, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="ship-last">Last Name</Label>
                <Input
                  id="ship-last"
                  value={shippingAddress?.lastName || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onShippingChange({ ...shippingAddress!, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ship-line1">Street Address</Label>
              <Input
                id="ship-line1"
                value={shippingAddress?.line1 || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onShippingChange({ ...shippingAddress!, line1: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="ship-line2">Apt / Suite (optional)</Label>
              <Input
                id="ship-line2"
                value={shippingAddress?.line2 || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onShippingChange({ ...shippingAddress!, line2: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="ship-city">City</Label>
                <Input
                  id="ship-city"
                  value={shippingAddress?.city || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onShippingChange({ ...shippingAddress!, city: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="ship-state">State</Label>
                <Input
                  id="ship-state"
                  value={shippingAddress?.state || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onShippingChange({ ...shippingAddress!, state: e.target.value })
                  }
                  maxLength={2}
                  placeholder="CA"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ship-zip">ZIP</Label>
                <Input
                  id="ship-zip"
                  value={shippingAddress?.zip || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onShippingChange({ ...shippingAddress!, zip: e.target.value })
                  }
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment fields */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Payment Details
          </div>

          {!fieldsReady && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading secure payment form...
            </div>
          )}

          <div className={fieldsReady ? '' : 'opacity-0 h-0 overflow-hidden'}>
            <div className="space-y-3">
              <div>
                <Label>Card Number</Label>
                <div
                  id="epd-ccnumber"
                  className="h-10 border rounded-md px-3 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiration</Label>
                  <div
                    id="epd-ccexp"
                    className="h-10 border rounded-md px-3 bg-background"
                  />
                </div>
                <div>
                  <Label>CVV</Label>
                  <div
                    id="epd-cvv"
                    className="h-10 border rounded-md px-3 bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {validationError && (
            <p className="text-sm text-red-600">{validationError}</p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-12 text-base"
        disabled={!fieldsReady || loading || disabled}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {totalAmount ? `${buttonText} — $${totalAmount}` : buttonText}
          </span>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your card details are securely processed. We never store your full card number.
      </p>
    </form>
  );
}
