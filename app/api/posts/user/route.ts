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

  // If userId is provided, fetch that user's posts, otherwise fetch current user's posts
  const targetUserId = userId || user.sub

  const db = await getDb()
  const posts = db.collection("posts")

  const userPosts = await posts
    .find({ userId: targetUserId })
    .sort({ createdAt: -1 })
    .toArray()

  return NextResponse.json({ posts: userPosts }, { status: 200 })
}

