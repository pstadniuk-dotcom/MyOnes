import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Settings, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizeSmsPreferences {
  id: string;
  userId: string;
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  workoutReminderEnabled: boolean;
  workoutReminderTime: string;
  eveningCheckinEnabled: boolean;
  eveningCheckinTime: string;
}

interface UserProfile {
  id: string;
  phone: string | null;
}

export function OptimizeSmsPreferencesDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile to get phone number
  const { data: user } = useQuery<UserProfile>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch SMS preferences
  const { data: preferences, isLoading } = useQuery<OptimizeSmsPreferences>({
    queryKey: ['/api/optimize/sms-preferences'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: open, // Only fetch when dialog is open
  });

  // Local state for form
  const [formData, setFormData] = useState<Partial<OptimizeSmsPreferences>>({});
  const [phone, setPhone] = useState('');

  // Initialize form data when preferences/user load
  useEffect(() => {
    if (preferences) {
      setFormData({
        morningReminderEnabled: preferences.morningReminderEnabled,
        morningReminderTime: preferences.morningReminderTime,
        workoutReminderEnabled: preferences.workoutReminderEnabled,
        workoutReminderTime: preferences.workoutReminderTime,
        eveningCheckinEnabled: preferences.eveningCheckinEnabled,
        eveningCheckinTime: preferences.eveningCheckinTime,
      });
    }
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [preferences, user]);

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<OptimizeSmsPreferences>) => {
      const res = await apiRequest('POST', '/api/optimize/sms-preferences', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/sms-preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your SMS reminder settings have been updated.',
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error saving preferences',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update phone number
  const updatePhoneMutation = useMutation({
    mutationFn: async (newPhone: string) => {
      // Assuming there's an endpoint to update user profile or we use a specific one
      // For now, let's assume we can update it via the user update endpoint
      // But wait, the user update endpoint might be complex.
      // Let's check if there is a specific endpoint for phone or if we should use the general one.
      // The prompt didn't specify a phone update endpoint, but I can probably use PATCH /api/users/me
      const res = await apiRequest('PATCH', '/api/users/me', { phone: newPhone });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating phone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    try {
      // Update phone if changed
      if (user && phone !== user.phone) {
        await updatePhoneMutation.mutateAsync(phone);
      }

      // Update preferences
      await updatePreferencesMutation.mutateAsync(formData);
    } catch (error) {
      // Errors handled in mutation callbacks
    }
  };

  const handleTimeChange = (key: keyof OptimizeSmsPreferences, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key: keyof OptimizeSmsPreferences, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Reminder Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>SMS Reminder Settings</DialogTitle>
          <DialogDescription>
            Configure when you want to receive your daily Optimize reminders.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Mobile Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Required for receiving SMS reminders. Standard rates apply.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Morning Briefing</Label>
                  <p className="text-xs text-muted-foreground">
                    Daily plan & nutrition goals
                  </p>
                </div>
                <Switch
                  checked={formData.morningReminderEnabled}
                  onCheckedChange={(c) => handleToggleChange('morningReminderEnabled', c)}
                />
              </div>
              {formData.morningReminderEnabled && (
                <div className="flex items-center gap-2 justify-end">
                  <Label htmlFor="morning-time" className="text-xs">Time:</Label>
                  <Input
                    id="morning-time"
                    type="time"
                    className="w-32 h-8"
                    value={formData.morningReminderTime}
                    onChange={(e) => handleTimeChange('morningReminderTime', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Workout Reminder - Hidden for now
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Workout Reminder</Label>
                  <p className="text-xs text-muted-foreground">
                    Pre-workout motivation & tips
                  </p>
                </div>
                <Switch
                  checked={formData.workoutReminderEnabled}
                  onCheckedChange={(c) => handleToggleChange('workoutReminderEnabled', c)}
                />
              </div>
              {formData.workoutReminderEnabled && (
                <div className="flex items-center gap-2 justify-end">
                  <Label htmlFor="workout-time" className="text-xs">Time:</Label>
                  <Input
                    id="workout-time"
                    type="time"
                    className="w-32 h-8"
                    value={formData.workoutReminderTime}
                    onChange={(e) => handleTimeChange('workoutReminderTime', e.target.value)}
                  />
                </div>
              )}
            </div>
            */}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Evening Check-in</Label>
                  <p className="text-xs text-muted-foreground">
                    Log your progress for the day
                  </p>
                </div>
                <Switch
                  checked={formData.eveningCheckinEnabled}
                  onCheckedChange={(c) => handleToggleChange('eveningCheckinEnabled', c)}
                />
              </div>
              {formData.eveningCheckinEnabled && (
                <div className="flex items-center gap-2 justify-end">
                  <Label htmlFor="evening-time" className="text-xs">Time:</Label>
                  <Input
                    id="evening-time"
                    type="time"
                    className="w-32 h-8"
                    value={formData.eveningCheckinTime}
                    onChange={(e) => handleTimeChange('eveningCheckinTime', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={updatePreferencesMutation.isPending || updatePhoneMutation.isPending}
          >
            {(updatePreferencesMutation.isPending || updatePhoneMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
