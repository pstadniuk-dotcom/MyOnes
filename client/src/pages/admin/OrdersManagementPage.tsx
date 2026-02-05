import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import {
  Package,
  Search,
  Download,
  ArrowLeft,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

interface Order {
  id: string;
  userId: string;
  formulaVersion: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  amountCents: number | null;
  supplyMonths: number | null;
  trackingUrl: string | null;
  placedAt: string;
  shippedAt: string | null;
  user: { id: string; name: string; email: string };
  formula?: { totalMg: number; bases: Array<{ ingredient: string; amount: number }> };
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  processing: { icon: Package, color: 'bg-blue-100 text-blue-700', label: 'Processing' },
  shipped: { icon: Truck, color: 'bg-violet-100 text-violet-700', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Cancelled' }
};

export default function OrdersManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; order: Order | null; newStatus: string; trackingUrl: string }>({
    open: false,
    order: null,
    newStatus: '',
    trackingUrl: ''
  });

  const limit = 20;

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['/api/admin/orders', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));
      const res = await apiRequest('GET', `/api/admin/orders?${params.toString()}`);
      return res.json();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, trackingUrl }: { orderId: string; status: string; trackingUrl?: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status, trackingUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setUpdateDialog({ open: false, order: null, newStatus: '', trackingUrl: '' });
      toast({
        title: 'Order Updated',
        description: 'Order status has been updated successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive'
      });
    }
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    window.open(`/api/admin/export/orders?${params.toString()}`, '_blank');
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    setUpdateDialog({
      open: true,
      order,
      newStatus,
      trackingUrl: order.trackingUrl || ''
    });
  };

  const confirmStatusUpdate = () => {
    if (!updateDialog.order) return;
    updateStatusMutation.mutate({
      orderId: updateDialog.order.id,
      status: updateDialog.newStatus,
      trackingUrl: updateDialog.newStatus === 'shipped' ? updateDialog.trackingUrl : undefined
    });
  };

  // Filter orders by search
  const filteredOrders = data?.orders.filter(order =>
    order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="p-8" data-testid="page-orders-management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Package className="h-8 w-8" />
                Order Management
              </h1>
              <p className="text-muted-foreground">
                View and manage all orders (90-day supply cycles)
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({data?.total || 0})</CardTitle>
            <CardDescription>
              Click on a status to update it
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Supply</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead>Shipped</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const config = statusConfig[order.status];
                      const StatusIcon = config.icon;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-left hover:underline"
                              onClick={() => setLocation(`/admin/users/${order.userId}`)}
                            >
                              <p className="font-medium">{order.user.name}</p>
                              <p className="text-xs text-muted-foreground">{order.user.email}</p>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order, value)}
                            >
                              <SelectTrigger className={`w-[130px] ${config.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {order.amountCents ? `$${(order.amountCents / 100).toFixed(0)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.supplyMonths ? `${order.supplyMonths * 30} days` : '90 days'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(order.placedAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.shippedAt ? format(new Date(order.shippedAt), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {order.trackingUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Update Status Dialog */}
        <Dialog open={updateDialog.open} onOpenChange={(open) => !open && setUpdateDialog({ ...updateDialog, open: false })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change status from {updateDialog.order?.status} to {updateDialog.newStatus}
              </DialogDescription>
            </DialogHeader>

            {updateDialog.newStatus === 'shipped' && (
              <div className="py-4">
                <label className="text-sm font-medium">Tracking URL (optional)</label>
                <Input
                  placeholder="https://tracking.example.com/..."
                  value={updateDialog.trackingUrl}
                  onChange={(e) => setUpdateDialog({ ...updateDialog, trackingUrl: e.target.value })}
                  className="mt-2"
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateDialog({ ...updateDialog, open: false })}>
                Cancel
              </Button>
              <Button onClick={confirmStatusUpdate} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
