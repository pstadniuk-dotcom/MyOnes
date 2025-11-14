import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Bell, Mail, MessageSquare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReviewFrequency = 'monthly' | 'bimonthly' | 'quarterly';

interface ReviewSchedule {
  id: string;
  userId: string;
  formulaId: string;
  frequency: ReviewFrequency;
  daysBefore: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
  emailReminders: boolean;
  smsReminders: boolean;
  calendarIntegration: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReviewScheduleCardProps {
  formulaId: string;
}

export function ReviewScheduleCard({ formulaId }: ReviewScheduleCardProps) {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [frequency, setFrequency] = useState<ReviewFrequency>('monthly');
  const [daysBefore, setDaysBefore] = useState<number>(5);
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing schedule
  useEffect(() => {
    loadSchedule();
  }, [formulaId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/formulas/${formulaId}/review-schedule`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSchedule(data);
          setFrequency(data.frequency);
          setDaysBefore(data.daysBefore);
          setEmailReminders(data.emailReminders);
          setSmsReminders(data.smsReminders);
        }
      }
    } catch (error) {
      console.error('Error loading review schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/formulas/${formulaId}/review-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          frequency,
          daysBefore,
          emailReminders,
          smsReminders,
          calendarIntegration: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save review schedule');
      }

      const data = await response.json();
      setSchedule(data);

      toast({
        title: "Review Schedule Saved",
        description: `Your ${frequency} review is scheduled for ${new Date(data.nextReviewDate).toLocaleDateString()}.`,
      });
    } catch (error) {
      console.error('Error saving review schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save review schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCalendar = async () => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/review-schedule/calendar`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download calendar file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ones-review.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Calendar Downloaded",
        description: "Add the .ics file to your preferred calendar app.",
      });
    } catch (error) {
      console.error('Error downloading calendar:', error);
      toast({
        title: "Error",
        description: "Failed to download calendar file. Please save your schedule first.",
        variant: "destructive",
      });
    }
  };

  const getNextReviewDateText = () => {
    if (!schedule?.nextReviewDate) return "Not scheduled";
    const date = new Date(schedule.nextReviewDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today!";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

  const frequencyLabels: Record<ReviewFrequency, string> = {
    monthly: 'Monthly (30 days)',
    bimonthly: 'Bimonthly (60 days)',
    quarterly: 'Quarterly (90 days)',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Review Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="section-review-schedule">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Review Schedule
        </CardTitle>
        <CardDescription>
          Schedule regular formula reviews to optimize your supplement plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next Review Date Display */}
        {schedule && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Review</p>
                <p className="text-2xl font-bold">
                  {schedule.nextReviewDate ? new Date(schedule.nextReviewDate).toLocaleDateString() : 'Not set'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{getNextReviewDateText()}</p>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </div>
        )}

        {/* Frequency Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Review Frequency</Label>
          <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as ReviewFrequency)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="cursor-pointer">
                {frequencyLabels.monthly}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bimonthly" id="bimonthly" />
              <Label htmlFor="bimonthly" className="cursor-pointer">
                {frequencyLabels.bimonthly}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quarterly" id="quarterly" />
              <Label htmlFor="quarterly" className="cursor-pointer">
                {frequencyLabels.quarterly}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Days Before Review */}
        <div className="space-y-3">
          <Label htmlFor="daysBefore" className="text-base font-semibold">
            Review Timing
          </Label>
          <Select value={daysBefore.toString()} onValueChange={(value) => setDaysBefore(parseInt(value))}>
            <SelectTrigger id="daysBefore">
              <SelectValue placeholder="Select timing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days before shipment</SelectItem>
              <SelectItem value="5">5 days before shipment</SelectItem>
              <SelectItem value="7">7 days before shipment</SelectItem>
              <SelectItem value="10">10 days before shipment</SelectItem>
              <SelectItem value="14">14 days before shipment</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How many days before your next order should we remind you to review?
          </p>
        </div>

        {/* Reminder Preferences */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Reminder Preferences</Label>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Reminders</p>
                <p className="text-xs text-muted-foreground">Get reminders via email</p>
              </div>
            </div>
            <Switch
              checked={emailReminders}
              onCheckedChange={setEmailReminders}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Reminders</p>
                <p className="text-xs text-muted-foreground">Get reminders via text</p>
              </div>
            </div>
            <Switch
              checked={smsReminders}
              onCheckedChange={setSmsReminders}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : schedule ? 'Update Schedule' : 'Set Schedule'}
          </Button>
          
          {schedule && (
            <Button
              variant="outline"
              onClick={handleDownloadCalendar}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              .ics
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          Review sessions help you stay on track with your health goals and adjust your formula as needed.
        </p>
      </CardContent>
    </Card>
  );
}
