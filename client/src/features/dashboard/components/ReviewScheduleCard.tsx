import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Switch } from "@/shared/components/ui/switch";
import { Calendar, Bell, Mail, MessageSquare, Download, ShoppingCart, Package, Info } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { buildApiUrl } from "@/shared/lib/api";
import { getAuthHeaders } from "@/shared/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

/**
 * Review frequency: "every_order" = review before each auto-ship (~8 weeks),
 * "every_other" = review every other auto-ship (~16 weeks).
 * Maps to the DB enum: every_order→bimonthly, every_other→quarterly (legacy enum values).
 */
type ReviewFrequency = 'every_order' | 'every_other';

/** Days before shipment the review reminder fires. Fixed at 10. */
const REVIEW_DAYS_BEFORE = 10;
/** Default supply period in weeks (matches orders.supplyWeeks default). */
const SUPPLY_WEEKS = 8;

interface ReviewSchedule {
  id: string;
  userId: string;
  formulaId: string;
  frequency: string;
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

interface Subscription {
  id: string;
  status: string;
  renewsAt: string | null;
}

interface Order {
  id: string;
  status: string;
  placedAt: string;
  supplyWeeks?: number;
}

interface ReviewScheduleCardProps {
  formulaId: string;
}

/** Map UI frequency labels to DB-compatible values */
function toDbFrequency(freq: ReviewFrequency): string {
  return freq === 'every_order' ? 'bimonthly' : 'quarterly';
}

/** Map DB frequency values back to UI labels */
function fromDbFrequency(dbFreq: string): ReviewFrequency {
  if (dbFreq === 'quarterly') return 'every_other';
  return 'every_order'; // bimonthly or monthly → every_order
}

export function ReviewScheduleCard({ formulaId }: ReviewScheduleCardProps) {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [frequency, setFrequency] = useState<ReviewFrequency>('every_order');
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if user has placed at least one order
  const { data: ordersData } = useQuery<Order[]>({
    queryKey: ['/api/users/me/orders'],
  });

  // Get subscription for renewsAt date
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['/api/users/me/subscription'],
  });

  // Get auto-ship info for next shipment date
  const { data: autoShipData } = useQuery<{ enabled: boolean; autoShip: { nextShipmentDate: string | null; status: string } | null }>({
    queryKey: ['/api/billing/auto-ship'],
    queryFn: async () => {
      const res = await fetch(buildApiUrl('/api/billing/auto-ship'), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { enabled: false, autoShip: null };
      return res.json();
    },
  });

  const hasOrders = (ordersData?.length ?? 0) > 0;

  // Load existing schedule
  useEffect(() => {
    if (hasOrders) {
      loadSchedule();
    }
  }, [formulaId, hasOrders]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/api/formulas/${formulaId}/review-schedule`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSchedule(data);
          setFrequency(fromDbFrequency(data.frequency));
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
      const response = await fetch(buildApiUrl(`/api/formulas/${formulaId}/review-schedule`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          frequency: toDbFrequency(frequency),
          daysBefore: REVIEW_DAYS_BEFORE,
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
        title: "Review Preferences Saved",
        description: `We'll remind you ${REVIEW_DAYS_BEFORE} days before your next shipment.`,
      });
    } catch (error) {
      console.error('Error saving review schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save review preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCalendar = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/formulas/${formulaId}/review-schedule/calendar`), {
        credentials: 'include',
        headers: getAuthHeaders(),
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

  /** Calculate next shipment date from auto-ship, subscription, or last order */
  const getNextShipmentDate = (): Date | null => {
    // Prefer auto-ship next shipment date (most accurate source)
    if (autoShipData?.autoShip?.status === 'active' && autoShipData.autoShip.nextShipmentDate) {
      return new Date(autoShipData.autoShip.nextShipmentDate);
    }
    // Fall back to subscription renewsAt
    if (subscription?.renewsAt) {
      return new Date(subscription.renewsAt);
    }
    // Fall back to last order + supply weeks
    if (ordersData && ordersData.length > 0) {
      const latestOrder = [...ordersData].sort(
        (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      )[0];
      const weeks = latestOrder.supplyWeeks ?? SUPPLY_WEEKS;
      const shipDate = new Date(latestOrder.placedAt);
      shipDate.setDate(shipDate.getDate() + weeks * 7);
      return shipDate;
    }
    return null;
  };

  const getNextReviewDate = (): Date | null => {
    const shipDate = getNextShipmentDate();
    if (!shipDate) return null;
    const reviewDate = new Date(shipDate);
    reviewDate.setDate(reviewDate.getDate() - REVIEW_DAYS_BEFORE);
    return reviewDate;
  };

  const getNextReviewDateText = () => {
    const reviewDate = getNextReviewDate();
    if (!reviewDate) return "Not scheduled";
    const today = new Date();
    const diffTime = reviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today!";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

  const getNextShipmentDateText = () => {
    const shipDate = getNextShipmentDate();
    if (!shipDate) return null;
    return shipDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Formula Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Pre-order state: show prompt to place first order
  if (!hasOrders) {
    return (
      <Card data-testid="section-review-schedule">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Formula Review
          </CardTitle>
          <CardDescription>
            Stay on track with your supplement plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center space-y-3 border border-dashed rounded-lg">
            <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Place your first order</p>
              <p className="text-sm text-muted-foreground mt-1">
                Once you've ordered your formula, we'll set up automatic review reminders{' '}
                {REVIEW_DAYS_BEFORE} days before each shipment so you can fine-tune your formula with your AI practitioner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reviewDate = getNextReviewDate();
  const shipmentDate = getNextShipmentDateText();

  return (
    <Card data-testid="section-review-schedule">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Formula Review
        </CardTitle>
        <CardDescription>
          Stay on track with your supplement plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next Review + Shipment Display */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Review</p>
              <p className="text-2xl font-bold">
                {reviewDate ? reviewDate.toLocaleDateString() : 'Not set'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{getNextReviewDateText()}</p>
              {shipmentDate && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Next shipment: {shipmentDate}
                </p>
              )}
            </div>
            <Bell className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Frequency Selection — simplified to 2 options */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Review Frequency</Label>
          <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as ReviewFrequency)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every_order" id="every_order" />
              <Label htmlFor="every_order" className="cursor-pointer">
                Every order (~{SUPPLY_WEEKS} weeks)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every_other" id="every_other" />
              <Label htmlFor="every_other" className="cursor-pointer">
                Every other order (~{SUPPLY_WEEKS * 2} weeks)
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            We'll notify you {REVIEW_DAYS_BEFORE} days before shipment so you can review and adjust your formula.
          </p>
        </div>

        {/* Reminder Preferences */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Reminders</Label>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Get review reminders via email</p>
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
                <p className="font-medium">SMS</p>
                <p className="text-xs text-muted-foreground">Get review reminders via text</p>
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
            {saving ? 'Saving...' : schedule ? 'Update Preferences' : 'Enable Review Reminders'}
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

        {/* Auto-ship info + drift detection note */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Your formula auto-ships every {SUPPLY_WEEKS} weeks. We'll also notify you if new lab results 
            or wearable trends suggest your formula should be adjusted — even outside your review schedule.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
