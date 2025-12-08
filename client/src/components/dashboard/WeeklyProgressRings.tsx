import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Utensils, Pill } from 'lucide-react';
import type { WeeklyProgress } from '@/types/wellness';

interface WeeklyProgressRingsProps {
  data: WeeklyProgress;
}

// Circular progress ring component
function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color,
  bgColor = '#e5e7eb',
  children 
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function WeeklyProgressRings({ data }: WeeklyProgressRingsProps) {
  const rings = [
    {
      key: 'workouts',
      label: 'Workouts',
      sublabel: 'completed',
      Icon: Dumbbell,
      value: data.workouts.completed,
      total: data.workouts.total,
      percentage: data.workouts.percentage,
      color: '#D4A574', // Gold/tan accent
      bgColor: '#D4A574/20'
    },
    {
      key: 'nutrition',
      label: 'Nutrition',
      sublabel: 'days logged',
      Icon: Utensils,
      value: data.nutrition.daysLogged,
      total: data.nutrition.totalDays,
      percentage: data.nutrition.percentage,
      color: '#52796F', // Sage green
      bgColor: '#52796F/20'
    },
    {
      key: 'supplements',
      label: 'Supplements',
      sublabel: 'days taken',
      Icon: Pill,
      value: data.supplements.daysTaken,
      total: data.supplements.totalDays,
      percentage: data.supplements.percentage,
      color: '#1B4332', // Dark forest green
      bgColor: '#1B4332/20'
    }
  ];

  return (
    <Card className="border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332]">
            This Week
          </CardTitle>
          <span className="text-2xl font-bold text-[#1B4332]">
            {data.overallScore}%
          </span>
        </div>
        <p className="text-xs text-[#52796F]">Your weekly consistency score</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-around py-2">
          {rings.map((ring) => (
            <div key={ring.key} className="flex flex-col items-center gap-2">
              <ProgressRing 
                progress={ring.percentage} 
                size={72}
                strokeWidth={6}
                color={ring.color}
                bgColor="#f3f4f6"
              >
                <ring.Icon className="h-5 w-5" style={{ color: ring.color }} />
              </ProgressRing>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#1B4332]">
                  {ring.value}/{ring.total}
                </p>
                <p className="text-xs text-[#52796F]">{ring.label}</p>
                <p className="text-[10px] text-[#52796F]/70">{ring.sublabel}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Motivational message based on progress */}
        <div className="mt-4 p-3 rounded-lg bg-[#1B4332]/5 text-center">
          {data.overallScore >= 80 ? (
            <p className="text-sm text-[#1B4332] font-medium">
              🔥 Crushing it! You're on fire this week.
            </p>
          ) : data.overallScore >= 50 ? (
            <p className="text-sm text-[#1B4332] font-medium">
              💪 Good progress! Keep the momentum going.
            </p>
          ) : data.overallScore > 0 ? (
            <p className="text-sm text-[#1B4332] font-medium">
              🌱 Every step counts. You've got this!
            </p>
          ) : (
            <p className="text-sm text-[#52796F]">
              Start tracking to see your progress
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state
export function WeeklyProgressRingsEmpty() {
  return (
    <Card className="border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex gap-4 mb-4 opacity-40">
          <ProgressRing progress={0} size={60} strokeWidth={5} color="#e5e7eb">
            <Dumbbell className="h-4 w-4 text-gray-400" />
          </ProgressRing>
          <ProgressRing progress={0} size={60} strokeWidth={5} color="#e5e7eb">
            <Utensils className="h-4 w-4 text-gray-400" />
          </ProgressRing>
          <ProgressRing progress={0} size={60} strokeWidth={5} color="#e5e7eb">
            <Pill className="h-4 w-4 text-gray-400" />
          </ProgressRing>
        </div>
        <p className="text-sm text-[#52796F]">
          Track your first workout or meal to see your weekly progress
        </p>
      </CardContent>
    </Card>
  );
}
