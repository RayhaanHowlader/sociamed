import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.sub;
    const limit = parseInt(searchParams.get('limit') || '5');
    const after = searchParams.get('after');

    const db = await getDb();
    
    // Build query
    const query: any = {
      userId: userId
    };

    // Add pagination
    if (after) {
      query.createdAt = { $lt: new Date(after) };
    }

    console.log('Fetching user shorts with query:', query);

    // Fetch shorts with pagination
    const shorts = await db
      .collection('shorts')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Fetch one extra to check if there are more
      .toArray();

    console.log('Found shorts:', shorts.length);

    // Check if there are more shorts
    const hasMore = shorts.length > limit;
    if (hasMore) {
      shorts.pop(); // Remove the extra short
    }

    // Transform shorts data to match the ProfileShortCard interface
    const transformedShorts = shorts.map((short: any) => ({
      id: short._id.toString(),
      videoUrl: short.videoUrl,
      thumbnailUrl: short.videoUrl, // Use video URL as thumbnail for now
      title: short.caption || 'Untitled Short', // Use caption as title
      description: short.caption || '',
      createdAt: short.createdAt.toISOString(),
      stats: {
        likes: short.stats?.likes || 0,
        comments: short.stats?.comments || 0,
        shares: 0, // Not implemented yet
        views: short.views || 0
      },
      liked: false // We'll need to check this separately if needed
    }));

    console.log('Transformed shorts:', transformedShorts.length);

    return NextResponse.json({
      shorts: transformedShorts,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching user shorts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts' },
      { status: 500 }
    );
  }
}