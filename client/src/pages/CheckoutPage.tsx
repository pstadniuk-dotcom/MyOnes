import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import {
  apiRequest,
  getAuthHeaders,
  queryClient,
} from "@/shared/lib/queryClient";
import { buildApiUrl } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import {
  ArrowLeft,
  Lock,
  Shield,
  ShieldCheck,
  CreditCard,
  Loader2,
  Check,
  Sparkles,
  Package,
  Truck,
  Star,
  Repeat,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface FormulaQuotePayload {
  formulaId: string;
  formulaVersion: number;
  formulaName?: string;
  quote: {
    available: boolean;
    reason?: string;
    capsuleCount: number;
    totalCapsules: number;
    weeks: number;
    subtotal?: number;
    shipping?: number;
    total?: number;
    currency: "USD";
    mappedIngredients: number;
    unmappedIngredients: string[];
  };
}

interface MembershipTierPayload {
  id: string;
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number | null;
  currentCount: number;
}

interface MyMembershipPayload {
  hasMembership: boolean;
  isCancelled?: boolean;
  tier?: string;
  priceCents?: number;
}

declare global {
  interface Window {
    CollectJS?: {
      configure: (config: any) => void;
      startPaymentRequest: () => void;
    };
  }
}

// ── Constants ──────────────────────────────────────────────────────────

const TOKENIZATION_KEY = import.meta.env.VITE_EPD_TOKENIZATION_KEY;
const COLLECTJS_URL = `https://secure.easypaydirectgateway.com/token/Collect.js`;
const PAYMENT_TOKEN_TIMEOUT_MS = 30000;
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];
const VALID_CAPSULE_COUNTS = [3, 6, 9, 12, 15] as const;

