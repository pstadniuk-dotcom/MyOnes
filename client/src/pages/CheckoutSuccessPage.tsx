import { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { CheckCircle, ArrowRight, MessageSquare, Truck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

export default function CheckoutSuccessPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const qc = useQueryClient();
  const params = new URLSearchParams(search || '');
  const includesMembership = params.get('membership') === '1';
  const smsRemindersEnabled = params.get('sms') === '1';

  // Invalidate user/auth queries so dashboard picks up new membership status
  useEffect(() => {
    const timer = setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['/api/auth/me'] });
      qc.invalidateQueries({ queryKey: ['/api/membership/tiers'] });
      qc.invalidateQueries({ queryKey: ['/api/orders'] });
    }, 2000);
    return () => clearTimeout(timer);
  }, [qc]);

  return (
    <div className="min-h-screen bg-[#ede8e2] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#054700]/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#054700]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-light text-[#054700] mb-3">
          Thank you for your <span className="font-medium">order</span>
        </h1>
        <p className="text-[#5a6623] leading-relaxed">
          We'll keep you updated with shipping information by email. Because each
          formula is custom-formulated and produced to order, please allow{' '}
          <span className="font-medium text-[#054700]">7–10 business days</span> for
          production before it ships.
          {includesMembership && ' Your membership is now active.'}
        </p>

        {/* What's next */}
        <div className="mt-10 bg-white rounded-2xl p-6 text-left shadow-sm shadow-[#054700]/5">
          <p className="text-xs font-medium text-[#D4A574] uppercase tracking-wider mb-4">What happens next</p>
          <ul className="space-y-3">
            {[
              'Our team reviews your personalized formula',
              'We compound your supplements to order (typically 7–10 business days)',
              "You'll receive a tracking email as soon as it ships",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#054700] text-white text-xs flex items-center justify-center font-medium mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[#2D3436] text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SMS reminders confirmation */}
        {smsRemindersEnabled && (
          <div className="mt-4 flex items-center gap-2 bg-[#054700]/5 rounded-xl px-4 py-3 text-left">
            <MessageSquare className="w-4 h-4 text-[#054700] flex-shrink-0" />
            <p className="text-sm text-[#054700]">
              Daily SMS reminders enabled — we'll text you when it's time to take your supplements.
            </p>
          </div>
        )}

        <Button
          onClick={() => navigate('/dashboard/orders')}
          className="mt-8 w-full bg-[#054700] hover:bg-[#043d00] text-white py-6 text-base rounded-full group"
        >
          <Truck className="mr-2 w-4 h-4" />
          View order status
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-3 text-sm text-[#5a6623] hover:text-[#054700] underline-offset-2 hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
