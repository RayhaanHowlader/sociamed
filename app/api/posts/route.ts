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
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const after = searchParams.get("after") // ISO timestamp string

  const db = await getDb()
  const posts = db.collection("posts")
  const friends = db.collection("friends")

  // Get user's friends
  const friendDocs = await friends
    .find({
      $or: [{ userId: String(user.sub) }, { friendUserId: String(user.sub) }],
    })
    .toArray()

  const friendIds = new Set<string>()
  friendIds.add(String(user.sub)) // Include current user's own posts

  friendDocs.forEach((doc) => {
    const docUserId = String(doc.userId)
    const docFriendUserId = String(doc.friendUserId)
    const currentUserId = String(user.sub)

    if (docUserId === currentUserId) {
      friendIds.add(docFriendUserId)
    } else if (docFriendUserId === currentUserId) {
      friendIds.add(docUserId)
    }
  })

  // Build query - only get posts from friends and current user
  const query: any = {
    userId: { $in: Array.from(friendIds) },
  }

  // If after timestamp is provided, only get posts after that time
  if (after) {
    query.createdAt = { $lt: new Date(after) }
  }

  // Get latest posts first (newest to oldest)
  const items = await posts
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  // Check if there are more posts to load
  const hasMore = items.length === limit

  return NextResponse.json({ posts: items, hasMore }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { content, imageUrl, imagePublicId } = (await req.json()) as {
    content?: string
    imageUrl?: string
    imagePublicId?: string
  }

  if (!content && !imageUrl) {
    return NextResponse.json({ error: "Please add some text or an image" }, { status: 400 })
  }

  const db = await getDb()
  const profiles = db.collection("profiles")
  const posts = db.collection("posts")

  const profile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: user.sub,
  })

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile before posting" }, { status: 403 })
  }

  const doc = {
    userId: user.sub,
    content: content?.trim() ?? "",
    imageUrl: imageUrl ?? "",
    imagePublicId: imagePublicId ?? "",
    author: {
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl || "",
    },
    createdAt: new Date(),
    stats: {
      likes: 0,
      comments: 0,
      shares: 0,
    },
  }

  const result = await posts.insertOne(doc)

  return NextResponse.json({ post: { ...doc, _id: result.insertedId } }, { status: 201 })
}



