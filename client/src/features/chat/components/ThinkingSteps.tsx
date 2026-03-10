import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export interface ThinkingStep {
  id: string;
  label: string;
  detail?: string;           // smaller text below the label
  status: 'waiting' | 'active' | 'done';
}

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  title?: string;             // e.g. "Preparing your response"
}

export default function ThinkingSteps({ steps, title }: ThinkingStepsProps) {
  // Animate step transitions with a subtle stagger
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    // Show one more row every 120ms for the initial reveal
    if (visibleCount < steps.length) {
      const t = setTimeout(() => setVisibleCount(prev => prev + 1), 120);
      return () => clearTimeout(t);
    }
  }, [visibleCount, steps.length]);

  return (
    <div className="py-1" role="status" aria-live="polite" aria-busy="true">
      {/* Title */}
      {title && (
        <p className="text-sm font-semibold text-[#054700] mb-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5a6623] animate-pulse" />
          {title}
        </p>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {steps.slice(0, visibleCount).map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-2.5 transition-all duration-300 ${
              step.status === 'waiting' ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {step.status === 'done' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
              ) : step.status === 'active' ? (
                <Loader2 className="h-3.5 w-3.5 text-[#5a6623] animate-spin" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-[#5a6623]/30" />
              )}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <p className={`text-sm leading-tight ${
                step.status === 'done'
                  ? 'text-[#054700]'
                  : step.status === 'active'
                    ? 'text-[#054700] font-medium'
                    : 'text-[#5a6623]'
              }`}>
                {step.label}
              </p>
              {step.detail && step.status !== 'waiting' && (
                <p className="text-xs text-[#5a6623]/70 mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
