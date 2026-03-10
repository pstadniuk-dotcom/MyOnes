import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlaskConical,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pill,
  Layers,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { apiRequest } from '@/shared/lib/queryClient';
import { cn } from '@/shared/lib/utils';

interface SubIngredient {
  name: string;
  amount: string;
  description?: string;
  benefits?: string[];
}

interface SystemSupportItem {
  name: string;
  category: 'system_support';
  doseMg: number;
  doseRangeMin?: number;
  doseRangeMax?: number;
  description?: string;
  systemSupported?: string | null;
  activeIngredients: SubIngredient[];
  suggestedDosage?: string | null;
}

interface IndividualIngredientItem {
  name: string;
  category: 'individual';
  doseMg: number;
  doseRangeMin?: number;
  doseRangeMax?: number;
  type?: string | null;
  description?: string | null;
  benefits: string[];
}

interface CatalogData {
  systemSupports: SystemSupportItem[];
  individualIngredients: IndividualIngredientItem[];
  totals: { systemSupports: number; individualIngredients: number; total: number };
  manufacturer: {
    available: boolean;
    mappedCount: number;
    unmappedCount: number;
    coveragePercent: number;
    mapped: Array<{ name: string; ingredientId: string | number }>;
    unmapped: string[];
  } | null;
}

