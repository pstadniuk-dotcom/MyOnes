import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { apiRequest, queryClient } from "@/shared/lib/queryClient";
import type {
  Order,
  Subscription as BaseSubscription,
  PaymentMethodRef,
} from "@shared/schema";

// Extend Subscription type with membership details returned from the backend
interface Subscription extends BaseSubscription {
  membershipTier?: string | null;
  membershipPriceCents?: number | null;
}

interface AutoShipData {
  id: string;
  status: "active" | "paused" | "cancelled";
  nextShipmentDate: string | null;
}

interface AutoShipResponse {
  enabled: boolean;
  autoShip: AutoShipData | null;
}
import {
  Package,
  CreditCard,
  Truck,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ExternalLink,
  Download,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  FileText,
  Loader2,
} from "lucide-react";

interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amountCents: number | null;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  invoiceId: string;
  invoiceUrl: string;
}

interface BillingInvoice {
  id: string;
  userId: string;
  orderId: string;
  amountCents: number | null;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  issuedAt: string;
  lineItems: Array<{
    label: string;
    formulaVersion: number;
    supplyMonths: number | null;
    amountCents: number | null;
  }>;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "delivered":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "shipped":
      return <Truck className="w-4 h-4 text-blue-600" />;
    case "processing":
    case "pending_3p":
    case "placed":
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "pending_confirmation":
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    default:
      return <Package className="w-4 h-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "shipped":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "processing":
    case "pending_3p":
    case "placed":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "pending_confirmation":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
};

