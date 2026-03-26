import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
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
  ShieldCheck,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest, queryClient, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import type { User as UserType, HealthProfile } from '@shared/schema';
import { AddressAutocomplete } from '@/shared/components/address/AddressAutocomplete';

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
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTab = searchParams.get('tab') || 'profile';
  const initialSection = searchParams.get('section') || 'basic-info';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [openSection, setOpenSection] = useState<string | undefined>(initialSection);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Sync tab and section from URL when navigating from other pages
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab') || 'profile';
    const section = params.get('section');
    setActiveTab(tab);
    if (section) {
      setOpenSection(section);
    }
  }, [location]);

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
  const [medicationDisclosureChecked, setMedicationDisclosureChecked] = useState(false);

  // Enforce min/max on numeric health input fields at the onChange level
  const handleHealthNumberChange = (field: string, value: string, min: number, max: number) => {
    // Allow empty (clearing the field)
    if (value === '') {
      setHealthData(prev => ({ ...prev, [field]: '' }));
      return;
    }
    // Allow partial typing (e.g. just a minus sign shouldn't be blocked)
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    // Clamp to max but allow typing below min (validated on save)
    const clamped = Math.min(num, max);
    setHealthData(prev => ({ ...prev, [field]: clamped.toString() }));
  };

  // Format phone number as user types: (555) 123-4567
  const formatPhoneNumber = (value: string): string => {
    // Strip everything except digits
    const digits = value.replace(/\D/g, '');
    // Remove leading '1' country code if user typed it
    const cleaned = digits.startsWith('1') && digits.length > 10 ? digits.slice(1) : digits;
    const len = cleaned.length;
    if (len === 0) return '';
    if (len <= 3) return `(${cleaned}`;
    if (len <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Convert display format to E.164 storage format: +15551234567
  const toE164 = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    const cleaned = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    if (cleaned.length === 0) return null;
    if (cleaned.length !== 10) return null;
    return `+1${cleaned}`;
  };

  // Format stored E.164 number for display
  const formatStoredPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    const cleaned = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return as-is if not a standard format
  };

  // Update form states when data is loaded
  useEffect(() => {
    if (userData?.user) {
      setProfile({
        name: userData.user.name || '',
        email: userData.user.email || '',
        phone: userData.user.phone ? formatStoredPhone(userData.user.phone) : '',
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

  // Helper: detect which profile fields changed
  const getChangedProfileFields = (): string[] => {
    const original = userData?.user;
    if (!original) return ['profile'];
    const fieldLabels: Record<string, string> = {
      name: 'name', email: 'email', phone: 'phone',
      addressLine1: 'address', addressLine2: 'address',
      city: 'city', state: 'state', postalCode: 'postal code', country: 'country',
    };
    const changed: string[] = [];
    const seen = new Set<string>();
    for (const [key, label] of Object.entries(fieldLabels)) {
      const oldVal = (original as any)[key] || '';
      const newVal = (profile as any)[key] || '';
      if (oldVal !== newVal && !seen.has(label)) {
        changed.push(label);
        seen.add(label);
      }
    }
    return changed;
  };

  // Helper: detect which health fields changed
  const getChangedHealthFields = (newData: Record<string, any>): string[] => {
    if (!healthProfile) return ['health info'];
    const fieldLabels: Record<string, string> = {
      age: 'age', sex: 'sex', weightLbs: 'weight', heightCm: 'height',
      bloodPressureSystolic: 'blood pressure', bloodPressureDiastolic: 'blood pressure',
      restingHeartRate: 'resting heart rate', sleepHoursPerNight: 'sleep hours',
      exerciseDaysPerWeek: 'exercise days', stressLevel: 'stress level',
      smokingStatus: 'smoking status', alcoholDrinksPerWeek: 'alcohol intake',
    };
    const changed: string[] = [];
    const seen = new Set<string>();
    for (const [key, label] of Object.entries(fieldLabels)) {
      const oldVal = (healthProfile as any)[key] ?? null;
      const newVal = newData[key] ?? null;
      if (oldVal !== newVal && !seen.has(label)) {
        changed.push(label);
        seen.add(label);
      }
    }
    // Check array fields
    const arraysToCheck = [
      { key: 'conditions', label: 'conditions' },
      { key: 'medications', label: 'medications' },
      { key: 'allergies', label: 'allergies' },
    ];
    for (const { key, label } of arraysToCheck) {
      const oldArr = ((healthProfile as any)[key] || []).sort().join(',');
      const newArr = (newData[key] || []).sort().join(',');
      if (oldArr !== newArr) changed.push(label);
    }
    return changed;
  };

  // Helper: format changed fields into a friendly description
  const formatChangedFields = (fields: string[]): string => {
    if (fields.length === 0) return 'No changes detected.';
    const capitalized = fields.map(f => f.charAt(0).toUpperCase() + f.slice(1));
    if (capitalized.length === 1) return `${capitalized[0]} saved successfully.`;
    if (capitalized.length === 2) return `${capitalized[0]} and ${capitalized[1]} saved successfully.`;
    return `${capitalized.slice(0, -1).join(', ')}, and ${capitalized[capitalized.length - 1]} saved successfully.`;
  };

  // Whether each section has existing saved data
  const hasExistingProfile = !!(userData?.user?.name || userData?.user?.phone || userData?.user?.addressLine1);
  const hasExistingHealthProfile = !!(healthProfile?.age || healthProfile?.sex || healthProfile?.weightLbs || healthProfile?.heightCm);

  // Mutations for updating data
  const updateHealthProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/users/me/health-profile', data);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      const changedFields = getChangedHealthFields(variables);
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: hasExistingHealthProfile ? "Health info updated" : "Health info saved",
        description: changedFields.length > 0
          ? formatChangedFields(changedFields)
          : "Your health info has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't save health info",
        description: error.message || "Something went wrong. Please try again.",
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
      const changedFields = getChangedProfileFields();
      // Update the form with the returned data
      if (data?.user) {
        setProfile({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone ? formatStoredPhone(data.user.phone) : '',
          addressLine1: data.user.addressLine1 || '',
          addressLine2: data.user.addressLine2 || '',
          city: data.user.city || '',
          state: data.user.state || '',
          postalCode: data.user.postalCode || '',
          country: data.user.country || 'US',
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await refreshUser();
      toast({
        title: hasExistingProfile ? "Profile updated" : "Profile saved",
        description: changedFields.length > 0
          ? formatChangedFields(changedFields)
          : "Your profile has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't save profile",
        description: error.message || "Something went wrong. Please try again.",
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
        consentText: 'I consent to Ones processing my lab data and health information to provide personalized supplement recommendations.'
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
            <TabsTrigger value="health">Health Profile</TabsTrigger>
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
          <h1 className="text-3xl font-bold tracking-tight text-[#054700]" data-testid="text-profile-title">
            Profile & Settings
          </h1>
          <p className="text-[#5a6623]">
            Manage your account, health profile, and preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-[-24px] z-20 -mx-6 px-6 pt-6 pb-4  backdrop-blur-md  border-[#054700]/5 mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm shadow-sm border border-[#054700]/5">
            <TabsTrigger value="profile" data-testid="tab-profile" className="data-[state=active]:bg-[#054700] data-[state=active]:text-white">Profile</TabsTrigger>
            <TabsTrigger value="health" data-testid="tab-health" className="data-[state=active]:bg-[#054700] data-[state=active]:text-white">Health Profile</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          {/* Personal Information */}
          <Card data-testid="section-personal-info" className="border-[#5a6623]/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#054700]">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-[#5a6623]">
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
                    readOnly
                    className="bg-muted cursor-not-allowed"
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
                  onChange={(e) => setProfile({ ...profile, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="(555) 123-4567"
                  maxLength={14}
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
                  <AddressAutocomplete
                    id="addressLine1"
                    value={profile.addressLine1}
                    onChange={(val) => setProfile({ ...profile, addressLine1: val })}
                    placeholder="123 Main Street"
                    countryCode={profile.country}
                    onSelectAddress={(fields) =>
                      setProfile((prev) => ({
                        ...prev,
                        addressLine1: fields.addressLine1 ?? prev.addressLine1,
                        city: fields.city ?? prev.city,
                        state: fields.state ?? prev.state,
                        postalCode: fields.postalCode ?? prev.postalCode,
                        country: fields.country ?? prev.country,
                      }))
                    }
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
                      // Validate phone number if provided
                      if (profile.phone) {
                        const phoneDigits = profile.phone.replace(/\D/g, '');
                        const cleanedDigits = phoneDigits.startsWith('1') && phoneDigits.length === 11 ? phoneDigits.slice(1) : phoneDigits;
                        if (cleanedDigits.length !== 10) {
                          toast({
                            title: "Invalid phone number",
                            description: "Please enter a valid 10-digit US phone number.",
                            variant: "destructive",
                          });
                          return;
                        }
                      }
                      await updateUserProfileMutation.mutateAsync({
                        name: profile.name,
                        email: profile.email,
                        phone: toE164(profile.phone),
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
                  className="bg-[#054700] hover:bg-[#054700]/90 text-white"
                >
                  {updateUserProfileMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {hasExistingProfile ? 'Update Profile' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Health Profile */}
          <Card data-testid="section-health-profile" className="border-[#5a6623]/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#054700]">
                <Activity className="w-5 h-5" />
                Health Profile
              </CardTitle>
              <CardDescription className="text-[#5a6623]">
                Keep your health information up to date for better formula optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="w-full">
                {/* Basic Information */}
                <AccordionItem value="basic-info" className="border-[#5a6623]/10">
                  <AccordionTrigger className="hover:no-underline py-4 justify-start items-start gap-3 [&>svg:last-child]:hidden">
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition-transform duration-200 text-[#054700]" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg font-semibold text-[#054700]">Basic Information</span>
                      <span className="text-sm font-normal text-[#5a6623]">Essential details for health calculations</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 space-y-6">
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
                            onChange={(e) => handleHealthNumberChange('age', e.target.value, 1, 120)}
                            placeholder="Enter your age"
                            min="1"
                            max="120"
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
                              <Label htmlFor="height-feet" className="text-xs text-muted-foreground">Feet</Label>
                              <Input
                                id="height-feet"
                                type="number"
                                value={healthData.heightFeet}
                                onChange={(e) => handleHealthNumberChange('heightFeet', e.target.value, 1, 8)}
                                placeholder="5"
                                min="3"
                                max="8"
                                data-testid="input-height-feet"
                              />
                            </div>
                            <div className="flex-1">
                              <Label htmlFor="height-inches" className="text-xs text-muted-foreground">Inches</Label>
                              <Input
                                id="height-inches"
                                type="number"
                                value={healthData.heightInches}
                                onChange={(e) => handleHealthNumberChange('heightInches', e.target.value, 0, 11)}
                                placeholder="10"
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
                            onChange={(e) => handleHealthNumberChange('weightLbs', e.target.value, 40, 500)}
                            placeholder="Enter weight in lbs"
                            min="0"
                            max="500"
                            data-testid="input-weight"
                          />
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Vital Signs */}
                <AccordionItem value="vital-signs" className="border-[#5a6623]/10">
                  <AccordionTrigger className="hover:no-underline py-4 justify-start items-start gap-3 [&>svg:last-child]:hidden">
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition-transform duration-200 text-[#054700]" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg font-semibold text-[#054700]">Vital Signs</span>
                      <span className="text-sm font-normal text-[#5a6623]">Current measurements for accurate health scoring</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="bpSystolic">Blood Pressure - Systolic</Label>
                        <Input
                          id="bpSystolic"
                          type="number"
                          value={healthData.bloodPressureSystolic}
                          onChange={(e) => handleHealthNumberChange('bloodPressureSystolic', e.target.value, 70, 200)}
                          min="70"
                          max="200"
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
                          onChange={(e) => handleHealthNumberChange('bloodPressureDiastolic', e.target.value, 40, 130)}
                          min="40"
                          max="130"
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
                          onChange={(e) => handleHealthNumberChange('restingHeartRate', e.target.value, 30, 220)}
                          min="30"
                          max="220"
                          placeholder="e.g. 70"
                          data-testid="input-heart-rate"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Lifestyle Factors */}
                <AccordionItem value="lifestyle-factors" className="border-[#5a6623]/10">
                  <AccordionTrigger className="hover:no-underline py-4 justify-start items-start gap-3 [&>svg:last-child]:hidden">
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition-transform duration-200 text-[#054700]" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg font-semibold text-[#054700]">Lifestyle Factors</span>
                      <span className="text-sm font-normal text-[#5a6623]">Help us understand your daily habits</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="sleep">Sleep Hours per Night</Label>
                        <Input
                          id="sleep"
                          type="number"
                          value={healthData.sleepHoursPerNight}
                          onChange={(e) => handleHealthNumberChange('sleepHoursPerNight', e.target.value, 0, 24)}
                          min="0"
                          max="24"
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
                          onChange={(e) => handleHealthNumberChange('exerciseDaysPerWeek', e.target.value, 0, 7)}
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
                          onChange={(e) => handleHealthNumberChange('stressLevel', e.target.value, 1, 10)}
                          placeholder="e.g. 5"
                          min="1"
                          max="10"
                          data-testid="input-stress"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Risk Factors */}
                <AccordionItem value="risk-factors" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-4 justify-start items-start gap-3 [&>svg:last-child]:hidden">
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition-transform duration-200 text-[#054700]" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg font-semibold text-[#054700]">Risk Factors</span>
                      <span className="text-sm font-normal text-[#5a6623]">Important for personalized recommendations</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 space-y-6">
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
                          onChange={(e) => handleHealthNumberChange('alcoholDrinksPerWeek', e.target.value, 0, 50)}
                          placeholder="e.g. 2"
                          min="0"
                          max="50"
                          data-testid="input-alcohol"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-2">
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
                            {/* Medication Safety Disclosure */}
                            <div className="mt-3">
                              {healthProfile?.medicationDisclosedAt ? (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                                  <span>
                                    Medication disclosure recorded on{' '}
                                    {new Date(healthProfile.medicationDisclosedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                  <Checkbox
                                    id="medication-disclosure"
                                    checked={medicationDisclosureChecked}
                                    onCheckedChange={(v) => setMedicationDisclosureChecked(!!v)}
                                    className="mt-0.5"
                                  />
                                  <Label htmlFor="medication-disclosure" className="text-xs text-amber-800 leading-snug cursor-pointer font-normal">
                                    I confirm the medication list above is complete and accurate. I understand that Ones uses this information to flag potential supplement–drug interactions. I will update this list if my medications change.
                                  </Label>
                                </div>
                              )}
                            </div>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      // Validate numeric ranges before saving
                      const validationRules: { field: string; label: string; min: number; max: number; value: string }[] = [
                        { field: 'age', label: 'Age', min: 1, max: 120, value: healthData.age },
                        { field: 'heightFeet', label: 'Height (feet)', min: 3, max: 8, value: healthData.heightFeet },
                        { field: 'heightInches', label: 'Height (inches)', min: 0, max: 11, value: healthData.heightInches },
                        { field: 'weightLbs', label: 'Weight', min: 40, max: 500, value: healthData.weightLbs },
                        { field: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', min: 70, max: 200, value: healthData.bloodPressureSystolic },
                        { field: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', min: 40, max: 130, value: healthData.bloodPressureDiastolic },
                        { field: 'restingHeartRate', label: 'Resting Heart Rate', min: 30, max: 220, value: healthData.restingHeartRate },
                        { field: 'sleepHoursPerNight', label: 'Sleep Hours', min: 0, max: 24, value: healthData.sleepHoursPerNight },
                        { field: 'exerciseDaysPerWeek', label: 'Exercise Days', min: 0, max: 7, value: healthData.exerciseDaysPerWeek },
                        { field: 'stressLevel', label: 'Stress Level', min: 1, max: 10, value: healthData.stressLevel },
                        { field: 'alcoholDrinksPerWeek', label: 'Alcohol (drinks/week)', min: 0, max: 50, value: healthData.alcoholDrinksPerWeek },
                      ];

                      for (const rule of validationRules) {
                        if (rule.value) {
                          const num = parseInt(rule.value);
                          if (isNaN(num) || num < rule.min || num > rule.max) {
                            toast({
                              title: 'Invalid value',
                              description: `${rule.label} must be between ${rule.min} and ${rule.max}.`,
                              variant: 'destructive',
                            });
                            return;
                          }
                        }
                      }

                      // Check that at least some health information has been provided
                      const hasAnyData =
                        healthData.age ||
                        healthData.sex ||
                        healthData.weightLbs ||
                        healthData.heightFeet ||
                        healthData.heightInches ||
                        healthData.bloodPressureSystolic ||
                        healthData.bloodPressureDiastolic ||
                        healthData.restingHeartRate ||
                        healthData.sleepHoursPerNight ||
                        healthData.exerciseDaysPerWeek ||
                        healthData.stressLevel ||
                        healthData.smokingStatus ||
                        healthData.alcoholDrinksPerWeek ||
                        healthData.conditions.length > 0 ||
                        healthData.medications.length > 0 ||
                        healthData.allergies.length > 0 ||
                        conditionInput.trim() ||
                        medicationInput.trim() ||
                        allergyInput.trim();

                      if (!hasAnyData) {
                        toast({
                          title: "No information provided",
                          description: "Please fill in at least one field before saving your health profile.",
                          variant: "destructive",
                        });
                        return;
                      }

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

                      // If the user just confirmed their medication disclosure, record it
                      if (medicationDisclosureChecked && !healthProfile?.medicationDisclosedAt) {
                        await apiRequest('POST', '/api/users/me/health-profile/medication-disclosure', {
                          medications: currentMedications,
                          noMedications: currentMedications.length === 0,
                        });
                        setMedicationDisclosureChecked(false);
                        queryClient.invalidateQueries({ queryKey: ['/api/users/me/health-profile'] });
                      }
                    } catch (error) {
                      // Error handling is done in the mutation
                    }
                  }}
                  disabled={updateHealthProfileMutation.isPending}
                  data-testid="button-save-health-profile"
                  className="bg-[#054700] hover:bg-[#054700]/90 text-white"
                >
                  {updateHealthProfileMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {hasExistingHealthProfile ? 'Update Health Profile' : 'Save Health Info'}
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
              By providing consent, you agree to allow Ones to:
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
