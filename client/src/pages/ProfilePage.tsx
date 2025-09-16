import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  FileText, 
  Settings, 
  Upload, 
  Download,
  Trash2,
  Plus,
  Activity,
  Shield,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from 'wouter';

// Mock health profile data
const healthProfile = {
  age: 32,
  sex: 'male',
  weightKg: 75,
  conditions: ['Mild anxiety', 'Occasional insomnia'],
  medications: ['None'],
  allergies: ['Shellfish'],
};

const labReports = [
  {
    id: '1',
    name: 'Comprehensive Metabolic Panel',
    uploadDate: '2024-09-15',
    type: 'lab_report',
    status: 'analyzed',
    insights: ['Vitamin D deficiency detected', 'Normal B12 levels']
  },
  {
    id: '2', 
    name: 'Complete Blood Count',
    uploadDate: '2024-08-20',
    type: 'lab_report',
    status: 'analyzed',
    insights: ['All values within normal range']
  },
  {
    id: '3',
    name: 'Lipid Profile',
    uploadDate: '2024-07-25',
    type: 'lab_report', 
    status: 'pending',
    insights: []
  }
];

export default function ProfilePage() {
  const { user } = useAuth();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [notifications, setNotifications] = useState({
    emailConsultation: true,
    emailShipping: true,
    emailBilling: true,
    pushNotifications: true,
  });

  return (
    <div className="space-y-6" data-testid="page-profile">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-profile-title">
            Profile & Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, health profile, and preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">Health Info</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Lab Reports</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Personal Information */}
          <Card data-testid="section-personal-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  data-testid="input-phone"
                />
              </div>
              <div className="flex justify-end">
                <Button data-testid="button-save-profile">Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card data-testid="section-security">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button data-testid="button-change-password">Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Health Profile */}
          <Card data-testid="section-health-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Health Profile
              </CardTitle>
              <CardDescription>
                Keep your health information up to date for better formula optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    defaultValue={healthProfile.age}
                    data-testid="input-age"
                  />
                </div>
                <div>
                  <Label htmlFor="sex">Sex</Label>
                  <Select defaultValue={healthProfile.sex}>
                    <SelectTrigger data-testid="select-sex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    defaultValue={healthProfile.weightKg}
                    data-testid="input-weight"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="conditions">Health Conditions</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {healthProfile.conditions.map((condition, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {condition}
                        <button className="ml-2 text-muted-foreground hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="conditions"
                    placeholder="Add a health condition..."
                    data-testid="input-conditions"
                  />
                </div>

                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {healthProfile.medications.map((medication, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {medication}
                        <button className="ml-2 text-muted-foreground hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="medications"
                    placeholder="Add a medication..."
                    data-testid="input-medications"
                  />
                </div>

                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {healthProfile.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive" className="text-sm">
                        {allergy}
                        <button className="ml-2 text-white hover:text-gray-300">×</button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="allergies"
                    placeholder="Add an allergy..."
                    data-testid="input-allergies"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button data-testid="button-save-health-profile">Save Health Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Lab Reports */}
          <Card data-testid="section-lab-reports">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Lab Reports & Documents
                  </CardTitle>
                  <CardDescription>
                    Upload and manage your blood work, medical reports, and other health documents
                  </CardDescription>
                </div>
                <Button data-testid="button-upload-report">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {labReports.map((report) => (
                  <Card key={report.id} className="border-l-4 border-l-blue-400" data-testid={`report-${report.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Uploaded on {new Date(report.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'analyzed' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                          <Button variant="outline" size="sm" data-testid={`button-download-${report.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" data-testid={`button-delete-${report.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {report.insights.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                          <h5 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-300">AI Insights:</h5>
                          <ul className="space-y-1">
                            {report.insights.map((insight, idx) => (
                              <li key={idx} className="text-sm text-blue-700 dark:text-blue-400 flex items-start">
                                <span className="text-blue-600 mr-2">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {labReports.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No reports uploaded yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your blood work and medical reports to get personalized insights
                    </p>
                    <Button data-testid="button-upload-first-report">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Your First Report
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Notification Preferences */}
          <Card data-testid="section-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates and activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-consultation">Email Consultation Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified about AI consultation responses</p>
                  </div>
                  <Switch
                    id="email-consultation"
                    checked={notifications.emailConsultation}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailConsultation: checked})
                    }
                    data-testid="switch-email-consultation"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-shipping">Shipping Notifications</Label>
                    <p className="text-sm text-muted-foreground">Order confirmations, shipping, and delivery updates</p>
                  </div>
                  <Switch
                    id="email-shipping"
                    checked={notifications.emailShipping}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailShipping: checked})
                    }
                    data-testid="switch-email-shipping"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-billing">Billing & Account</Label>
                    <p className="text-sm text-muted-foreground">Payment confirmations and account changes</p>
                  </div>
                  <Switch
                    id="email-billing"
                    checked={notifications.emailBilling}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailBilling: checked})
                    }
                    data-testid="switch-email-billing"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser notifications for important updates</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, pushNotifications: checked})
                    }
                    data-testid="switch-push-notifications"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button data-testid="button-save-notifications">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card data-testid="section-privacy">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control how your data is used and shared
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Data Export</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a copy of all your data including health profile, consultations, and formulas.
                </p>
                <Button variant="outline" data-testid="button-export-data">
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/30">
                <h4 className="font-medium mb-2 text-red-800 dark:text-red-300">Delete Account</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive" data-testid="button-delete-account">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}