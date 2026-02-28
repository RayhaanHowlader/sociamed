'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Eye, Users, Clock, BarChart3, Activity, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortAnalytics {
  shortId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number; // in seconds
  averageWatchTime: number;
  completionRate: number;
  retentionData: { time: number; percentage: number }[];
  viewsByDay: { date: string; views: number }[];
  demographics: {
    age: { range: string; percentage: number }[];
    gender: { type: string; percentage: number }[];
  };
}

interface ShortsAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortId: string;
  shortTitle: string;
}

export function ShortsAnalytics({ open, onOpenChange, shortId, shortTitle }: ShortsAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ShortAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (open && shortId) {
      loadAnalytics();
    }
  }, [open, shortId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shorts/${shortId}/analytics?range=${timeRange}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Analytics - {shortTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : analytics ? (
          <div className="p-6 space-y-6">
            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'All time'}
                </button>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Eye className="h-5 w-5" />}
                label="Views"
                value={formatNumber(analytics.views)}
                color="blue"
              />
              <MetricCard
                icon={<Clock className="h-5 w-5" />}
                label="Avg Watch Time"
                value={formatDuration(analytics.averageWatchTime)}
                color="green"
              />
              <MetricCard
                icon={<Activity className="h-5 w-5" />}
                label="Completion Rate"
                value={`${analytics.completionRate.toFixed(1)}%`}
                color="purple"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Engagement"
                value={`${((analytics.likes + analytics.comments + analytics.shares) / analytics.views * 100).toFixed(1)}%`}
                color="orange"
              />
            </div>

            {/* Audience Retention Graph */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Audience Retention
              </h3>
              <div className="relative h-64">
                <RetentionGraph data={analytics.retentionData} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Shows the percentage of viewers still watching at each point in the video
              </p>
            </div>

            {/* Views Over Time */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Views Over Time
              </h3>
              <div className="relative h-64">
                <ViewsGraph data={analytics.viewsByDay} />
              </div>
            </div>

            {/* Engagement Stats */}
            <div className="grid grid-cols-3 gap-4">
              <EngagementCard
                label="Likes"
                value={formatNumber(analytics.likes)}
                percentage={(analytics.likes / analytics.views * 100).toFixed(1)}
                color="red"
              />
              <EngagementCard
                label="Comments"
                value={formatNumber(analytics.comments)}
                percentage={(analytics.comments / analytics.views * 100).toFixed(1)}
                color="blue"
              />
              <EngagementCard
                label="Shares"
                value={formatNumber(analytics.shares)}
                percentage={(analytics.shares / analytics.views * 100).toFixed(1)}
                color="green"
              />
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-600 dark:text-slate-400">
            No analytics data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} mb-2`}>
        {icon}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function EngagementCard({ label, value, percentage, color }: { label: string; value: string; percentage: string; color: string }) {
  const colorClasses = {
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{percentage}% of views</p>
    </div>
  );
}

function RetentionGraph({ data }: { data: { time: number; percentage: number }[] }) {
  const maxPercentage = 100;
  
  return (
    <div className="h-full flex items-end gap-1">
      {data.map((point, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full bg-gradient-to-t from-purple-600 to-purple-400 dark:from-purple-500 dark:to-purple-300 rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${(point.percentage / maxPercentage) * 100}%` }}
          />
          <div className="absolute -top-8 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {point.time}s: {point.percentage.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewsGraph({ data }: { data: { date: string; views: number }[] }) {
  const maxViews = Math.max(...data.map(d => d.views));
  
  return (
    <div className="h-full flex items-end gap-2">
      {data.map((point, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 dark:from-blue-500 dark:to-cyan-300 rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${(point.views / maxViews) * 100}%` }}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 rotate-45 origin-left">
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <div className="absolute -top-8 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {point.views} views
          </div>
        </div>
      ))}
    </div>
  );
}
