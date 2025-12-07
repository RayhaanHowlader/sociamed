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
  const friendId = searchParams.get("friendId")
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const before = searchParams.get("before") // ISO timestamp string

  if (!friendId) {
    return NextResponse.json({ error: "friendId is required" }, { status: 400 })
  }

  const db = await getDb()
  const chatMessages = db.collection("chatMessages")

  // Build query - get messages before a certain timestamp if provided
  const query: any = {
    $or: [
      { fromUserId: String(user.sub), toUserId: friendId },
      { fromUserId: friendId, toUserId: String(user.sub) },
    ],
  }

  // If before timestamp is provided, only get messages before that time
  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  // Get latest messages first (newest to oldest), then we'll reverse for display
  const cursor = chatMessages
    .find(query)
    .sort({ createdAt: -1 }) // newest first for pagination
    .limit(limit)

  const items = await cursor.toArray()

  // Reverse to show oldest first in UI (chronological order)
  const messages = items
    .reverse()
    .map((m) => ({
      id: String(m._id),
      fromUserId: m.fromUserId,
      toUserId: m.toUserId,
      content: m.content,
      fileUrl: m.fileUrl || "",
      fileName: m.fileName || "",
      mimeType: m.mimeType || "",
      isImage: Boolean(m.isImage),
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      status: "seen" as const,
    }))

  // Check if there are more messages to load
  const hasMore = items.length === limit

  return NextResponse.json({ messages, hasMore }, { status: 200 })
}


