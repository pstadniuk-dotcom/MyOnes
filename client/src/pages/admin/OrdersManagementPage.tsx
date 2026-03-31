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
  user: { id: string; name: string; email: string };
  formula?: { totalMg: number; bases: Array<{ ingredient: string; amount: number }> };
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                        const config = statusConfig[order.status];
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
      </div>
    </div>
  );
}