// ── Component ──────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const formulaId = params.get("formulaId") || "";
  const requestedCapsuleCount = Number(params.get("capsuleCount"));
  const capsuleCount = VALID_CAPSULE_COUNTS.includes(
    requestedCapsuleCount as (typeof VALID_CAPSULE_COUNTS)[number],
  )
    ? requestedCapsuleCount
    : 9;
  const membershipParam = params.get("membership");
  const autoshipParam = params.get("autoship");

  // ── Shipping Form ──────────────────────────────────────────────────

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // ── Billing Address ────────────────────────────────────────────────

  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");

  // ── Checkout Options ───────────────────────────────────────────────

  const [includeMembership, setIncludeMembership] = useState(
    membershipParam === "1",
  );
  const [enableAutoShip, setEnableAutoShip] = useState(autoshipParam !== "0");

  // ── Collect.js State ───────────────────────────────────────────────

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const configuredRef = useRef(false);
  const tokenCallbackRef = useRef<(token: string) => void>(() => {});
  const paymentTimeoutRef = useRef<number | null>(null);

  const clearPaymentTimeout = useCallback(() => {
    if (paymentTimeoutRef.current !== null) {
      window.clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
  }, []);

  const resetPaymentSubmission = useCallback(() => {
    clearPaymentTimeout();
    setSubmitting(false);
  }, [clearPaymentTimeout]);

  // ── Pre-fill from user profile ─────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    if (user.name) {
      const parts = user.name.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    setPhone(user.phone || "");
  }, [user]);

  // Pre-fill address from user profile
  useEffect(() => {
    if (!user) return;
    apiRequest("GET", "/api/users/me/profile")
      .then((res) => res.json())
      .then((profile: any) => {
        if (profile.addressLine1) setLine1(profile.addressLine1);
        if (profile.city) setCity(profile.city);
        if (profile.state) setState(profile.state);
        if (profile.postalCode) setZip(profile.postalCode);
      })
      .catch(() => {});
  }, [user]);

  // ── Data Fetching ──────────────────────────────────────────────────

  const { data: quoteData, isLoading: loadingQuote } =
    useQuery<FormulaQuotePayload>({
      queryKey: ["/api/users/me/formula/quote", formulaId, capsuleCount],
      enabled: !!user && !!formulaId,
      queryFn: () =>
        apiRequest(
          "GET",
          `/api/users/me/formula/${formulaId}/quote?capsuleCount=${capsuleCount}`,
        ).then((res) => res.json()),
    });

  const { data: membershipTier } = useQuery<MembershipTierPayload | null>({
    queryKey: ["/api/membership/current-tier"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/membership/current-tier"), {
        method: "GET",
        headers: { ...getAuthHeaders() },
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load tier");
      return res.json();
    },
  });

  const { data: myMembership } = useQuery<MyMembershipPayload>({
    queryKey: ["/api/membership/me"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/membership/me"), {
        method: "GET",
        headers: { ...getAuthHeaders() },
        credentials: "include",
      });
      if (res.status === 404) return { hasMembership: false };
      if (!res.ok) throw new Error("Failed to load membership");
      return res.json();
    },
  });

  // ── Pricing Calculations ───────────────────────────────────────────

  const hasActiveMembership =
    !!myMembership?.hasMembership && !myMembership?.isCancelled;
  const membershipUpsellAvailable = !hasActiveMembership && !!membershipTier;
  const formulaPrice = quoteData?.quote?.available
    ? (quoteData.quote.total ?? 0)
    : 0;
  const membershipMonthlyPrice = membershipTier
    ? membershipTier.priceCents / 100
    : 0;
  const membershipSavings = formulaPrice * 0.15;
  const discountedPrice = Math.max(0, formulaPrice - membershipSavings);
  const shippingCost = quoteData?.quote?.shipping ?? 0;

  const activeMembershipPrice = myMembership?.priceCents
    ? myMembership.priceCents / 100
    : 10; // Fallback to 10 if unknown
  const displayMembershipPrice = hasActiveMembership
    ? activeMembershipPrice
    : membershipMonthlyPrice;

  const orderTotal = (() => {
    if (includeMembership && membershipUpsellAvailable) {
      return discountedPrice + membershipMonthlyPrice + shippingCost;
    }
    if (hasActiveMembership) {
      // Existing member: they get the discount but don't pay the membership fee again here
      return discountedPrice + shippingCost;
    }
    return formulaPrice + shippingCost;
  })();

  const showDiscounted =
    hasActiveMembership || (includeMembership && membershipUpsellAvailable);

  // Sync membership and autoship selection
  useEffect(() => {
    if (includeMembership && membershipUpsellAvailable) {
      setEnableAutoShip(true);
    }
  }, [includeMembership, membershipUpsellAvailable]);

  // ── Collect.js Loading ─────────────────────────────────────────────

  useEffect(() => {
    if (!TOKENIZATION_KEY) {
      setScriptError("Payment system not configured. Please contact support.");
      return;
    }

    if (window.CollectJS) {
      setScriptLoaded(true);
      return;
    }

    const scriptPrice = orderTotal > 0 ? orderTotal.toFixed(2) : "0.00";
    const existing = document.querySelector(
      `script[src*="collectjs.js"], script[src*="Collect.js"], script[src*="collect.js"]`,
    );

    if (existing) {
      const existingKey = existing.getAttribute("data-tokenization-key");
      if (existingKey === TOKENIZATION_KEY) {
        existing.setAttribute("data-price", scriptPrice);
        existing.addEventListener("load", () => setScriptLoaded(true));
        existing.addEventListener("error", () =>
          setScriptError("Failed to load payment form. Please refresh."),
        );
        return;
      } else {
        existing.remove();
        if (window.CollectJS) {
          // Remove stale Collect.js instance if script key changed.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as any).CollectJS;
        }
      }
    }

    const script = document.createElement("script");
    script.src = COLLECTJS_URL;
    script.setAttribute("data-tokenization-key", TOKENIZATION_KEY);
    script.setAttribute("data-variant", "inline");
    script.setAttribute("data-country", "US");
    script.setAttribute("data-currency", "USD");
    script.setAttribute("data-price", scriptPrice);
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () =>
      setScriptError("Failed to load payment form. Please refresh.");
    document.head.appendChild(script);
  }, [orderTotal]);

  // useEffect(() => {
  //   if (!TOKENIZATION_KEY) {
  //     setScriptError('Payment system not configured. Please contact support.');
  //     return;
  //   }

  //   if (window.CollectJS) {
  //     setScriptLoaded(true);
  //     return;
  //   }

  //   const existing = document.querySelector(`script[src*="collectjs.js"]`);
  //   if (existing) existing.remove(); // always remove and reload fresh

  //   const script = document.createElement('script');
  //   script.src = `https://secure.easypaydirectgateway.com/collect/v1/collectjs.js?tokenizationkey=${TOKENIZATION_KEY}`;
  //   script.async = true;
  //   script.onload = () => setScriptLoaded(true);
  //   script.onerror = () => setScriptError('Failed to load payment form. Please refresh.');
  //   document.head.appendChild(script);
  // }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.CollectJS || configuredRef.current) return;
    configuredRef.current = true;

    window.CollectJS.configure({
      variant: "inline",
      styleSniffer: true,
      googleFont: "Inter:400,500,600",
      price: orderTotal.toFixed(2),
      currency: "USD",
      country: "US",
      fields: {
        ccnumber: {
          selector: "#epd-ccnumber",
          title: "Card Number",
          placeholder: "•••• •••• •••• ••••",
        },
        ccexp: {
          selector: "#epd-ccexp",
          title: "Expiration",
          placeholder: "MM / YY",
        },
        cvv: {
          selector: "#epd-cvv",
          title: "CVV",
          placeholder: "•••",
        },
      },
      fieldsAvailableCallback: () => setFieldsReady(true),
      validationCallback: (_field: string, valid: boolean, message: string) => {
        setValidationError(
          valid ? null : message || "Please check your card details",
        );
      },
      timeoutDuration: PAYMENT_TOKEN_TIMEOUT_MS,
      timeoutCallback: () => {
        resetPaymentSubmission();
        setValidationError("Payment request timed out. Please try again.");
        toast({
          title: "Payment timed out",
          description:
            "We could not reach the payment gateway in time. Please try again.",
          variant: "destructive",
        });
      },
      callback: (response: any) => {
        clearPaymentTimeout();
        if (response.token) {
          setValidationError(null);
          tokenCallbackRef.current(response.token);
        } else {
          resetPaymentSubmission();
          setValidationError("Failed to process card. Please try again.");
        }
      },
    });
  }, [
    scriptLoaded,
    orderTotal,
    clearPaymentTimeout,
    resetPaymentSubmission,
    toast,
  ]);

  useEffect(() => {
    return () => {
      clearPaymentTimeout();
    };
  }, [clearPaymentTimeout]);

  // ── Checkout Mutation ──────────────────────────────────────────────

  const checkoutMutation = useMutation({
    mutationFn: async (paymentToken: string) => {
      const response = await apiRequest("POST", "/api/billing/checkout", {
        paymentToken,
        formulaId,
        includeMembership: membershipUpsellAvailable
          ? includeMembership
          : false,
        enableAutoShip,
        plan: "monthly",
        shippingAddress: {
          firstName,
          lastName,
          line1,
          line2: line2 || undefined,
          city,
          state,
          zip,
          country: "US",
        },
        billingAddress: billingSameAsShipping
          ? undefined
          : {
              firstName: billingFirstName,
              lastName: billingLastName,
              line1: billingLine1,
              line2: billingLine2 || undefined,
              city: billingCity,
              state: billingState,
              zip: billingZip,
              country: "US",
            },
      });
      return response.json() as Promise<{
        success: boolean;
        orderId?: string;
        transactionId?: string;
        membershipActivated?: boolean;
        error?: string;
      }>;
    },
    onSuccess: (data) => {
      // Invalidate queries to ensure latest data is fetched when navigating
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/billing-history"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/membership/me"] });

      resetPaymentSubmission();
      const memberParam =
        membershipUpsellAvailable && includeMembership ? "1" : "0";
      navigate(
        `/membership/success?order_id=${data.orderId || ""}&membership=${memberParam}`,
      );
    },
    onError: (error: any) => {
      resetPaymentSubmission();
      const errorCode = error?.code;
      const rawMessage = error?.message || "Please try again.";
      const parsedMessage = rawMessage.replace(/^\d+:\s*/, "");
      if (
        errorCode === "PAYMENT_DECLINED" ||
        rawMessage.includes("PAYMENT_DECLINED") ||
        rawMessage.startsWith("402:")
      ) {
        toast({
          title: "Payment Declined",
          description: parsedMessage.replace("PAYMENT_DECLINED: ", ""),
          variant: "destructive",
        });
      } else if (
        errorCode === "SAFETY_WARNINGS_NOT_ACKNOWLEDGED" ||
        rawMessage.includes("SAFETY_WARNINGS_NOT_ACKNOWLEDGED")
      ) {
        toast({
          title: "Safety Acknowledgment Required",
          description: "Please go back and acknowledge the safety warnings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unable to process payment",
          description: parsedMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Wire up the token callback
  tokenCallbackRef.current = (token: string) => {
    checkoutMutation.mutate(token);
  };

  // ── Form Submission ────────────────────────────────────────────────

  const handlePlaceOrder = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!window.CollectJS || submitting) return;
      // Validate required fields
      if (!firstName || !lastName || !line1 || !city || !state || !zip) {
        toast({
          title: "Missing information",
          description: "Please fill in all required shipping fields.",
          variant: "destructive",
        });
        return;
      }
      if (!email) {
        toast({
          title: "Missing email",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        return;
      }
      if (
        !billingSameAsShipping &&
        (!billingFirstName ||
          !billingLastName ||
          !billingLine1 ||
          !billingCity ||
          !billingState ||
          !billingZip)
      ) {
        toast({
          title: "Missing information",
          description: "Please fill in all required billing address fields.",
          variant: "destructive",
        });
        return;
      }
      setValidationError(null);
      setSubmitting(true);
      clearPaymentTimeout();
      paymentTimeoutRef.current = window.setTimeout(() => {
        setValidationError("Payment request timed out. Please try again.");
        setSubmitting(false);
      }, PAYMENT_TOKEN_TIMEOUT_MS + 5000);
      window.CollectJS.startPaymentRequest();
    },
    [
      submitting,
      firstName,
      lastName,
      line1,
      city,
      state,
      zip,
      email,
      billingSameAsShipping,
      billingFirstName,
      billingLastName,
      billingLine1,
      billingCity,
      billingState,
      billingZip,
      toast,
      clearPaymentTimeout,
    ],
  );

  // ── Redirect if no formula ─────────────────────────────────────────

  if (!formulaId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#ede8e2" }}
      >
        <div className="text-center space-y-4">
          <p className="text-lg text-[#262626]/70">No formula selected.</p>
          <Button
            onClick={() => navigate("/dashboard/formula")}
            style={{ backgroundColor: "#054700" }}
            className="text-white"
          >
            Go to My Formula
          </Button>
        </div>
      </div>
    );
  }

  const quote = quoteData?.quote;
  const formulaName = quoteData?.formulaName || "Your Custom Formula";

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#ede8e2" }}>
      {/* Header */}
      <header className="border-b border-black/5 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard/formula")}
              className="flex items-center gap-1.5 text-sm text-[#262626]/60 hover:text-[#054700] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to formula
            </button>
          </div>
          <img src="/ones-logo-light.svg" alt="Ones" className="h-7" />
          <div className="flex items-center gap-1.5 text-xs text-[#262626]/50">
            <Lock className="w-3.5 h-3.5" />
            Secure Checkout
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {loadingQuote ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#054700]" />
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">
            {/* ─── Order Summary (mobile: top, desktop: right column) ─── */}
            <aside className="lg:col-span-5 lg:order-2 mb-8 lg:mb-0">
              <div className="lg:sticky lg:top-24 space-y-6">
                <OrderSummaryCard
                  formulaName={formulaName}
                  quote={quote}
                  formulaPrice={formulaPrice}
                  discountedPrice={discountedPrice}
                  shippingCost={shippingCost}
                  membershipMonthlyPrice={membershipMonthlyPrice}
                  membershipSavings={membershipSavings}
                  membershipUpsellAvailable={membershipUpsellAvailable}
                  hasActiveMembership={hasActiveMembership}
                  includeMembership={includeMembership}
                  onToggleMembership={setIncludeMembership}
                  enableAutoShip={enableAutoShip}
                  onToggleAutoShip={setEnableAutoShip}
                  orderTotal={orderTotal}
                  showDiscounted={showDiscounted}
                  tierName={membershipTier?.name || myMembership?.tier}
                  displayMembershipPrice={displayMembershipPrice}
                />
                <CheckoutReviews />
              </div>
            </aside>

            {/* ─── Left Column: Forms ─── */}
            <section className="lg:col-span-7 lg:order-1">
              <form onSubmit={handlePlaceOrder} className="space-y-8">
                {/* Contact */}
                <FormSection title="Contact Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Email" required>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                        required
                      />
                    </FormField>
                    <FormField label="Phone">
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* Shipping */}
                <FormSection title="Shipping Address">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="First Name" required>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                          required
                        />
                      </FormField>
                      <FormField label="Last Name" required>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                          required
                        />
                      </FormField>
                    </div>
                    <FormField label="Address" required>
                      <Input
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="Street address"
                        className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                        required
                      />
                    </FormField>
                    <FormField label="Apartment, suite, etc.">
                      <Input
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        placeholder="Apt, suite, unit (optional)"
                        className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <FormField
                        label="City"
                        required
                        className="col-span-2 sm:col-span-1"
                      >
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                          required
                        />
                      </FormField>
                      <FormField label="State" required>
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#054700] focus:outline-none focus:ring-2 focus:ring-[#054700]/20"
                          required
                        >
                          <option value="">State</option>
                          {US_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="ZIP Code" required>
                        <Input
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          placeholder="12345"
                          className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                          maxLength={10}
                          required
                        />
                      </FormField>
                    </div>
                  </div>
                </FormSection>

                {/* Billing Address */}
                <FormSection title="Billing Address">
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingSameAsShipping}
                        onChange={(e) =>
                          setBillingSameAsShipping(e.target.checked)
                        }
                        className="w-4 h-4 rounded border-black/20 text-[#054700] focus:ring-[#054700]/20"
                      />
                      <span className="text-sm text-[#262626]/70">
                        Same as shipping address
                      </span>
                    </label>

                    {!billingSameAsShipping && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="First Name" required>
                            <Input
                              value={billingFirstName}
                              onChange={(e) =>
                                setBillingFirstName(e.target.value)
                              }
                              placeholder="First name"
                              className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                              required
                            />
                          </FormField>
                          <FormField label="Last Name" required>
                            <Input
                              value={billingLastName}
                              onChange={(e) =>
                                setBillingLastName(e.target.value)
                              }
                              placeholder="Last name"
                              className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                              required
                            />
                          </FormField>
                        </div>
                        <FormField label="Address" required>
                          <Input
                            value={billingLine1}
                            onChange={(e) => setBillingLine1(e.target.value)}
                            placeholder="Street address"
                            className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                            required
                          />
                        </FormField>
                        <FormField label="Apartment, suite, etc.">
                          <Input
                            value={billingLine2}
                            onChange={(e) => setBillingLine2(e.target.value)}
                            placeholder="Apt, suite, unit (optional)"
                            className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                          />
                        </FormField>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <FormField
                            label="City"
                            required
                            className="col-span-2 sm:col-span-1"
                          >
                            <Input
                              value={billingCity}
                              onChange={(e) => setBillingCity(e.target.value)}
                              placeholder="City"
                              className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                              required
                            />
                          </FormField>
                          <FormField label="State" required>
                            <select
                              value={billingState}
                              onChange={(e) => setBillingState(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#054700] focus:outline-none focus:ring-2 focus:ring-[#054700]/20"
                              required
                            >
                              <option value="">State</option>
                              {US_STATES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label="ZIP Code" required>
                            <Input
                              value={billingZip}
                              onChange={(e) => setBillingZip(e.target.value)}
                              placeholder="12345"
                              className="bg-white border-black/10 focus:border-[#054700] focus:ring-[#054700]/20"
                              maxLength={10}
                              required
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                </FormSection>

                {/* Payment */}
                <FormSection title="Payment">
                  {scriptError ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                      <p className="text-sm text-red-600">{scriptError}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Accepted Cards */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#262626]/40">
                          Accepted:
                        </span>
                        <div className="flex gap-1.5">
                          <CardBrandIcon brand="visa" />
                          <CardBrandIcon brand="mastercard" />
                          <CardBrandIcon brand="amex" />
                          <CardBrandIcon brand="discover" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <FormField label="Card Number" required>
                          <div
                            id="epd-ccnumber"
                            className="h-10 rounded-md border border-black/10 bg-white px-3 flex items-center"
                            style={{ minHeight: "40px" }}
                          />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Expiration" required>
                            <div
                              id="epd-ccexp"
                              className="h-10 rounded-md border border-black/10 bg-white px-3 flex items-center"
                              style={{ minHeight: "40px" }}
                            />
                          </FormField>
                          <FormField label="CVV" required>
                            <div
                              id="epd-cvv"
                              className="h-10 rounded-md border border-black/10 bg-white px-3 flex items-center"
                              style={{ minHeight: "40px" }}
                            />
                          </FormField>
                        </div>
                      </div>

                      {!fieldsReady && !scriptError && (
                        <div className="flex items-center gap-2 text-sm text-[#262626]/40">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading payment fields…
                        </div>
                      )}

                      {validationError && (
                        <p className="text-sm text-red-600">
                          {validationError}
                        </p>
                      )}
                    </div>
                  )}
                </FormSection>

                {/* Place Order Button */}
                <Button
                  type="submit"
                  disabled={submitting || !fieldsReady || !!scriptError}
                  className="w-full h-14 text-base font-semibold rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#054700" }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Place Order — ${orderTotal.toFixed(2)}
                    </span>
                  )}
                </Button>

                {/* Security Badges */}
                <div className="rounded-2xl bg-white/60 border border-black/[0.04] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <SecurityBadge
                      icon={<Lock className="w-4 h-4" />}
                      text="PCI DSS Compliant"
                    />
                    <SecurityBadge
                      icon={<Shield className="w-4 h-4" />}
                      text="256-bit SSL"
                    />
                    <SecurityBadge
                      icon={<ShieldCheck className="w-4 h-4" />}
                      text="HIPAA Secure"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <CardBrandIcon brand="visa" />
                    <CardBrandIcon brand="mastercard" />
                    <CardBrandIcon brand="amex" />
                    <CardBrandIcon brand="discover" />
                  </div>
                  <p className="text-[10px] text-center text-[#262626]/30 leading-relaxed">
                    Your payment information is encrypted and never stored on
                    our servers.
                    <br />
                    30-day money-back guarantee on all orders.
                  </p>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Checkout Reviews ─────────────────────────────────────────────────

