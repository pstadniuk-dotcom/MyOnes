import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useSearch } from 'wouter';
import { Search as SearchIcon, ChevronLeft, ChevronRight, Users, Shield, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isAdmin: boolean;
}

interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

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
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const limit = 20;

  // Get filter from URL query parameter
  const urlParams = new URLSearchParams(searchParams);
  const filter = urlParams.get('filter') || 'all';

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, filter]);

  // Build query string for users API
  const queryParams = new URLSearchParams({
    ...(debouncedSearch && { q: debouncedSearch }),
    limit: limit.toString(),
    offset: (currentPage * limit).toString(),
    filter: filter,
  });

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: [`/api/admin/users?${queryParams.toString()}`],
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
    <div className="p-8" data-testid="page-user-management">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-user-management">
              <Users className="h-8 w-8" />
              User Management
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/admin')}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <p className="text-muted-foreground">
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
            {/* Search Input */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-user-search"
              />
            </div>

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
