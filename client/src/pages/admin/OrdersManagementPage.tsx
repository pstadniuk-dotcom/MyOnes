import { useState, useCallback, useEffect, useMemo } from 'react';
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
  Eye,
  DollarSign,
  RotateCcw,
  AlertCircle,
  AlertCircleIcon,
  Ban,
  AlertTriangle,
  CreditCard,
  FileText,
  Mail,
  Send,
  RefreshCcw,
  Pencil,
  Trash2,
  Plus,
  Beaker,
  BadgePercent,
  History,
  ClipboardList,
} from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed' | 'voided' | 'placed' | 'completed' | 'settlement_failed';
  amountCents: number | null;
  manufacturerCostCents: number | null;
  supplyMonths: number | null;
  trackingUrl: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  isTestOrder: boolean;
  discountCodeId: string | null;
  discountAppliedCents: number;
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
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  refunded: { icon: RotateCcw, color: 'bg-orange-100 text-orange-700', label: 'Refunded' },
  failed: { icon: AlertTriangle, color: 'bg-rose-100 text-rose-700', label: 'Failed' },
  voided: { icon: Ban, color: 'bg-slate-100 text-slate-700', label: 'Voided' },
  placed: { icon: FileText, color: 'bg-cyan-100 text-cyan-700', label: 'Placed' },
  completed: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  settlement_failed: { icon: CreditCard, color: 'bg-red-100 text-red-700', label: 'Settlement Failed' }
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hideTestOrders, setHideTestOrders] = useState(true);
  const [hasDiscountCode, setHasDiscountCode] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>('placedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; amountDollars: string; reason: string }>({ open: false, amountDollars: '', reason: '' });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<{ open: boolean; status: string; trackingUrl: string }>({ open: false, status: 'shipped', trackingUrl: '' });

  // New action dialogs
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });

  // Notes
  const [newNoteBody, setNewNoteBody] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; body: string } | null>(null);

  // Tracking edit
  const [trackingForm, setTrackingForm] = useState<{ trackingNumber: string; carrier: string; trackingUrl: string }>({ trackingNumber: '', carrier: '', trackingUrl: '' });
  const [trackingDirty, setTrackingDirty] = useState(false);

  // Debounce search by 300ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const limit = 20;

  const ordersQueryKey = useMemo(
    () => ['/api/admin/orders', statusFilter, debouncedSearch, hideTestOrders, hasDiscountCode, dateFrom, dateTo, page],
    [statusFilter, debouncedSearch, hideTestOrders, hasDiscountCode, dateFrom, dateTo, page],
  );

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ordersQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      params.append('hideTestOrders', String(hideTestOrders));
      if (hasDiscountCode) params.append('hasDiscountCode', 'true');
      if (dateFrom) params.append('startDate', new Date(dateFrom).toISOString());
      if (dateTo) params.append('endDate', new Date(dateTo).toISOString());
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

  // Detail-only side queries
  const { data: orderNotes } = useQuery<Array<{ id: string; body: string; adminId: string; createdAt: string; updatedAt: string }>>({
    queryKey: ['/api/admin/orders', detailOrderId, 'notes'],
    queryFn: async () => (await apiRequest('GET', `/api/admin/orders/${detailOrderId}/notes`)).json(),
    enabled: !!detailOrderId,
  });

  const { data: orderRefunds } = useQuery<Array<{ id: string; status: string; amountCents: number; reason: string | null; transactionId: string | null; createdAt: string }>>({
    queryKey: ['/api/admin/orders', detailOrderId, 'refunds'],
    queryFn: async () => (await apiRequest('GET', `/api/admin/orders/${detailOrderId}/refunds`)).json(),
    enabled: !!detailOrderId,
  });

  const { data: orderActivity } = useQuery<{ rows: Array<{ id: string; action: string; details: any; createdAt: string; adminName: string | null; adminEmail: string | null }>; total: number }>({
    queryKey: ['/api/admin/orders', detailOrderId, 'activity'],
    queryFn: async () => (await apiRequest('GET', `/api/admin/orders/${detailOrderId}/activity?limit=50`)).json(),
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

  const cancelMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/orders/${orderId}/cancel`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setCancelDialog({ open: false, reason: '' });
      toast({ title: 'Order cancelled', description: 'No money moved. Manufacturer cancellation attempted.' });
    },
    onError: (error: any) => toast({ title: 'Cancel failed', description: error?.message, variant: 'destructive' }),
  });

  const voidMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/orders/${orderId}/void`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setVoidDialog({ open: false, reason: '' });
      toast({ title: 'Transaction voided', description: 'EPD void recorded. Refund row created with status voided.' });
    },
    onError: (error: any) => toast({ title: 'Void failed', description: error?.message, variant: 'destructive' }),
  });

  const resendConfirmationMutation = useMutation({
    mutationFn: async (orderId: string) => (await apiRequest('POST', `/api/admin/orders/${orderId}/resend-confirmation`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'activity'] });
      toast({ title: 'Confirmation resent' });
    },
    onError: (e: any) => toast({ title: 'Resend failed', description: e?.message, variant: 'destructive' }),
  });

  const resendShippingMutation = useMutation({
    mutationFn: async (orderId: string) => (await apiRequest('POST', `/api/admin/orders/${orderId}/resend-shipping`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'activity'] });
      toast({ title: 'Shipping notification resent' });
    },
    onError: (e: any) => toast({ title: 'Resend failed', description: e?.message, variant: 'destructive' }),
  });

  const testFlagMutation = useMutation({
    mutationFn: async ({ orderId, isTest }: { orderId: string; isTest: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/orders/${orderId}/test-flag`, { isTest });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: vars.isTest ? 'Marked as test order' : 'Removed test flag' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const retryManufacturerMutation = useMutation({
    mutationFn: async (orderId: string) => (await apiRequest('POST', `/api/admin/orders/${orderId}/retry-manufacturer`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: 'Manufacturer retry submitted' });
    },
    onError: (e: any) => toast({ title: 'Retry failed', description: e?.message, variant: 'destructive' }),
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, ...payload }: { orderId: string; trackingNumber?: string | null; carrier?: string | null; trackingUrl?: string | null }) => {
      const res = await apiRequest('PATCH', `/api/admin/orders/${orderId}/tracking-fields`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setTrackingDirty(false);
      toast({ title: 'Tracking updated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ orderId, body }: { orderId: string; body: string }) => (await apiRequest('POST', `/api/admin/orders/${orderId}/notes`, { body })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'activity'] });
      setNewNoteBody('');
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, body }: { noteId: string; body: string }) => (await apiRequest('PATCH', `/api/admin/orders/notes/${noteId}`, { body })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'notes'] });
      setEditingNote(null);
    },
    onError: (e: any) => toast({ title: 'Edit failed', description: e?.message, variant: 'destructive' }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => apiRequest('DELETE', `/api/admin/orders/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', detailOrderId, 'notes'] });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' }),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status, trackingUrl }: { orderIds: string[]; status: string; trackingUrl?: string }) => {
      const res = await apiRequest('POST', `/api/admin/orders/bulk-status`, { orderIds, status, trackingUrl });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setBulkDialog({ open: false, status: 'shipped', trackingUrl: '' });
      setSelectedIds(new Set());
      const ok = data?.results?.filter((r: any) => r.ok).length ?? 0;
      const fail = (data?.results?.length ?? 0) - ok;
      toast({ title: `Bulk update: ${ok} succeeded${fail ? `, ${fail} failed` : ''}` });
    },
    onError: (e: any) => toast({ title: 'Bulk update failed', description: e?.message, variant: 'destructive' }),
  });

  // Sync tracking edit form with detailOrder when it changes (and reset dirty state).
  useEffect(() => {
    if (detailOrder) {
      setTrackingForm({
        trackingNumber: detailOrder.trackingNumber || '',
        carrier: detailOrder.carrier || '',
        trackingUrl: detailOrder.trackingUrl || '',
      });
      setTrackingDirty(false);
    }
  }, [detailOrder]);

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

  // Server-side search/filter is now applied; client-side just sorts the page.
  let filteredOrders = data?.orders ?? [];

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

  // ── Cost / margin helpers ──
  const formatCents = (cents: number | null | undefined): string =>
    cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

  const grossMarginCents = (order: { amountCents: number | null; manufacturerCostCents: number | null }): number | null => {
    if (order.amountCents == null || order.manufacturerCostCents == null) return null;
    return order.amountCents - order.manufacturerCostCents;
  };

  const grossMarginPct = (order: { amountCents: number | null; manufacturerCostCents: number | null }): number | null => {
    const margin = grossMarginCents(order);
    if (margin == null || !order.amountCents) return null;
    return (margin / order.amountCents) * 100;
  };

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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, order ID, txn ID, tracking #…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
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
              <div className="flex items-center gap-2">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="w-[150px]" />
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="w-[150px]" />
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div className="flex items-center gap-2">
                <Switch id="hideTest" checked={hideTestOrders} onCheckedChange={(v) => { setHideTestOrders(v); setPage(0); }} />
                <Label htmlFor="hideTest" className="cursor-pointer">Hide test orders</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="hasDiscount" checked={hasDiscountCode} onCheckedChange={(v) => { setHasDiscountCode(v); setPage(0); }} />
                <Label htmlFor="hasDiscount" className="cursor-pointer">Discount code applied</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk-actions bar (appears when at least one row is selected) */}
        {selectedIds.size > 0 && (
          <Card className="border-[#054700]/20 bg-[#054700]/[0.04]">
            <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-medium">{selectedIds.size} selected</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkDialog({ open: true, status: 'shipped', trackingUrl: '' })}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Mark Shipped
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({data?.total || 0})</CardTitle>
            <CardDescription>
              Click column headers to sort.
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
                      <TableHead className="w-8">
                        <Checkbox
                          checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id))}
                          onCheckedChange={(v) => {
                            if (v) {
                              setSelectedIds(new Set(filteredOrders.map(o => o.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          aria-label="Select all"
                        />
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
                      <TableHead>Cost</TableHead>
                      <TableHead>Margin</TableHead>
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
                        <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                        const config = statusConfig[order.status as keyof typeof statusConfig] || {
                          icon: AlertCircleIcon,
                          color: 'bg-gray-100 text-gray-700',
                          label: order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'
                        };
                        const StatusIcon = config.icon;
                        return (
                          <TableRow key={order.id} className={order.isTestOrder ? 'opacity-60' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(order.id)}
                                onCheckedChange={(v) => {
                                  setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (v) next.add(order.id); else next.delete(order.id);
                                    return next;
                                  });
                                }}
                                aria-label={`Select order ${order.id.slice(0, 8)}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <span>{order.id.slice(0, 8)}...</span>
                                {order.isTestOrder && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 text-amber-700">
                                    <Beaker className="w-2.5 h-2.5 mr-0.5" />TEST
                                  </Badge>
                                )}
                                {order.discountCodeId && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-300 text-emerald-700">
                                    <BadgePercent className="w-2.5 h-2.5 mr-0.5" />Code
                                  </Badge>
                                )}
                                {order.manufacturerOrderStatus === 'failed' && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-300 text-red-700">
                                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Mfr fail
                                  </Badge>
                                )}
                              </div>
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
                              <Badge className={config.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.amountCents ? `$${(order.amountCents / 100).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatCents(order.manufacturerCostCents)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const margin = grossMarginCents(order);
                                const pct = grossMarginPct(order);
                                if (margin == null) return <span className="text-gray-400">—</span>;
                                const isNeg = margin < 0;
                                return (
                                  <span className={isNeg ? 'text-red-600' : 'text-emerald-700'}>
                                    {formatCents(margin)}
                                    {pct != null && (
                                      <span className="ml-1 text-xs text-gray-500">({pct.toFixed(1)}%)</span>
                                    )}
                                  </span>
                                );
                              })()}
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
                        const cfg = statusConfig[detailOrder.status as keyof typeof statusConfig] || {
                          icon: AlertCircleIcon,
                          color: 'bg-gray-100 text-gray-700',
                          label: detailOrder.status ? detailOrder.status.charAt(0).toUpperCase() + detailOrder.status.slice(1) : 'Unknown'
                        };
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

                {/* Financials — internal only */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Financials <span className="text-xs font-normal text-gray-400">(internal)</span></h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Customer paid:</span>{' '}
                      <span className="font-medium text-gray-900">{formatCents(detailOrder.amountCents)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Manufacturer cost:</span>{' '}
                      <span className="text-gray-900">{formatCents(detailOrder.manufacturerCostCents)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Gross margin:</span>{' '}
                      {(() => {
                        const margin = grossMarginCents(detailOrder);
                        if (margin == null) return <span className="text-gray-400">—</span>;
                        const isNeg = margin < 0;
                        return (
                          <span className={`font-medium ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
                            {formatCents(margin)}
                          </span>
                        );
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-500">Margin %:</span>{' '}
                      {(() => {
                        const pct = grossMarginPct(detailOrder);
                        if (pct == null) return <span className="text-gray-400">—</span>;
                        const isNeg = pct < 0;
                        return (
                          <span className={`font-medium ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
                            {pct.toFixed(1)}%
                          </span>
                        );
                      })()}
                    </div>
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

                {/* Linked transactions */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Linked transactions</h4>
                  <div className="space-y-2 text-sm">
                    {detailOrder.discountCodeId && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgePercent className="w-4 h-4 text-emerald-700" />
                          <span>Discount applied: ${(detailOrder.discountAppliedCents / 100).toFixed(2)}</span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href="/admin/discount-codes"><ExternalLink className="w-3.5 h-3.5" /></a>
                        </Button>
                      </div>
                    )}
                    {detailOrder.manufacturerOrderId && (
                      <div className="rounded-md border p-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500">Manufacturer (Alive)</div>
                          <div className="font-mono text-xs">{detailOrder.manufacturerOrderId}</div>
                          {detailOrder.manufacturerOrderStatus && (
                            <Badge variant="outline" className="mt-1 text-[10px]">{detailOrder.manufacturerOrderStatus}</Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => detailOrderId && retryManufacturerMutation.mutate(detailOrderId)}
                          disabled={retryManufacturerMutation.isPending}
                        >
                          <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                          Resync
                        </Button>
                      </div>
                    )}
                    {orderRefunds && orderRefunds.length > 0 && (
                      <div className="rounded-md border p-2">
                        <div className="text-xs text-gray-500 mb-1">Refunds ({orderRefunds.length})</div>
                        <div className="space-y-1">
                          {orderRefunds.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                                <span>${(r.amountCents / 100).toFixed(2)}</span>
                                {r.reason && <span className="text-gray-500 truncate max-w-[200px]">— {r.reason}</span>}
                              </div>
                              <span className="text-gray-400">{format(new Date(r.createdAt), 'MMM d')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Tracking edit */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Tracking</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500" htmlFor="tracking-number">Tracking number</Label>
                      <Input
                        id="tracking-number"
                        value={trackingForm.trackingNumber}
                        onChange={(e) => { setTrackingForm({ ...trackingForm, trackingNumber: e.target.value }); setTrackingDirty(true); }}
                        placeholder="1Z…"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500" htmlFor="carrier">Carrier</Label>
                      <Select
                        value={trackingForm.carrier || 'none'}
                        onValueChange={(v) => { setTrackingForm({ ...trackingForm, carrier: v === 'none' ? '' : v }); setTrackingDirty(true); }}
                      >
                        <SelectTrigger id="carrier">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="ups">UPS</SelectItem>
                          <SelectItem value="fedex">FedEx</SelectItem>
                          <SelectItem value="dhl">DHL</SelectItem>
                          <SelectItem value="usps">USPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500" htmlFor="tracking-url">Tracking URL</Label>
                      <Input
                        id="tracking-url"
                        value={trackingForm.trackingUrl}
                        onChange={(e) => { setTrackingForm({ ...trackingForm, trackingUrl: e.target.value }); setTrackingDirty(true); }}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Placed {format(new Date(detailOrder.placedAt), 'MMM d, yyyy h:mm a')}{detailOrder.shippedAt ? ` · Shipped ${format(new Date(detailOrder.shippedAt), 'MMM d, yyyy')}` : ''}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!trackingDirty || updateTrackingMutation.isPending}
                        onClick={() => detailOrderId && updateTrackingMutation.mutate({
                          orderId: detailOrderId,
                          trackingNumber: trackingForm.trackingNumber || null,
                          carrier: trackingForm.carrier || null,
                          trackingUrl: trackingForm.trackingUrl || null,
                        })}
                      >
                        Save tracking
                      </Button>
                    </div>
                    {detailOrder.shippingAddress && (
                      <div className="col-span-2 text-xs">
                        <span className="text-gray-500">Ship to:</span>{' '}
                        <span className="text-gray-900">
                          {detailOrder.shippingAddress.line1}
                          {detailOrder.shippingAddress.line2 && `, ${detailOrder.shippingAddress.line2}`}
                          {', '}
                          {detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.state} {detailOrder.shippingAddress.zip}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Notes */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Internal notes
                  </h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Textarea
                        rows={2}
                        placeholder="Add a note (visible to admins only)…"
                        value={newNoteBody}
                        onChange={(e) => setNewNoteBody(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => detailOrderId && newNoteBody.trim() && createNoteMutation.mutate({ orderId: detailOrderId, body: newNoteBody })}
                        disabled={!newNoteBody.trim() || createNoteMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1" />Add
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(orderNotes ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No notes yet.</p>
                      ) : (
                        (orderNotes ?? []).map(note => (
                          <div key={note.id} className="rounded-md border p-2 text-sm">
                            {editingNote?.id === note.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  rows={2}
                                  value={editingNote.body}
                                  onChange={(e) => setEditingNote({ ...editingNote, body: e.target.value })}
                                />
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>Cancel</Button>
                                  <Button
                                    size="sm"
                                    onClick={() => updateNoteMutation.mutate({ noteId: note.id, body: editingNote.body })}
                                    disabled={updateNoteMutation.isPending || !editingNote.body.trim()}
                                  >Save</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap text-gray-800">{note.body}</p>
                                <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                                  <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setEditingNote({ id: note.id, body: note.body })}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => deleteNoteMutation.mutate(note.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Activity log */}
                <section>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Activity log {orderActivity?.total ? <span className="text-xs text-gray-400">({orderActivity.total})</span> : null}
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                    {(orderActivity?.rows ?? []).length === 0 ? (
                      <p className="text-gray-400 italic">No admin activity recorded.</p>
                    ) : (
                      (orderActivity?.rows ?? []).map(row => (
                        <div key={row.id} className="flex items-center justify-between border-b last:border-b-0 py-1">
                          <div>
                            <Badge variant="outline" className="mr-2 text-[10px]">{row.action.replace(/_/g, ' ')}</Badge>
                            <span className="text-gray-500">{row.adminName || row.adminEmail || row.id.slice(0, 6)}</span>
                          </div>
                          <span className="text-gray-400">{format(new Date(row.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <Separator />

                {/* Action buttons */}
                <section className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => detailOrderId && resendConfirmationMutation.mutate(detailOrderId)} disabled={resendConfirmationMutation.isPending}>
                      <Mail className="w-4 h-4 mr-1" />Resend confirmation
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!detailOrder.shippedAt || !detailOrder.trackingUrl || resendShippingMutation.isPending}
                      onClick={() => detailOrderId && resendShippingMutation.mutate(detailOrderId)}
                    >
                      <Send className="w-4 h-4 mr-1" />Resend shipping
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => detailOrderId && testFlagMutation.mutate({ orderId: detailOrderId, isTest: !detailOrder.isTestOrder })}
                      disabled={testFlagMutation.isPending}
                    >
                      <Beaker className="w-4 h-4 mr-1" />
                      {detailOrder.isTestOrder ? 'Unmark test' : 'Mark as test'}
                    </Button>
                  </div>
                  {detailOrder.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" onClick={() => setCancelDialog({ open: true, reason: '' })}>
                        <Ban className="w-4 h-4 mr-1" />Cancel (no refund)
                      </Button>
                      <Button size="sm" variant="outline" disabled={!detailOrder.gatewayTransactionId} onClick={() => setVoidDialog({ open: true, reason: '' })}>
                        <XCircle className="w-4 h-4 mr-1" />Void
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRefundDialog({
                          open: true,
                          amountDollars: detailOrder.amountCents ? (detailOrder.amountCents / 100).toFixed(2) : '0.00',
                          reason: ''
                        })}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />Refund
                      </Button>
                    </div>
                  )}
                </section>
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

        {/* Cancel without refund */}
        <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ ...cancelDialog, open: false }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Cancel order (no refund)
              </DialogTitle>
              <DialogDescription>
                Marks the order cancelled and attempts to cancel the manufacturer order. <strong>Does NOT refund the customer.</strong> Use this for orders that were already comp'd out-of-band, or orders that never settled and don't need refunding.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="cancel-reason" className="text-sm">Reason (required)</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
                placeholder="Why is this being cancelled without a refund?"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialog({ ...cancelDialog, open: false })}>Back</Button>
              <Button
                onClick={() => detailOrderId && cancelMutation.mutate({ orderId: detailOrderId, reason: cancelDialog.reason })}
                disabled={!cancelDialog.reason.trim() || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void */}
        <Dialog open={voidDialog.open} onOpenChange={(open) => { if (!open) setVoidDialog({ ...voidDialog, open: false }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Void transaction
              </DialogTitle>
              <DialogDescription>
                Reverses the EPD transaction (only works for unsettled charges). On success, the order is cancelled and a refund row is created with status <code>voided</code>. Use Refund instead if the transaction has already settled.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="void-reason" className="text-sm">Reason (required)</Label>
              <Textarea
                id="void-reason"
                rows={3}
                value={voidDialog.reason}
                onChange={(e) => setVoidDialog({ ...voidDialog, reason: e.target.value })}
                placeholder="Why is this transaction being voided?"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialog({ ...voidDialog, open: false })}>Back</Button>
              <Button
                variant="destructive"
                onClick={() => detailOrderId && voidMutation.mutate({ orderId: detailOrderId, reason: voidDialog.reason })}
                disabled={!voidDialog.reason.trim() || voidMutation.isPending}
              >
                {voidMutation.isPending ? 'Voiding…' : 'Confirm void'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk status update */}
        <Dialog open={bulkDialog.open} onOpenChange={(open) => { if (!open) setBulkDialog({ ...bulkDialog, open: false }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk update status</DialogTitle>
              <DialogDescription>
                Apply this change to {selectedIds.size} selected order{selectedIds.size === 1 ? '' : 's'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-sm" htmlFor="bulk-status">New status</Label>
                <Select value={bulkDialog.status} onValueChange={(v) => setBulkDialog({ ...bulkDialog, status: v })}>
                  <SelectTrigger id="bulk-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {bulkDialog.status === 'shipped' && (
                <div>
                  <Label className="text-sm" htmlFor="bulk-tracking">Tracking URL (optional)</Label>
                  <Input
                    id="bulk-tracking"
                    value={bulkDialog.trackingUrl}
                    onChange={(e) => setBulkDialog({ ...bulkDialog, trackingUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialog({ ...bulkDialog, open: false })}>Cancel</Button>
              <Button
                onClick={() => bulkStatusMutation.mutate({
                  orderIds: Array.from(selectedIds),
                  status: bulkDialog.status,
                  trackingUrl: bulkDialog.trackingUrl || undefined,
                })}
                disabled={bulkStatusMutation.isPending}
              >
                {bulkStatusMutation.isPending ? 'Applying…' : `Apply to ${selectedIds.size}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
