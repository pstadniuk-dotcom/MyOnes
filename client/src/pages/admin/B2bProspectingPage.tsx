import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  UserCheck,
  Phone,
  TrendingUp,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Send,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface B2bStats {
  totalProspects: number;
  newThisMonth: number;
  qualified: number;
  contacted: number;
  converted: number;
  avgLeadScore: number;
}

type ProspectStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
type PracticeType = 'dermatology' | 'med_spa' | 'functional_medicine' | 'naturopathic' | 'integrative' | 'chiropractic' | 'wellness_center' | 'other';

interface Prospect {
  id: string;
  practiceName: string;
  practiceType: PracticeType;
  specialty: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primaryContactName: string | null;
  primaryContactTitle: string | null;
  primaryContactEmail: string | null;
  leadScore: number;
  source: string | null;
  providerCount: number | null;
  notes: string | null;
  status: ProspectStatus;
  lastActivity: string | null;
  createdAt: string;
}

type OutreachType = 'email' | 'call' | 'meeting' | 'demo' | 'proposal';
type OutreachOutcome = 'no_response' | 'interested' | 'not_interested' | 'follow_up' | 'scheduled_demo' | 'closed_won' | 'closed_lost';

interface OutreachEntry {
  id: string;
  prospectId: string;
  type: OutreachType;
  subject: string;
  body: string | null;
  outcome: OutreachOutcome | null;
  notes: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: ProspectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLORS: Record<ProspectStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  proposal: 'bg-indigo-100 text-indigo-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const PRACTICE_TYPE_OPTIONS: { value: PracticeType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Practice Types' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'med_spa', label: 'Med Spa' },
  { value: 'functional_medicine', label: 'Functional Medicine' },
  { value: 'naturopathic', label: 'Naturopathic' },
  { value: 'integrative', label: 'Integrative' },
  { value: 'chiropractic', label: 'Chiropractic' },
  { value: 'wellness_center', label: 'Wellness Center' },
  { value: 'other', label: 'Other' },
];

const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  dermatology: 'Dermatology',
  med_spa: 'Med Spa',
  functional_medicine: 'Functional Medicine',
  naturopathic: 'Naturopathic',
  integrative: 'Integrative',
  chiropractic: 'Chiropractic',
  wellness_center: 'Wellness Center',
  other: 'Other',
};

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'conference', label: 'Conference' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Other' },
];

const OUTREACH_TYPE_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
  { value: 'proposal', label: 'Proposal' },
];

