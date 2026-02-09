import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  User,
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest, queryClient, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import type { User as UserType, HealthProfile } from '@shared/schema';

// Loading skeleton components
function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // React Query for user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    enabled: isAuthenticated,
  });

  // React Query for health profile
  const { data: healthProfile, isLoading: healthLoading, error: healthError } = useQuery<HealthProfile>({
    queryKey: ['/api/users/me/health-profile'],
    enabled: isAuthenticated,
  });

  // Form states - initialize with fetched data
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const [healthData, setHealthData] = useState({
    age: '',
    sex: '',
    weightLbs: '',
    heightCm: '',
    heightFeet: '',
    heightInches: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    restingHeartRate: '',
    sleepHoursPerNight: '',
    exerciseDaysPerWeek: '',
    stressLevel: '',
    smokingStatus: '',
    alcoholDrinksPerWeek: '',
    conditions: [] as string[],
    medications: [] as string[],
    allergies: [] as string[],
  });

  // State for pending inputs
  const [conditionInput, setConditionInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');

  // Update form states when data is loaded
  useEffect(() => {
    if (userData?.user) {
      setProfile({
        name: userData.user.name || '',
        email: userData.user.email || '',
        phone: userData.user.phone || '',
        addressLine1: userData.user.addressLine1 || '',
        addressLine2: userData.user.addressLine2 || '',
        city: userData.user.city || '',
        state: userData.user.state || '',
        postalCode: userData.user.postalCode || '',
        country: userData.user.country || 'US',
      });
    }
  }, [userData]);

  useEffect(() => {
    if (healthProfile) {
      // Convert cm to feet and inches
      let feet = '';
      let inches = '';
      if (healthProfile.heightCm) {
        const totalInches = healthProfile.heightCm / 2.54;
        feet = Math.floor(totalInches / 12).toString();
        inches = Math.round(totalInches % 12).toString();
      }

      setHealthData({
        age: healthProfile.age?.toString() || '',
        sex: healthProfile.sex || '',
        weightLbs: healthProfile.weightLbs?.toString() || '',
        heightCm: healthProfile.heightCm?.toString() || '',
        heightFeet: feet,
        heightInches: inches,
        bloodPressureSystolic: healthProfile.bloodPressureSystolic?.toString() || '',
        bloodPressureDiastolic: healthProfile.bloodPressureDiastolic?.toString() || '',
        restingHeartRate: healthProfile.restingHeartRate?.toString() || '',
        sleepHoursPerNight: healthProfile.sleepHoursPerNight?.toString() || '',
        exerciseDaysPerWeek: healthProfile.exerciseDaysPerWeek?.toString() || '',
        stressLevel: healthProfile.stressLevel?.toString() || '',
        smokingStatus: healthProfile.smokingStatus || '',
        alcoholDrinksPerWeek: healthProfile.alcoholDrinksPerWeek?.toString() || '',
        conditions: healthProfile.conditions || [],
        medications: healthProfile.medications || [],
        allergies: healthProfile.allergies || [],
      });
    }
  }, [healthProfile]);

  // Mutations for updating data
  const updateHealthProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/users/me/health-profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Health profile updated",
        description: "Your health score will update based on the new information.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating health profile",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async (data: {
      name?: string;
      email?: string;
      phone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    }) => {
      const response = await apiRequest('PATCH', '/api/users/me/profile', data);
      return response.json();
    },
    onSuccess: async (data) => {
      // Update the form with the returned data
      if (data?.user) {
        setProfile({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          addressLine1: data.user.addressLine1 || '',
          addressLine2: data.user.addressLine2 || '',
          city: data.user.city || '',
          state: data.user.state || '',
          postalCode: data.user.postalCode || '',
          country: data.user.country || 'US',
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Consent mutation
  const grantConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/consents/grant', {
        consentType: 'lab_data_processing',
        consentVersion: '1.0',
        consentText: 'I consent to Ones AI processing my lab data and health information to provide personalized supplement recommendations.'
      });
      return response.json();
    },
    onSuccess: async () => {
      setShowConsentDialog(false);
      // Now proceed with the file upload
      if (pendingFile) {
        await uploadFile(pendingFile);
        setPendingFile(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Consent failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete file mutation
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      toast({
        title: "File deleted",
        description: "Lab report has been permanently deleted.",
      });
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  });

  // Actual file upload function
  const uploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'lab-report');
      formData.append('metadata', JSON.stringify({
        uploadSource: 'health-profile-page',
        originalName: file.name
      }));

      const response = await fetch(buildApiUrl('/api/files/upload'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been securely uploaded.`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPG, or PNG file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Store the file and show consent dialog
    setPendingFile(file);
    setShowConsentDialog(true);
  };

  // Show error message if any critical data fetch fails
  // But ignore 404 errors for health profile (user hasn't created one yet)
  useEffect(() => {
    // Check if error is a 404 "not found" or JSON parsing error (expected for new users)
    const isNonCriticalError = (error: Error | null) => {
      if (!error) return false;
      const msg = error.message || '';
      // Check for 404s, "not found" errors, or JSON parsing errors (which happen when endpoint returns HTML)
      return msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('No health profile') ||
        msg.includes('Unexpected token') ||
        msg.includes('is not valid JSON');
    };

    // Only show toast for real errors (not 404 "not found" or parsing errors)
    const hasRealError = userError && !isNonCriticalError(userError);
    const hasHealthError = healthError && !isNonCriticalError(healthError);

    if (hasRealError || hasHealthError) {
      toast({
        title: "Error loading profile data",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    }
  }, [userError, healthError, toast]);

  // Show loading state if critical data is still loading
  if (userLoading) {
    return (
      <div className="space-y-6" data-testid="page-profile">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Tabs className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="health">Health Info</TabsTrigger>
          </TabsList>
          <Card>
            <CardContent className="pt-6">
              <ProfileSkeleton />
            </CardContent>
          </Card>
        </Tabs>
      </div>
    );
  }

  // Show error state if critical data failed to load
  if (userError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Failed to load profile</h3>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentUser = userData?.user || user;

  return (
    <div className="space-y-6" data-testid="page-profile">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B4332]" data-testid="text-profile-title">
            Profile & Settings
          </h1>
          <p className="text-[#52796F]">
            Manage your account, health profile, and preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-[#FAF7F2]">
          <TabsTrigger value="profile" data-testid="tab-profile" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">Profile</TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">Health Info</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Personal Information */}
          <Card data-testid="section-personal-info" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-[#52796F]">
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
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  data-testid="input-phone"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Address</h3>
                </div>
                <div>
                  <Label htmlFor="addressLine1">Street Address</Label>
                  <Input
                    id="addressLine1"
                    value={profile.addressLine1}
                    onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
                    placeholder="123 Main Street"
                    data-testid="input-address-line1"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Apartment, Suite, etc. (Optional)</Label>
                  <Input
                    id="addressLine2"
                    value={profile.addressLine2}
                    onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })}
                    placeholder="Apt 4B"
                    data-testid="input-address-line2"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="New York"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      placeholder="NY"
                      data-testid="input-state"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={profile.postalCode}
                      onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                      placeholder="10001"
                      data-testid="input-postal-code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      placeholder="US"
                      data-testid="input-country"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      await updateUserProfileMutation.mutateAsync({
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone || null,
                        addressLine1: profile.addressLine1 || null,
                        addressLine2: profile.addressLine2 || null,
                        city: profile.city || null,
                        state: profile.state || null,
                        postalCode: profile.postalCode || null,
                        country: profile.country || null,
                      });
                    } catch (error) {
                      // Error handling is done in the mutation
                    }
                  }}
                  disabled={updateUserProfileMutation.isPending}
                  data-testid="button-save-profile"
                  className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                >
                  {updateUserProfileMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Health Profile */}
          <Card data-testid="section-health-profile" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Activity className="w-5 h-5" />
                Health Profile
              </CardTitle>
              <CardDescription className="text-[#52796F]">
                Keep your health information up to date for better formula optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Demographics */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold text-[#1B4332]">Basic Information</h3>
                <p className="text-sm text-[#52796F]">Essential details for health calculations</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="age">Age</Label>
                  {healthLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input
                      id="age"
                      type="number"
                      value={healthData.age}
                      onChange={(e) => setHealthData({ ...healthData, age: e.target.value })}
                      placeholder="Enter your age"
                      data-testid="input-age"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="sex">Sex</Label>
                  {healthLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={healthData.sex} onValueChange={(value) => setHealthData({ ...healthData, sex: value })}>
                      <SelectTrigger data-testid="select-sex">
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="">
                  <Label>Height</Label>
                  {healthLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="height-feet"
                          type="number"
                          value={healthData.heightFeet}
                          onChange={(e) => setHealthData({ ...healthData, heightFeet: e.target.value })}
                          placeholder="Feet"
                          min="3"
                          max="8"
                          data-testid="input-height-feet"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          id="height-inches"
                          type="number"
                          value={healthData.heightInches}
                          onChange={(e) => setHealthData({ ...healthData, heightInches: e.target.value })}
                          placeholder="Inches"
                          min="0"
                          max="11"
                          data-testid="input-height-inches"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  {healthLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input
                      id="weight"
                      type="number"
                      value={healthData.weightLbs}
                      onChange={(e) => setHealthData({ ...healthData, weightLbs: e.target.value })}
                      placeholder="Enter weight in lbs"
                      data-testid="input-weight"
                    />
                  )}
                </div>
              </div>

              <Separator className="bg-[#52796F]/20" />

              {/* Vital Signs */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold text-[#1B4332]">Vital Signs</h3>
                <p className="text-sm text-[#52796F]">Current measurements for accurate health scoring</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="bpSystolic">Blood Pressure - Systolic</Label>
                  <Input
                    id="bpSystolic"
                    type="number"
                    value={healthData.bloodPressureSystolic}
                    onChange={(e) => setHealthData({ ...healthData, bloodPressureSystolic: e.target.value })}
                    min="0"
                    placeholder="e.g. 120"
                    data-testid="input-bp-systolic"
                  />
                </div>
                <div>
                  <Label htmlFor="bpDiastolic">Blood Pressure - Diastolic</Label>
                  <Input
                    id="bpDiastolic"
                    type="number"
                    value={healthData.bloodPressureDiastolic}
                    onChange={(e) => setHealthData({ ...healthData, bloodPressureDiastolic: e.target.value })}
                    min="0"
                    placeholder="e.g. 80"
                    data-testid="input-bp-diastolic"
                  />
                </div>
                <div>
                  <Label htmlFor="heartRate">Resting Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={healthData.restingHeartRate}
                    onChange={(e) => setHealthData({ ...healthData, restingHeartRate: e.target.value })}
                    min="0"
                    placeholder="e.g. 70"
                    data-testid="input-heart-rate"
                  />
                </div>
              </div>

              <Separator className="bg-[#52796F]/20" />

              {/* Lifestyle Factors */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold text-[#1B4332]">Lifestyle Factors</h3>
                <p className="text-sm text-[#52796F]">Help us understand your daily habits</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="sleep">Sleep Hours per Night</Label>
                  <Input
                    id="sleep"
                    type="number"
                    value={healthData.sleepHoursPerNight}
                    onChange={(e) => setHealthData({ ...healthData, sleepHoursPerNight: e.target.value })}
                    min="0"
                    placeholder="e.g. 7"
                    data-testid="input-sleep"
                  />
                </div>
                <div>
                  <Label htmlFor="exercise">Exercise Days per Week</Label>
                  <Input
                    id="exercise"
                    type="number"
                    value={healthData.exerciseDaysPerWeek}
                    onChange={(e) => setHealthData({ ...healthData, exerciseDaysPerWeek: e.target.value })}
                    placeholder="e.g. 3"
                    min="0"
                    max="7"
                    data-testid="input-exercise"
                  />
                </div>
                <div>
                  <Label htmlFor="stress">Stress Level (1-10)</Label>
                  <Input
                    id="stress"
                    type="number"
                    value={healthData.stressLevel}
                    onChange={(e) => setHealthData({ ...healthData, stressLevel: e.target.value })}
                    placeholder="e.g. 5"
                    min="1"
                    max="10"
                    data-testid="input-stress"
                  />
                </div>
              </div>

              <Separator className="bg-[#52796F]/20" />

              {/* Risk Factors */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold text-[#1B4332]">Risk Factors</h3>
                <p className="text-sm text-[#52796F]">Important for personalized recommendations</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="smoking">Smoking Status</Label>
                  <Select value={healthData.smokingStatus} onValueChange={(value) => setHealthData({ ...healthData, smokingStatus: value })}>
                    <SelectTrigger data-testid="select-smoking">
                      <SelectValue placeholder="Select smoking status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="former">Former Smoker</SelectItem>
                      <SelectItem value="current">Current Smoker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alcohol">Alcohol Drinks per Week</Label>
                  <Input
                    id="alcohol"
                    type="number"
                    value={healthData.alcoholDrinksPerWeek}
                    onChange={(e) => setHealthData({ ...healthData, alcoholDrinksPerWeek: e.target.value })}
                    placeholder="e.g. 2"
                    min="0"
                    data-testid="input-alcohol"
                  />
                </div>
              </div>

              <Separator className="bg-[#52796F]/20" />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="conditions">Health Conditions</Label>
                  {healthLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {healthData.conditions.map((condition, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm">
                            {condition}
                            <button
                              className="ml-2 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const newConditions = healthData.conditions.filter((_, i) => i !== idx);
                                setHealthData({ ...healthData, conditions: newConditions });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        id="conditions"
                        value={conditionInput}
                        onChange={(e) => setConditionInput(e.target.value)}
                        placeholder="Add a health condition..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = conditionInput.trim();
                            if (value && !healthData.conditions.includes(value)) {
                              setHealthData({ ...healthData, conditions: [...healthData.conditions, value] });
                              setConditionInput('');
                            }
                          }
                        }}
                        data-testid="input-conditions"
                      />
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  {healthLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {healthData.medications.map((medication, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {medication}
                            <button
                              className="ml-2 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const newMedications = healthData.medications.filter((_, i) => i !== idx);
                                setHealthData({ ...healthData, medications: newMedications });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        id="medications"
                        value={medicationInput}
                        onChange={(e) => setMedicationInput(e.target.value)}
                        placeholder="Add a medication..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = medicationInput.trim();
                            if (value && !healthData.medications.includes(value)) {
                              setHealthData({ ...healthData, medications: [...healthData.medications, value] });
                              setMedicationInput('');
                            }
                          }
                        }}
                        data-testid="input-medications"
                      />
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  {healthLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {healthData.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="destructive" className="text-sm">
                            {allergy}
                            <button
                              className="ml-2 text-white hover:text-gray-300"
                              onClick={() => {
                                const newAllergies = healthData.allergies.filter((_, i) => i !== idx);
                                setHealthData({ ...healthData, allergies: newAllergies });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        id="allergies"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder="Add an allergy..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = allergyInput.trim();
                            if (value && !healthData.allergies.includes(value)) {
                              setHealthData({ ...healthData, allergies: [...healthData.allergies, value] });
                              setAllergyInput('');
                            }
                          }
                        }}
                        data-testid="input-allergies"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      // Handle pending inputs
                      const currentConditions = [...healthData.conditions];
                      if (conditionInput.trim() && !currentConditions.includes(conditionInput.trim())) {
                        currentConditions.push(conditionInput.trim());
                        setConditionInput('');
                      }

                      const currentMedications = [...healthData.medications];
                      if (medicationInput.trim() && !currentMedications.includes(medicationInput.trim())) {
                        currentMedications.push(medicationInput.trim());
                        setMedicationInput('');
                      }

                      const currentAllergies = [...healthData.allergies];
                      if (allergyInput.trim() && !currentAllergies.includes(allergyInput.trim())) {
                        currentAllergies.push(allergyInput.trim());
                        setAllergyInput('');
                      }

                      // Convert feet and inches to cm
                      let heightCm = null;
                      if (healthData.heightFeet || healthData.heightInches) {
                        const feet = parseInt(healthData.heightFeet) || 0;
                        const inches = parseInt(healthData.heightInches) || 0;
                        const totalInches = (feet * 12) + inches;
                        heightCm = Math.round(totalInches * 2.54);
                      }

                      const healthProfileData = {
                        age: healthData.age ? parseInt(healthData.age) : null,
                        sex: healthData.sex || null,
                        weightLbs: healthData.weightLbs ? parseInt(healthData.weightLbs) : null,
                        heightCm: heightCm,
                        bloodPressureSystolic: healthData.bloodPressureSystolic ? parseInt(healthData.bloodPressureSystolic) : null,
                        bloodPressureDiastolic: healthData.bloodPressureDiastolic ? parseInt(healthData.bloodPressureDiastolic) : null,
                        restingHeartRate: healthData.restingHeartRate ? parseInt(healthData.restingHeartRate) : null,
                        sleepHoursPerNight: healthData.sleepHoursPerNight ? parseInt(healthData.sleepHoursPerNight) : null,
                        exerciseDaysPerWeek: healthData.exerciseDaysPerWeek ? parseInt(healthData.exerciseDaysPerWeek) : null,
                        stressLevel: healthData.stressLevel ? parseInt(healthData.stressLevel) : null,
                        smokingStatus: healthData.smokingStatus || null,
                        alcoholDrinksPerWeek: healthData.alcoholDrinksPerWeek ? parseInt(healthData.alcoholDrinksPerWeek) : null,
                        conditions: currentConditions,
                        medications: currentMedications,
                        allergies: currentAllergies,
                      };
                      await updateHealthProfileMutation.mutateAsync(healthProfileData);
                    } catch (error) {
                      // Error handling is done in the mutation
                    }
                  }}
                  disabled={updateHealthProfileMutation.isPending}
                  data-testid="button-save-health-profile"
                  className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                >
                  {updateHealthProfileMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Health Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent data-testid="dialog-consent">
          <DialogHeader>
            <DialogTitle>Consent to Process Health Data</DialogTitle>
            <DialogDescription>
              To upload and analyze your lab results, we need your consent to process your health information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              By providing consent, you agree to allow Ones AI to:
            </p>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li>Process and analyze your uploaded lab results</li>
              <li>Use this data to create personalized supplement recommendations</li>
              <li>Store your health information securely</li>
              <li>Use this data to optimize your formula over time</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Your data is stored with encryption and not shared with third parties. You can revoke this consent at any time from your privacy settings.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConsentDialog(false);
                setPendingFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              data-testid="button-consent-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => grantConsentMutation.mutate()}
              disabled={grantConsentMutation.isPending}
              data-testid="button-consent-agree"
            >
              {grantConsentMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              I Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-file">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lab report from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">
              No, Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fileToDelete) {
                  deleteFileMutation.mutate(fileToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-delete-confirm"
            >
              {deleteFileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}