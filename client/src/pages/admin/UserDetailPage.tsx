import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Activity,
  FlaskConical,
  Package,
  MessageSquare,
  Heart,
  Pill,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { UserAdminNotes } from '@/components/admin/UserAdminNotes';

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

interface UserTimeline {
  healthProfile: HealthProfile | null;
  formulas: Formula[];
  orders: Order[];
  chatSessions: ChatSession[];
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
  const userId = params?.id;

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

  return (
    <div className="p-8" data-testid="page-user-detail">
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
                  {healthProfile.conditions && healthProfile.conditions.length > 0 && (
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
                  {healthProfile.medications && healthProfile.medications.length > 0 && (
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
                  {healthProfile.allergies && healthProfile.allergies.length > 0 && (
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
              View user's formulas, orders, and chat sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="formulas" data-testid="tabs-user-activity">
              <TabsList className="grid w-full grid-cols-3">
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
                  Chat Sessions ({chatSessions.length})
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
