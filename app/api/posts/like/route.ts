import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { postId } = (await req.json()) as { postId?: string }

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 })
  }

  const db = await getDb()
  const posts = db.collection("posts")
  const postLikes = db.collection("postLikes")

  const _id = new ObjectId(postId)

  const existing = await postLikes.findOne<{ _id: ObjectId }>({
    postId,
    userId: String(user.sub),
  })

  let liked: boolean

  if (existing) {
    await postLikes.deleteOne({ _id: existing._id })
    await posts.updateOne({ _id }, { $inc: { "stats.likes": -1 } })
    liked = false
  } else {
    await postLikes.insertOne({
      postId,
      userId: String(user.sub),
      createdAt: new Date(),
    })
    await posts.updateOne({ _id }, { $inc: { "stats.likes": 1 } })
    liked = true
  }

  const updated = await posts.findOne<{ stats?: { likes?: number } }>({ _id })
  const likes = updated?.stats?.likes ?? 0

  return NextResponse.json({ liked, likes }, { status: 200 })
}