const checkoutReviews = [
  {
    name: "Rick M.",
    age: "72 year old male",
    text: "Since being on my formula I've noticed my overall energy levels are up. When I ran out of product I noticed a significant drop. I do believe there is hope this can extend quality of life.",
    rating: 5,
  },
  {
    name: "Leslie H.",
    age: "47 year old female",
    text: "Within 1.5 months of being on my formula I felt like a different person. My energy levels were in sharp contrast to what I had before starting.",
    rating: 5,
  },
  {
    name: "Tammy S.",
    age: "55 year old female",
    text: "I had very low energy and hormone issues. I felt better than I've ever felt on the custom formula!",
    rating: 5,
  },
];

function CheckoutReviews() {
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-black/[0.04] space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#262626] tracking-tight">
          What Our Customers Say
        </h3>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5 fill-[#D4A574] text-[#D4A574]"
            />
          ))}
          <span className="text-xs text-[#262626]/40 ml-1">5.0</span>
        </div>
      </div>

      <div className="space-y-4">
        {checkoutReviews.map((review) => (
          <div
            key={review.name}
            className="border-t border-black/[0.04] pt-4 first:border-0 first:pt-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: "#054700" }}
              >
                {review.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-[#262626] leading-tight">
                  {review.name}
                </p>
                <p className="text-[11px] text-[#262626]/40">{review.age}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(review.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 fill-[#D4A574] text-[#D4A574]"
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-[#262626]/60 leading-relaxed">
              "{review.text}"
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-black/[0.04]">
        <div className="text-center">
          <p className="text-lg font-bold text-[#054700]">2,000+</p>
          <p className="text-[10px] text-[#262626]/40 uppercase tracking-wider">
            Clinical Patients
          </p>
        </div>
        <div className="w-px h-8 bg-black/[0.06]" />
        <div className="text-center">
          <p className="text-lg font-bold text-[#054700]">94%</p>
          <p className="text-[10px] text-[#262626]/40 uppercase tracking-wider">
            Report Improvement
          </p>
        </div>
        <div className="w-px h-8 bg-black/[0.06]" />
        <div className="text-center">
          <p className="text-lg font-bold text-[#054700]">8+ Yrs</p>
          <p className="text-[10px] text-[#262626]/40 uppercase tracking-wider">
            Experience
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-black/[0.04]">
      <h2 className="text-lg font-semibold text-[#262626] mb-5 tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium text-[#262626]/70">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SecurityBadge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#262626]/40">
      {icon}
      {text}
    </div>
  );
}

function CardBrandIcon({
  brand,
}: {
  brand: "visa" | "mastercard" | "amex" | "discover";
}) {
  const images: Record<string, { src: string; alt: string }> = {
    visa: { src: "/credit%20cards/1490135017-visa_82256.png", alt: "Visa" },
    mastercard: {
      src: "/credit%20cards/1490135018-mastercard_82253.png",
      alt: "Mastercard",
    },
    amex: {
      src: "/credit%20cards/1490135020-american-express_82257.png",
      alt: "American Express",
    },
    discover: {
      src: "/credit%20cards/1490135012-discover_82255.png",
      alt: "Discover",
    },
  };
  const img = images[brand];
  return <img src={img.src} alt={img.alt} className="h-7 w-auto" />;
}

// ── Order Summary Card ─────────────────────────────────────────────────

function OrderSummaryCard({
  formulaName,
  quote,
  formulaPrice,
  discountedPrice,
  shippingCost,
  membershipMonthlyPrice,
  membershipSavings,
  membershipUpsellAvailable,
  hasActiveMembership,
  includeMembership,
  onToggleMembership,
  enableAutoShip,
  onToggleAutoShip,
  orderTotal,
  showDiscounted,
  tierName,
  displayMembershipPrice,
}: {
  formulaName: string;
  quote?: FormulaQuotePayload["quote"];
  formulaPrice: number;
  discountedPrice: number;
  shippingCost: number;
  membershipMonthlyPrice: number;
  membershipSavings: number;
  membershipUpsellAvailable: boolean;
  hasActiveMembership: boolean;
  includeMembership: boolean;
  onToggleMembership: (v: boolean) => void;
  enableAutoShip: boolean;
  onToggleAutoShip: (v: boolean) => void;
  orderTotal: number;
  showDiscounted: boolean;
  tierName?: string;
  displayMembershipPrice: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-black/[0.04] space-y-6">
      <h2 className="text-lg font-semibold text-[#262626] tracking-tight">
        Order Summary
      </h2>

      {/* Formula Details */}
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#f5f3f0]">
          <img
            src="/Ones%20LIfestyle%20Images/16X9%20CAPSULES.png"
            alt="ONES Supplement"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#262626] truncate">{formulaName}</p>
          {quote && (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-[#262626]/50">
                {quote.capsuleCount} capsules/day · {quote.totalCapsules} total
                · {quote.weeks}-week supply
              </p>
              <p className="text-sm text-[#262626]/50">
                {quote.mappedIngredients} active ingredient
                {quote.mappedIngredients !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-black/[0.06]" />

      {/* Line Items */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#262626]/60">
            Formula ({quote?.weeks ?? 4}-week supply)
          </span>
          {showDiscounted ? (
            <span className="flex items-center gap-2">
              <span className="line-through text-[#262626]/30">
                ${formulaPrice.toFixed(2)}
              </span>
              <span className="font-medium text-[#054700]">
                ${discountedPrice.toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="font-medium text-[#262626]">
              ${formulaPrice.toFixed(2)}
            </span>
          )}
        </div>

        {showDiscounted && (
          <div className="flex justify-between text-[#054700]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Member discount (15%)
            </span>
            <span>−${membershipSavings.toFixed(2)}</span>
          </div>
        )}

        {includeMembership && membershipUpsellAvailable && (
          <div className="flex justify-between">
            <span className="text-[#262626]/60">
              {tierName || "Membership"} (monthly)
            </span>
            <span className="font-medium text-[#262626]">
              ${displayMembershipPrice.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#262626]/60">Shipping</span>
          <span className="font-medium text-[#262626]">
            {shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : "Free"}
          </span>
        </div>
      </div>

      <Separator className="bg-black/[0.06]" />

      {/* Total */}
      <div className="flex justify-between items-baseline">
        <span className="text-base font-semibold text-[#262626]">Total</span>
        <span className="text-2xl font-bold text-[#262626] tracking-tight">
          ${orderTotal.toFixed(2)}
        </span>
      </div>

      {/* Membership Upsell */}
      {membershipUpsellAvailable && (
        <>
          <Separator className="bg-black/[0.06]" />
          <div
            className="rounded-xl border-2 p-4 transition-colors"
            style={{
              borderColor: includeMembership ? "#054700" : "rgba(0,0,0,0.06)",
              backgroundColor: includeMembership
                ? "#054700/[0.03]"
                : "transparent",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#D4A574]" />
                  <span className="font-semibold text-sm text-[#262626]">
                    Add {tierName || "Membership"}
                  </span>
                </div>
                <p className="text-xs text-[#262626]/50 leading-relaxed">
                  Save ${membershipSavings.toFixed(2)} on this order and get 15%
                  off all future orders, priority support, and free shipping.
                </p>
              </div>
              <Switch
                checked={includeMembership}
                onCheckedChange={onToggleMembership}
                className="data-[state=checked]:bg-[#054700] flex-shrink-0 mt-0.5"
              />
            </div>
          </div>
        </>
      )}

      {hasActiveMembership && (
        <>
          <Separator className="bg-black/[0.06]" />
          <div
            className="flex items-center gap-2 rounded-lg p-3"
            style={{ backgroundColor: "rgba(5,71,0,0.05)" }}
          >
            <Check className="w-4 h-4 text-[#054700]" />
            <span className="text-sm font-medium text-[#054700]">
              Member discount applied
            </span>
          </div>
        </>
      )}

      {/* Auto-Ship / Smart Re-Order Section */}
      {showDiscounted ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#054700]/15 bg-[#054700]/[0.02] p-4 text-left">
          <div className="mt-0.5 w-4 h-4 rounded-full bg-[#054700] flex items-center justify-center shrink-0">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-[#054700]" />
              <span className="font-semibold text-sm text-[#262626]">
                Smart Re-Order with AI Review
              </span>
            </div>
            <p className="text-xs text-[#262626]/50 leading-relaxed">
              Before your next refill, your AI practitioner reviews your body
              data and recommends formula adjustments. You approve via text.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 text-left">
                <Truck className="w-4 h-4 text-[#262626]/50" />
                <span className="font-semibold text-sm text-[#262626]">
                  Auto-Ship
                </span>
              </div>
              <p className="text-xs text-[#262626]/50 leading-relaxed text-left">
                Automatically reorder every {quote?.weeks ?? 4} weeks. Cancel or
                pause anytime.
              </p>
            </div>
            <Switch
              checked={enableAutoShip}
              onCheckedChange={onToggleAutoShip}
              className="data-[state=checked]:bg-[#054700] flex-shrink-0 mt-0.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
