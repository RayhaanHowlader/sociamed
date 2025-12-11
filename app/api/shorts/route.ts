import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"
import cloudinary from "@/lib/cloudinary"

export const dynamic = "force-dynamic"

export async function GET() {
  const db = await getDb()
  const shorts = db.collection("shorts")

  const items = await shorts
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({ shorts: items }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { caption, videoUrl, videoPublicId, duration } = (await req.json()) as {
    caption?: string
    videoUrl?: string
    videoPublicId?: string
    duration?: number
  }

  if (!videoUrl || !videoPublicId) {
    return NextResponse.json({ error: "Video upload missing" }, { status: 400 })
  }

  if (typeof duration !== "number" || duration > 60) {
    return NextResponse.json({ error: "Video must be 60 seconds or shorter" }, { status: 400 })
  }

  const db = await getDb()
  const profiles = db.collection("profiles")
  const shorts = db.collection("shorts")

  const profile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: user.sub,
  })

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile before posting shorts" }, { status: 403 })
  }

  const doc = {
    userId: user.sub,
    caption: caption?.trim() ?? "",
    videoUrl,
    videoPublicId,
    duration,
    createdAt: new Date(),
    author: {
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl || "",
    },
    stats: {
      likes: 0,
      comments: 0,
    },
  }

  const result = await shorts.insertOne(doc)

  return NextResponse.json({ short: { ...doc, _id: result.insertedId } }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
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
  const commentsCol = db.collection("shortComments")

  let _id: ObjectId
  try {
    _id = new ObjectId(shortId)
  } catch {
    return NextResponse.json({ error: "Invalid short id" }, { status: 400 })
  }

  const short = await shorts.findOne<{ userId: string; videoPublicId?: string }>({ _id })

  if (!short) {
    return NextResponse.json({ error: "Short not found" }, { status: 404 })
  }

  if (short.userId !== user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete video from Cloudinary
  if (short.videoPublicId && cloudinary.config().cloud_name) {
    try {
      await cloudinary.uploader.destroy(short.videoPublicId, { resource_type: "video" })
    } catch (error) {
      console.error("Error deleting Cloudinary video:", error)
    }
  }

  // Delete associated comments
  await commentsCol.deleteMany({ shortId: shortId })

  // Delete the short
  await shorts.deleteOne({ _id })

  return NextResponse.json({ success: true }, { status: 200 })
}

