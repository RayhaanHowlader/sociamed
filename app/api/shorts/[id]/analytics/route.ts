import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '7d';

  try {
    const db = await getDb();
    const shorts = db.collection('shorts');
    const views = db.collection('shortViews');
    const likes = db.collection('shortLikes');
    const comments = db.collection('shortComments');

    const shortId = params.id;
    const short = await shorts.findOne({ _id: new ObjectId(shortId) });

    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = new Date(short.createdAt);
    }

    // Get views data
    const viewsData = await views.find({
      shortId,
      createdAt: { $gte: startDate },
    }).toArray();

    const totalViews = viewsData.length;
    const totalWatchTime = viewsData.reduce((sum, v) => sum + (v.watchTime || 0), 0);
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const completedViews = viewsData.filter(v => v.completed).length;
    const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    // Generate retention data (simulated for now - in production, track actual retention)
    const duration = short.duration || 30;
    const retentionData = [];
    for (let i = 0; i <= duration; i += Math.ceil(duration / 20)) {
      const percentage = 100 - (i / duration) * (100 - completionRate);
      retentionData.push({
        time: i,
        percentage: Math.max(percentage, completionRate),
      });
    }

    // Get views by day
    const viewsByDay = [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayViews = viewsData.filter(v => {
        const viewDate = new Date(v.createdAt);
        return viewDate >= date && viewDate < nextDate;
      }).length;
      
      viewsByDay.push({
        date: date.toISOString(),
        views: dayViews,
      });
    }

    // Get engagement stats
    const [likesCount, commentsCount] = await Promise.all([
      likes.countDocuments({ shortId }),
      comments.countDocuments({ shortId }),
    ]);

    const sharesCount = short.stats?.shares || 0;

    const analytics = {
      shortId,
      views: totalViews,
      likes: likesCount,
      comments: commentsCount,
      shares: sharesCount,
      watchTime: totalWatchTime,
      averageWatchTime,
      completionRate,
      retentionData,
      viewsByDay,
      demographics: {
        age: [
          { range: '18-24', percentage: 35 },
          { range: '25-34', percentage: 40 },
          { range: '35-44', percentage: 15 },
          { range: '45+', percentage: 10 },
        ],
        gender: [
          { type: 'Male', percentage: 55 },
          { type: 'Female', percentage: 42 },
          { type: 'Other', percentage: 3 },
        ],
      },
    };

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
