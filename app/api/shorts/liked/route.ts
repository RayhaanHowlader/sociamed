import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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
    
    // Build query to find shortLikes by the user
    const likesQuery: any = {
      userId: String(userId)
    };

    // Add pagination based on shortLikes createdAt
    if (after) {
      likesQuery.createdAt = { $lt: new Date(after) };
    }

    // Fetch liked shorts from shortLikes collection with pagination
    const shortLikes = await db
      .collection('shortLikes')
      .find(likesQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Fetch one extra to check if there are more
      .toArray();



    // Check if there are more likes
    const hasMore = shortLikes.length > limit;
    if (hasMore) {
      shortLikes.pop(); // Remove the extra like
    }

    // Get the actual shorts data with embedded author information
    const shortsWithAuthors = await Promise.all(
      shortLikes.map(async (like: any) => {
        // Get the short data with embedded author information
        const short = await db.collection('shorts').findOne(
          { _id: new ObjectId(like.shortId) }
        );

        if (!short) {
          return null; // Skip if short doesn't exist anymore
        }

        return {
          id: short._id.toString(),
          videoUrl: short.videoUrl,
          thumbnailUrl: short.videoUrl, // Use video URL as thumbnail
          title: short.caption || 'Untitled Short', // Use caption as title
          description: short.caption || '',
          createdAt: like.createdAt.toISOString(), // Use like createdAt for proper pagination
          stats: {
            likes: short.stats?.likes || 0,
            comments: short.stats?.comments || 0,
            shares: 0, // Not implemented yet
            views: short.views || 0
          },
          liked: true // All shorts in this response are liked by the user
        };
      })
    );

    // Filter out null values (deleted shorts)
    const validShorts = shortsWithAuthors.filter(short => short !== null);

    return NextResponse.json({
      shorts: validShorts,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching liked shorts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liked shorts' },
      { status: 500 }
    );
  }
}