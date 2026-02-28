'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Eye, Users, Clock, BarChart3, Activity, Play, Video, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShortAnalytics {
  _id: string;
  caption: string;
  videoUrl: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;
  averageWatchTime: number;
  completionRate: number;
  createdAt: string;
}

interface OverallStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalWatchTime: number;
  averageWatchTime: number;
  averageCompletionRate: number;
  totalShorts: number;
  viewsByDay: { date: string; views: number }[];
  topPerformingShorts: ShortAnalytics[];
}

interface ShortsAnalyticsDashboardProps {
  onBack: () => void;
}

export function ShortsAnalyticsDashboard({ onBack }: ShortsAnalyticsDashboardProps) {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [shorts, setShorts] = useState<ShortAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shorts/analytics/dashboard?range=${timeRange}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setShorts(data.shorts);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-between">
            {/* Back Button - Icon Only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                Shorts Analytics Dashboard
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track your shorts performance and engagement
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'All time'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 flex-1 overflow-y-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Overall Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Video className="h-6 w-6" />}
              label="Total Shorts"
              value={stats.totalShorts.toString()}
              color="blue"
            />
            <StatCard
              icon={<Eye className="h-6 w-6" />}
              label="Total Views"
              value={formatNumber(stats.totalViews)}
              color="green"
            />
            <StatCard
              icon={<Clock className="h-6 w-6" />}
              label="Avg Watch Time"
              value={formatDuration(stats.averageWatchTime)}
              color="purple"
            />
            <StatCard
              icon={<Activity className="h-6 w-6" />}
              label="Avg Completion"
              value={`${stats.averageCompletionRate.toFixed(1)}%`}
              color="orange"
            />
          </div>

          {/* Engagement Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EngagementCard
              icon={<Heart className="h-5 w-5" />}
              label="Total Likes"
              value={formatNumber(stats.totalLikes)}
              color="red"
            />
            <EngagementCard
              icon={<MessageCircle className="h-5 w-5" />}
              label="Total Comments"
              value={formatNumber(stats.totalComments)}
              color="blue"
            />
            <EngagementCard
              icon={<Share2 className="h-5 w-5" />}
              label="Total Shares"
              value={formatNumber(stats.totalShares)}
              color="green"
            />
          </div>

          {/* Views Over Time Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Views Over Time
            </h3>
            <div className="relative h-64">
              <ViewsChart data={stats.viewsByDay} timeRange={timeRange} />
            </div>
          </div>

          {/* Individual Shorts Performance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Individual Shorts Performance
            </h3>
            <div className="space-y-3">
              {shorts.map((short) => (
                <ShortPerformanceCard key={short._id} short={short} />
              ))}
              {shorts.length === 0 && (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No shorts data available for this period
                </p>
              )}
            </div>
          </div>

          {/* Top Performing Shorts */}
          {stats.topPerformingShorts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                Top Performing Shorts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.topPerformingShorts.map((short, index) => (
                  <TopShortCard key={short._id} short={short} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex items-center justify-center text-slate-600 dark:text-slate-400">
          No analytics data available
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function EngagementCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} mb-2`}>
        {icon}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ViewsChart({ data, timeRange }: { data: { date: string; views: number }[]; timeRange: '7d' | '30d' | 'all' }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    if (timeRange === '7d') {
      // Daily format: "Dec 4"
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeRange === '30d') {
      // Weekly format: "Jan 4"
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Monthly format: "Jan" or "Feb"
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end gap-2 pb-8">
        {data.map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 dark:from-blue-500 dark:to-cyan-300 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
              style={{ height: `${(point.views / maxViews) * 100}%`, minHeight: point.views > 0 ? '4px' : '0' }}
            />
            <div className="absolute -top-10 bg-slate-900 dark:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
              {point.views} views
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-between px-1">
        {data.map((point, index) => (
          <div key={index} className="flex-1 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {formatDate(point.date)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortPerformanceCard({ short }: { short: ShortAnalytics }) {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
      <div className="relative w-24 h-32 flex-shrink-0 bg-black rounded-lg overflow-hidden">
        <video
          src={short.videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 truncate">
          {short.caption || 'Untitled Short'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Views</p>
            <p className="font-bold text-slate-900 dark:text-white">{formatNumber(short.views)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Likes</p>
            <p className="font-bold text-red-600 dark:text-red-400">{formatNumber(short.likes)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Avg Watch</p>
            <p className="font-bold text-green-600 dark:text-green-400">{formatDuration(short.averageWatchTime)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Completion</p>
            <p className="font-bold text-purple-600 dark:text-purple-400">{short.completionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopShortCard({ short, rank }: { short: ShortAnalytics; rank: number }) {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const rankColors = {
    1: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
    2: 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600',
    3: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700',
  };

  return (
    <div className={`relative rounded-xl p-4 border-2 ${rankColors[rank as keyof typeof rankColors] || 'border-slate-200 dark:border-slate-700'}`}>
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">
        #{rank}
      </div>
      <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden mb-3">
        <video
          src={short.videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      </div>
      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 truncate text-sm">
        {short.caption || 'Untitled Short'}
      </h4>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <Eye className="h-3 w-3" />
          <span>{formatNumber(short.views)}</span>
        </div>
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <Heart className="h-3 w-3" />
          <span>{formatNumber(short.likes)}</span>
        </div>
      </div>
    </div>
  );
}
