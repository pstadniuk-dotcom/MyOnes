import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Percent,
  DollarSign,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

// --- Types ---

type DiscountType = 'percent' | 'fixed_cents' | 'free_shipping';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  minOrderCents: number;
  firstOrderOnly: boolean;
  stackableWithMember: boolean;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiscountStats {
  totalActive: number;
  redemptionsLast30Days: number;
  discountCentsLast30Days: number;
}

type FormData = {
  code: string;
  description: string;
  type: DiscountType;
  value: string;          // percent (1-100), cents off, or 0
  maxUses: string;        // empty = unlimited
  maxUsesPerUser: string;
  minOrderCents: string;
  firstOrderOnly: boolean;
  stackableWithMember: boolean;
  expiresAt: string;      // YYYY-MM-DDTHH:mm or empty
  isActive: boolean;
};

const EMPTY_FORM: FormData = {
  code: '',
  description: '',
  type: 'percent',
  value: '20',
  maxUses: '',
  maxUsesPerUser: '1',
  minOrderCents: '0',
  firstOrderOnly: false,
  stackableWithMember: false,
  expiresAt: '',
  isActive: true,
};

function formatTypeLabel(type: DiscountType): string {
  if (type === 'percent') return 'Percent';
  if (type === 'fixed_cents') return 'Fixed amount';
  return 'Free shipping';
}

function formatValue(code: DiscountCode): string {
  if (code.type === 'percent') return `${code.value}% off`;
  if (code.type === 'fixed_cents') return `$${(code.value / 100).toFixed(2)} off`;
  return 'Free shipping';
}

function typeIcon(type: DiscountType) {
  if (type === 'percent') return <Percent className="w-3.5 h-3.5" />;
  if (type === 'fixed_cents') return <DollarSign className="w-3.5 h-3.5" />;
  return <Truck className="w-3.5 h-3.5" />;
}

