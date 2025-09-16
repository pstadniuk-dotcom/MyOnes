import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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

// Mock data - in production this would come from APIs
const subscription = {
  plan: 'Monthly Subscription',
  status: 'active',
  nextBilling: '2024-10-20',
  price: 89.99,
  renewsAt: '2024-10-20',
  formulaVersion: 3,
};

const orders = [
  {
    id: 'ORD-001',
    status: 'shipped',
    placedAt: '2024-09-20',
    shippedAt: '2024-09-22',
    trackingUrl: 'https://track.example.com/123456',
    formulaVersion: 3,
    total: 89.99,
  },
  {
    id: 'ORD-002',
    status: 'delivered',
    placedAt: '2024-08-20',
    shippedAt: '2024-08-22',
    deliveredAt: '2024-08-25',
    formulaVersion: 2,
    total: 89.99,
  },
  {
    id: 'ORD-003',
    status: 'delivered',
    placedAt: '2024-07-20',
    shippedAt: '2024-07-22',
    deliveredAt: '2024-07-25',
    formulaVersion: 1,
    total: 89.99,
  },
];

const paymentMethods = [
  {
    id: 'pm_1',
    brand: 'visa',
    last4: '4242',
    default: true,
  },
  {
    id: 'pm_2',
    brand: 'mastercard', 
    last4: '8888',
    default: false,
  },
];

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
                    {subscription.plan}
                  </CardTitle>
                  <CardDescription>
                    Formula v{subscription.formulaVersion} • Next billing: {new Date(subscription.nextBilling).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                  {subscription.status}
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
                    <div className="text-2xl font-bold">${subscription.price}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Next Billing</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {new Date(subscription.renewsAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Formula Version</span>
                    </div>
                    <div className="text-lg font-semibold">v{subscription.formulaVersion}</div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" data-testid="button-pause-subscription">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Subscription
                </Button>
                <Button variant="outline" data-testid="button-change-plan">
                  Change Plan
                </Button>
                <Button variant="destructive" data-testid="button-cancel-subscription">
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
                  <p className="font-medium">October 2024 Supply</p>
                  <p className="text-sm text-muted-foreground">
                    Expected delivery: {new Date(subscription.nextBilling).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formula v{subscription.formulaVersion} • $89.99
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
                {orders.map((order) => (
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
                          <div className="font-medium">${order.total}</div>
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
                        {order.deliveredAt && (
                          <div>
                            <span className="text-muted-foreground">Delivered:</span>
                            <div>{new Date(order.deliveredAt).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>

                      {order.status === 'shipped' && (
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
                ))}
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
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`payment-method-${method.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {method.brand.toUpperCase()} ****{method.last4}
                        </div>
                        {method.default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="destructive" size="sm">Remove</Button>
                    </div>
                  </div>
                ))}
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
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">September 2024</div>
                      <div className="text-sm text-muted-foreground">
                        Paid on Sep 20, 2024
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">$89.99</span>
                    <Button variant="outline" size="sm" data-testid="button-download-invoice">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">August 2024</div>
                      <div className="text-sm text-muted-foreground">
                        Paid on Aug 20, 2024
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">$89.99</span>
                    <Button variant="outline" size="sm" data-testid="button-download-invoice">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}