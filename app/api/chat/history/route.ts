import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"

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
  const chatHistory = db.collection("chat_history")

  // Build query - handle both string and ObjectId formats
  const userIdStr = String(user.sub);
  const friendIdStr = String(friendId);
  
  // Try to convert to ObjectId if they're valid ObjectId strings
  let userIdObj, friendIdObj;
  try {
    userIdObj = new ObjectId(userIdStr);
    friendIdObj = new ObjectId(friendIdStr);
  } catch {
    // If conversion fails, use strings
    userIdObj = userIdStr;
    friendIdObj = friendIdStr;
  }

  const query: any = {
    $or: [
      // String format (for chatMessages collection)
      { fromUserId: userIdStr, toUserId: friendIdStr },
      { fromUserId: friendIdStr, toUserId: userIdStr },
      // ObjectId format (for chat_history collection)
      { fromUserId: userIdObj, toUserId: friendIdObj },
      { fromUserId: friendIdObj, toUserId: userIdObj },
    ],
  }

  // If before timestamp is provided, only get messages before that time
  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  // Debug: Log the query
  console.log('Chat history query:', JSON.stringify(query), 'friendId:', friendId, 'userId:', user.sub);

  // Get messages from both collections
  const [chatMessagesItems, chatHistoryItems] = await Promise.all([
    chatMessages
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
    chatHistory
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
  ])

  console.log('Found messages - chatMessages:', chatMessagesItems.length, 'chatHistory:', chatHistoryItems.length);

  // Combine and deduplicate messages by ID, then sort by creation time
  const messageMap = new Map();
  
  // Add messages from both collections, with chatMessages taking precedence
  [...chatHistoryItems, ...chatMessagesItems].forEach(item => {
    const id = String(item._id);
    if (!messageMap.has(id)) {
      messageMap.set(id, item);
    }
  });
  
  const allItems = Array.from(messageMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  const items = allItems

  // Reverse to show oldest first in UI (chronological order)
  const messages = items
    .reverse()
    .map((m) => ({
      id: String(m._id),
      fromUserId: String(m.fromUserId),
      toUserId: String(m.toUserId),
      content: m.deleted ? "" : (m.content || ""),
      fileUrl: m.deleted ? "" : (m.fileUrl || ""),
      fileName: m.deleted ? "" : (m.fileName || ""),
      mimeType: m.deleted ? "" : (m.mimeType || ""),
      isImage: m.deleted ? false : Boolean(m.isImage),
      filePublicId: m.deleted ? "" : (m.filePublicId || ""),
      deleted: Boolean(m.deleted),
      type: m.deleted ? undefined : m.type,
      sharedPostId: m.deleted ? undefined : m.sharedPostId ? String(m.sharedPostId) : undefined,
      sharedPostData: m.deleted ? undefined : m.sharedPostData,
      sharedShort: m.deleted ? undefined : m.sharedShort,
      sharedBy: m.deleted ? undefined : m.sharedBy,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      status: "seen" as const,
    }))

  // Check if there are more messages to load
  const hasMore = items.length === limit

  return NextResponse.json({ messages, hasMore }, { status: 200 })
}


