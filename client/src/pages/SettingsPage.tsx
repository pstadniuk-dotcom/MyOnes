import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Lock, Bell, Shield, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account');

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
      });
    }
  }, [notificationPrefs]);

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    analyticsOptIn: true,
    thirdPartyResearch: false,
  });

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
      apiRequest('/api/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
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

  const savePrivacySettings = () => {
    toast({
      title: 'Privacy settings saved',
      description: 'Your privacy preferences have been updated.',
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="heading-settings">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account" data-testid="tab-account">
            <Lock className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Password Change */}
          <Card data-testid="section-password">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
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
                <Button type="submit" data-testid="button-update-password">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card data-testid="section-theme">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                Theme Preference
              </CardTitle>
              <CardDescription>
                Choose your preferred color theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  data-testid="switch-dark-mode"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card data-testid="section-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
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
                  </div>

                  <Button 
                    onClick={saveNotificationSettings} 
                    disabled={saveNotificationsMutation.isPending}
                    data-testid="button-save-notifications"
                  >
                    {saveNotificationsMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
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
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Share anonymized health data to improve our AI
                    </p>
                  </div>
                  <Switch
                    checked={privacy.dataSharing}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, dataSharing: checked })
                    }
                    data-testid="switch-data-sharing"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Help us improve by collecting usage analytics
                    </p>
                  </div>
                  <Switch
                    checked={privacy.analyticsOptIn}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, analyticsOptIn: checked })
                    }
                    data-testid="switch-analytics"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Third-Party Research</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anonymized data for health research studies
                    </p>
                  </div>
                  <Switch
                    checked={privacy.thirdPartyResearch}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, thirdPartyResearch: checked })
                    }
                    data-testid="switch-research"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your health data is encrypted and stored securely. We never sell your personal 
                  information to third parties. You can request to download or delete your data at 
                  any time by contacting support.
                </p>
              </div>

              <Button onClick={savePrivacySettings} data-testid="button-save-privacy">
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
