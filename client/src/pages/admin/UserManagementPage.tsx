import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isAdmin: boolean;
  aiCostCents?: number;
  aiCallCount?: number;
}

function formatCost(cents: number): string {
  if (cents === 0) return '-';
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

function getCostColor(cents: number): string {
  if (cents === 0) return 'text-muted-foreground';
  if (cents < 50) return 'text-green-600';
  if (cents < 200) return 'text-yellow-600';
  if (cents < 500) return 'text-orange-600';
  return 'text-red-600 font-semibold';
}

interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

interface AdvancedFilters {
  hasDevices?: 'any' | 'yes' | 'no';
  deviceProviders: string[];
  hasLabResults?: 'any' | 'yes' | 'no';
  hasOrders?: 'any' | 'yes' | 'no';
  minOrders?: string;
  maxOrders?: string;
}

const DEVICE_PROVIDERS = [
  { value: 'fitbit', label: 'Fitbit' },
  { value: 'oura', label: 'Oura' },
  { value: 'whoop', label: 'WHOOP' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'apple_health', label: 'Apple Health' },
  { value: 'google_fit', label: 'Google Fit' },
  { value: 'ultrahuman', label: 'Ultrahuman' },
  { value: 'eight_sleep', label: 'Eight Sleep' },
  { value: 'dexcom', label: 'Dexcom' },
  { value: 'freestyle_libre', label: 'FreeStyle Libre' },
  { value: 'withings', label: 'Withings' },
  { value: 'polar', label: 'Polar' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'strava', label: 'Strava' },
  { value: 'peloton', label: 'Peloton' },
  { value: 'cronometer', label: 'Cronometer' },
  { value: 'omron', label: 'Omron' },
  { value: 'kardia', label: 'Kardia' },
];

const emptyFilters: AdvancedFilters = {
  hasDevices: 'any',
  deviceProviders: [],
  hasLabResults: 'any',
  hasOrders: 'any',
  minOrders: '',
  maxOrders: '',
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Loading skeleton
function UserTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function UserManagementPage() {
  const [location, setLocation] = useLocation();
  const searchParams = location.split('?')[1] || '';
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({ ...emptyFilters });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'aiCost'>('date');
  const limit = 20;

  // Get filter from URL query parameter
  const urlParams = new URLSearchParams(searchParams);
  const filter = urlParams.get('filter') || 'all';

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Count active advanced filters
  const activeFilterCount = [
    advancedFilters.hasDevices && advancedFilters.hasDevices !== 'any',
    advancedFilters.deviceProviders.length > 0,
    advancedFilters.hasLabResults && advancedFilters.hasLabResults !== 'any',
    advancedFilters.hasOrders && advancedFilters.hasOrders !== 'any',
    advancedFilters.minOrders && advancedFilters.minOrders !== '',
    advancedFilters.maxOrders && advancedFilters.maxOrders !== '',
  ].filter(Boolean).length;

  // Reset to first page when search, filter, or sort changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, filter, advancedFilters, sortBy]);

  // Build query string for users API
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      ...(debouncedSearch && { q: debouncedSearch }),
      limit: limit.toString(),
      offset: (currentPage * limit).toString(),
      filter: filter,
      ...(sortBy === 'aiCost' && { sortBy: 'aiCost' }),
    });
    // Add advanced filters
    if (advancedFilters.hasDevices && advancedFilters.hasDevices !== 'any') {
      params.set('hasDevices', advancedFilters.hasDevices === 'yes' ? 'true' : 'false');
    }
    if (advancedFilters.deviceProviders.length > 0) {
      params.set('deviceProviders', advancedFilters.deviceProviders.join(','));
    }
    if (advancedFilters.hasLabResults && advancedFilters.hasLabResults !== 'any') {
      params.set('hasLabResults', advancedFilters.hasLabResults === 'yes' ? 'true' : 'false');
    }
    if (advancedFilters.hasOrders && advancedFilters.hasOrders !== 'any') {
      params.set('hasOrders', advancedFilters.hasOrders === 'yes' ? 'true' : 'false');
    }
    if (advancedFilters.minOrders && advancedFilters.minOrders !== '') {
      params.set('minOrders', advancedFilters.minOrders);
    }
    if (advancedFilters.maxOrders && advancedFilters.maxOrders !== '') {
      params.set('maxOrders', advancedFilters.maxOrders);
    }
    return params.toString();
  }, [debouncedSearch, currentPage, filter, advancedFilters, sortBy]);

  const queryParams = buildQueryParams();

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: [`/api/admin/users?${queryParams}`],
  });

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading users",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleUserClick = (userId: string) => {
    setLocation(`/admin/users/${userId}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div data-testid="page-user-management">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2" data-testid="heading-user-management">
            <Users className="h-5 w-5" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and view all platform users
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {filter === 'paid' ? 'Paid Users' : filter === 'active' ? 'Active Users' : 'All Users'}
                </CardTitle>
                <CardDescription>
                  {total} total user{total !== 1 ? 's' : ''}
                  {filter === 'paid' && ' with orders'}
                  {filter === 'active' && ' with formulas'}
                </CardDescription>
              </div>
              {filter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/admin/users')}
                  data-testid="button-view-all-users"
                >
                  View All Users
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search + Filters Row */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-user-search"
                />
              </div>
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-advanced-filters">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-96 p-0" align="end">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Advanced Filters</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-xs text-muted-foreground"
                          onClick={() => setAdvancedFilters({ ...emptyFilters })}
                          data-testid="button-clear-filters"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-5 max-h-[420px] overflow-y-auto">
                    {/* Connected Devices */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected Devices</Label>
                      <Select
                        value={advancedFilters.hasDevices || 'any'}
                        onValueChange={(v) => setAdvancedFilters(prev => ({
                          ...prev,
                          hasDevices: v as 'any' | 'yes' | 'no',
                          ...(v === 'no' || v === 'any' ? { deviceProviders: [] } : {})
                        }))}
                      >
                        <SelectTrigger className="h-8 text-sm" data-testid="select-has-devices">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="yes">Has devices</SelectItem>
                          <SelectItem value="no">No devices</SelectItem>
                        </SelectContent>
                      </Select>
                      {advancedFilters.hasDevices === 'yes' && (
                        <div className="space-y-2 pl-1 pt-1">
                          <Label className="text-xs text-muted-foreground">Specific providers</Label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {DEVICE_PROVIDERS.map(provider => (
                              <div key={provider.value} className="flex items-center gap-2">
                                <Checkbox
                                  id={`provider-${provider.value}`}
                                  checked={advancedFilters.deviceProviders.includes(provider.value)}
                                  onCheckedChange={(checked) => {
                                    setAdvancedFilters(prev => ({
                                      ...prev,
                                      deviceProviders: checked
                                        ? [...prev.deviceProviders, provider.value]
                                        : prev.deviceProviders.filter(p => p !== provider.value)
                                    }));
                                  }}
                                  data-testid={`checkbox-provider-${provider.value}`}
                                />
                                <Label htmlFor={`provider-${provider.value}`} className="text-sm font-normal cursor-pointer">
                                  {provider.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lab Results */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lab Reports</Label>
                      <Select
                        value={advancedFilters.hasLabResults || 'any'}
                        onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, hasLabResults: v as 'any' | 'yes' | 'no' }))}
                      >
                        <SelectTrigger className="h-8 text-sm" data-testid="select-has-lab-results">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="yes">Has uploaded labs</SelectItem>
                          <SelectItem value="no">No labs uploaded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Orders */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Orders</Label>
                      <Select
                        value={advancedFilters.hasOrders || 'any'}
                        onValueChange={(v) => setAdvancedFilters(prev => ({
                          ...prev,
                          hasOrders: v as 'any' | 'yes' | 'no',
                          ...(v === 'no' || v === 'any' ? { minOrders: '', maxOrders: '' } : {})
                        }))}
                      >
                        <SelectTrigger className="h-8 text-sm" data-testid="select-has-orders">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="yes">Has ordered</SelectItem>
                          <SelectItem value="no">Never ordered</SelectItem>
                        </SelectContent>
                      </Select>
                      {advancedFilters.hasOrders === 'yes' && (
                        <div className="flex items-center gap-2 pl-1 pt-1">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Min orders</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 1"
                              className="h-8 text-sm mt-1"
                              value={advancedFilters.minOrders || ''}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minOrders: e.target.value }))}
                              data-testid="input-min-orders"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Max orders</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 5"
                              className="h-8 text-sm mt-1"
                              value={advancedFilters.maxOrders || ''}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxOrders: e.target.value }))}
                              data-testid="input-max-orders"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 border-t bg-muted/30">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setFiltersOpen(false)}
                      data-testid="button-apply-filters"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant={sortBy === 'aiCost' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setSortBy(sortBy === 'aiCost' ? 'date' : 'aiCost')}
                data-testid="button-sort-ai-cost"
              >
                <DollarSign className="h-4 w-4" />
                {sortBy === 'aiCost' ? 'Sorted by Cost' : 'Sort by AI Cost'}
              </Button>
            </div>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-tags">
                <span className="text-xs text-muted-foreground">Filtering by:</span>
                {advancedFilters.hasDevices === 'yes' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Has devices
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasDevices: 'any', deviceProviders: [] }))} />
                  </Badge>
                )}
                {advancedFilters.hasDevices === 'no' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    No devices
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasDevices: 'any' }))} />
                  </Badge>
                )}
                {advancedFilters.deviceProviders.map(p => {
                  const label = DEVICE_PROVIDERS.find(d => d.value === p)?.label || p;
                  return (
                    <Badge key={p} variant="secondary" className="gap-1 text-xs">
                      {label}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({
                        ...prev,
                        deviceProviders: prev.deviceProviders.filter(dp => dp !== p)
                      }))} />
                    </Badge>
                  );
                })}
                {advancedFilters.hasLabResults === 'yes' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Has labs
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasLabResults: 'any' }))} />
                  </Badge>
                )}
                {advancedFilters.hasLabResults === 'no' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    No labs
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasLabResults: 'any' }))} />
                  </Badge>
                )}
                {advancedFilters.hasOrders === 'yes' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Has orders{advancedFilters.minOrders ? ` (≥${advancedFilters.minOrders})` : ''}{advancedFilters.maxOrders ? ` (≤${advancedFilters.maxOrders})` : ''}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasOrders: 'any', minOrders: '', maxOrders: '' }))} />
                  </Badge>
                )}
                {advancedFilters.hasOrders === 'no' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Never ordered
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAdvancedFilters(prev => ({ ...prev, hasOrders: 'any' }))} />
                  </Badge>
                )}
              </div>
            )}

            {/* Users Table */}
            {isLoading ? (
              <UserTableSkeleton />
            ) : users.length === 0 ? (
              <div className="text-center py-12" data-testid="no-users-found">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query' : 'No users registered yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border" data-testid="table-users">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => setSortBy(sortBy === 'aiCost' ? 'date' : 'aiCost')}
                        >
                          <div className="flex items-center gap-1">
                            AI Cost
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                            {sortBy === 'aiCost' && <span className="text-xs text-primary">(high→low)</span>}
                          </div>
                        </TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleUserClick(user.id)}
                          data-testid={`row-user-${user.id}`}
                        >
                          <TableCell className="font-medium" data-testid={`cell-email-${user.id}`}>
                            {user.email}
                          </TableCell>
                          <TableCell data-testid={`cell-name-${user.id}`}>
                            {user.name}
                          </TableCell>
                          <TableCell data-testid={`cell-phone-${user.id}`}>
                            {user.phone || '-'}
                          </TableCell>
                          <TableCell data-testid={`cell-ai-cost-${user.id}`}>
                            <div className="flex flex-col">
                              <span className={getCostColor(user.aiCostCents || 0)}>
                                {formatCost(user.aiCostCents || 0)}
                              </span>
                              {(user.aiCallCount || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {user.aiCallCount} calls
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-created-${user.id}`}>
                            {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell data-testid={`cell-status-${user.id}`}>
                            {user.isAdmin && (
                              <Badge variant="default" className="gap-1" data-testid={`badge-admin-${user.id}`}>
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between" data-testid="pagination-controls">
                    <p className="text-sm text-muted-foreground" data-testid="pagination-info">
                      Showing {currentPage * limit + 1} to {Math.min((currentPage + 1) * limit, total)} of {total} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 0}
                        data-testid="button-previous-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm font-medium" data-testid="page-number">
                        Page {currentPage + 1} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
