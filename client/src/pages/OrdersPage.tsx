import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
    updateSubscriptionMutation.mutate({ status: 'cancelled' });
  };

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate(paymentMethodId);
  };

  return (
    <div className="space-y-6" data-testid="page-orders">
      {/* Header */}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription" data-testid="tab-subscription">Subscription</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Order History</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Current Subscription */}
          <Card data-testid="section-subscription-overview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {subscription?.plan || 'No Subscription'}
                  </CardTitle>
                  <CardDescription>
                    {subscription && (
                      <>Next billing: {subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}</>
                    )}
                  </CardDescription>
                </div>
                <Badge className={subscription?.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                  {subscription?.status || 'inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Monthly Price</span>
                    </div>
                    <div className="text-2xl font-bold">${subscription?.plan === 'monthly' ? '89.99' : subscription?.plan === 'quarterly' ? '239.99' : subscription?.plan === 'annual' ? '899.99' : '0.00'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Next Billing</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {subscription?.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Formula Version</span>
                    </div>
                    <div className="text-lg font-semibold">Current</div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  data-testid="button-pause-subscription"
                  onClick={handlePauseSubscription}
                  disabled={updateSubscriptionMutation.isPending || subscription?.status !== 'active'}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Subscription
                </Button>
                <Button variant="outline" data-testid="button-change-plan">
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
          <Card data-testid="section-upcoming-delivery">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Upcoming Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Supply</p>
                  <p className="text-sm text-muted-foreground">
                    Expected delivery: {subscription?.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current Formula • ${subscription?.plan === 'monthly' ? '89.99' : subscription?.plan === 'quarterly' ? '239.99' : subscription?.plan === 'annual' ? '899.99' : '0.00'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">Scheduled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card data-testid="section-order-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order History
              </CardTitle>
              <CardDescription>
                View all your past supplement orders and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!orders || orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  orders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-muted" data-testid={`order-${order.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="font-medium">{order.id}</span>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">$89.99</div>
                          <div className="text-sm text-muted-foreground">
                            Formula v{order.formulaVersion}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Placed:</span>
                          <div>{new Date(order.placedAt).toLocaleDateString()}</div>
                        </div>
                        {order.shippedAt && (
                          <div>
                            <span className="text-muted-foreground">Shipped:</span>
                            <div>{new Date(order.shippedAt).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>

                      {order.status === 'shipped' && order.trackingUrl && (
                        <div className="mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm" asChild data-testid={`button-track-${order.id}`}>
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
          <Card data-testid="section-payment-methods">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Manage your saved payment methods
                  </CardDescription>
                </div>
                <Button data-testid="button-add-payment-method">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!paymentMethods || paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment methods found</p>
                    <p className="text-sm text-muted-foreground mt-2">Add a payment method to get started</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`payment-method-${method.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {method.brand?.toUpperCase()} ****{method.last4}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
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
          <Card data-testid="section-billing-history">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>
                    Download invoices and view payment history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!billingHistory || billingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No billing history found</p>
                    <p className="text-sm text-muted-foreground mt-2">Your payment history will appear here</p>
                  </div>
                ) : (
                  billingHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {record.status === 'paid' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : record.status === 'pending' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{record.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.status === 'paid' ? 'Paid' : record.status === 'pending' ? 'Pending' : 'Failed'} on {new Date(record.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">${record.amount.toFixed(2)}</span>
                        {record.invoiceUrl && record.status === 'paid' && (
                          <Button variant="outline" size="sm" data-testid="button-download-invoice">
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