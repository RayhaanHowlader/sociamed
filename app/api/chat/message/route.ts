import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import cloudinary from "@/lib/cloudinary"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { toUserId, content, fileUrl, fileName, mimeType, isImage, filePublicId } = (await req.json()) as {
    toUserId?: string
    content?: string
    fileUrl?: string
    fileName?: string
    mimeType?: string
    isImage?: boolean
    filePublicId?: string
  }

  if (!toUserId) {
    return NextResponse.json({ error: "Missing recipient" }, { status: 400 })
  }

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 })
  }

  const db = await getDb()
  const chatMessages = db.collection("chatMessages")

  const createdAt = new Date()

  const doc = {
    fromUserId: String(user.sub),
    toUserId,
    content: content ?? "",
    fileUrl: fileUrl ?? "",
    fileName: fileName ?? "",
    mimeType: mimeType ?? "",
    isImage: Boolean(isImage),
    filePublicId: filePublicId ?? "",
    createdAt,
    deleted: false,
  }

  const result = await chatMessages.insertOne(doc)

  return NextResponse.json({ message: { ...doc, _id: result.insertedId } }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageIds } = (await req.json()) as { messageIds?: string[] }

  if (!messageIds || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds is required" }, { status: 400 })
  }

  const db = await getDb()
  const chatMessages = db.collection("chatMessages")

  const ids = messageIds
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter(Boolean) as ObjectId[]

  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid message ids" }, { status: 400 })
  }

  // Fetch messages to delete for cleanup
  const toDelete = await chatMessages
    .find({ _id: { $in: ids }, fromUserId: String(user.sub) })
    .project<{ _id: ObjectId; filePublicId?: string; mimeType?: string; isImage?: boolean }>({
      filePublicId: 1,
      mimeType: 1,
      isImage: 1,
    })
    .toArray()

  // Delete assets from Cloudinary if present
  await Promise.all(
    toDelete.map(async (m) => {
      if (!m.filePublicId) return
      const resourceType = m.isImage ? "image" : (m.mimeType || "").startsWith("video/") ? "video" : "raw"
      try {
        await cloudinary.uploader.destroy(m.filePublicId, { resource_type: resourceType })
      } catch (err) {
        console.error("Cloudinary destroy failed for chat message", m.filePublicId, err)
      }
    }),
  )

  // Soft delete in DB
  const result = await chatMessages.updateMany(
    { _id: { $in: ids }, fromUserId: String(user.sub) },
    {
      $set: {
        deleted: true,
        deletedBy: String(user.sub),
        deletedAt: new Date(),
        content: "",
        fileUrl: "",
        fileName: "",
        mimeType: "",
        isImage: false,
        filePublicId: "",
      },
    },
  )

  return NextResponse.json({ success: true, modified: result.modifiedCount }, { status: 200 })
}


