import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const db = await getDb()
  const posts = db.collection("posts")

  const items = await posts
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({ posts: items }, { status: 200 })
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