const CancellationTimer = ({ 
  placedAt,
  children
}: { 
  placedAt: string | Date,
  children?: React.ReactNode
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const placedDate = new Date(placedAt);
      const expiryDate = new Date(placedDate.getTime() + 4 * 60 * 1000);
      const now = new Date();
      const diffMs = expiryDate.getTime() - now.getTime();

      if (diffMs <= 0) return "Expired";

      const minutes = Math.floor(diffMs / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const m = minutes.toString().padStart(1, "0");
      const s = seconds.toString().padStart(2, "0");

      return `${m}m ${s}s left`;
    };

    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial === "Expired") return;

    const interval = setInterval(() => {
      const text = calculateTimeLeft();
      setTimeLeft(text);
      if (text === "Expired") {
        clearInterval(interval);
         // Refresh orders and billing once timer expires to hide cancel button and update status
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/billing-history"] });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [placedAt]);

  if (timeLeft === "Expired" || !timeLeft) return null;
 
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg border border-red-100 text-[10px] font-bold shadow-sm animate-pulse whitespace-nowrap min-w-[110px] justify-center tabular-nums">
        <Clock className="w-3 h-3" />
        <span className="font-mono">{timeLeft.toUpperCase()} TO CANCEL</span>
      </div>
      {children}
    </div>
  );
};

// ── Pre-reorder review gate ────────────────────────────────────────────────
interface ReviewStatus {
  needsReview: boolean;
  reasons: string[];
  driftScore: number;
  autoOptimizeEnabled: boolean;
}

function PreReorderReviewGate() {
  const qc = useQueryClient();
  const { data: status } = useQuery<ReviewStatus>({
    queryKey: ["/api/formulas/review-status"],
    queryFn: () =>
      apiRequest("GET", "/api/formulas/review-status").then((r: Response) =>
        r.json(),
      ),
    staleTime: 5 * 60 * 1000,
  });

  if (!status?.needsReview) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 mb-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            Formula review recommended before this shipment
          </p>
          {status.reasons.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {status.reasons.map((r, i) => (
                <li
                  key={i}
                  className="text-xs text-amber-700 flex items-start gap-1"
                >
                  <span className="mt-1 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
        <a
          href="/dashboard/chat?context=formula-review"
          className="shrink-0 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
        >
          Review now
        </a>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("subscription");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCancelNextOrderDialog, setShowCancelNextOrderDialog] =
    useState(false);
  const [showCancelOrderDialog, setShowCancelOrderDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(
    null,
  );
  const [isFetchingInvoice, setIsFetchingInvoice] = useState<string | null>(
    null,
  );
  const { user } = useAuth();
  const { toast } = useToast();

  // API calls using React Query
  const {
    data: subscription,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
  } = useQuery<Subscription>({
    queryKey: ["/api/users/me/subscription"],
    enabled: !!user?.id,
  });

  const {
    data: orders,
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[]>({
    queryKey: ["/api/users/me/orders"],
    enabled: !!user?.id,
  });

  const {
    data: paymentMethods,
    isLoading: isLoadingPayments,
    error: paymentsError,
  } = useQuery<PaymentMethodRef[]>({
    queryKey: ["/api/users/me/payment-methods"],
    enabled: !!user?.id,
  });

  const {
    data: billingHistory,
    isLoading: isLoadingBilling,
    error: billingError,
  } = useQuery<BillingRecord[]>({
    queryKey: ["/api/users/me/billing-history"],
    enabled: !!user?.id,
  });

  const {
    data: autoShipStatus,
    isLoading: isLoadingAutoShip,
    error: autoShipError,
  } = useQuery<AutoShipResponse>({
    queryKey: ["/api/billing/auto-ship"],
    enabled: !!user?.id,
  });

  // Mutations for subscription management
  const updateSubscriptionMutation = useMutation({
    mutationFn: (updates: {
      status?: string;
      plan?: string;
      pausedUntil?: string;
    }) =>
      apiRequest("PATCH", "/api/users/me/subscription", updates).then((res) =>
        res.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/subscription"],
      });
      toast({
        title: "Subscription updated successfully",
        description: "Your subscription changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating subscription",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const resumeSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      apiRequest(
        "POST",
        `/api/billing/subscriptions/${subscriptionId}/resume`,
      ).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/subscription"],
      });
      toast({
        title: "Subscription resumed",
        description: "Your subscription has been successfully reactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resuming subscription",
        description: error.message || "Failed to resume subscription",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionActionMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      apiRequest(
        "POST",
        `/api/billing/subscriptions/${subscriptionId}/cancel`,
      ).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/subscription"],
      });
      toast({
        title: "Subscription cancelled",
        description:
          "Your subscription has been set to cancel at the end of the period.",
      });
    },
    onError: (error: any) => {
      // Fallback to internal update if billing API fails (e.g. payment gateway not configured)
      updateSubscriptionMutation.mutate({ status: "cancelled" });
    },
  });

  const cancelNextOrderMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/billing/auto-ship/skip-next").then((res) =>
        res.json(),
      ),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/auto-ship"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/orders"] });
      toast({
        title: "Next order cancelled",
        description:
          result?.message || "Your next upcoming order has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error cancelling next order",
        description: error.message || "Failed to cancel next upcoming order",
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/billing/orders/${orderId}/cancel`,
      );
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/billing-history"],
      });
      toast({
        title: "Order cancelled",
        description:
          result?.message || "Your order has been cancelled successfully.",
      });
      setShowCancelOrderDialog(false);
      setOrderToCancel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error cancelling order",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest(
        "DELETE",
        `/api/users/me/payment-methods/${paymentMethodId}`,
      ).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me/payment-methods"],
      });
      toast({
        title: "Payment method removed",
        description: "Payment method has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing payment method",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  // Show error messages
  useEffect(() => {
    // Check if error is a 404 "not found" or JSON parsing error (expected for new users)
    const isNonCriticalError = (error: Error | null) => {
      if (!error) return false;
      const msg = error.message || "";
      // Check for 404s, "not found" errors, or JSON parsing errors
      return (
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("No subscription") ||
        msg.includes("Unexpected token") ||
        msg.includes("is not valid JSON")
      );
    };

    // Only show toast for real errors (not 404 "not found" or parsing errors)
    const hasSubscriptionError =
      subscriptionError && !isNonCriticalError(subscriptionError);
    const hasOrdersError = ordersError && !isNonCriticalError(ordersError);
    const hasPaymentsError =
      paymentsError && !isNonCriticalError(paymentsError);
    const hasBillingError = billingError && !isNonCriticalError(billingError);
    const hasAutoShipError =
      autoShipError && !isNonCriticalError(autoShipError);

    if (
      hasSubscriptionError ||
      hasOrdersError ||
      hasPaymentsError ||
      hasBillingError ||
      hasAutoShipError
    ) {
      const errorMessage =
        subscriptionError?.message ||
        ordersError?.message ||
        paymentsError?.message ||
        billingError?.message ||
        autoShipError?.message;
      toast({
        title: "Error loading data",
        description: errorMessage || "Please refresh the page to try again.",
        variant: "destructive",
      });
    }
  }, [
    subscriptionError,
    ordersError,
    paymentsError,
    billingError,
    autoShipError,
    toast,
  ]);

  // Loading skeleton component
  const OrdersSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  // Show loading state
  const isLoading =
    isLoadingSubscription ||
    isLoadingOrders ||
    isLoadingPayments ||
    isLoadingBilling ||
    isLoadingAutoShip;
  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-orders">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              data-testid="text-orders-title"
            >
              Orders & Billing
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription, view orders, and update payment methods
            </p>
          </div>
        </div>
        <OrdersSkeleton />
      </div>
    );
  }

  // Handle subscription actions
  const handlePauseSubscription = () => {
    updateSubscriptionMutation.mutate({ status: "paused" });
  };

  const handleCancelSubscription = () => {
    setShowCancelDialog(true);
  };

  const confirmCancelSubscription = () => {
    if (subscription?.id) {
      cancelSubscriptionActionMutation.mutate(subscription.id);
    } else {
      updateSubscriptionMutation.mutate({ status: "cancelled" });
    }
    setShowCancelDialog(false);
  };

  const handleResumeSubscription = () => {
    if (subscription?.id) {
      resumeSubscriptionMutation.mutate(subscription.id);
    } else {
      updateSubscriptionMutation.mutate({ status: "active" });
    }
  };

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate(paymentMethodId);
  };

  const handleViewInvoice = async (record: BillingRecord) => {
    setIsFetchingInvoice(record.id);
    try {
      const response = await apiRequest("GET", record.invoiceUrl);
      const invoiceData = await response.json();
      setSelectedInvoice(invoiceData);
      setShowInvoiceDialog(true);
    } catch (error: any) {
      toast({
        title: "Error fetching invoice",
        description: error.message || "Could not retrieve invoice details.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingInvoice(null);
    }
  };

  const expectedDeliveryDate =
    autoShipStatus?.autoShip?.nextShipmentDate ||
    subscription?.renewsAt ||
    null;
  const canCancelNextOrder =
    autoShipStatus?.autoShip?.status === "active" &&
    !!autoShipStatus?.autoShip?.nextShipmentDate;

  return (
    <div className="space-y-6" data-testid="page-orders">
      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will lose
              access to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your personalized supplement formula</li>
                <li>AI health consultations</li>
                <li>Monthly formula deliveries</li>
              </ul>
              <p className="mt-3 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Next Order Confirmation Dialog */}
      <AlertDialog
        open={showCancelNextOrderDialog}
        onOpenChange={setShowCancelNextOrderDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel next upcoming order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your next upcoming auto-order. Future auto-orders
              will continue as scheduled after that.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Next Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelNextOrderMutation.mutate();
                setShowCancelNextOrderDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelNextOrderMutation.isPending
                ? "Cancelling..."
                : "Yes, Cancel Next Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Order Confirmation Dialog */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-[#1B4332]"
            data-testid="text-orders-title"
          >
            Orders & Billing
          </h1>
          <p className="text-[#52796F]">
            Manage your subscription, view orders, and update payment methods
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 bg-[#FAF7F2]">
          <TabsTrigger
            value="subscription"
            data-testid="tab-subscription"
            className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white"
          >
            Subscription
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            data-testid="tab-orders"
            className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white"
          >
            Order History
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            data-testid="tab-billing"
            className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white"
          >
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Current Subscription */}
          <Card
            data-testid="section-subscription-overview"
            className="bg-[#FAF7F2] border-[#52796F]/20"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                    <Package className="w-5 h-5" />
                    {subscription?.plan || "No Subscription"}
                  </CardTitle>
                  <CardDescription className="text-[#52796F]">
                    {subscription && (
                      <>
                        {subscription.status === "cancelled"
                          ? "Expires on: "
                          : "Next billing: "}
                        {subscription.renewsAt
                          ? new Date(subscription.renewsAt).toLocaleDateString()
                          : "N/A"}
                      </>
                    )}
                  </CardDescription>
                </div>
                <Badge
                  className={
                    subscription?.status === "active"
                      ? "bg-[#1B4332] text-white"
                      : "bg-[#52796F]/20 text-[#52796F]"
                  }
                >
                  {subscription?.status || "inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white border-[#1B4332]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">
                        Monthly Price
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-[#1B4332]">
                      {subscription?.membershipPriceCents
                        ? `$${(subscription.membershipPriceCents / 100).toFixed(2)}`
                        : orders && orders.length > 0 && orders[0].amountCents
                          ? `$${(orders[0].amountCents / 100).toFixed(2)}`
                          : `$${subscription?.plan === "monthly" ? "89.99" : subscription?.plan === "quarterly" ? "239.99" : subscription?.plan === "annual" ? "899.99" : "0.00"}`}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#52796F]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">
                        Next Billing
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-[#1B4332]">
                      {subscription?.renewsAt
                        ? new Date(subscription.renewsAt).toLocaleDateString()
                        : orders?.[0]?.placedAt
                          ? new Date(
                              new Date(orders[0].placedAt).getTime() +
                                8 * 7 * 24 * 60 * 60 * 1000,
                            ).toLocaleDateString()
                          : "N/A"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#D4A574]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">
                        Formula Version
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-[#D4A574]">
                      v
                      {orders?.[0]?.formulaVersion ||
                        (subscription ? "1" : "N/A")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="bg-[#52796F]/20" />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  data-testid="button-pause-subscription"
                  onClick={handlePauseSubscription}
                  disabled={
                    updateSubscriptionMutation.isPending ||
                    subscription?.status !== "active"
                  }
                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Subscription
                </Button>

                {(subscription?.status === "cancelled" ||
                  subscription?.status === "paused") && (
                  <Button
                    variant="outline"
                    data-testid="button-resume-subscription"
                    onClick={handleResumeSubscription}
                    disabled={resumeSubscriptionMutation.isPending}
                    className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Subscription
                  </Button>
                )}

                {subscription?.status === "active" && (
                  <Button
                    variant="destructive"
                    data-testid="button-cancel-subscription"
                    onClick={handleCancelSubscription}
                    disabled={updateSubscriptionMutation.isPending}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Delivery - only show when user has an active subscription */}
          {subscription?.status === "active" && (
            <Card
              data-testid="section-upcoming-delivery"
              className="bg-[#FAF7F2] border-[#52796F]/20"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                  <Truck className="w-5 h-5" />
                  Upcoming Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PreReorderReviewGate />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1B4332]">
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      Supply
                    </p>
                    <p className="text-sm text-[#52796F]">
                      Expected delivery:{" "}
                      {expectedDeliveryDate
                        ? new Date(expectedDeliveryDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="text-sm text-[#52796F]">
                      Current Formula • $
                      {subscription?.plan === "monthly"
                        ? "89.99"
                        : subscription?.plan === "quarterly"
                          ? "239.99"
                          : subscription?.plan === "annual"
                            ? "899.99"
                            : "0.00"}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge
                      variant="outline"
                      className="border-[#D4A574] text-[#D4A574]"
                    >
                      Scheduled
                    </Badge>
                    {canCancelNextOrder && (
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-cancel-next-order"
                          onClick={() => setShowCancelNextOrderDialog(true)}
                          disabled={cancelNextOrderMutation.isPending}
                          className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Next Order
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card
            data-testid="section-order-history"
            className="bg-[#FAF7F2] border-[#52796F]/20"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Package className="w-5 h-5" />
                Order History
              </CardTitle>
              <CardDescription className="text-[#52796F]">
                View all your past supplement orders and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!orders || orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-[#52796F] mx-auto mb-4" />
                    <p className="text-[#52796F]">No orders found</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <Card
                      key={order.id}
                      className="border-[#52796F]/10 bg-white shadow-none"
                      data-testid={`order-${order.id}`}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between sm:justify-start gap-4">
                              <span className="font-bold text-[#1B4332]">
                                Order #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              <Badge
                                className={`${getStatusColor(order.status)} border-none capitalize`}
                              >
                                {order.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[#52796F]">Placed</p>
                                <p className="font-medium text-[#1B4332]">
                                  {new Date(
                                    order.placedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#52796F]">Total</p>
                                <p className="font-medium text-[#1B4332]">
                                  $
                                  {order.amountCents
                                    ? (order.amountCents / 100).toFixed(2)
                                    : "0.00"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#52796F]">Formula</p>
                                <p className="font-medium text-[#1B4332]">
                                  Version v{order.formulaVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#52796F]">Supply</p>
                                <p className="font-medium text-[#1B4332]">
                                  {order.supplyWeeks || 8} weeks
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 sm:self-center">
                            {order.status === "shipped" &&
                              order.trackingUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                                >
                                  <a
                                    href={order.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Track
                                  </a>
                                </Button>
                              )}

                            {[
                              "processing",
                              "pending",
                              "pending_confirmation",
                            ].includes(order.status) && (
                              <CancellationTimer placedAt={order.placedAt}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setOrderToCancel(order.id);
                                    setShowCancelOrderDialog(true);
                                  }}
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancel Order
                                </Button>
                              </CancellationTimer>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Payment Methods */}
          <Card
            data-testid="section-payment-methods"
            className="bg-[#FAF7F2] border-[#52796F]/20"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                    <CreditCard className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription className="text-[#52796F]">
                    Manage your saved payment methods
                  </CardDescription>
                </div>
                <Button
                  data-testid="button-add-payment-method"
                  className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!paymentMethods || paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-[#52796F] mx-auto mb-4" />
                    <p className="text-[#52796F]">No payment methods found</p>
                    <p className="text-sm text-[#52796F] mt-2">
                      Add a payment method to get started
                    </p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border border-[#52796F]/20 rounded-lg bg-white"
                      data-testid={`payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-[#1B4332]/10 rounded flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-[#1B4332]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#1B4332]">
                            {method.brand?.toUpperCase()} ****{method.last4}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#52796F] text-[#52796F]"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemovePaymentMethod(method.id)}
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card
            data-testid="section-billing-history"
            className="bg-[#FAF7F2] border-[#52796F]/20 overflow-hidden"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#1B4332] text-xl">
                    Billing History
                  </CardTitle>
                  <CardDescription className="text-[#52796F]">
                    Download invoices and view your complete payment history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#52796F]/10">
                    <thead>
                      <tr className="bg-[#52796F]/5">
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-semibold text-[#52796F] uppercase tracking-wider"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-semibold text-[#52796F] uppercase tracking-wider"
                        >
                          Description
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-semibold text-[#52796F] uppercase tracking-wider"
                        >
                          Amount
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-semibold text-[#52796F] uppercase tracking-wider"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-semibold text-[#52796F] uppercase tracking-wider"
                        >
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#52796F]/10">
                      {!billingHistory || billingHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Calendar className="w-12 h-12 text-[#52796F]/30 mx-auto mb-4" />
                            <p className="text-[#52796F] font-medium">
                              No billing history found
                            </p>
                            <p className="text-sm text-[#52796F]/70 mt-1">
                              Your payment history will appear here once you
                              make a purchase.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        billingHistory.map((record) => (
                          <tr
                            key={record.id}
                            className="hover:bg-[#FAF7F2]/50 transition-colors group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#52796F]">
                              {new Date(record.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-[#1B4332]">
                                {record.description}
                              </div>
                              <div className="text-xs text-[#52796F]">
                                ID: {record.id.slice(0, 8).toUpperCase()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-bold text-[#1B4332]">
                                {record.amountCents
                                  ? `$${(record.amountCents / 100).toFixed(2)}`
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`
                                  capitalize px-2 py-0.5 text-[10px] font-bold border-none
                                  ${
                                    record.status === "paid"
                                      ? "bg-green-50 text-green-700"
                                      : record.status === "pending"
                                        ? "bg-amber-50 text-amber-700"
                                        : record.status === "refunded"
                                          ? "bg-blue-50 text-blue-700"
                                          : "bg-red-50 text-red-700"
                                  }
                                `}
                              >
                                <span className="flex items-center gap-1">
                                  {record.status === "paid" && (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  {record.status === "pending" && (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {record.status === "refunded" && (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  {record.status === "failed" && (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {record.status}
                                </span>
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewInvoice(record)}
                                disabled={isFetchingInvoice === record.id}
                                className="h-8 w-8 p-0 text-[#1B4332] hover:bg-[#1B4332] hover:text-white rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
                                title="View/Download Invoice"
                              >
                                {isFetchingInvoice === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1B4332] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </DialogTitle>
            <DialogDescription className="text-[#52796F]">
              Invoice for Order #
              {selectedInvoice?.orderId.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-[#52796F] uppercase tracking-wider">
                    Date Issued
                  </h4>
                  <p className="text-[#1B4332]">
                    {new Date(selectedInvoice.issuedAt).toLocaleDateString(
                      undefined,
                      { dateStyle: "long" },
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-[#52796F] uppercase tracking-wider">
                    Status
                  </h4>
                  <Badge
                    variant="outline"
                    className={`border-none capitalize ${selectedInvoice.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-[#52796F]/10 pt-4">
                <h4 className="text-sm font-semibold text-[#52796F] uppercase tracking-wider mb-3">
                  Line Items
                </h4>
                <div className="space-y-3">
                  {selectedInvoice.lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="text-[#1B4332]">
                        <p className="font-medium">{item.label}</p>
                        {item.formulaVersion > 0 && (
                          <p className="text-xs text-[#52796F]">
                            Formula v{item.formulaVersion} •{" "}
                            {item.supplyMonths || 2} month supply
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-[#1B4332]">
                        $
                        {item.amountCents
                          ? (item.amountCents / 100).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#52796F]/10 pt-4 flex justify-between items-center">
                <p className="text-lg font-bold text-[#1B4332]">Total Amount</p>
                <p className="text-2xl font-black text-[#1B4332]">
                  $
                  {selectedInvoice.amountCents
                    ? (selectedInvoice.amountCents / 100).toFixed(2)
                    : "0.00"}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                  onClick={() => window.print()}
                >
                  Print PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-[#52796F] text-[#52796F]"
                  onClick={() => setShowInvoiceDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Cancellation Confirmation Dialog */}
      <AlertDialog
        open={showCancelOrderDialog}
        onOpenChange={setShowCancelOrderDialog}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1B4332]">
              Cancel Your Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#52796F]">
              Are you sure you want to cancel this order? This action cannot be
              undone if the order has already entered final production. Note:
              You can only cancel within 4 minutes of placing the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#52796F] text-[#52796F]">
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                orderToCancel && cancelOrderMutation.mutate(orderToCancel)
              }
              disabled={cancelOrderMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelOrderMutation.isPending
                ? "Cancelling..."
                : "Yes, Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
