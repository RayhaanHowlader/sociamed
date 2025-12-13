import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = getUserFromRequest(request as any)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const groupId = url.searchParams.get('groupId')

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    const db = await getDb()
    const groups = db.collection("groups")
    const groupMessages = db.collection("groupMessages")

    // Verify user is a member of the group
    const group = await groups.findOne({
      _id: new ObjectId(groupId),
      memberIds: user.sub
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 })
    }

    // Get all messages with files from the group
    const messages = await groupMessages
      .find({
        groupId: groupId,
        deleted: { $ne: true },
        fileUrl: { 
          $exists: true, 
          $nin: [null, ''] 
        }
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    const formattedMessages = messages.map(msg => ({
      id: String(msg._id),
      groupId: msg.groupId,
      fromUserId: msg.fromUserId,
      content: msg.content || '',
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      mimeType: msg.mimeType,
      isImage: msg.isImage || false,
      createdAt: msg.createdAt
    }))

    return NextResponse.json({ messages: formattedMessages }, { status: 200 })
  } catch (err) {
    console.error('Group media error:', err)
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 })
  }
}