export default function DiscountCodesAdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formDialog, setFormDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);

  // --- Queries ---

  const { data: codes, isLoading } = useQuery<DiscountCode[]>({
    queryKey: ['/api/discount-codes/admin'],
  });

  const { data: stats } = useQuery<DiscountStats>({
    queryKey: ['/api/discount-codes/admin/stats'],
  });

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/discount-codes/admin', buildPayload(data));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes/admin/stats'] });
      closeFormDialog();
      toast({ title: 'Discount code created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create discount code', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const res = await apiRequest('PATCH', `/api/discount-codes/admin/${id}`, buildPayload(data, true));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes/admin'] });
      closeFormDialog();
      toast({ title: 'Discount code updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update discount code', description: err.message, variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/discount-codes/admin/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes/admin/stats'] });
      setDeactivateConfirmId(null);
      toast({ title: 'Discount code deactivated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to deactivate discount code', description: err.message, variant: 'destructive' });
    },
  });

  // --- Helpers ---

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  function openCreateDialog() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormDialog(true);
  }

  function openEditDialog(code: DiscountCode) {
    setEditingId(code.id);
    setFormData({
      code: code.code,
      description: code.description ?? '',
      type: code.type,
      value: String(code.value),
      maxUses: code.maxUses === null ? '' : String(code.maxUses),
      maxUsesPerUser: String(code.maxUsesPerUser),
      minOrderCents: String(code.minOrderCents),
      firstOrderOnly: code.firstOrderOnly,
      stackableWithMember: code.stackableWithMember,
      expiresAt: code.expiresAt ? toLocalDateTimeInputValue(code.expiresAt) : '',
      isActive: code.isActive,
    });
    setFormDialog(true);
  }

  function closeFormDialog() {
    setFormDialog(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function handleFormSubmit() {
    if (!formData.code.trim()) {
      toast({ title: 'Code is required', variant: 'destructive' });
      return;
    }
    if (formData.type === 'percent') {
      const v = Number(formData.value);
      if (!Number.isFinite(v) || v < 1 || v > 100) {
        toast({ title: 'Percent must be between 1 and 100', variant: 'destructive' });
        return;
      }
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  // --- Filtering ---

  const filtered = (codes ?? []).filter((c) => {
    if (statusFilter === 'active') return c.isActive;
    if (statusFilter === 'inactive') return !c.isActive;
    return true;
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // --- Render ---

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discount Codes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage promo codes redeemable at checkout.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active codes</CardDescription>
            <CardTitle className="text-3xl">
              {stats ? stats.totalActive : <Skeleton className="h-9 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Redemptions (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {stats ? stats.redemptionsLast30Days : <Skeleton className="h-9 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Discount given (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {stats ? `$${(stats.discountCentsLast30Days / 100).toFixed(2)}` : <Skeleton className="h-9 w-24" />}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>All Codes</CardTitle>
              <CardDescription>{filtered.length} code(s)</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Used / Max</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Stackable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No discount codes yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{code.code}</div>
                        {code.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{code.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {typeIcon(code.type)}
                          {formatTypeLabel(code.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatValue(code)}</TableCell>
                      <TableCell>
                        {code.usedCount} / {code.maxUses === null ? '∞' : code.maxUses}
                      </TableCell>
                      <TableCell>
                        {code.expiresAt
                          ? new Date(code.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {code.stackableWithMember ? (
                          <Badge variant="secondary">Stacks</Badge>
                        ) : (
                          <Badge variant="outline">Exclusive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(code)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {code.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivateConfirmId(code.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={formDialog} onOpenChange={(open) => { if (!open) closeFormDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Discount Code' : 'Create Discount Code'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="WELCOME20"
                className="font-mono uppercase"
                disabled={!!editingId}
              />
              <p className="text-xs text-gray-500 mt-1">
                Customers will type this in. Stored uppercase.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description (admin-only)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Black Friday 2026 newsletter promo"
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => updateField('type', v as DiscountType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed_cents">Fixed amount off</SelectItem>
                  <SelectItem value="free_shipping">Free shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">
                {formData.type === 'percent' && 'Percent (1-100)'}
                {formData.type === 'fixed_cents' && 'Amount in cents'}
                {formData.type === 'free_shipping' && 'Value (unused)'}
              </Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => updateField('value', e.target.value)}
                disabled={formData.type === 'free_shipping'}
                placeholder={formData.type === 'fixed_cents' ? '500 = $5.00' : '20'}
              />
            </div>

            <div>
              <Label htmlFor="maxUses">Total max uses</Label>
              <Input
                id="maxUses"
                type="number"
                value={formData.maxUses}
                onChange={(e) => updateField('maxUses', e.target.value)}
                placeholder="Unlimited"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited.</p>
            </div>

            <div>
              <Label htmlFor="maxUsesPerUser">Max uses per user</Label>
              <Input
                id="maxUsesPerUser"
                type="number"
                value={formData.maxUsesPerUser}
                onChange={(e) => updateField('maxUsesPerUser', e.target.value)}
                placeholder="1"
              />
            </div>

            <div>
              <Label htmlFor="minOrderCents">Min. order amount (cents)</Label>
              <Input
                id="minOrderCents"
                type="number"
                value={formData.minOrderCents}
                onChange={(e) => updateField('minOrderCents', e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">5000 = $50 minimum.</p>
            </div>

            <div>
              <Label htmlFor="expiresAt">Expires at (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => updateField('expiresAt', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="firstOrderOnly" className="cursor-pointer">First-order only</Label>
                  <p className="text-xs text-gray-500">Code only valid for users with no prior orders.</p>
                </div>
                <Switch
                  id="firstOrderOnly"
                  checked={formData.firstOrderOnly}
                  onCheckedChange={(v) => updateField('firstOrderOnly', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="stackableWithMember" className="cursor-pointer">Stack with member discount</Label>
                  <p className="text-xs text-gray-500">
                    If off, code competes with the 15% member discount and the bigger one wins.
                  </p>
                </div>
                <Switch
                  id="stackableWithMember"
                  checked={formData.stackableWithMember}
                  onCheckedChange={(v) => updateField('stackableWithMember', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                  <p className="text-xs text-gray-500">Inactive codes are rejected at checkout.</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(v) => updateField('isActive', v)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeFormDialog}>Cancel</Button>
            <Button onClick={handleFormSubmit} disabled={!formData.code || isMutating}>
              {isMutating ? 'Saving…' : editingId ? 'Save Changes' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <Dialog open={!!deactivateConfirmId} onOpenChange={(open) => { if (!open) setDeactivateConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Discount Code</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            Deactivating will prevent new redemptions. Past redemptions are preserved for reporting.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deactivateConfirmId && deactivateMutation.mutate(deactivateConfirmId)}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Helpers ---

function buildPayload(data: FormData, isUpdate = false) {
  const payload: any = {
    description: data.description.trim() || null,
    type: data.type,
    value: data.type === 'free_shipping' ? 0 : Number(data.value) || 0,
    maxUses: data.maxUses === '' ? null : Number(data.maxUses),
    maxUsesPerUser: Number(data.maxUsesPerUser) || 1,
    minOrderCents: Number(data.minOrderCents) || 0,
    firstOrderOnly: !!data.firstOrderOnly,
    stackableWithMember: !!data.stackableWithMember,
    expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
    isActive: !!data.isActive,
  };
  if (!isUpdate) payload.code = data.code.toUpperCase().trim();
  return payload;
}

function toLocalDateTimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
