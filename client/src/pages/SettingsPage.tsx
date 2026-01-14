import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Lock, Bell, Shield, Clock, Pill, Globe, Dumbbell, Salad, Heart } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getCurrentTimezone } from '@/hooks/use-timezone';

// Time slot options for each notification type
const TIME_SLOT_OPTIONS = [
  { value: 'morning', label: '☀️ Morning' },
  { value: 'afternoon', label: '🌤️ Afternoon' },
  { value: 'evening', label: '🌙 Evening' },
  { value: 'custom', label: '⏰ Custom Time' },
  { value: 'off', label: '🔕 Off' },
];

// Pills have an extra "all" option
const PILLS_TIME_SLOT_OPTIONS = [
  { value: 'all', label: '📅 All Times' },
  ...TIME_SLOT_OPTIONS,
];

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Check URL hash on mount to determine initial tab
  const initialTab = window.location.hash === '#notifications' ? 'notifications' : 'account';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Account settings state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch notification preferences from database
  const { data: notificationPrefs, isLoading: isLoadingPrefs } = useQuery<{
    emailConsultation: boolean;
    emailShipping: boolean;
    emailBilling: boolean;
    smsConsultation: boolean;
    smsShipping: boolean;
    smsBilling: boolean;
    dailyRemindersEnabled?: boolean;
    reminderBreakfast?: string;
    reminderLunch?: string;
    reminderDinner?: string;
    // Time slot selections
    pillsTimeSlot?: string;
    workoutTimeSlot?: string;
    nutritionTimeSlot?: string;
    lifestyleTimeSlot?: string;
    // Custom times
    pillsCustomTime?: string | null;
    workoutCustomTime?: string | null;
    nutritionCustomTime?: string | null;
    lifestyleCustomTime?: string | null;
  }>({
    queryKey: ['/api/notification-prefs'],
  });

  // Notification settings state - initialized from database
  const [notifications, setNotifications] = useState({
    emailConsultation: true,
    emailShipping: true,
    emailBilling: true,
    smsConsultation: false,
    smsShipping: false,
    smsBilling: false,
    dailyRemindersEnabled: false,
    reminderMorning: '07:00',
    reminderAfternoon: '14:00',
    reminderEvening: '19:00',
    // Time slot selections: 'morning' | 'afternoon' | 'evening' | 'custom' | 'off' | 'all'
    pillsTimeSlot: 'all',
    workoutTimeSlot: 'morning',
    nutritionTimeSlot: 'morning',
    lifestyleTimeSlot: 'evening',
    // Custom times for each notification type
    pillsCustomTime: '',
    workoutCustomTime: '',
    nutritionCustomTime: '',
    lifestyleCustomTime: '',
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (notificationPrefs) {
      setNotifications({
        emailConsultation: notificationPrefs.emailConsultation,
        emailShipping: notificationPrefs.emailShipping,
        emailBilling: notificationPrefs.emailBilling,
        smsConsultation: notificationPrefs.smsConsultation,
        smsShipping: notificationPrefs.smsShipping,
        smsBilling: notificationPrefs.smsBilling,
        dailyRemindersEnabled: notificationPrefs.dailyRemindersEnabled ?? false,
        reminderMorning: (notificationPrefs as any).reminderMorning ?? notificationPrefs.reminderBreakfast ?? '07:00',
        reminderAfternoon: (notificationPrefs as any).reminderAfternoon ?? notificationPrefs.reminderLunch ?? '14:00',
        reminderEvening: (notificationPrefs as any).reminderEvening ?? notificationPrefs.reminderDinner ?? '19:00',
        pillsTimeSlot: notificationPrefs.pillsTimeSlot ?? 'all',
        workoutTimeSlot: notificationPrefs.workoutTimeSlot ?? 'morning',
        nutritionTimeSlot: notificationPrefs.nutritionTimeSlot ?? 'morning',
        lifestyleTimeSlot: notificationPrefs.lifestyleTimeSlot ?? 'evening',
        pillsCustomTime: notificationPrefs.pillsCustomTime ?? '',
        workoutCustomTime: notificationPrefs.workoutCustomTime ?? '',
        nutritionCustomTime: notificationPrefs.nutritionCustomTime ?? '',
        lifestyleCustomTime: notificationPrefs.lifestyleCustomTime ?? '',
      });
    }
  }, [notificationPrefs]);


  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please ensure your new passwords match.',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 8 characters long.',
      });
      return;
    }

    toast({
      title: 'Password updated',
      description: 'Your password has been successfully changed.',
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Mutation to save notification preferences
  const saveNotificationsMutation = useMutation({
    mutationFn: (prefs: typeof notifications) =>
      apiRequest('PUT', '/api/notification-prefs', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-prefs'] });
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notification preferences. Please try again.',
      });
    },
  });

  const saveNotificationSettings = () => {
    saveNotificationsMutation.mutate(notifications);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1B4332]" data-testid="heading-settings">Settings</h2>
          <p className="text-[#52796F]">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-[#FAF7F2]">
          <TabsTrigger value="account" data-testid="tab-account" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications" className="data-[state=active]:bg-[#1B4332] data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Password Change */}
          <Card data-testid="section-password" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription className="text-[#52796F]">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-testid="input-current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    data-testid="input-new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="input-confirm-password"
                    required
                  />
                </div>
                <Button type="submit" data-testid="button-update-password" className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Theme settings removed: app is light-only */}

          {/* Privacy & Security Notice */}
          <Card data-testid="section-privacy" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#1B4332]/5 rounded-lg border border-[#1B4332]/10">
                <p className="text-sm text-[#52796F]">
                  Your health data is encrypted and stored securely. We never sell or share your personal 
                  information with third parties. You can request to download or delete your data at 
                  any time by contacting support.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card data-testid="section-notifications" className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B4332]">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-[#52796F]">
                Choose what updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPrefs ? (
                <div className="text-center py-8 text-muted-foreground">Loading preferences...</div>
              ) : (
                <>
                  <div className="space-y-6">
                    {/* Formula & Consultation Updates */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-base font-semibold">Formula & Consultation Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Formula updates, consultation reminders, and lab results
                        </p>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Email</Label>
                          <Switch
                            checked={notifications.emailConsultation}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailConsultation: checked })
                            }
                            data-testid="switch-email-consultation"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">SMS</Label>
                          <Switch
                            checked={notifications.smsConsultation}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, smsConsultation: checked })
                            }
                            data-testid="switch-sms-consultation"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order & Shipping Updates */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-base font-semibold">Order & Shipping Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Order status, shipment tracking, and delivery notifications
                        </p>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Email</Label>
                          <Switch
                            checked={notifications.emailShipping}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailShipping: checked })
                            }
                            data-testid="switch-email-shipping"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">SMS</Label>
                          <Switch
                            checked={notifications.smsShipping}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, smsShipping: checked })
                            }
                            data-testid="switch-sms-shipping"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Account & Billing */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-base font-semibold">Account & Billing</Label>
                        <p className="text-sm text-muted-foreground">
                          Account updates, payment reminders, and billing notifications
                        </p>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Email</Label>
                          <Switch
                            checked={notifications.emailBilling}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailBilling: checked })
                            }
                            data-testid="switch-email-billing"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">SMS</Label>
                          <Switch
                            checked={notifications.smsBilling}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, smsBilling: checked })
                            }
                            data-testid="switch-sms-billing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Daily Reminders - Unified System */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <Label className="text-base font-semibold">Daily Reminders (SMS)</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Get personalized SMS reminders for supplements, workouts, nutrition & lifestyle
                          </p>
                        </div>
                        <Switch
                          checked={notifications.dailyRemindersEnabled}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, dailyRemindersEnabled: checked })
                          }
                          data-testid="switch-daily-reminders"
                        />
                      </div>

                      {notifications.dailyRemindersEnabled && (
                        <div className="ml-6 space-y-6 pl-4 border-l-2 border-primary/20">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              <strong>Your timezone:</strong> {getCurrentTimezone()} - Reminders will be sent at your local time
                            </p>
                          </div>
                          
                          {/* Reminder Times */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Reminder Times</Label>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div className="space-y-2">
                                <Label htmlFor="morning-time" className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3" />
                                  Morning
                                </Label>
                                <Input
                                  id="morning-time"
                                  type="time"
                                  value={notifications.reminderMorning}
                                  onChange={(e) =>
                                    setNotifications({ ...notifications, reminderMorning: e.target.value })
                                  }
                                  data-testid="input-morning-time"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="afternoon-time" className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3" />
                                  Afternoon
                                </Label>
                                <Input
                                  id="afternoon-time"
                                  type="time"
                                  value={notifications.reminderAfternoon}
                                  onChange={(e) =>
                                    setNotifications({ ...notifications, reminderAfternoon: e.target.value })
                                  }
                                  data-testid="input-afternoon-time"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="evening-time" className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3" />
                                  Evening
                                </Label>
                                <Input
                                  id="evening-time"
                                  type="time"
                                  value={notifications.reminderEvening}
                                  onChange={(e) =>
                                    setNotifications({ ...notifications, reminderEvening: e.target.value })
                                  }
                                  data-testid="input-evening-time"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Notification Schedule - Time Slot Selection */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Notification Schedule</Label>
                            <p className="text-xs text-muted-foreground">
                              Choose when to receive each type of reminder
                            </p>
                            <div className="space-y-4 ml-2">
                              {/* Supplement Reminders */}
                              <div className="p-3 rounded-lg border bg-card space-y-3">
                                <div className="flex items-center gap-3">
                                  <Pill className="w-4 h-4 text-primary" />
                                  <div className="flex-1">
                                    <Label className="font-medium">Supplement Reminders</Label>
                                    <p className="text-xs text-muted-foreground">"Take your pills with your meal"</p>
                                  </div>
                                  <Select
                                    value={notifications.pillsTimeSlot}
                                    onValueChange={(value) =>
                                      setNotifications({ ...notifications, pillsTimeSlot: value })
                                    }
                                  >
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PILLS_TIME_SLOT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {notifications.pillsTimeSlot === 'custom' && (
                                  <div className="ml-0 sm:ml-7 mt-2 sm:mt-0">
                                    <Input
                                      type="time"
                                      value={notifications.pillsCustomTime}
                                      onChange={(e) =>
                                        setNotifications({ ...notifications, pillsCustomTime: e.target.value })
                                      }
                                      className="w-full sm:w-[140px]"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Workout Reminders - Hidden for now
                              <div className="p-3 rounded-lg border bg-card space-y-3">
                                <div className="flex items-center gap-3">
                                  <Dumbbell className="w-4 h-4 text-blue-600" />
                                  <div className="flex-1">
                                    <Label className="font-medium">Workout Reminders</Label>
                                    <p className="text-xs text-muted-foreground">"Today's workout: Upper Body"</p>
                                  </div>
                                  <Select
                                    value={notifications.workoutTimeSlot}
                                    onValueChange={(value) =>
                                      setNotifications({ ...notifications, workoutTimeSlot: value })
                                    }
                                  >
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_SLOT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {notifications.workoutTimeSlot === 'custom' && (
                                  <div className="ml-0 sm:ml-7 mt-2 sm:mt-0">
                                    <Input
                                      type="time"
                                      value={notifications.workoutCustomTime}
                                      onChange={(e) =>
                                        setNotifications({ ...notifications, workoutCustomTime: e.target.value })
                                      }
                                      className="w-full sm:w-[140px]"
                                    />
                                  </div>
                                )}
                              </div>
                              */}

                              {/* Nutrition Tips - Hidden for now
                              <div className="p-3 rounded-lg border bg-card space-y-3">
                                <div className="flex items-center gap-3">
                                  <Salad className="w-4 h-4 text-green-600" />
                                  <div className="flex-1">
                                    <Label className="font-medium">Nutrition Tips</Label>
                                    <p className="text-xs text-muted-foreground">"Stay hydrated & eat mindfully"</p>
                                  </div>
                                  <Select
                                    value={notifications.nutritionTimeSlot}
                                    onValueChange={(value) =>
                                      setNotifications({ ...notifications, nutritionTimeSlot: value })
                                    }
                                  >
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_SLOT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {notifications.nutritionTimeSlot === 'custom' && (
                                  <div className="ml-0 sm:ml-7 mt-2 sm:mt-0">
                                    <Input
                                      type="time"
                                      value={notifications.nutritionCustomTime}
                                      onChange={(e) =>
                                        setNotifications({ ...notifications, nutritionCustomTime: e.target.value })
                                      }
                                      className="w-full sm:w-[140px]"
                                    />
                                  </div>
                                )}
                              </div>
                              */}

                              {/* Lifestyle & Wellness - Hidden for now
                              <div className="p-3 rounded-lg border bg-card space-y-3">
                                <div className="flex items-center gap-3">
                                  <Heart className="w-4 h-4 text-purple-600" />
                                  <div className="flex-1">
                                    <Label className="font-medium">Lifestyle & Wellness</Label>
                                    <p className="text-xs text-muted-foreground">"Wind down for better sleep"</p>
                                  </div>
                                  <Select
                                    value={notifications.lifestyleTimeSlot}
                                    onValueChange={(value) =>
                                      setNotifications({ ...notifications, lifestyleTimeSlot: value })
                                    }
                                  >
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_SLOT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {notifications.lifestyleTimeSlot === 'custom' && (
                                  <div className="ml-0 sm:ml-7 mt-2 sm:mt-0">
                                    <Input
                                      type="time"
                                      value={notifications.lifestyleCustomTime}
                                      onChange={(e) =>
                                        setNotifications({ ...notifications, lifestyleCustomTime: e.target.value })
                                      }
                                      className="w-full sm:w-[140px]"
                                    />
                                  </div>
                                )}
                              </div>
                              */}
                            </div>
                          </div>
                          
                          {/* Example Messages */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Example Messages</Label>
                            <div className="space-y-2">
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs font-medium text-green-800 mb-1">☀️ Morning ({notifications.reminderMorning})</p>
                                <p className="text-sm text-green-900">
                                  "⚗️ ONES: Good morning! 
                                  {(notifications.pillsTimeSlot === 'all' || notifications.pillsTimeSlot === 'morning') && "💊 Take 3 capsules with breakfast."}"
                                </p>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-800 mb-1">🌤️ Afternoon ({notifications.reminderAfternoon})</p>
                                <p className="text-sm text-blue-900">
                                  "⚗️ ONES: Afternoon check-in! 
                                  {(notifications.pillsTimeSlot === 'all' || notifications.pillsTimeSlot === 'afternoon') && "💊 Take 2 capsules with lunch."}"
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-xs font-medium text-purple-800 mb-1">🌙 Evening ({notifications.reminderEvening})</p>
                                <p className="text-sm text-purple-900">
                                  "⚗️ ONES: Evening reminder! 
                                  {(notifications.pillsTimeSlot === 'all' || notifications.pillsTimeSlot === 'evening') && "💊 Take 2 capsules with dinner."}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={saveNotificationSettings} 
                    disabled={saveNotificationsMutation.isPending}
                    data-testid="button-save-notifications"
                    className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                  >
                    {saveNotificationsMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
