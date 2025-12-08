import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, Subscription, PaymentMethodRef } from '@shared/schema';
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
  Play
} from 'lucide-react';

// Types for billing history
interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'shipped':
      return <Truck className="w-4 h-4 text-blue-600" />;
    case 'processing':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return <Package className="w-4 h-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'shipped':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('subscription');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // API calls using React Query
  const { data: subscription, isLoading: isLoadingSubscription, error: subscriptionError } = useQuery<Subscription>({
    queryKey: ['/api/users/me/subscription'],
    enabled: !!user?.id
  });

  const { data: orders, isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
    queryKey: ['/api/users/me/orders'],
    enabled: !!user?.id
  });

  const { data: paymentMethods, isLoading: isLoadingPayments, error: paymentsError } = useQuery<PaymentMethodRef[]>({
    queryKey: ['/api/users/me/payment-methods'],
    enabled: !!user?.id
  });

  const { data: billingHistory, isLoading: isLoadingBilling, error: billingError } = useQuery<BillingRecord[]>({
    queryKey: ['/api/users/me/billing-history'],
    enabled: !!user?.id
  });

  // Mutations for subscription management
  const updateSubscriptionMutation = useMutation({
    mutationFn: (updates: { status?: string; plan?: string; pausedUntil?: string }) =>
      apiRequest('PATCH', '/api/users/me/subscription', updates).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/subscription'] });
      toast({
        title: 'Subscription updated successfully',
        description: 'Your subscription changes have been saved.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating subscription',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive'
      });
    }
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest('DELETE', `/api/users/me/payment-methods/${paymentMethodId}`).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/payment-methods'] });
      toast({
        title: 'Payment method removed',
        description: 'Payment method has been successfully removed.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing payment method',
        description: error.message || 'Failed to remove payment method',
        variant: 'destructive'
      });
    }
  });

  // Show error messages
  useEffect(() => {
    // Check if error is a 404 "not found" or JSON parsing error (expected for new users)
    const isNonCriticalError = (error: Error | null) => {
      if (!error) return false;
      const msg = error.message || '';
      // Check for 404s, "not found" errors, or JSON parsing errors
      return msg.includes('404') || 
             msg.includes('not found') || 
             msg.includes('No subscription') ||
             msg.includes('Unexpected token') ||
             msg.includes('is not valid JSON');
    };
    
    // Only show toast for real errors (not 404 "not found" or parsing errors)
    const hasSubscriptionError = subscriptionError && !isNonCriticalError(subscriptionError);
    const hasOrdersError = ordersError && !isNonCriticalError(ordersError);
    const hasPaymentsError = paymentsError && !isNonCriticalError(paymentsError);
    const hasBillingError = billingError && !isNonCriticalError(billingError);
    
    if (hasSubscriptionError || hasOrdersError || hasPaymentsError || hasBillingError) {
      const errorMessage = subscriptionError?.message || ordersError?.message || paymentsError?.message || billingError?.message;
      toast({
        title: 'Error loading data',
        description: errorMessage || 'Please refresh the page to try again.',
        variant: 'destructive',
      });
    }
  }, [subscriptionError, ordersError, paymentsError, billingError, toast]);

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
  const isLoading = isLoadingSubscription || isLoadingOrders || isLoadingPayments || isLoadingBilling;
  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-orders">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-orders-title">
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
    updateSubscriptionMutation.mutate({ status: 'paused' });
  };

  const handleCancelSubscription = () => {
    setShowCancelDialog(true);
  };

  const confirmCancelSubscription = () => {
    updateSubscriptionMutation.mutate({ status: 'cancelled' });
    setShowCancelDialog(false);
  };

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate(paymentMethodId);
  };

  return (
    <div className="space-y-6" data-testid="page-orders">
      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will lose access to:
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B4332]" data-testid="text-orders-title">
            Orders & Billing
          </h1>
          <p className="text-[#52796F]">
            Manage your subscription, view orders, and update payment methods
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-[#FAF7F2]">
          <TabsTrigger value="subscription" data-testid="tab-subscription" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">Subscription</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">Order History</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Current Subscription */}
          <Card data-testid="section-subscription-overview" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                    <Package className="w-5 h-5" />
                    {subscription?.plan || 'No Subscription'}
                  </CardTitle>
                  <CardDescription className="text-[#52796F]">
                    {subscription && (
                      <>Next billing: {subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}</>
                    )}
                  </CardDescription>
                </div>
                <Badge className={subscription?.status === 'active' ? 'bg-[#1B4332] text-white' : 'bg-[#52796F]/20 text-[#52796F]'}>
                  {subscription?.status || 'inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white border-[#1B4332]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">Monthly Price</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1B4332]">${subscription?.plan === 'monthly' ? '89.99' : subscription?.plan === 'quarterly' ? '239.99' : subscription?.plan === 'annual' ? '899.99' : '0.00'}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#52796F]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">Next Billing</span>
                    </div>
                    <div className="text-lg font-semibold text-[#1B4332]">
                      {subscription?.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#D4A574]/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-[#52796F]" />
                      <span className="text-sm font-medium text-[#52796F]">Formula Version</span>
                    </div>
                    <div className="text-lg font-semibold text-[#D4A574]">Current</div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="bg-[#52796F]/20" />

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  data-testid="button-pause-subscription"
                  onClick={handlePauseSubscription}
                  disabled={updateSubscriptionMutation.isPending || subscription?.status !== 'active'}
                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Subscription
                </Button>
                <Button variant="outline" data-testid="button-change-plan" className="border-[#52796F] text-[#52796F] hover:bg-[#52796F] hover:text-white">
                  Change Plan
                </Button>
                <Button 
                  variant="destructive" 
                  data-testid="button-cancel-subscription"
                  onClick={handleCancelSubscription}
                  disabled={updateSubscriptionMutation.isPending}
                >
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Delivery */}
          <Card data-testid="section-upcoming-delivery" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Truck className="w-5 h-5" />
                Upcoming Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1B4332]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Supply</p>
                  <p className="text-sm text-[#52796F]">
                    Expected delivery: {subscription?.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm text-[#52796F]">
                    Current Formula • ${subscription?.plan === 'monthly' ? '89.99' : subscription?.plan === 'quarterly' ? '239.99' : subscription?.plan === 'annual' ? '899.99' : '0.00'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-[#D4A574] text-[#D4A574]">Scheduled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card data-testid="section-order-history" className="bg-[#FAF7F2] border-[#52796F]/20">
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
                  <Card key={order.id} className="border-l-4 border-l-[#1B4332] bg-white" data-testid={`order-${order.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="font-medium text-[#1B4332]">{order.id}</span>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-[#1B4332]">$89.99</div>
                          <div className="text-sm text-[#52796F]">
                            Formula v{order.formulaVersion}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div>
                          <span className="text-[#52796F]">Placed:</span>
                          <div className="text-[#1B4332]">{new Date(order.placedAt).toLocaleDateString()}</div>
                        </div>
                        {order.shippedAt && (
                          <div>
                            <span className="text-[#52796F]">Shipped:</span>
                            <div className="text-[#1B4332]">{new Date(order.shippedAt).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>

                      {order.status === 'shipped' && order.trackingUrl && (
                        <div className="mt-4 pt-4 border-t border-[#52796F]/20">
                          <Button variant="outline" size="sm" asChild data-testid={`button-track-${order.id}`} className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white">
                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Track Package
                            </a>
                          </Button>
                        </div>
                      )}
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
          <Card data-testid="section-payment-methods" className="bg-[#FAF7F2] border-[#52796F]/20">
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
                <Button data-testid="button-add-payment-method" className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white">
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
                    <p className="text-sm text-[#52796F] mt-2">Add a payment method to get started</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border border-[#52796F]/20 rounded-lg bg-white" data-testid={`payment-method-${method.id}`}>
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
                      <Button variant="outline" size="sm" className="border-[#52796F] text-[#52796F]">Edit</Button>
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
          <Card data-testid="section-billing-history" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#1B4332]">Billing History</CardTitle>
                  <CardDescription className="text-[#52796F]">
                    Download invoices and view payment history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!billingHistory || billingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-[#52796F] mx-auto mb-4" />
                    <p className="text-[#52796F]">No billing history found</p>
                    <p className="text-sm text-[#52796F] mt-2">Your payment history will appear here</p>
                  </div>
                ) : (
                  billingHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border border-[#52796F]/20 rounded-lg bg-white">
                      <div className="flex items-center gap-3">
                        {record.status === 'paid' ? (
                          <CheckCircle className="w-5 h-5 text-[#1B4332]" />
                        ) : record.status === 'pending' ? (
                          <Clock className="w-5 h-5 text-[#D4A574]" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium text-[#1B4332]">{record.description}</div>
                          <div className="text-sm text-[#52796F]">
                            {record.status === 'paid' ? 'Paid' : record.status === 'pending' ? 'Pending' : 'Failed'} on {new Date(record.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[#1B4332]">${record.amount.toFixed(2)}</span>
                        {record.invoiceUrl && record.status === 'paid' && (
                          <Button variant="outline" size="sm" data-testid="button-download-invoice" className="border-[#1B4332] text-[#1B4332]">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}