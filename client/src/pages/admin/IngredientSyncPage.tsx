import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  FlaskConical,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import { apiRequest } from '@/shared/lib/queryClient';
import { cn } from '@/shared/lib/utils';

interface SyncLog {
  id: string;
  syncedAt: string;
  totalFromApi: number;
  newIngredients: number;
  discontinuedIngredients: number;
  reactivatedIngredients: number;
  addedNames: string[] | null;
  removedNames: string[] | null;
  reactivatedNames: string[] | null;
}

interface ManufacturerIngredient {
  id: string;
  name: string;
  status: 'active' | 'discontinued';
  firstSeenAt: string;
  lastSeenAt: string;
  discontinuedAt: string | null;
}

interface SyncResult {
  totalFromApi: number;
  newIngredients: number;
  discontinuedIngredients: number;
  reactivatedIngredients: number;
  addedNames: string[];
  removedNames: string[];
  reactivatedNames: string[];
  affectedFormulaCount: number;
}

interface AffectedFormula {
  formulaId: string;
  formulaName: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  discontinuedIngredients: string[];
  discontinuedFlaggedAt: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) {
    const mins = Math.floor(diff / 60000);
    return mins <= 1 ? 'just now' : `${mins}m ago`;
  }
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function IngredientSyncPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: syncLogs, isLoading: logsLoading } = useQuery<SyncLog[]>({
    queryKey: ['/api/admin/ingredient-catalog/sync-logs'],
    queryFn: () => apiRequest('GET', '/api/admin/ingredient-catalog/sync-logs').then(r => r.json()),
  });

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<ManufacturerIngredient[]>({
    queryKey: ['/api/admin/ingredient-catalog/ingredients', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return apiRequest('GET', `/api/admin/ingredient-catalog/ingredients${params}`).then(r => r.json());
    },
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: () => apiRequest('POST', '/api/admin/ingredient-catalog/sync').then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-catalog/sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-catalog/ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-catalog/affected-formulas'] });
    },
  });

  const { data: affectedFormulas, isLoading: affectedLoading } = useQuery<AffectedFormula[]>({
    queryKey: ['/api/admin/ingredient-catalog/affected-formulas'],
    queryFn: () => apiRequest('GET', '/api/admin/ingredient-catalog/affected-formulas').then(r => r.json()),
  });

  const lastSync = syncLogs?.[0];
  const activeCount = ingredients?.filter(i => i.status === 'active').length ?? 0;
  const discontinuedCount = ingredients?.filter(i => i.status === 'discontinued').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingredient Catalog Sync</h1>
          <p className="text-sm text-muted-foreground">
            Alive Innovations ingredient catalog — synced daily at 3:00 AM UTC
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', syncMutation.isPending && 'animate-spin')} />
          {syncMutation.isPending ? 'Syncing…' : 'Sync Now'}
        </Button>
      </div>

      {/* Sync result toast */}
      {syncMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Sync complete — {syncMutation.data.totalFromApi} ingredients from API.
                {syncMutation.data.newIngredients > 0 && ` +${syncMutation.data.newIngredients} new.`}
                {syncMutation.data.discontinuedIngredients > 0 && ` −${syncMutation.data.discontinuedIngredients} discontinued.`}
                {syncMutation.data.reactivatedIngredients > 0 && ` ↻${syncMutation.data.reactivatedIngredients} reactivated.`}
                {syncMutation.data.affectedFormulaCount > 0 && ` ⚠ ${syncMutation.data.affectedFormulaCount} active formulas affected.`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {syncMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <XCircle className="h-4 w-4" />
              <span>Sync failed — {(syncMutation.error as Error)?.message || 'Unknown error'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Ingredients</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discontinued</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{discontinuedCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : lastSync ? (
              <div>
                <div className="text-lg font-semibold">{timeAgo(lastSync.syncedAt)}</div>
                <p className="text-xs text-muted-foreground">{formatDate(lastSync.syncedAt)}</p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Never synced</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{lastSync?.totalFromApi ?? '—'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent catalog sync operations and their results</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !syncLogs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sync history yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>API Total</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Discontinued</TableHead>
                    <TableHead>Reactivated</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <SyncLogRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affected Formulas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Affected Formulas</CardTitle>
              <CardDescription>Active formulas containing discontinued ingredients — checkout and autoship blocked</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {affectedLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !affectedFormulas?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No formulas currently affected by discontinued ingredients.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Formula</TableHead>
                    <TableHead>Discontinued Ingredients</TableHead>
                    <TableHead>Flagged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affectedFormulas.map((af) => (
                    <TableRow key={af.formulaId}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{af.userName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{af.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {af.formulaName || af.formulaId.slice(0, 8) + '…'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {af.discontinuedIngredients.map((name) => (
                            <Badge key={name} variant="destructive" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {af.discontinuedFlaggedAt ? formatDate(af.discontinuedFlaggedAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredient List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manufacturer Ingredients</CardTitle>
              <CardDescription>All ingredients tracked from Alive Innovations API</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {ingredientsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !ingredients?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No ingredients found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Discontinued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(item.firstSeenAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(item.lastSeenAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.discontinuedAt ? formatDate(item.discontinuedAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SyncLogRow({ log }: { log: SyncLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = (log.newIngredients + log.discontinuedIngredients + log.reactivatedIngredients) > 0;

  return (
    <>
      <TableRow
        className={cn(hasChanges && 'cursor-pointer hover:bg-muted/50')}
        onClick={() => hasChanges && setExpanded(!expanded)}
      >
        <TableCell className="text-sm">{formatDate(log.syncedAt)}</TableCell>
        <TableCell>{log.totalFromApi}</TableCell>
        <TableCell>
          {log.newIngredients > 0 ? (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <ArrowUpCircle className="h-3.5 w-3.5" />+{log.newIngredients}
            </span>
          ) : '0'}
        </TableCell>
        <TableCell>
          {log.discontinuedIngredients > 0 ? (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <ArrowDownCircle className="h-3.5 w-3.5" />−{log.discontinuedIngredients}
            </span>
          ) : '0'}
        </TableCell>
        <TableCell>
          {log.reactivatedIngredients > 0 ? (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <RotateCcw className="h-3.5 w-3.5" />{log.reactivatedIngredients}
            </span>
          ) : '0'}
        </TableCell>
        <TableCell>
          {hasChanges ? (
            <Badge variant="outline" className="text-xs cursor-pointer">
              {expanded ? 'Hide' : 'View changes'}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No changes</span>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasChanges && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 py-3 px-6">
            <div className="flex flex-wrap gap-6 text-sm">
              {log.addedNames && log.addedNames.length > 0 && (
                <div>
                  <span className="font-medium text-green-700">Added:</span>{' '}
                  <span className="text-muted-foreground">{log.addedNames.join(', ')}</span>
                </div>
              )}
              {log.removedNames && log.removedNames.length > 0 && (
                <div>
                  <span className="font-medium text-red-700">Discontinued:</span>{' '}
                  <span className="text-muted-foreground">{log.removedNames.join(', ')}</span>
                </div>
              )}
              {log.reactivatedNames && log.reactivatedNames.length > 0 && (
                <div>
                  <span className="font-medium text-blue-700">Reactivated:</span>{' '}
                  <span className="text-muted-foreground">{log.reactivatedNames.join(', ')}</span>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
