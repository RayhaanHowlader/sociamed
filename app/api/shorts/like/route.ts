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

  const { shortId } = (await req.json()) as { shortId?: string }

  if (!shortId) {
    return NextResponse.json({ error: "shortId is required" }, { status: 400 })
  }

  const db = await getDb()
  const shorts = db.collection("shorts")
  const shortLikes = db.collection("shortLikes")

  const _id = new ObjectId(shortId)

  const existing = await shortLikes.findOne<{ _id: ObjectId }>({
    shortId,
    userId: String(user.sub),
  })

  let liked: boolean

  if (existing) {
    await shortLikes.deleteOne({ _id: existing._id })
    await shorts.updateOne(
      { _id },
      { $inc: { "stats.likes": -1 } },
    )
    liked = false
  } else {
    await shortLikes.insertOne({
      shortId,
      userId: String(user.sub),
      createdAt: new Date(),
    })
    // First like: increment likes, Mongo will create stats subdocument if missing.
    await shorts.updateOne(
      { _id },
      { $inc: { "stats.likes": 1 } },
    )
    liked = true
  }

  const updated = await shorts.findOne<{ stats?: { likes?: number } }>({ _id })
  let likes = updated?.stats?.likes ?? 0

  // Guard against negative values in case of older data
  if (likes < 0) {
    likes = 0
    await shorts.updateOne({ _id }, { $set: { "stats.likes": 0 } })
  }

  return NextResponse.json({ liked, likes }, { status: 200 })
}



