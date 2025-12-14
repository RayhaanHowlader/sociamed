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
    
    // Build query to find postLikes by the user
    const likesQuery: any = {
      userId: String(userId)
    };

    // Add pagination based on postLikes createdAt
    if (after) {
      likesQuery.createdAt = { $lt: new Date(after) };
    }

    // Fetch liked posts from postLikes collection with pagination
    const postLikes = await db
      .collection('postLikes')
      .find(likesQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Fetch one extra to check if there are more
      .toArray();



    // Check if there are more likes
    const hasMore = postLikes.length > limit;
    if (hasMore) {
      postLikes.pop(); // Remove the extra like
    }

    // Get the actual posts data with embedded author information
    const postsWithAuthors = await Promise.all(
      postLikes.map(async (like: any) => {
        // Get the post data with embedded author information
        const post = await db.collection('posts').findOne(
          { _id: new ObjectId(like.postId) }
        );

        if (!post) {
          return null; // Skip if post doesn't exist anymore
        }

        return {
          _id: post._id.toString(),
          content: post.content,
          imageUrl: post.imageUrl,
          createdAt: like.createdAt, // Use like createdAt for proper pagination
          userId: post.userId,
          author: {
            name: post.author?.name || 'Unknown User',
            username: post.author?.username || 'unknown',
            avatarUrl: post.author?.avatarUrl
          },
          stats: {
            likes: post.stats?.likes || 0,
            comments: post.stats?.comments || 0,
            shares: post.stats?.shares || 0
          },
          liked: true // All posts in this response are liked by the user
        };
      })
    );

    // Filter out null values (deleted posts)
    const validPosts = postsWithAuthors.filter(post => post !== null);

    return NextResponse.json({
      posts: validPosts,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liked posts' },
      { status: 500 }
    );
  }
}