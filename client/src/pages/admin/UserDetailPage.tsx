import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldOff,
  Activity,
  FlaskConical,
  Package,
  MessageSquare,
  Heart,
  Pill,
  AlertCircle,
  Trash2,
  Watch,
  FileText,
  Wifi,
  WifiOff,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { UserAdminNotes } from '@/features/admin/components/UserAdminNotes';
import { apiRequest } from '@/shared/lib/queryClient';

// Types
interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

interface HealthProfile {
  age: number | null;
  sex: string | null;
  weightLbs: number | null;
  heightCm: number | null;
  conditions: string[];
  medications: string[];
  allergies: string[];
}

interface Formula {
  id: string;
  version: number;
  name: string | null;
  totalMg: number;
  createdAt: string;
  bases: Array<{ ingredient: string; amount: number }>;
}

interface Order {
  id: string;
  formulaVersion: number;
  status: string;
  placedAt: string;
  shippedAt: string | null;
  trackingUrl: string | null;
  amountCents: number | null;
  supplyMonths: number | null;
  formula?: Formula;
}

interface ChatSession {
  id: string;
  status: string;
  createdAt: string;
  messageCount: number;
}

interface WearableDevice {
  provider: string;
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

interface FileUploadSummary {
  id: string;
  type: string;
  originalFileName: string;
  uploadedAt: string;
  labReportData?: {
    testDate?: string;
    testType?: string;
    labName?: string;
    analysisStatus?: string;
  } | null;
}

interface UserTimeline {
  healthProfile: HealthProfile | null;
  formulas: Formula[];
  orders: Order[];
  chatSessions: ChatSession[];
  wearableDevices: WearableDevice[];
  fileUploads: FileUploadSummary[];
}

interface AiUsageData {
  totalCostCents: number;
  totalTokens: number;
  totalCalls: number;
  bySession: Array<{
    sessionId: string;
    sessionTitle: string | null;
    sessionCreatedAt: string | null;
    sessionStatus: string | null;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
    firstCall: string;
    lastCall: string;
  }>;
  byFeature: Array<{
    feature: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  dailyCosts: Array<{
    date: string;
    totalCostCents: number;
    callCount: number;
  }>;
}

function formatCostCents(cents: number): string {
  if (cents === 0) return '$0.00';
  if (cents < 100) return `${cents}\u00a2`;
  return `$${(cents / 100).toFixed(2)}`;
}

function getCostBadgeVariant(cents: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (cents >= 500) return 'destructive';
  if (cents >= 200) return 'default';
  return 'secondary';
}

// Loading Skeleton
function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function UserDetailPage() {
  const [, params] = useRoute('/admin/users/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = params?.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch user details
  const { data: user, isLoading: userLoading, error: userError } = useQuery<UserDetail>({
    queryKey: ['/api/admin/users', userId],
    enabled: !!userId,
  });

  // Fetch user timeline (health profile, formulas, orders, chat sessions)
  const { data: timeline, isLoading: timelineLoading, error: timelineError } = useQuery<UserTimeline>({
    queryKey: ['/api/admin/users', userId, 'timeline'],
    enabled: !!userId,
  });

  // Fetch AI usage data for this user
  const { data: aiUsage, isLoading: aiUsageLoading } = useQuery<AiUsageData>({
    queryKey: ['/api/admin/ai-usage/user', userId],
    enabled: !!userId,
  });

  // State for viewing a specific conversation
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Fetch conversation messages when viewing a session
  const { data: conversationDetail } = useQuery<{
    session: any;
    user: any;
    messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
  }>({
    queryKey: ['/api/admin/conversations', viewingSessionId],
    enabled: !!viewingSessionId,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user and all associated data have been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setLocation('/admin/users');
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async (makeAdmin: boolean) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/admin-status`, { isAdmin: makeAdmin });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admin status');
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: updatedUser.isAdmin ? "Admin access granted" : "Admin access revoked",
        description: `${user?.name} is ${updatedUser.isAdmin ? 'now' : 'no longer'} an admin.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating admin status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Show error toast
  useEffect(() => {
    if (userError || timelineError) {
      toast({
        title: "Error loading user details",
        description: (userError || timelineError)?.message || "Please try again later.",
        variant: "destructive"
      });
    }
  }, [userError, timelineError, toast]);

  const isLoading = userLoading || timelineLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <UserDetailSkeleton />
      </div>
    );
  }

  if (userError && !user) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load user</h3>
          <p className="text-muted-foreground mb-4">
            {userError.message || 'An error occurred while loading user details.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId] })} data-testid="button-retry">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => setLocation('/admin/users')} data-testid="button-back-to-users">
              Back to Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">User not found</h3>
          <p className="text-muted-foreground mb-4">
            The requested user could not be found.
          </p>
          <Button onClick={() => setLocation('/admin/users')} data-testid="button-back-to-users">
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const healthProfile = timeline?.healthProfile;
  const formulas = timeline?.formulas || [];
  const orders = timeline?.orders || [];
  const chatSessions = timeline?.chatSessions || [];
  const wearableDevices = timeline?.wearableDevices || [];
  const fileUploads = timeline?.fileUploads || [];
  const labReports = fileUploads.filter(f => f.type === 'lab_report');

  return (
    <div data-testid="page-user-detail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin/users')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-user-name">
              {user.name}
              {user.isAdmin && (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              User ID: {user.id}
            </p>
          </div>
          {/* Admin Actions */}
          <div className="flex items-center gap-2">
            {/* Toggle Admin Status */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={user.isAdmin ? "outline" : "default"}
                  size="sm"
                  data-testid="button-toggle-admin"
                >
                  {user.isAdmin ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Make Admin
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {user.isAdmin ? 'Remove Admin Access' : 'Grant Admin Access'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.isAdmin ? (
                      <>Are you sure you want to remove admin access from <strong>{user.name}</strong>? They will no longer be able to access the admin dashboard.</>
                    ) : (
                      <>Are you sure you want to grant admin access to <strong>{user.name}</strong>? They will have full access to the admin dashboard, user management, and all platform data.</>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-toggle-admin">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => toggleAdminMutation.mutate(!user.isAdmin)}
                    disabled={toggleAdminMutation.isPending}
                    data-testid="button-confirm-toggle-admin"
                  >
                    {toggleAdminMutation.isPending ? 'Updating...' : (user.isAdmin ? 'Remove Admin' : 'Make Admin')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete User Button - only show for non-admin users */}
            {!user.isAdmin && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid="button-delete-user"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p>Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?</p>
                        <p className="mt-2">This action cannot be undone and will permanently delete:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>User account and profile</li>
                          <li>All health profiles and formulas</li>
                          <li>All orders and subscriptions</li>
                          <li>All chat sessions and messages</li>
                          <li>All uploaded files and lab reports</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteUserMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteUserMutation.isPending}
                      data-testid="button-confirm-delete"
                    >
                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* User Info Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Information */}
          <Card data-testid="card-contact-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-phone">{user.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-address">
                    {user.addressLine1 ? (
                      <>
                        {user.addressLine1}
                        {user.addressLine2 && <><br />{user.addressLine2}</>}
                        {(user.city || user.state || user.postalCode) && (
                          <>
                            <br />
                            {user.city && `${user.city}, `}
                            {user.state && `${user.state} `}
                            {user.postalCode}
                          </>
                        )}
                      </>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-created-date">
                    {format(new Date(user.createdAt), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Profile */}
          <Card data-testid="card-health-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthProfile ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {healthProfile.age && (
                      <div>
                        <p className="text-sm font-medium">Age</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-age">{healthProfile.age} years</p>
                      </div>
                    )}
                    {healthProfile.sex && (
                      <div>
                        <p className="text-sm font-medium">Sex</p>
                        <p className="text-sm text-muted-foreground capitalize" data-testid="text-sex">{healthProfile.sex}</p>
                      </div>
                    )}
                    {healthProfile.weightLbs && (
                      <div>
                        <p className="text-sm font-medium">Weight</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-weight">{healthProfile.weightLbs} lbs</p>
                      </div>
                    )}
                    {healthProfile.heightCm && (
                      <div>
                        <p className="text-sm font-medium">Height</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-height">{healthProfile.heightCm} cm</p>
                      </div>
                    )}
                  </div>
                  {Array.isArray(healthProfile.conditions) && healthProfile.conditions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Conditions</p>
                      <div className="flex flex-wrap gap-1">
                        {healthProfile.conditions.map((condition, i) => (
                          <Badge key={i} variant="secondary" data-testid={`badge-condition-${i}`}>
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Medications</p>
                      <div className="flex flex-wrap gap-1">
                        {healthProfile.medications.map((med, i) => (
                          <Badge key={i} variant="secondary" data-testid={`badge-medication-${i}`}>
                            <Pill className="h-3 w-3 mr-1" />
                            {med}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Allergies</p>
                      <div className="flex flex-wrap gap-1">
                        {healthProfile.allergies.map((allergy, i) => (
                          <Badge key={i} variant="destructive" data-testid={`badge-allergy-${i}`}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-health-profile">
                  No health profile data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connected Devices & Lab Reports */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Connected Devices */}
          <Card data-testid="card-connected-devices">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Watch className="h-5 w-5" />
                Connected Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wearableDevices.length > 0 ? (
                <div className="space-y-3">
                  {wearableDevices.map((device, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.status === 'connected' ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium capitalize">{device.provider}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={device.status === 'connected' ? 'default' : device.status === 'error' || device.status === 'token_expired' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {device.status === 'token_expired' ? 'expired' : device.status}
                        </Badge>
                        {device.lastSyncAt && (
                          <span className="text-xs text-muted-foreground">
                            Synced {format(new Date(device.lastSyncAt), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No devices connected</p>
              )}
            </CardContent>
          </Card>

          {/* Lab Reports */}
          <Card data-testid="card-lab-reports">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lab Reports
                {labReports.length > 0 && (
                  <Badge variant="default" className="ml-auto">
                    {labReports.length} uploaded
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {labReports.length > 0 ? (
                <div className="space-y-3">
                  {labReports.map((report) => (
                    <div key={report.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {report.labReportData?.testType || report.originalFileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.labReportData?.labName && `${report.labReportData.labName} · `}
                            {format(new Date(report.uploadedAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      {report.labReportData?.analysisStatus && (
                        <Badge
                          variant={report.labReportData.analysisStatus === 'completed' ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {report.labReportData.analysisStatus}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lab reports uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Notes */}
        <UserAdminNotes userId={user.id} />

        {/* Activity Tabs */}
        <Card data-testid="card-activity-tabs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Activity
            </CardTitle>
            <CardDescription>
              View user's formulas, orders, chat sessions, and AI costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="formulas" data-testid="tabs-user-activity">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="formulas" data-testid="tab-formulas">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Formulas ({formulas.length})
                </TabsTrigger>
                <TabsTrigger value="orders" data-testid="tab-orders">
                  <Package className="h-4 w-4 mr-2" />
                  Orders ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="chats" data-testid="tab-chats">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chats ({chatSessions.length})
                </TabsTrigger>
                <TabsTrigger value="ai-usage" data-testid="tab-ai-usage">
                  <DollarSign className="h-4 w-4 mr-2" />
                  AI Costs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="formulas" className="space-y-4 mt-4">
                {formulas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-formulas">
                    No formulas created yet
                  </p>
                ) : (
                  formulas.map((formula) => (
                    <Card key={formula.id} data-testid={`card-formula-${formula.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {formula.name || `Formula v${formula.version}`}
                          </CardTitle>
                          <Badge variant="outline">v{formula.version}</Badge>
                        </div>
                        <CardDescription>
                          Created {format(new Date(formula.createdAt), 'MMM dd, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">{formula.bases.length}</span> base ingredients
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">{formula.totalMg}mg</span> total dosage
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 mt-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-orders">
                    No orders placed yet
                  </p>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} data-testid={`card-order-${order.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base">Order #{order.id.slice(0, 8)}</CardTitle>
                            <CardDescription>
                              Placed {format(new Date(order.placedAt), 'MMM dd, yyyy')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.amountCents && (
                              <Badge variant="outline" className="font-mono">
                                ${(order.amountCents / 100).toFixed(2)}
                              </Badge>
                            )}
                            <Badge
                              variant={
                                order.status === 'delivered' ? 'default' :
                                  order.status === 'shipped' ? 'default' :
                                    order.status === 'cancelled' ? 'destructive' :
                                      'secondary'
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Order Details */}
                          <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                            <div>
                              <p className="text-xs text-muted-foreground">Formula Version</p>
                              <p className="text-sm font-medium" data-testid={`text-formula-version-${order.id}`}>v{order.formulaVersion}</p>
                            </div>
                            {order.supplyMonths && (
                              <div>
                                <p className="text-xs text-muted-foreground">Supply Duration</p>
                                <p className="text-sm font-medium" data-testid={`text-supply-months-${order.id}`}>
                                  {order.supplyMonths} month{order.supplyMonths !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Formula Ingredients */}
                          {order.formula && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Formula Composition</p>
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">{order.formula.bases.length}</span> ingredients •
                                  <span className="font-medium ml-1">{order.formula.totalMg}mg</span> total
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {order.formula.bases.slice(0, 5).map((base, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-xs"
                                      data-testid={`badge-ingredient-${order.id}-${i}`}
                                    >
                                      {base.ingredient} - {base.amount}mg
                                    </Badge>
                                  ))}
                                  {order.formula.bases.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{order.formula.bases.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Shipping Details */}
                          {(order.shippedAt || order.trackingUrl) && (
                            <div className="pt-2 border-t">
                              {order.shippedAt && (
                                <p className="text-sm text-muted-foreground">
                                  Shipped: {format(new Date(order.shippedAt), 'MMM dd, yyyy')}
                                </p>
                              )}
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline inline-block mt-1"
                                  data-testid={`link-tracking-${order.id}`}
                                >
                                  Track shipment →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="chats" className="space-y-4 mt-4">
                {chatSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-chats">
                    No chat sessions yet
                  </p>
                ) : (
                  chatSessions.map((session) => (
                    <Card key={session.id} data-testid={`card-chat-${session.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Session #{session.id.slice(0, 8)}</CardTitle>
                          <Badge
                            variant={session.status === 'active' ? 'default' : 'secondary'}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Started {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">
                          <span className="font-medium">{session.messageCount}</span> messages
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* AI Usage Tab */}
              <TabsContent value="ai-usage" className="space-y-4 mt-4">
                {aiUsageLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-40" />
                  </div>
                ) : !aiUsage || aiUsage.totalCalls === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-ai-usage">
                    No AI usage recorded yet
                  </p>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-bold text-primary" data-testid="ai-total-cost">
                          {formatCostCents(aiUsage.totalCostCents)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">API Calls</p>
                        <p className="text-lg font-bold" data-testid="ai-total-calls">
                          {aiUsage.totalCalls}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Tokens Used</p>
                        <p className="text-lg font-bold" data-testid="ai-total-tokens">
                          {aiUsage.totalTokens >= 1_000_000
                            ? `${(aiUsage.totalTokens / 1_000_000).toFixed(1)}M`
                            : aiUsage.totalTokens >= 1_000
                              ? `${(aiUsage.totalTokens / 1_000).toFixed(1)}K`
                              : aiUsage.totalTokens}
                        </p>
                      </div>
                    </div>

                    {/* Feature Breakdown */}
                    {aiUsage.byFeature.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Cost by Feature</h4>
                        <div className="space-y-1">
                          {aiUsage.byFeature.map((f) => (
                            <div key={f.feature} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                              <span className="capitalize">{f.feature.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{f.callCount} calls</span>
                                <Badge variant={getCostBadgeVariant(f.totalCostCents)}>
                                  {formatCostCents(f.totalCostCents)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-Session Breakdown — the key section for understanding overuse */}
                    {aiUsage.bySession.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Cost per Conversation (highest first)
                        </h4>
                        <div className="space-y-2">
                          {aiUsage.bySession.map((s) => (
                            <Card key={s.sessionId} className="overflow-hidden">
                              <div
                                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setViewingSessionId(
                                  viewingSessionId === s.sessionId ? null : s.sessionId
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">
                                        {s.sessionTitle || `Session #${s.sessionId.slice(0, 8)}`}
                                      </span>
                                      {s.sessionStatus && (
                                        <Badge variant={s.sessionStatus === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                                          {s.sessionStatus}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {s.sessionCreatedAt ? format(new Date(s.sessionCreatedAt), 'MMM dd, yyyy') : format(new Date(s.firstCall), 'MMM dd')}
                                      </span>
                                      <span>{s.callCount} AI calls</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getCostBadgeVariant(s.totalCostCents)}>
                                      {formatCostCents(s.totalCostCents)}
                                    </Badge>
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>

                              {/* Expanded: show actual messages */}
                              {viewingSessionId === s.sessionId && (
                                <div className="border-t bg-muted/20 px-3 py-2 max-h-80 overflow-y-auto">
                                  {!conversationDetail ? (
                                    <div className="space-y-2 py-2">
                                      <Skeleton className="h-4 w-3/4" />
                                      <Skeleton className="h-4 w-1/2" />
                                      <Skeleton className="h-4 w-2/3" />
                                    </div>
                                  ) : conversationDetail.messages.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No messages found</p>
                                  ) : (
                                    <div className="space-y-2 py-1">
                                      {conversationDetail.messages.map((msg) => (
                                        <div key={msg.id} className={`text-xs rounded p-2 ${
                                          msg.role === 'user'
                                            ? 'bg-blue-50 border-l-2 border-blue-300'
                                            : msg.role === 'assistant'
                                              ? 'bg-gray-50 border-l-2 border-gray-300'
                                              : 'bg-yellow-50 border-l-2 border-yellow-300 italic'
                                        }`}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold capitalize text-[10px] uppercase tracking-wider">
                                              {msg.role}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {format(new Date(msg.createdAt), 'h:mm a')}
                                            </span>
                                          </div>
                                          <p className="whitespace-pre-wrap line-clamp-6">
                                            {msg.content.length > 500
                                              ? msg.content.slice(0, 500) + '...'
                                              : msg.content}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Trend */}
                    {aiUsage.dailyCosts.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Daily Usage (last 30 days)</h4>
                        <div className="flex items-end gap-1 h-20">
                          {aiUsage.dailyCosts.map((d) => {
                            const maxCost = Math.max(...aiUsage.dailyCosts.map(x => x.totalCostCents), 1);
                            const height = Math.max(2, (d.totalCostCents / maxCost) * 100);
                            return (
                              <div
                                key={d.date}
                                className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors"
                                style={{ height: `${height}%` }}
                                title={`${d.date}: ${formatCostCents(d.totalCostCents)} (${d.callCount} calls)`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{aiUsage.dailyCosts[0]?.date}</span>
                          <span>{aiUsage.dailyCosts[aiUsage.dailyCosts.length - 1]?.date}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
