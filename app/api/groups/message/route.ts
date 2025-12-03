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

  const { groupId, content, fileUrl, fileName, mimeType, isImage } = (await req.json()) as {
    groupId?: string
    content?: string
    fileUrl?: string
    fileName?: string
    mimeType?: string
    isImage?: boolean
  }

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 })
  }

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
  }

  const db = await getDb()
  const groups = db.collection("groups")
  const messages = db.collection("groupMessages")

  const group = await groups.findOne<{ _id: ObjectId }>({ _id: new ObjectId(groupId) })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const createdAt = new Date()
  const doc = {
    groupId: String(groupId),
    fromUserId: String(user.sub),
    content: content?.trim() ?? "",
    fileUrl: fileUrl ?? "",
    fileName: fileName ?? "",
    mimeType: mimeType ?? "",
    isImage: !!isImage,
    createdAt,
  }

  const result = await messages.insertOne(doc)

  await groups.updateOne(
    { _id: new ObjectId(groupId) },
    {
      $set: {
        lastMessage: content?.trim() || (isImage ? "Sent a photo" : "Sent an attachment"),
        lastActivityAt: createdAt,
      },
    },
  )

  return NextResponse.json(
    {
      message: {
        id: String(result.insertedId),
        ...doc,
        createdAt: createdAt.toISOString(),
      },
    },
    { status: 201 },
  )
}


