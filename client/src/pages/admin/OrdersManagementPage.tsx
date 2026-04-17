import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import {
  Package,
  Search,
  Download,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Eye,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Separator } from '@/shared/components/ui/separator';
import { Textarea } from '@/shared/components/ui/textarea';
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
import { apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';

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
  gatewayTransactionId: string | null;
  manufacturerOrderId: string | null;
  manufacturerOrderStatus: string | null;
  user: { id: string; name: string; email: string; phone?: string | null };
  formula?: { id: string; version: number; name: string | null; bases: Array<{ ingredient: string; amount: number }>; additions: Array<{ ingredient: string; amount: number }>; targetCapsules: number | null };
  shippingAddress?: { line1: string; line2?: string | null; city: string; state: string; zip: string; country?: string } | null;
  consentSnapshot?: Record<string, any> | null;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

type SortField = 'placedAt' | 'amountCents' | 'status' | 'customer';
type SortDir = 'asc' | 'desc';

const statusConfig = {
  pending: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  processing: { icon: Package, color: 'bg-blue-100 text-blue-700', label: 'Processing' },
  shipped: { icon: Truck, color: 'bg-violet-100 text-violet-700', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Cancelled' }
};

const getStatusConfig = (status: string) => {
  if (statusConfig[status as keyof typeof statusConfig]) {
    return statusConfig[status as keyof typeof statusConfig];
  }
  // Map transitional statuses to their primary visual styles
  if (status === 'placed') return statusConfig.processing;
  if (status === 'pending_confirmation') return statusConfig.pending;
  if (status === 'settlement_failed') return statusConfig.cancelled;
  
  // Default fallback
  return statusConfig.pending;
};

function SortIcon({ field, current, dir }: { field: SortField; current: SortField | null; dir: SortDir }) {
  if (current !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-300" />;
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-gray-700" />
    : <ArrowDown className="h-3 w-3 ml-1 text-gray-700" />;
}

export default function OrdersManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>('placedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; order: Order | null; newStatus: string; trackingUrl: string }>({
    open: false,
    order: null,
    newStatus: '',
    trackingUrl: ''
  });
  const [bulkDialog, setBulkDialog] = useState<{ open: boolean; newStatus: string }>({ open: false, newStatus: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; amountDollars: string; reason: string }>({ open: false, amountDollars: '', reason: '' });

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

  const { data: detailOrder, isLoading: isDetailLoading } = useQuery<Order>({
    queryKey: ['/api/admin/orders', detailOrderId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/orders/${detailOrderId}`);
      return res.json();
    },
    enabled: !!detailOrderId,
  });

  const refundMutation = useMutation({
    mutationFn: async ({ orderId, amountCents, reason }: { orderId: string; amountCents?: number; reason?: string }) => {
      const res = await apiRequest('POST', `/api/admin/orders/${orderId}/refund`, { amountCents, reason });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setRefundDialog({ open: false, amountDollars: '', reason: '' });
      setDetailOrderId(null);
      toast({ title: 'Refund Processed', description: `$${((data.refundedAmountCents || 0) / 100).toFixed(2)} refunded successfully.` });
    },
    onError: (error: any) => {
      toast({ title: 'Refund Failed', description: error?.message || 'Failed to process refund.', variant: 'destructive' });
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
      toast({ title: 'Order Updated', description: 'Order status has been updated successfully.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update order status.', variant: 'destructive' });
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      const results = await Promise.allSettled(
        orderIds.map(id => apiRequest('PATCH', `/api/admin/orders/${id}/status`, { status }))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} of ${orderIds.length} updates failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setSelectedIds(new Set());
      setBulkDialog({ open: false, newStatus: '' });
      toast({ title: 'Bulk Update Complete', description: `${selectedIds.size} orders updated.` });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: 'Partial Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/export/orders?${params.toString()}`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your order data has been exported.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    setUpdateDialog({ open: true, order, newStatus, trackingUrl: order.trackingUrl || '' });
  };

  const confirmStatusUpdate = () => {
    if (!updateDialog.order) return;
    updateStatusMutation.mutate({
      orderId: updateDialog.order.id,
      status: updateDialog.newStatus,
      trackingUrl: updateDialog.newStatus === 'shipped' ? updateDialog.trackingUrl : undefined
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Filter and sort orders
  let filteredOrders = data?.orders.filter(order =>
    order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (sortField) {
    filteredOrders = [...filteredOrders].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'placedAt':
          cmp = new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
          break;
        case 'amountCents':
          cmp = (a.amountCents || 0) - (b.amountCents || 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'customer':
          cmp = (a.user.name || '').localeCompare(b.user.name || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div data-testid="page-orders-management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all orders (90-day supply cycles)
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Filters & Bulk Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
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

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                  <Select value="" onValueChange={(status) => setBulkDialog({ open: true, newStatus: status })}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Bulk update..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">Set Processing</SelectItem>
                      <SelectItem value="shipped">Set Shipped</SelectItem>
                      <SelectItem value="delivered">Set Delivered</SelectItem>
                      <SelectItem value="cancelled">Set Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({data?.total || 0})</CardTitle>
            <CardDescription>
              Click column headers to sort. Use checkboxes for bulk actions.
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
                      <TableHead className="w-10">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center">
                          {selectedIds.size === filteredOrders.length && filteredOrders.length > 0
                            ? <CheckSquare className="h-4 w-4 text-[#054700]" />
                            : <Square className="h-4 w-4 text-gray-400" />
                          }
                        </button>
                      </TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>
                        <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('customer')}>
                          Customer <SortIcon field="customer" current={sortField} dir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('status')}>
                          Status <SortIcon field="status" current={sortField} dir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('amountCents')}>
                          Amount <SortIcon field="amountCents" current={sortField} dir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>Supply (Days)</TableHead>
                      <TableHead>
                        <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('placedAt')}>
                          Placed At <SortIcon field="placedAt" current={sortField} dir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>Shipped At</TableHead>
                      <TableHead>Tracking URL</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                        const config = getStatusConfig(order.status);
                        const StatusIcon = config.icon;
                        const isSelected = selectedIds.has(order.id);
                        return (
                          <TableRow key={order.id} className={isSelected ? 'bg-green-50/50' : ''}>
                            <TableCell>
                              <button onClick={() => toggleSelect(order.id)} className="flex items-center justify-center">
                                {isSelected
                                  ? <CheckSquare className="h-4 w-4 text-[#054700]" />
                                  : <Square className="h-4 w-4 text-gray-300 hover:text-gray-500" />
                                }
                              </button>
                            </TableCell>
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
                              {order.amountCents ? `$${(order.amountCents / 100).toFixed(2)}` : '-'}
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailOrderId(order.id)}
                                title="View order details"
                              >
                                <Eye className="h-4 w-4 text-gray-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages} ({data?.total} total)
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

        {/* Bulk Update Dialog */}
        <Dialog open={bulkDialog.open} onOpenChange={(open) => !open && setBulkDialog({ open: false, newStatus: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Update Orders</DialogTitle>
              <DialogDescription>
                Update {selectedIds.size} selected orders to "{bulkDialog.newStatus}"?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialog({ open: false, newStatus: '' })}>
                Cancel
              </Button>
              <Button
                onClick={() => bulkUpdateMutation.mutate({ orderIds: Array.from(selectedIds), status: bulkDialog.newStatus })}
                disabled={bulkUpdateMutation.isPending}
              >
                {bulkUpdateMutation.isPending ? 'Updating...' : `Update ${selectedIds.size} Orders`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Detail Modal */}
        <Dialog open={!!detailOrderId} onOpenChange={(open) => { if (!open) setDetailOrderId(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </DialogTitle>
              <DialogDescription>
                {detailOrderId && <span className="font-mono text-xs">{detailOrderId}</span>}
              </DialogDescription>
            </DialogHeader>

            {isDetailLoading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : detailOrder ? (
              <div className="space-y-5 py-2">
                {/* Status & Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = getStatusConfig(detailOrder.status);
                      const Icon = cfg.icon;
                      return (
                        <Badge className={cfg.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <span className="text-2xl font-semibold text-gray-900">
                    {detailOrder.amountCents ? `$${(detailOrder.amountCents / 100).toFixed(2)}` : '-'}
                  </span>
                </div>

                <Separator />

                {/* Customer */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Customer</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium text-gray-900">{detailOrder.user?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="text-gray-900">{detailOrder.user?.email || '-'}</span>
                    </div>
                    {detailOrder.user?.phone && (
                      <div>
                        <span className="text-gray-500">Phone:</span>{' '}
                        <span className="text-gray-900">{detailOrder.user.phone}</span>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Transaction IDs */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Transaction Details</h4>
                  <div className="grid grid-cols-1 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Gateway Transaction ID:</span>{' '}
                      <span className="font-mono text-xs text-gray-900">{detailOrder.gatewayTransactionId || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Manufacturer Order ID:</span>{' '}
                      <span className="font-mono text-xs text-gray-900">{detailOrder.manufacturerOrderId || '-'}</span>
                    </div>
                    {detailOrder.manufacturerOrderStatus && (
                      <div>
                        <span className="text-gray-500">Manufacturer Status:</span>{' '}
                        <Badge variant="outline" className="ml-1 text-xs">{detailOrder.manufacturerOrderStatus}</Badge>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Formula */}
                {detailOrder.formula && (
                  <>
                    <section>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Formula</h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Name:</span>{' '}
                          <span className="text-gray-900">{detailOrder.formula.name || 'Custom Formula'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Version:</span>{' '}
                          <span className="text-gray-900">v{detailOrder.formula.version}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Capsules:</span>{' '}
                          <span className="text-gray-900">{detailOrder.formula.targetCapsules || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Ingredients:</span>{' '}
                          <span className="text-gray-900">
                            {(detailOrder.formula.bases?.length || 0) + (detailOrder.formula.additions?.length || 0)} total
                          </span>
                        </div>
                      </div>
                    </section>
                    <Separator />
                  </>
                )}

                {/* Dates & Shipping */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Shipping</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Placed:</span>{' '}
                      <span className="text-gray-900">{format(new Date(detailOrder.placedAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Shipped:</span>{' '}
                      <span className="text-gray-900">
                        {detailOrder.shippedAt ? format(new Date(detailOrder.shippedAt), 'MMM d, yyyy') : '-'}
                      </span>
                    </div>
                    {detailOrder.trackingUrl && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Tracking:</span>{' '}
                        <a href={detailOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[#054700] hover:underline inline-flex items-center gap-1">
                          View Tracking <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {detailOrder.shippingAddress && (
                      <div className="col-span-2 mt-1">
                        <span className="text-gray-500">Address:</span>{' '}
                        <span className="text-gray-900">
                          {detailOrder.shippingAddress.line1}
                          {detailOrder.shippingAddress.line2 && `, ${detailOrder.shippingAddress.line2}`}
                          {', '}
                          {detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.state} {detailOrder.shippingAddress.zip}
                          {detailOrder.shippingAddress.country && detailOrder.shippingAddress.country !== 'US' && `, ${detailOrder.shippingAddress.country}`}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Refund Button */}
                {detailOrder.status !== 'cancelled' && (
                  <>
                    <Separator />
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRefundDialog({
                          open: true,
                          amountDollars: detailOrder.amountCents ? (detailOrder.amountCents / 100).toFixed(2) : '0.00',
                          reason: ''
                        })}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Refund Order
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Order not found.</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Refund Confirmation Dialog */}
        <Dialog open={refundDialog.open} onOpenChange={(open) => { if (!open) setRefundDialog({ ...refundDialog, open: false }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <DollarSign className="h-5 w-5" />
                Confirm Refund
              </DialogTitle>
              <DialogDescription>
                This will process a refund through the payment gateway and cancel the order. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium">Refund Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={refundDialog.amountDollars}
                  onChange={(e) => setRefundDialog({ ...refundDialog, amountDollars: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  placeholder="Customer request, duplicate charge, etc."
                  value={refundDialog.reason}
                  onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundDialog({ ...refundDialog, open: false })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!detailOrderId) return;
                  const cents = Math.round(parseFloat(refundDialog.amountDollars) * 100);
                  if (isNaN(cents) || cents <= 0) {
                    toast({ title: 'Invalid Amount', description: 'Enter a valid refund amount.', variant: 'destructive' });
                    return;
                  }
                  refundMutation.mutate({
                    orderId: detailOrderId,
                    amountCents: cents,
                    reason: refundDialog.reason || undefined,
                  });
                }}
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