// ── Expandable system support row ───────────────────────────────────────
function SystemSupportRow({ item, manufacturerStatus }: { item: SystemSupportItem; manufacturerStatus: 'mapped' | 'unmapped' | 'unknown' }) {
  const [expanded, setExpanded] = useState(false);
  const maxDoses = item.doseRangeMax && item.doseRangeMin ? Math.floor(item.doseRangeMax / item.doseMg) : 1;

  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-gray-50 transition-colors', expanded && 'bg-gray-50')}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8 px-2">
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#054700]" />
            <span className="font-medium text-gray-900">{item.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm">{item.systemSupported || '—'}</TableCell>
        <TableCell className="text-sm font-mono">{item.doseMg}mg</TableCell>
        <TableCell className="text-sm font-mono text-gray-500">
          {item.doseRangeMin}–{item.doseRangeMax}mg
          {maxDoses > 1 && <span className="text-xs text-gray-400 ml-1">(up to {maxDoses}×)</span>}
        </TableCell>
        <TableCell className="text-sm">
          {item.activeIngredients.length > 0 ? (
            <Badge variant="outline" className="text-xs">{item.activeIngredients.length} sub-ingredients</Badge>
          ) : '—'}
        </TableCell>
        <TableCell>
          <ManufacturerBadge status={manufacturerStatus} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-gray-50/60">
          <TableCell colSpan={7} className="p-0">
            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              {item.description && (
                <p className="text-sm text-gray-600">{item.description}</p>
              )}
              {item.suggestedDosage && (
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Suggested Dosage</p>
                  <p className="text-sm text-gray-700 mt-0.5">{item.suggestedDosage}</p>
                </div>
              )}
              {item.activeIngredients.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Active Ingredients</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {item.activeIngredients.map((sub, i) => (
                      <div key={i} className="bg-white rounded-md border p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                          <span className="text-xs font-mono text-[#054700]">{sub.amount}</span>
                        </div>
                        {sub.description && <p className="text-xs text-gray-500 mt-1">{sub.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Expandable individual ingredient row ────────────────────────────────
function IndividualIngredientRow({ item, manufacturerStatus }: { item: IndividualIngredientItem; manufacturerStatus: 'mapped' | 'unmapped' | 'unknown' }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-gray-50 transition-colors', expanded && 'bg-gray-50')}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8 px-2">
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-[#5a6623]" />
            <span className="font-medium text-gray-900">{item.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm max-w-[200px] truncate text-gray-500">{item.type || '—'}</TableCell>
        <TableCell className="text-sm font-mono">{item.doseMg}mg</TableCell>
        <TableCell className="text-sm font-mono text-gray-500">
          {item.doseRangeMin}–{item.doseRangeMax}mg
        </TableCell>
        <TableCell className="text-sm">
          {item.benefits.length > 0 ? (
            <Badge variant="outline" className="text-xs">{item.benefits.length} benefits</Badge>
          ) : '—'}
        </TableCell>
        <TableCell>
          <ManufacturerBadge status={manufacturerStatus} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-gray-50/60">
          <TableCell colSpan={7} className="p-0">
            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              {item.description && (
                <p className="text-sm text-gray-600">{item.description}</p>
              )}
              {item.benefits.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Benefits</p>
                  <ul className="space-y-1">
                    {item.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ManufacturerBadge({ status }: { status: 'mapped' | 'unmapped' | 'unknown' }) {
  switch (status) {
    case 'mapped':
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Mapped</Badge>;
    case 'unmapped':
      return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Unmapped</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">N/A</Badge>;
  }
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function ProductCatalogPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'system_support' | 'individual'>('all');

  const { data, isLoading } = useQuery<CatalogData>({
    queryKey: ['/api/admin/products/catalog'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/products/catalog');
      return res.json();
    },
  });

  // Build manufacturer lookup
  const mfrLookup = useMemo(() => {
    if (!data?.manufacturer?.available) return new Map<string, 'mapped' | 'unmapped' | 'unknown'>();
    const map = new Map<string, 'mapped' | 'unmapped'>();
    data.manufacturer.mapped.forEach(m => map.set(m.name.toLowerCase(), 'mapped'));
    data.manufacturer.unmapped.forEach(n => map.set(n.toLowerCase(), 'unmapped'));
    return map;
  }, [data]);

  const getMfrStatus = (name: string): 'mapped' | 'unmapped' | 'unknown' => {
    if (!data?.manufacturer) return 'unknown';
    return mfrLookup.get(name.toLowerCase()) || 'unknown';
  };

  // Filter
  const filteredSystems = useMemo(() => {
    if (!data) return [];
    let list = data.systemSupports;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.systemSupported?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const filteredIndividuals = useMemo(() => {
    if (!data) return [];
    let list = data.individualIngredients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.type?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const showSystems = categoryFilter === 'all' || categoryFilter === 'system_support';
  const showIndividuals = categoryFilter === 'all' || categoryFilter === 'individual';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" /> Product Catalog
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          All system support mixes and individual ingredients available for formulas, with manufacturer availability status.
        </p>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-24" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Layers className="h-4 w-4" /> System Supports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{data?.totals.systemSupports || 0}</div>
              <p className="text-xs text-gray-400">Proprietary mixes (fixed dose)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Pill className="h-4 w-4" /> Individual Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{data?.totals.individualIngredients || 0}</div>
              <p className="text-xs text-gray-400">Flexible dosing ingredients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{data?.totals.total || 0}</div>
              <p className="text-xs text-gray-400">Available for formulas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                {data?.manufacturer?.available ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                Manufacturer Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.manufacturer?.available ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{data.manufacturer.coveragePercent}%</div>
                  <Progress value={data.manufacturer.coveragePercent} className="h-1.5 mt-1" />
                  <p className="text-xs text-gray-400 mt-1">
                    {data.manufacturer.mappedCount} mapped / {data.manufacturer.unmappedCount} unmapped
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-yellow-600">Unavailable</div>
                  <p className="text-xs text-gray-400">API key not configured</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unmapped Alert */}
      {data?.manufacturer?.available && data.manufacturer.unmappedCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {data.manufacturer.unmappedCount} ingredient{data.manufacturer.unmappedCount !== 1 ? 's' : ''} not found in manufacturer catalog
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {data.manufacturer.unmapped.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="system_support">System Supports</SelectItem>
            <SelectItem value="individual">Individual Ingredients</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">
          {(showSystems ? filteredSystems.length : 0) + (showIndividuals ? filteredIndividuals.length : 0)} results
        </span>
      </div>

      {/* System Supports Table */}
      {showSystems && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#054700]" />
              System Supports ({filteredSystems.length})
            </CardTitle>
            <CardDescription>
              Proprietary blends with fixed base dosages. Each is a pre-formulated mix of active sub-ingredients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredSystems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No system supports match your search.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Base Dose</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Composition</TableHead>
                      <TableHead>Manufacturer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSystems.map((item) => (
                      <SystemSupportRow key={item.name} item={item} manufacturerStatus={getMfrStatus(item.name)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Ingredients Table */}
      {showIndividuals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-[#5a6623]" />
              Individual Ingredients ({filteredIndividuals.length})
            </CardTitle>
            <CardDescription>
              Standalone ingredients with flexible dosing ranges. AI selects dose within min–max based on user profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredIndividuals.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No individual ingredients match your search.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type / Category</TableHead>
                      <TableHead>Default Dose</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Benefits</TableHead>
                      <TableHead>Manufacturer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndividuals.map((item) => (
                      <IndividualIngredientRow key={item.name} item={item} manufacturerStatus={getMfrStatus(item.name)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
