import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  LogIn,
  UserCog,
  Upload,
  Download,
  Trash2,
  XCircle,
  Eye,
  Share2,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/shared/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/shared/lib/utils';

type TabType = 'auth-events' | 'admin-actions' | 'file-audit' | 'safety' | 'acknowledgments' | 'consents';

// ---- Shared Components ----

function ExpandableRow({ cells, details }: { cells: React.ReactNode; details: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-gray-50', expanded && 'bg-gray-50')}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8 px-2">
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </TableCell>
        {cells}
      </TableRow>
      {expanded && (
        <TableRow className="bg-gray-50/60">
          <TableCell colSpan={10} className="p-0">
            <div className="px-6 py-4 border-t border-gray-100">{details}</div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CopyableId({ id, label }: { id: string; label?: string }) {
  const { toast } = useToast();
  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast({ title: 'Copied', description: 'ID copied to clipboard' });
  };
  return (
    <button onClick={copyId} className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-[#054700] group" title="Click to copy full ID">
      <span>{label || (id.slice(0, 8) + '\u2026')}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function DetailGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
      {items.filter(i => i.value).map((item, idx) => (
        <div key={idx}>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{item.label}</p>
          <div className="text-sm text-gray-800 mt-0.5">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-gray-400">
        <Icon className="h-8 w-8" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function FileActionBadge({ action }: { action: string }) {
  const configs: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    upload: { icon: <Upload className="h-3 w-3" />, className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Upload' },
    download: { icon: <Download className="h-3 w-3" />, className: 'bg-green-100 text-green-800 border-green-200', label: 'Download' },
    delete: { icon: <Trash2 className="h-3 w-3" />, className: 'bg-red-100 text-red-800 border-red-200', label: 'Delete' },
    view: { icon: <Eye className="h-3 w-3" />, className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'View' },
    access_denied: { icon: <XCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-800 border-red-200', label: 'Denied' },
    share: { icon: <Share2 className="h-3 w-3" />, className: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Share' },
  };
  const cfg = configs[action] || { icon: null, className: 'bg-gray-100 text-gray-700', label: action };
  return <Badge variant="outline" className={cn('inline-flex items-center gap-1', cfg.className)}>{cfg.icon}{cfg.label}</Badge>;
}

// ---- Auth Events Tab ----
function AuthEventsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs/auth', page, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await apiRequest('GET', '/api/admin/audit-logs/auth?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All events" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="login_success">Login success</SelectItem>
            <SelectItem value="login_failed">Login failed</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="password_reset">Password reset</SelectItem>
            <SelectItem value="google_login">Google login</SelectItem>
            <SelectItem value="facebook_login">Facebook login</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{data?.total ?? 0} events</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={LogIn} message="No authentication events recorded yet." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <ExpandableRow
                  key={log.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{log.action?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{log.email || '\u2014'}</TableCell>
                    <TableCell className="text-xs capitalize">{log.provider || 'email'}</TableCell>
                    <TableCell>{log.success ? <Badge className="bg-green-100 text-green-800">Success</Badge> : <Badge variant="destructive">Failed</Badge>}</TableCell>
                  </>}
                  details={
                    <DetailGrid items={[
                      { label: 'User ID', value: log.userId ? <CopyableId id={log.userId} label={log.userId} /> : '\u2014' },
                      { label: 'Email', value: log.email || '\u2014' },
                      { label: 'Action', value: log.action?.replace(/_/g, ' ') },
                      { label: 'Provider', value: log.provider || 'email' },
                      { label: 'Status', value: log.success ? 'Success' : 'Failed' },
                      { label: 'Failure Reason', value: log.failureReason || '\u2014' },
                      { label: 'IP Address', value: log.ipAddress || '\u2014' },
                      { label: 'Timestamp', value: format(new Date(log.createdAt), 'PPpp') },
                      { label: 'User Agent', value: log.userAgent ? <span className="text-xs break-all">{log.userAgent}</span> : '\u2014' },
                      { label: 'Navigate', value: log.userId ? <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + log.userId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> : null },
                    ]} />
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- Admin Actions Tab ----
function AdminActionsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 25;

  const PHI_ACTIONS = ['user_view', 'conversation_view', 'data_export'];

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs/admin', page, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await apiRequest('GET', '/api/admin/audit-logs/admin?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="user_view">PHI: User view</SelectItem>
            <SelectItem value="conversation_view">PHI: Conversation view</SelectItem>
            <SelectItem value="data_export">PHI: Data export</SelectItem>
            <SelectItem value="settings_update">Settings update</SelectItem>
            <SelectItem value="ticket_reply">Ticket reply</SelectItem>
            <SelectItem value="user_note_add">User note</SelectItem>
            <SelectItem value="ingredient_pricing_update">Pricing update</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{data?.total ?? 0} actions</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={UserCog} message="No admin actions recorded yet." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>PHI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <ExpandableRow
                  key={log.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{log.action?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">
                      <span className="text-gray-500">{log.targetType}</span>
                      {log.targetId && <> &middot; <CopyableId id={log.targetId} /></>}
                    </TableCell>
                    <TableCell>{log.adminId ? <CopyableId id={log.adminId} /> : '\u2014'}</TableCell>
                    <TableCell>
                      {PHI_ACTIONS.includes(log.action)
                        ? <Badge className="bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-1"><Shield className="h-3 w-3" />PHI</Badge>
                        : <span className="text-xs text-gray-400">\u2014</span>}
                    </TableCell>
                  </>}
                  details={
                    <div className="space-y-4">
                      <DetailGrid items={[
                        { label: 'Admin ID', value: log.adminId ? <CopyableId id={log.adminId} label={log.adminId} /> : '\u2014' },
                        { label: 'Action', value: log.action?.replace(/_/g, ' ') },
                        { label: 'Target Type', value: log.targetType },
                        { label: 'Target ID', value: log.targetId ? <CopyableId id={log.targetId} label={log.targetId} /> : '\u2014' },
                        { label: 'IP Address', value: log.ipAddress || '\u2014' },
                        { label: 'Timestamp', value: format(new Date(log.createdAt), 'PPpp') },
                        { label: 'Navigate', value: log.targetType === 'user' && log.targetId ? <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + log.targetId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> : null },
                      ]} />
                      {log.details && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Details</p>
                          <pre className="text-xs bg-gray-100 rounded-lg p-3 overflow-auto max-h-48 text-gray-700">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- File Audit Logs Tab ----
function FileAuditLogsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs', page, userFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (userFilter) params.set('userId', userFilter);
      const res = await apiRequest('GET', '/api/admin/audit-logs?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Filter by user ID..." value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} className="max-w-xs h-9" />
        <span className="text-xs text-gray-400">{data?.total ?? 0} entries</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={FileText} message="No file operations recorded yet. Upload, download, or delete events will appear here." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>File</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <ExpandableRow
                  key={log.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><FileActionBadge action={log.action} /></TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{log.metadata?.originalFileName || log.objectPath || '\u2014'}</TableCell>
                    <TableCell>{log.userId ? <CopyableId id={log.userId} /> : '\u2014'}</TableCell>
                    <TableCell>{log.success ? <Badge className="bg-green-100 text-green-800">OK</Badge> : <Badge variant="destructive">Failed</Badge>}</TableCell>
                  </>}
                  details={
                    <DetailGrid items={[
                      { label: 'Full User ID', value: log.userId ? <CopyableId id={log.userId} label={log.userId} /> : '\u2014' },
                      { label: 'File ID', value: log.fileId ? <CopyableId id={log.fileId} label={log.fileId} /> : '\u2014' },
                      { label: 'File Name', value: log.metadata?.originalFileName || '\u2014' },
                      { label: 'Object Path', value: log.objectPath || '\u2014' },
                      { label: 'Action', value: log.action },
                      { label: 'Status', value: log.success ? 'Success' : 'Failed' },
                      { label: 'Error', value: log.errorMessage || '\u2014' },
                      { label: 'IP Address', value: log.ipAddress || '\u2014' },
                      { label: 'Timestamp', value: format(new Date(log.timestamp), 'PPpp') },
                      { label: 'User Agent', value: log.userAgent ? <span className="text-xs break-all">{log.userAgent}</span> : '\u2014' },
                      { label: 'Navigate', value: log.userId ? <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + log.userId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> : null },
                    ]} />
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- Safety Logs Tab ----
function SafetyLogsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/safety-logs', page, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (severityFilter) params.set('severity', severityFilter);
      const res = await apiRequest('GET', '/api/admin/safety-logs?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={severityFilter} onValueChange={(val) => { setSeverityFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="serious">Serious</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{data?.total ?? 0} entries</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Shield} message="No safety events recorded yet." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log: any) => (
                <ExpandableRow
                  key={log.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell><SeverityBadge severity={log.severity} /></TableCell>
                    <TableCell>{log.userId ? <CopyableId id={log.userId} /> : '\u2014'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-gray-500">{log.details ? summarizeDetails(log.details) : '\u2014'}</TableCell>
                  </>}
                  details={
                    <div className="space-y-4">
                      <DetailGrid items={[
                        { label: 'Full User ID', value: log.userId ? <CopyableId id={log.userId} label={log.userId} /> : '\u2014' },
                        { label: 'Formula ID', value: log.formulaId ? <CopyableId id={log.formulaId} label={log.formulaId} /> : '\u2014' },
                        { label: 'Action', value: log.action },
                        { label: 'Severity', value: <SeverityBadge severity={log.severity} /> },
                        { label: 'Timestamp', value: format(new Date(log.createdAt), 'PPpp') },
                        { label: 'Navigate', value: log.userId ? <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + log.userId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> : null },
                      ]} />
                      {log.details && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Full Details</p>
                          <pre className="text-xs bg-gray-100 rounded-lg p-3 overflow-auto max-h-48 text-gray-700">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- Warning Acknowledgments Tab ----
function WarningAcknowledgmentsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/warning-acknowledgments', page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await apiRequest('GET', '/api/admin/warning-acknowledgments?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <span className="text-xs text-gray-400">{data?.total ?? 0} acknowledgments</span>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={AlertTriangle} message="No warning acknowledgments recorded yet." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Acknowledged At</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((ack: any) => (
                <ExpandableRow
                  key={ack.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(ack.acknowledgedAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><CopyableId id={ack.userId} /></TableCell>
                    <TableCell><Badge variant="outline">{Array.isArray(ack.acknowledgedWarnings) ? ack.acknowledgedWarnings.length + ' warning(s)' : '\u2014'}</Badge></TableCell>
                    <TableCell className="text-xs">v{ack.disclaimerVersion}</TableCell>
                    <TableCell className="text-xs">{ack.ipAddress || '\u2014'}</TableCell>
                  </>}
                  details={
                    <div className="space-y-4">
                      <DetailGrid items={[
                        { label: 'Full User ID', value: <CopyableId id={ack.userId} label={ack.userId} /> },
                        { label: 'Formula ID', value: ack.formulaId ? <CopyableId id={ack.formulaId} label={ack.formulaId} /> : '\u2014' },
                        { label: 'Disclaimer Version', value: 'v' + ack.disclaimerVersion },
                        { label: 'IP Address', value: ack.ipAddress || '\u2014' },
                        { label: 'Navigate', value: <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + ack.userId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> },
                      ]} />
                      {Array.isArray(ack.acknowledgedWarnings) && ack.acknowledgedWarnings.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Acknowledged Warnings</p>
                          <ul className="space-y-1">
                            {ack.acknowledgedWarnings.map((w: any, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <AlertTriangle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', w.severity === 'critical' ? 'text-red-500' : w.severity === 'serious' ? 'text-yellow-500' : 'text-blue-400')} />
                                <div>
                                  <span>{typeof w === 'string' ? w : w.message || JSON.stringify(w)}</span>
                                  {w.category && <Badge variant="outline" className="ml-2 text-[10px] py-0">{w.category.replace(/_/g, ' ')}</Badge>}
                                  {w.ingredients?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Ingredients: {w.ingredients.join(', ')}</p>}
                                  {w.drugs?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Drugs: {w.drugs.join(', ')}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- Consents Tab ----
function ConsentsTab() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/consents', page, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (typeFilter) params.set('consentType', typeFilter);
      const res = await apiRequest('GET', '/api/admin/consents?' + params);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All consent types" /></SelectTrigger>
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
        <span className="text-xs text-gray-400">{data?.total ?? 0} consents</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CheckCircle} message="No consent records found yet." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Granted At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((consent: any) => (
                <ExpandableRow
                  key={consent.id}
                  cells={<>
                    <TableCell className="text-sm">{format(new Date(consent.grantedAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{consent.consentType?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{consent.userEmail || (consent.userId ? <CopyableId id={consent.userId} /> : '\u2014')}</TableCell>
                    <TableCell>{consent.granted ? <Badge className="bg-green-100 text-green-800">Granted</Badge> : <Badge variant="destructive">Denied</Badge>}</TableCell>
                    <TableCell className="text-xs">v{consent.consentVersion}</TableCell>
                  </>}
                  details={
                    <DetailGrid items={[
                      { label: 'Full User ID', value: consent.userId ? <CopyableId id={consent.userId} label={consent.userId} /> : '\u2014' },
                      { label: 'Email', value: consent.userEmail || '\u2014' },
                      { label: 'Consent Type', value: consent.consentType?.replace(/_/g, ' ') },
                      { label: 'Version', value: 'v' + consent.consentVersion },
                      { label: 'Granted', value: consent.granted ? 'Yes' : 'No' },
                      { label: 'IP Address', value: consent.ipAddress || '\u2014' },
                      { label: 'Revoked At', value: consent.revokedAt ? format(new Date(consent.revokedAt), 'PPpp') : 'Not revoked' },
                      { label: 'Navigate', value: consent.userId ? <button onClick={(e) => { e.stopPropagation(); setLocation('/admin/users/' + consent.userId); }} className="text-xs text-[#054700] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View user</button> : null },
                    ]} />
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ---- Shared Helpers ----
function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical': return <Badge variant="destructive">Critical</Badge>;
    case 'serious': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Serious</Badge>;
    default: return <Badge variant="secondary">Info</Badge>;
  }
}

function summarizeDetails(details: any): string {
  const parts: string[] = [];
  if (details.blockedReasons?.length) parts.push('Blocked: ' + details.blockedReasons.length + ' reason(s)');
  if (details.warnings?.length) parts.push(details.warnings.length + ' warning(s)');
  if (details.ingredients?.length) parts.push('Ingredients: ' + details.ingredients.join(', '));
  if (details.medications?.length) parts.push('Meds: ' + details.medications.join(', '));
  if (details.conditions?.length) parts.push('Conditions: ' + details.conditions.join(', '));
  return parts.join(' | ') || 'No details';
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

// ---- Tab Config ----
const TABS: { key: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'auth-events', label: 'Auth Events', icon: <LogIn className="h-4 w-4" />, description: 'Login, signup & password events' },
  { key: 'admin-actions', label: 'Admin Actions', icon: <UserCog className="h-4 w-4" />, description: 'Admin operations & PHI access' },
  { key: 'file-audit', label: 'File Audit', icon: <FileText className="h-4 w-4" />, description: 'HIPAA file operation logs' },
  { key: 'safety', label: 'Safety Events', icon: <Shield className="h-4 w-4" />, description: 'Formula safety validations' },
  { key: 'acknowledgments', label: 'Acknowledgments', icon: <AlertTriangle className="h-4 w-4" />, description: 'User warning acknowledgments' },
  { key: 'consents', label: 'Consents', icon: <CheckCircle className="h-4 w-4" />, description: 'Consent records (ToS, data, etc.)' },
];

// ---- Main Page ----
export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('auth-events');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Shield className="h-5 w-5" /> Audit & Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Authentication events, admin actions, file audits, safety events, warning acknowledgments, and consent records. Click any row to expand details.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {TABS.map((tab) => (
          <Card
            key={tab.key}
            className={cn('cursor-pointer transition-all', activeTab === tab.key ? 'ring-2 ring-[#054700] shadow-md' : 'hover:shadow-sm')}
            onClick={() => setActiveTab(tab.key)}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs flex items-center gap-1.5">{tab.icon}{tab.label}</CardTitle>
              <CardDescription className="text-[10px] leading-tight">{tab.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {TABS.find(t => t.key === activeTab)?.icon}
            {TABS.find(t => t.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'auth-events' && <AuthEventsTab />}
          {activeTab === 'admin-actions' && <AdminActionsTab />}
          {activeTab === 'file-audit' && <FileAuditLogsTab />}
          {activeTab === 'safety' && <SafetyLogsTab />}
          {activeTab === 'acknowledgments' && <WarningAcknowledgmentsTab />}
          {activeTab === 'consents' && <ConsentsTab />}
        </CardContent>
      </Card>
    </div>
  );
}