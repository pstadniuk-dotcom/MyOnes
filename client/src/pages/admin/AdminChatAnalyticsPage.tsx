import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  MessageCircle, Clock, Star, TrendingUp, Users, BarChart3, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Link } from 'wouter';

interface AnalyticsData {
  totalSessions: number;
  statusBreakdown: { status: string; count: number }[];
  avgRating: number;
  ratingCount: number;
  messageVolume: { sender: string; count: number }[];
  avgResponseTimeMs: number;
  dailyVolume: { date: string; count: number }[];
}

export default function AdminChatAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/live-chats/analytics', days],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/live-chats/analytics?days=${days}`);
      return res.json();
    },
  });

  const avgResponseSec = data?.avgResponseTimeMs ? Math.round(data.avgResponseTimeMs / 1000) : 0;
  const avgResponseMin = avgResponseSec > 60 ? `${Math.round(avgResponseSec / 60)}m` : `${avgResponseSec}s`;

  const totalMessages = data?.messageVolume?.reduce((s, m) => s + m.count, 0) || 0;
  const userMessages = data?.messageVolume?.find(m => m.sender === 'user')?.count || 0;
  const adminMessages = data?.messageVolume?.find(m => m.sender === 'admin')?.count || 0;
  const botMessages = data?.messageVolume?.find(m => m.sender === 'bot')?.count || 0;

  const activeCount = data?.statusBreakdown?.find(s => s.status === 'active')?.count || 0;
  const waitingCount = data?.statusBreakdown?.find(s => s.status === 'waiting')?.count || 0;
  const closedCount = data?.statusBreakdown?.find(s => s.status === 'closed')?.count || 0;

  // Max for chart scaling
  const maxDaily = data?.dailyVolume?.length
    ? Math.max(...data.dailyVolume.map(d => d.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/live-chats">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#054700]">Chat Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Live chat performance metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(d => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
              className={days === d ? 'bg-[#054700] hover:bg-[#054700]/90' : ''}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Chats</p>
                    <p className="text-3xl font-bold text-[#054700]">{data?.totalSessions || 0}</p>
                  </div>
                  <div className="h-10 w-10 bg-[#054700]/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-[#054700]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Response</p>
                    <p className="text-3xl font-bold text-[#054700]">{avgResponseMin}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Rating</p>
                    <p className="text-3xl font-bold text-[#054700]">
                      {data?.avgRating ? data.avgRating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">{data?.ratingCount || 0} ratings</p>
                  </div>
                  <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Messages</p>
                    <p className="text-3xl font-bold text-[#054700]">{totalMessages}</p>
                  </div>
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Session Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Active</span>
                      <span className="font-medium text-green-600">{activeCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${data?.totalSessions ? (activeCount / data.totalSessions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Waiting</span>
                      <span className="font-medium text-amber-600">{waitingCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${data?.totalSessions ? (waitingCount / data.totalSessions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Closed</span>
                      <span className="font-medium text-gray-500">{closedCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full transition-all"
                        style={{ width: `${data?.totalSessions ? (closedCount / data.totalSessions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Message Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">User Messages</span>
                      <span className="font-medium">{userMessages}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#054700] rounded-full transition-all"
                        style={{ width: `${totalMessages ? (userMessages / totalMessages) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Admin Messages</span>
                      <span className="font-medium">{adminMessages}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${totalMessages ? (adminMessages / totalMessages) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Bot Messages</span>
                      <span className="font-medium">{botMessages}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${totalMessages ? (botMessages / totalMessages) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily volume chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Daily Chat Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.dailyVolume && data.dailyVolume.length > 0 ? (
                <div className="flex items-end gap-1 h-40">
                  {data.dailyVolume.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-[#054700]/80 rounded-t hover:bg-[#054700] transition-colors cursor-default min-h-[2px]"
                        style={{ height: `${Math.max((d.count / maxDaily) * 100, 2)}%` }}
                      />
                      <span className="text-[9px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      {/* Tooltip */}
                      <div className="hidden group-hover:block absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                        {d.count} chat{d.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
