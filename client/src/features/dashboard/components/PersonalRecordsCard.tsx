import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Trophy, TrendingUp, Star, ArrowUp } from 'lucide-react';
import type { PersonalRecord, WellnessInsight } from '@/types/wellness';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
  insights: WellnessInsight[];
  totalWorkouts?: number;
}

export function PersonalRecordsCard({ records, insights, totalWorkouts = 0 }: PersonalRecordsCardProps) {
  const newRecords = records.filter(r => r.isNew);
  const topRecords = records.slice(0, 5);

  return (
    <Card className="border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#D4A574]" />
            Personal Records
          </CardTitle>
          {newRecords.length > 0 && (
            <Badge className="bg-[#D4A574]/20 text-[#D4A574] border-[#D4A574]/30 hover:bg-[#D4A574]/20">
              <Star className="h-3 w-3 mr-1 fill-current" />
              {newRecords.length} New PR{newRecords.length > 1 ? 's' : ''}!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        {totalWorkouts > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-[#1B4332]/5 to-[#52796F]/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1B4332]" />
              <span className="text-sm font-medium text-[#1B4332]">
                {totalWorkouts} workouts logged
              </span>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, 2).map((insight) => (
              <div 
                key={insight.id}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  insight.type === 'achievement' ? 'bg-[#D4A574]/10' :
                  insight.type === 'streak' ? 'bg-orange-50' :
                  insight.type === 'improvement' ? 'bg-green-50' :
                  'bg-[#1B4332]/5'
                }`}
              >
                <span className="text-lg">{insight.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1B4332]">{insight.message}</p>
                  {insight.metric && (
                    <p className="text-xs text-[#52796F]">{insight.metric}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PR List */}
        {topRecords.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#52796F] uppercase tracking-wide">
              Top Lifts
            </p>
            {topRecords.map((record, i) => (
              <div 
                key={record.exerciseName}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  record.isNew ? 'bg-[#D4A574]/10 border border-[#D4A574]/20' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {record.isNew && (
                    <Star className="h-3 w-3 text-[#D4A574] fill-current" />
                  )}
                  <span className="text-sm text-[#1B4332] font-medium">
                    {record.exerciseName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1B4332]">
                    {record.weight} lbs
                  </span>
                  {record.isNew && record.previousWeight && (
                    <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 px-1 py-0">
                      <ArrowUp className="h-2 w-2 mr-0.5" />
                      {record.weight - record.previousWeight}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[#52796F]">
              Complete your first strength workout to track PRs
            </p>
          </div>
        )}

        {/* Motivational footer */}
        {newRecords.length > 0 && (
          <div className="pt-2 border-t border-[#1B4332]/10 text-center">
            <p className="text-xs text-[#52796F]">
              🎯 You're getting stronger! Keep pushing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state when no PRs
export function PersonalRecordsEmpty() {
  return (
    <Card className="border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Trophy className="h-8 w-8 text-gray-300 mb-3" />
        <h3 className="font-semibold text-[#1B4332] mb-1">No PRs Yet</h3>
        <p className="text-sm text-[#52796F] max-w-xs">
          Log your workouts with weights to start tracking personal records.
        </p>
      </CardContent>
    </Card>
  );
}
