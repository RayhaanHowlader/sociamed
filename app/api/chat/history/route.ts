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

  if (!friendId) {
    return NextResponse.json({ error: "friendId is required" }, { status: 400 })
  }

  const db = await getDb()
  const chatMessages = db.collection("chatMessages")

  const cursor = chatMessages
    .find({
      $or: [
        { fromUserId: String(user.sub), toUserId: friendId },
        { fromUserId: friendId, toUserId: String(user.sub) },
      ],
    })
    .sort({ createdAt: 1 }) // oldest first so UI shows chronological order

  const items = await cursor.toArray()

  const messages = items.map((m) => ({
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

  return NextResponse.json({ messages }, { status: 200 })
}


