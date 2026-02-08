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

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const posts = db.collection("posts")
  const likes = db.collection("likes")

  const _id = new ObjectId(params.id)

  // Check if post exists
  const post = await posts.findOne({ _id })
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const existing = await likes.findOne({
    postId: params.id,
    userId: String(user.sub),
  })

  let liked: boolean
  let likesCount: number

  if (existing) {
    // Unlike the post
    await likes.deleteOne({ _id: existing._id })
    await posts.updateOne({ _id }, { $inc: { "stats.likes": -1 } })
    liked = false
  } else {
    // Like the post
    await likes.insertOne({
      postId: params.id,
      userId: String(user.sub),
      createdAt: new Date(),
    })
    await posts.updateOne({ _id }, { $inc: { "stats.likes": 1 } })
    liked = true
  }

  // Get updated likes count
  const updatedPost = await posts.findOne({ _id })
  likesCount = updatedPost?.stats?.likes ?? 0

  return NextResponse.json({ liked, likesCount }, { status: 200 })
}