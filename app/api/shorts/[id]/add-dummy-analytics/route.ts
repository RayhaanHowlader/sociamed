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

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const shorts = db.collection('shorts');
    const shortViews = db.collection('shortViews');
    const shortLikes = db.collection('shortLikes');
    const shortComments = db.collection('shortComments');

    const shortId = params.id;
    const short = await shorts.findOne({ _id: new ObjectId(shortId) });

    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    // Verify ownership
    if (short.userId !== String(user.sub)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Clear existing analytics
    await Promise.all([
      shortViews.deleteMany({ shortId }),
      shortLikes.deleteMany({ shortId }),
      shortComments.deleteMany({ shortId }),
    ]);

    // Generate dummy views for the last 30 days
    const now = new Date();
    const views = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Random number of views per day (5-25)
      const viewsCount = Math.floor(Math.random() * 20) + 5;
      
      for (let j = 0; j < viewsCount; j++) {
        const viewDate = new Date(date);
        viewDate.setHours(Math.floor(Math.random() * 24));
        viewDate.setMinutes(Math.floor(Math.random() * 60));
        
        // Random watch time (10-60 seconds)
        const watchTime = Math.floor(Math.random() * 50) + 10;
        
        // 75% completion rate
        const completed = Math.random() < 0.75;
        
        views.push({
          shortId,
          userId: `dummy_user_${Math.floor(Math.random() * 100)}`,
          watchTime,
          completed,
          createdAt: viewDate
        });
      }
    }
    
    // Insert views
    if (views.length > 0) {
      await shortViews.insertMany(views);
    }
    
    // Update short views count
    await shorts.updateOne(
      { _id: new ObjectId(shortId) },
      { $set: { views: views.length } }
    );
    
    // Add likes (30% of views)
    const likesCount = Math.floor(views.length * 0.3);
    const likes = [];
    for (let i = 0; i < likesCount; i++) {
      likes.push({
        shortId,
        userId: `dummy_user_${Math.floor(Math.random() * 100)}`,
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    if (likes.length > 0) {
      await shortLikes.insertMany(likes);
    }
    
    // Add comments (10% of views)
    const commentsCount = Math.floor(views.length * 0.1);
    const commentTexts = [
      'Great video!',
      'Love this!',
      'Amazing content',
      'Keep it up!',
      'This is awesome',
      'Nice work',
      'Impressive!',
      'Well done',
      'Fantastic!',
      'So cool!'
    ];
    
    const comments = [];
    for (let i = 0; i < commentsCount; i++) {
      const userId = Math.floor(Math.random() * 100);
      comments.push({
        shortId,
        userId: `dummy_user_${userId}`,
        content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
        author: {
          name: `User ${userId}`,
          username: `user${userId}`
        },
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    if (comments.length > 0) {
      await shortComments.insertMany(comments);
    }

    const avgWatchTime = views.reduce((sum, v) => sum + v.watchTime, 0) / views.length;
    const completionRate = (views.filter(v => v.completed).length / views.length) * 100;

    return NextResponse.json({ 
      success: true,
      stats: {
        views: views.length,
        likes: likes.length,
        comments: comments.length,
        avgWatchTime: avgWatchTime.toFixed(1),
        completionRate: completionRate.toFixed(1)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Add dummy analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
