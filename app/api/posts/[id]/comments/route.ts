import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  const db = await getDb()
  const commentsCol = db.collection("postComments")
  const profiles = db.collection("profiles")

  // Get comments for this post, sorted by creation time (newest first)
  const comments = await commentsCol
    .find({ postId: params.id })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()

  // Check if there are more comments to load
  const totalComments = await commentsCol.countDocuments({ postId: params.id })
  const hasMore = offset + comments.length < totalComments

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

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { content } = (await req.json()) as { content?: string }

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 })
  }

  const db = await getDb()
  const commentsCol = db.collection("postComments")
  const posts = db.collection("posts")
  const profiles = db.collection("profiles")

  const createdAt = new Date()
  const insertResult = await commentsCol.insertOne({
    postId: params.id,
    userId: String(user.sub),
    content: content.trim(),
    createdAt,
  })

  // Update post comment count
  await posts.updateOne(
    { _id: new ObjectId(params.id) }, 
    { $inc: { "stats.comments": 1 } }
  )

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