const OUTCOME_OPTIONS = [
  { value: 'no_response', label: 'No Response' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'scheduled_demo', label: 'Scheduled Demo' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyProspectForm = (): Omit<Prospect, 'id' | 'lastActivity' | 'createdAt'> => ({
  practiceName: '',
  practiceType: 'other' as PracticeType,
  specialty: '',
  website: '',
  phone: '',
  email: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  primaryContactName: '',
  primaryContactTitle: '',
  primaryContactEmail: '',
  leadScore: 50,
  source: 'website',
  providerCount: null,
  notes: '',
  status: 'new',
});

const emptyOutreachForm = () => ({
  type: 'email' as OutreachType,
  subject: '',
  body: '',
  outcome: '' as string,
  notes: '',
});

function LeadScoreBar({ score }: { score: number }) {
  const color = score < 30 ? 'bg-red-500' : score <= 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <span className="text-xs text-gray-600 tabular-nums w-7 text-right">{score}</span>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function B2bProspectingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PracticeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);

  // Forms
  const [prospectForm, setProspectForm] = useState(emptyProspectForm());
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null);
  const [outreachForm, setOutreachForm] = useState(emptyOutreachForm());

  // Selected prospect for detail view
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // ---- Queries ----
  const { data: stats, isLoading: statsLoading } = useQuery<B2bStats>({
    queryKey: ['/api/admin/b2b/stats'],
  });

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (typeFilter !== 'all') queryParams.set('practiceType', typeFilter);
  const prospectsQueryKey = `/api/admin/b2b/prospects?${queryParams.toString()}`;

  const { data: prospects, isLoading: prospectsLoading } = useQuery<Prospect[]>({
    queryKey: [prospectsQueryKey],
  });

  const { data: outreachHistory, isLoading: outreachLoading } = useQuery<OutreachEntry[]>({
    queryKey: [`/api/admin/b2b/prospects/${selectedProspect?.id}/outreach`],
    enabled: !!selectedProspect,
  });

  // ---- Mutations ----
  const createProspectMutation = useMutation({
    mutationFn: async (data: typeof prospectForm) => {
      const res = await apiRequest('POST', '/api/admin/b2b/prospects', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [prospectsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b/stats'] });
      setAddDialogOpen(false);
      setProspectForm(emptyProspectForm());
      toast({ title: 'Prospect created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create prospect', variant: 'destructive' });
    },
  });

  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Prospect> }) => {
      const res = await apiRequest('PATCH', `/api/admin/b2b/prospects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [prospectsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b/stats'] });
      setEditDialogOpen(false);
      setEditingProspect(null);
      toast({ title: 'Prospect updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update prospect', variant: 'destructive' });
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/b2b/prospects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [prospectsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b/stats'] });
      setDeleteDialogOpen(false);
      setDeletingProspect(null);
      if (selectedProspect?.id === deletingProspect?.id) {
        setSelectedProspect(null);
      }
      toast({ title: 'Prospect deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete prospect', variant: 'destructive' });
    },
  });

  const createOutreachMutation = useMutation({
    mutationFn: async ({ prospectId, data }: { prospectId: string; data: typeof outreachForm }) => {
      const res = await apiRequest('POST', `/api/admin/b2b/prospects/${prospectId}/outreach`, data);
      return res.json();
    },
    onSuccess: () => {
      if (selectedProspect) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/b2b/prospects/${selectedProspect.id}/outreach`] });
      }
      queryClient.invalidateQueries({ queryKey: [prospectsQueryKey] });
      setOutreachDialogOpen(false);
      setOutreachForm(emptyOutreachForm());
      toast({ title: 'Outreach logged successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to log outreach', variant: 'destructive' });
    },
  });

  // ---- Filtered prospects ----
  const filteredProspects = (prospects ?? []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.practiceName.toLowerCase().includes(q) ||
      p.primaryContactName?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q) ||
      p.specialty?.toLowerCase().includes(q)
    );
  });

  // ---- Handlers ----
  function openEditDialog(prospect: Prospect) {
    setEditingProspect(prospect);
    setEditDialogOpen(true);
  }

  function openDeleteDialog(prospect: Prospect) {
    setDeletingProspect(prospect);
    setDeleteDialogOpen(true);
  }

  // ---- Loading state ----
  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ---- Detail view when a prospect is selected ----
  if (selectedProspect) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedProspect(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Pipeline
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {selectedProspect.practiceName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_COLORS[selectedProspect.status]}>{selectedProspect.status}</Badge>
              <span className="text-sm text-gray-500">
                {PRACTICE_TYPE_LABELS[selectedProspect.practiceType]}
                {selectedProspect.specialty ? ` - ${selectedProspect.specialty}` : ''}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEditDialog(selectedProspect)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" onClick={() => setOutreachDialogOpen(true)} style={{ backgroundColor: '#054700' }}>
              <Send className="h-4 w-4 mr-1" /> Log Outreach
            </Button>
          </div>
        </div>

        {/* Prospect Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {selectedProspect.primaryContactName && (
                <div><span className="text-gray-500">Primary Contact:</span> {selectedProspect.primaryContactName}{selectedProspect.primaryContactTitle ? ` (${selectedProspect.primaryContactTitle})` : ''}</div>
              )}
              {selectedProspect.primaryContactEmail && (
                <div><span className="text-gray-500">Contact Email:</span> {selectedProspect.primaryContactEmail}</div>
              )}
              {selectedProspect.email && (
                <div><span className="text-gray-500">Practice Email:</span> {selectedProspect.email}</div>
              )}
              {selectedProspect.phone && (
                <div><span className="text-gray-500">Phone:</span> {selectedProspect.phone}</div>
              )}
              {selectedProspect.website && (
                <div><span className="text-gray-500">Website:</span> <a href={selectedProspect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedProspect.website}</a></div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(selectedProspect.city || selectedProspect.state) && (
                <div><span className="text-gray-500">Location:</span> {[selectedProspect.addressLine1, selectedProspect.city, selectedProspect.state, selectedProspect.zip].filter(Boolean).join(', ')}</div>
              )}
              <div><span className="text-gray-500">Lead Score:</span> <span className="inline-block align-middle ml-1"><LeadScoreBar score={selectedProspect.leadScore} /></span></div>
              {selectedProspect.source && (
                <div><span className="text-gray-500">Source:</span> {selectedProspect.source}</div>
              )}
              {selectedProspect.providerCount != null && (
                <div><span className="text-gray-500">Provider Count:</span> {selectedProspect.providerCount}</div>
              )}
              {selectedProspect.notes && (
                <div><span className="text-gray-500">Notes:</span> {selectedProspect.notes}</div>
              )}
              <div><span className="text-gray-500">Created:</span> {formatDate(selectedProspect.createdAt)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Outreach History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Outreach History</CardTitle>
                <CardDescription>All interactions with this prospect</CardDescription>
              </div>
              <Button size="sm" onClick={() => setOutreachDialogOpen(true)} style={{ backgroundColor: '#054700' }}>
                <Plus className="h-4 w-4 mr-1" /> Log Outreach
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {outreachLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !outreachHistory || outreachHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Send className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No outreach recorded yet.</p>
                <p className="text-xs mt-1">Log your first interaction to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outreachHistory.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{entry.type}</Badge>
                          <span className="font-medium text-sm">{entry.subject}</span>
                        </div>
                        {entry.body && (
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{entry.body}</p>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">{entry.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</p>
                        {entry.outcome && (
                          <Badge className="mt-1 capitalize text-xs" variant="secondary">{entry.outcome.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outreach Dialog */}
        <Dialog open={outreachDialogOpen} onOpenChange={setOutreachDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Outreach</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Type</Label>
                <Select value={outreachForm.type} onValueChange={(v) => setOutreachForm({ ...outreachForm, type: v as OutreachType })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTREACH_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Input
                  value={outreachForm.subject}
                  onChange={(e) => setOutreachForm({ ...outreachForm, subject: e.target.value })}
                  placeholder="e.g. Initial outreach email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  value={outreachForm.body}
                  onChange={(e) => setOutreachForm({ ...outreachForm, body: e.target.value })}
                  placeholder="Details of the interaction..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={outreachForm.outcome} onValueChange={(v) => setOutreachForm({ ...outreachForm, outcome: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                  <SelectContent>
                    {OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={outreachForm.notes}
                  onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })}
                  placeholder="Internal notes..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOutreachDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => selectedProspect && createOutreachMutation.mutate({ prospectId: selectedProspect.id, data: outreachForm })}
                disabled={!outreachForm.subject || createOutreachMutation.isPending}
                style={{ backgroundColor: '#054700' }}
              >
                {createOutreachMutation.isPending ? 'Saving...' : 'Log Outreach'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog (shared) */}
        {renderEditDialog()}
      </div>
    );
  }

  // ---- Prospect form fields (shared between add and edit) ----
  function renderProspectFormFields(
    form: ReturnType<typeof emptyProspectForm>,
    setForm: (f: ReturnType<typeof emptyProspectForm>) => void,
  ) {
    return (
      <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Practice Name *</Label>
            <Input value={form.practiceName} onChange={(e) => setForm({ ...form, practiceName: e.target.value })} placeholder="e.g. Glow Dermatology" className="mt-1" />
          </div>
          <div>
            <Label>Practice Type *</Label>
            <Select value={form.practiceType} onValueChange={(v) => setForm({ ...form, practiceType: v as PracticeType })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRACTICE_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Specialty</Label>
            <Input value={form.specialty ?? ''} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Cosmetic dermatology" className="mt-1" />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@practice.com" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={form.addressLine1 ?? ''} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="123 Main St" className="mt-1" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="mt-1" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={form.state ?? ''} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="CA" className="mt-1" />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={form.zip ?? ''} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="90210" className="mt-1" />
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source ?? 'website'} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Primary Contact</p>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={form.primaryContactName ?? ''} onChange={(e) => setForm({ ...form, primaryContactName: e.target.value })} placeholder="Dr. Jane Smith" className="mt-1" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.primaryContactTitle ?? ''} onChange={(e) => setForm({ ...form, primaryContactTitle: e.target.value })} placeholder="Medical Director" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Contact Email</Label>
            <Input value={form.primaryContactEmail ?? ''} onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })} placeholder="jane@practice.com" className="mt-1" />
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Scoring & Notes</p>
          </div>
          <div>
            <Label>Lead Score (0-100)</Label>
            <Input type="number" min={0} max={100} value={form.leadScore} onChange={(e) => setForm({ ...form, leadScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="mt-1" />
          </div>
          <div>
            <Label>Provider Count</Label>
            <Input type="number" min={0} value={form.providerCount ?? ''} onChange={(e) => setForm({ ...form, providerCount: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 5" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes about this prospect..." className="mt-1" rows={3} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Edit Dialog ----
  function renderEditDialog() {
    if (!editingProspect) return null;
    const form: ReturnType<typeof emptyProspectForm> = {
      practiceName: editingProspect.practiceName,
      practiceType: editingProspect.practiceType,
      specialty: editingProspect.specialty ?? '',
      website: editingProspect.website ?? '',
      phone: editingProspect.phone ?? '',
      email: editingProspect.email ?? '',
      addressLine1: editingProspect.addressLine1 ?? '',
      city: editingProspect.city ?? '',
      state: editingProspect.state ?? '',
      zip: editingProspect.zip ?? '',
      primaryContactName: editingProspect.primaryContactName ?? '',
      primaryContactTitle: editingProspect.primaryContactTitle ?? '',
      primaryContactEmail: editingProspect.primaryContactEmail ?? '',
      leadScore: editingProspect.leadScore,
      source: editingProspect.source ?? 'website',
      providerCount: editingProspect.providerCount,
      notes: editingProspect.notes ?? '',
      status: editingProspect.status,
    };

    const setForm = (f: ReturnType<typeof emptyProspectForm>) => {
      setEditingProspect({ ...editingProspect, ...f });
    };

    return (
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingProspect(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={editingProspect.status} onValueChange={(v) => setEditingProspect({ ...editingProspect, status: v as ProspectStatus })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((o) => o.value !== 'all').map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderProspectFormFields(form, setForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingProspect(null); }}>Cancel</Button>
            <Button
              onClick={() => updateProspectMutation.mutate({ id: editingProspect.id, data: { ...form, status: editingProspect.status } })}
              disabled={!editingProspect.practiceName || updateProspectMutation.isPending}
              style={{ backgroundColor: '#054700' }}
            >
              {updateProspectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---- Main pipeline view ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" /> B2B Practice Prospecting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your medical practice sales pipeline and outreach.
          </p>
        </div>
        <Button onClick={() => { setProspectForm(emptyProspectForm()); setAddDialogOpen(true); }} style={{ backgroundColor: '#054700' }}>
          <Plus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Total Prospects</p>
            <p className="text-2xl font-semibold mt-1">{stats?.totalProspects ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New This Month</p>
            <p className="text-2xl font-semibold mt-1">{stats?.newThisMonth ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Qualified</p>
            <p className="text-2xl font-semibold mt-1">{stats?.qualified ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contacted</p>
            <p className="text-2xl font-semibold mt-1">{stats?.contacted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Converted</p>
            <p className="text-2xl font-semibold mt-1">{stats?.converted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Avg Lead Score</p>
            <p className="text-2xl font-semibold mt-1">{stats?.avgLeadScore ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Sales Pipeline</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prospects..."
                  className="pl-9 w-56"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProspectStatus | 'all')}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PracticeType | 'all')}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRACTICE_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prospectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No prospects found</p>
              <p className="text-sm mt-1">
                {prospects && prospects.length > 0
                  ? 'Try adjusting your filters or search query.'
                  : 'Add your first prospect to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Practice Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Lead Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedProspect(p)}
                    >
                      <TableCell className="font-medium">{p.practiceName}</TableCell>
                      <TableCell className="text-sm">{PRACTICE_TYPE_LABELS[p.practiceType] ?? p.practiceType}</TableCell>
                      <TableCell className="text-sm text-gray-600">{p.specialty || '--'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {[p.city, p.state].filter(Boolean).join(', ') || '--'}
                      </TableCell>
                      <TableCell>
                        {p.primaryContactName ? (
                          <div>
                            <p className="text-sm">{p.primaryContactName}</p>
                            {p.primaryContactTitle && <p className="text-xs text-gray-400">{p.primaryContactTitle}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell><LeadScoreBar score={p.leadScore} /></TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(p.lastActivity)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)}>
                            <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(p)}>
                            <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Prospect</DialogTitle>
          </DialogHeader>
          {renderProspectFormFields(prospectForm, setProspectForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createProspectMutation.mutate(prospectForm)}
              disabled={!prospectForm.practiceName || !prospectForm.practiceType || createProspectMutation.isPending}
              style={{ backgroundColor: '#054700' }}
            >
              {createProspectMutation.isPending ? 'Creating...' : 'Add Prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {renderEditDialog()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeletingProspect(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prospect</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            Are you sure you want to delete <span className="font-semibold">{deletingProspect?.practiceName}</span>? This action cannot be undone and all associated outreach history will be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingProspect(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingProspect && deleteProspectMutation.mutate(deletingProspect.id)}
              disabled={deleteProspectMutation.isPending}
            >
              {deleteProspectMutation.isPending ? 'Deleting...' : 'Delete Prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
