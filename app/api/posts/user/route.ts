import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const limit = parseInt(searchParams.get("limit") || "5")
  const after = searchParams.get("after")

  // If userId is provided, fetch that user's posts, otherwise fetch current user's posts
  const targetUserId = String(userId || user.sub)

  const db = await getDb()
  const posts = db.collection("posts")

  // Build query (matching the pattern from main posts API)
  const query: any = {
    userId: targetUserId
  }

  // Add pagination
  if (after) {
    query.createdAt = { $lt: new Date(after) }
  }

  // Fetch posts with pagination
  const userPosts = await posts
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1) // Fetch one extra to check if there are more
    .toArray()

  // Check if there are more posts
  const hasMore = userPosts.length > limit
  if (hasMore) {
    userPosts.pop() // Remove the extra post
  }

  // Check which posts the current user has liked
  const postLikes = db.collection("postLikes")
  const postIds = userPosts.map(p => p._id.toString())
  const userLikes = await postLikes
    .find({
      postId: { $in: postIds },
      userId: String(user.sub)
    })
    .toArray()
  
  const likedPostIds = new Set(userLikes.map(like => like.postId))

  // Transform posts data to match expected format
  const transformedPosts = userPosts.map((post: any) => ({
    id: post._id.toString(),
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    stats: {
      likes: post.stats?.likes || 0,
      comments: post.stats?.comments || 0,
      shares: post.stats?.shares || 0
    },
    liked: likedPostIds.has(post._id.toString())
  }))

  return NextResponse.json({ 
    posts: transformedPosts,
    hasMore 
  }, { status: 200 })
}

