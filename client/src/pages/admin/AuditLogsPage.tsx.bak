import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
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
import { apiRequest } from '@/shared/lib/queryClient';

type TabType = 'file-audit' | 'safety' | 'acknowledgments' | 'consents';

// ── File Audit Logs Tab ─────────────────────────────────────────────────

function FileAuditLogsTab() {
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs', page, userFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (userFilter) params.set('userId', userFilter);
      const res = await apiRequest('GET', `/api/admin/audit-logs?${params}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter by user ID..."
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          {data?.total ?? 0} total entries
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No file audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>File ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.userId ? log.userId.slice(0, 8) + '...' : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.fileId ? log.fileId.slice(0, 8) + '...' : '—'}
                  </TableCell>
                  <TableCell>
                    {log.success ? (
                      <Badge className="bg-green-100 text-green-800">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{log.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ── Safety Logs Tab ─────────────────────────────────────────────────────

function SafetyLogsTab() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/safety-logs', page, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (severityFilter) params.set('severity', severityFilter);
      const res = await apiRequest('GET', `/api/admin/safety-logs?${params}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={severityFilter} onValueChange={(val) => { setSeverityFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="serious">Serious</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data?.total ?? 0} total entries
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No safety audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Formula ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={log.severity} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.userId?.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.formulaId ? log.formulaId.slice(0, 8) + '...' : '—'}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs">
                    {log.details ? summarizeDetails(log.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ── Warning Acknowledgments Tab ─────────────────────────────────────────

function WarningAcknowledgmentsTab() {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/warning-acknowledgments', page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await apiRequest('GET', `/api/admin/warning-acknowledgments?${params}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {data?.total ?? 0} total acknowledgments
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No warning acknowledgments found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acknowledged At</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Formula ID</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Disclaimer Ver.</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((ack: any) => (
                <TableRow key={ack.id}>
                  <TableCell className="text-sm">
                    {format(new Date(ack.acknowledgedAt), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {ack.userId?.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {ack.formulaId?.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Array.isArray(ack.acknowledgedWarnings)
                        ? `${ack.acknowledgedWarnings.length} warning(s)`
                        : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">v{ack.disclaimerVersion}</TableCell>
                  <TableCell className="text-xs">{ack.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ── Consents Tab ────────────────────────────────────────────────────────

function ConsentsTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/consents', page, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (typeFilter) params.set('consentType', typeFilter);
      const res = await apiRequest('GET', `/api/admin/consents?${params}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All consent types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="tos_acceptance">ToS Acceptance</SelectItem>
            <SelectItem value="lab_data_processing">Lab Data Processing</SelectItem>
            <SelectItem value="ai_analysis">AI Analysis</SelectItem>
            <SelectItem value="data_retention">Data Retention</SelectItem>
            <SelectItem value="third_party_sharing">Third-Party Sharing</SelectItem>
            <SelectItem value="sms_accountability">SMS Accountability</SelectItem>
            <SelectItem value="medication_disclosure">Medication Disclosure</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data?.total ?? 0} total consents
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No consent records found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Granted At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Revoked</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((consent: any) => (
                <TableRow key={consent.id}>
                  <TableCell className="text-sm">
                    {format(new Date(consent.grantedAt), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {consent.consentType?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {consent.userEmail || consent.userId?.slice(0, 8) + '...'}
                  </TableCell>
                  <TableCell>
                    {consent.granted ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge variant="destructive">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">v{consent.consentVersion}</TableCell>
                  <TableCell className="text-xs">
                    {consent.revokedAt
                      ? format(new Date(consent.revokedAt), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{consent.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'serious':
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Serious</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function summarizeDetails(details: any): string {
  const parts: string[] = [];
  if (details.blockedReasons?.length) parts.push(`Blocked: ${details.blockedReasons.length} reason(s)`);
  if (details.warnings?.length) parts.push(`${details.warnings.length} warning(s)`);
  if (details.ingredients?.length) parts.push(`Ingredients: ${details.ingredients.join(', ')}`);
  if (details.medications?.length) parts.push(`Meds: ${details.medications.join(', ')}`);
  if (details.conditions?.length) parts.push(`Conditions: ${details.conditions.join(', ')}`);
  return parts.join(' | ') || 'No details';
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

const TABS: { key: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'file-audit', label: 'File Audit', icon: <FileText className="h-4 w-4" />, description: 'HIPAA file operation logs' },
  { key: 'safety', label: 'Safety Events', icon: <Shield className="h-4 w-4" />, description: 'Formula safety validation events' },
  { key: 'acknowledgments', label: 'Acknowledgments', icon: <AlertTriangle className="h-4 w-4" />, description: 'User warning acknowledgments' },
  { key: 'consents', label: 'Consents', icon: <CheckCircle className="h-4 w-4" />, description: 'User consent records (ToS, data, etc.)' },
];

export default function AuditLogsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('safety');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Compliance Logs</h1>
          <p className="text-muted-foreground">
            View file audit trails, safety events, warning acknowledgments, and consent records.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid gap-3 md:grid-cols-4">
          {TABS.map((tab) => (
            <Card
              key={tab.key}
              className={`cursor-pointer transition-all ${
                activeTab === tab.key
                  ? 'ring-2 ring-primary shadow-md'
                  : 'hover:shadow-sm'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </CardTitle>
                <CardDescription className="text-xs">{tab.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Tab Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {TABS.find(t => t.key === activeTab)?.icon}
              {TABS.find(t => t.key === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'file-audit' && <FileAuditLogsTab />}
            {activeTab === 'safety' && <SafetyLogsTab />}
            {activeTab === 'acknowledgments' && <WarningAcknowledgmentsTab />}
            {activeTab === 'consents' && <ConsentsTab />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
