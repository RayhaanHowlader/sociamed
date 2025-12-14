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
  const groupId = searchParams.get("groupId")
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const before = searchParams.get("before") // ISO timestamp string

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 })
  }

  const db = await getDb()
  const messages = db.collection("groupMessages")

  // Build query - get messages before a certain timestamp if provided
  const query: any = { groupId }

  // If before timestamp is provided, only get messages before that time
  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  // Get latest messages first (newest to oldest), then we'll reverse for display
  const docs = await messages
    .find(query)
    .sort({ createdAt: -1 }) // newest first for pagination
    .limit(limit)
    .toArray()

  // Get poll data for poll messages
  const polls = db.collection("polls")
  const pollIds = docs.filter(m => m.type === 'poll' && m.pollId).map(m => m.pollId)
  const pollData = pollIds.length > 0 ? await polls.find({ 
    _id: { $in: pollIds.map(id => typeof id === 'string' ? new ObjectId(id) : id) }
  }).toArray() : []
  
  const pollMap = new Map(pollData.map(poll => [poll._id.toString(), poll]))

  // Reverse to show oldest first in UI (chronological order)
  const items = docs
    .reverse()
    .map((m) => ({
      id: String(m._id),
      groupId: m.groupId,
      fromUserId: m.fromUserId,
      content: m.deleted ? "" : m.content,
      fileUrl: m.deleted ? "" : m.fileUrl || "",
      fileName: m.deleted ? "" : m.fileName || "",
      mimeType: m.deleted ? "" : m.mimeType || "",
      isImage: m.deleted ? false : !!m.isImage,
      filePublicId: m.deleted ? "" : m.filePublicId || "",
      deletedBy: m.deletedBy ? String(m.deletedBy) : "",
      deleted: Boolean(m.deleted),
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      type: m.type || 'text',
      pollId: m.pollId || null,
      poll: m.type === 'poll' && m.pollId ? pollMap.get(String(m.pollId)) : null,
    }))

  // Check if there are more messages to load
  const hasMore = docs.length === limit

  return NextResponse.json({ messages: items, hasMore }, { status: 200 })
}



