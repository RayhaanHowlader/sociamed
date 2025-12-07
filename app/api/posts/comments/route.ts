import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get("postId")
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const after = searchParams.get("after") // ISO timestamp string

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 })
  }

  const db = await getDb()
  const commentsCol = db.collection("postComments")
  const profiles = db.collection("profiles")

  // Build query - get comments after a certain timestamp if provided
  const query: any = { postId }

  // If after timestamp is provided, only get comments after that time
  if (after) {
    query.createdAt = { $gt: new Date(after) }
  }

  // Get comments sorted by creation time (oldest first)
  const comments = await commentsCol
    .find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray()

  // Check if there are more comments to load
  const hasMore = comments.length === limit

  const authorIds = Array.from(new Set(comments.map((c) => c.userId)))
  const authorProfiles = await profiles
    .find({ userId: { $in: authorIds } })
    .project<{ userId: string; name: string; username: string }>({
      userId: 1,
      name: 1,
      username: 1,
    })
    .toArray()

  const items = comments.map((c) => {
    const profile = authorProfiles.find((p) => p.userId === c.userId)
    return {
      id: String(c._id),
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      author: {
        name: profile?.name ?? "Unknown",
        username: profile?.username ?? "",
      },
    }
  })

  return NextResponse.json({ comments: items, hasMore }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { postId, content } = (await req.json()) as { postId?: string; content?: string }

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 })
  }

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 })
  }

  const db = await getDb()
  const commentsCol = db.collection("postComments")
  const posts = db.collection("posts")
  const profiles = db.collection("profiles")

  const createdAt = new Date()
  const insertResult = await commentsCol.insertOne({
    postId,
    userId: String(user.sub),
    content: content.trim(),
    createdAt,
  })

  await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { "stats.comments": 1 } })

  const profile = await profiles.findOne<{ name: string; username: string }>({
    userId: String(user.sub),
  })

  return NextResponse.json(
    {
      comment: {
        id: String(insertResult.insertedId),
        userId: String(user.sub),
        content: content.trim(),
        createdAt: createdAt.toISOString(),
        author: {
          name: profile?.name ?? "You",
          username: profile?.username ?? "",
        },
      },
    },
    { status: 201 },
  )
}


