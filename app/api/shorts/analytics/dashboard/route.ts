import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '30d';

  try {
    const db = await getDb();
    const shorts = db.collection('shorts');
    const views = db.collection('shortViews');
    const likes = db.collection('shortLikes');
    const comments = db.collection('shortComments');

    const userId = String(user.sub);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = new Date(0); // All time
    }

    // Get user's shorts
    const userShorts = await shorts.find({ userId }).toArray();
    const shortIds = userShorts.map(s => s._id.toString());

    // Get all views for user's shorts in date range
    const allViews = await views.find({
      shortId: { $in: shortIds },
      createdAt: { $gte: startDate },
    }).toArray();

    // Calculate overall stats
    const totalViews = allViews.length;
    const totalWatchTime = allViews.reduce((sum, v) => sum + (v.watchTime || 0), 0);
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    
    const completedViews = allViews.filter(v => v.completed).length;
    const averageCompletionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    // Get engagement stats
    const [totalLikes, totalComments] = await Promise.all([
      likes.countDocuments({ shortId: { $in: shortIds } }),
      comments.countDocuments({ shortId: { $in: shortIds } }),
    ]);

    const totalShares = userShorts.reduce((sum, s) => sum + (s.stats?.shares || 0), 0);

    // Get views by day/week/month based on range
    let viewsByDay = [];
    
    if (range === '7d') {
      // Last 7 days - show daily
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayViews = allViews.filter(v => {
          const viewDate = new Date(v.createdAt);
          return viewDate >= date && viewDate < nextDate;
        }).length;
        
        viewsByDay.push({
          date: date.toISOString(),
          views: dayViews,
        });
      }
    } else if (range === '30d') {
      // Last 30 days - show weekly (4-5 weeks)
      const weeks = 5;
      for (let i = weeks - 1; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekViews = allViews.filter(v => {
          const viewDate = new Date(v.createdAt);
          return viewDate >= weekStart && viewDate <= weekEnd;
        }).length;
        
        viewsByDay.push({
          date: weekStart.toISOString(),
          views: weekViews,
        });
      }
    } else {
      // All time - show monthly
      const firstShortDate = userShorts.length > 0 
        ? new Date(Math.min(...userShorts.map(s => new Date(s.createdAt).getTime())))
        : new Date();
      
      const monthsCount = Math.ceil((now.getTime() - firstShortDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const months = Math.min(Math.max(monthsCount, 6), 12); // Show 6-12 months
      
      for (let i = months - 1; i >= 0; i--) {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthViews = allViews.filter(v => {
          const viewDate = new Date(v.createdAt);
          return viewDate >= monthStart && viewDate <= monthEnd;
        }).length;
        
        viewsByDay.push({
          date: monthStart.toISOString(),
          views: monthViews,
        });
      }
    }

    // Get individual shorts performance
    const shortsPerformance = await Promise.all(
      userShorts.map(async (short) => {
        const shortId = short._id.toString();
        const shortViews = allViews.filter(v => v.shortId === shortId);
        const shortViewsCount = shortViews.length;
        const shortWatchTime = shortViews.reduce((sum, v) => sum + (v.watchTime || 0), 0);
        const shortAvgWatchTime = shortViewsCount > 0 ? shortWatchTime / shortViewsCount : 0;
        const shortCompleted = shortViews.filter(v => v.completed).length;
        const shortCompletionRate = shortViewsCount > 0 ? (shortCompleted / shortViewsCount) * 100 : 0;

        const [shortLikes, shortComments] = await Promise.all([
          likes.countDocuments({ shortId }),
          comments.countDocuments({ shortId }),
        ]);

        return {
          _id: shortId,
          caption: short.caption,
          videoUrl: short.videoUrl,
          views: shortViewsCount,
          likes: shortLikes,
          comments: shortComments,
          shares: short.stats?.shares || 0,
          watchTime: shortWatchTime,
          averageWatchTime: shortAvgWatchTime,
          completionRate: shortCompletionRate,
          createdAt: short.createdAt,
        };
      })
    );

    // Sort by views and get top 3
    const topPerformingShorts = [...shortsPerformance]
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);

    const stats = {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalWatchTime,
      averageWatchTime,
      averageCompletionRate,
      totalShorts: userShorts.length,
      viewsByDay,
      topPerformingShorts,
    };

    return NextResponse.json({ 
      stats, 
      shorts: shortsPerformance.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, { status: 200 });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
