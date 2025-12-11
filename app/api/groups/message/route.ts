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

  const { groupId, content, fileUrl, fileName, mimeType, isImage, filePublicId } = (await req.json()) as {
    groupId?: string
    content?: string
    fileUrl?: string
    fileName?: string
    mimeType?: string
    isImage?: boolean
    filePublicId?: string
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
    filePublicId: filePublicId ?? "",
    isImage: !!isImage,
    createdAt,
    deleted: false,
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

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { groupId, messageIds } = (await req.json()) as { groupId?: string; messageIds?: string[] }

  if (!groupId || !messageIds || messageIds.length === 0) {
    return NextResponse.json({ error: "groupId and messageIds are required" }, { status: 400 })
  }

  const db = await getDb()
  const groups = db.collection("groups")
  const messages = db.collection("groupMessages")

  const group = await groups.findOne<{ ownerId?: string; memberIds?: string[] }>({
    _id: new ObjectId(groupId),
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const currentUserId = String(user.sub)
  const isOwner = group.ownerId === currentUserId
  const isMember = (group.memberIds ?? []).includes(currentUserId)

  if (!isMember && !isOwner) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
  }

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

  // Allow sender to delete own messages; owner can delete any
  const filter = isOwner
    ? { _id: { $in: ids }, groupId }
    : { _id: { $in: ids }, groupId, fromUserId: currentUserId }

  const toDelete = await messages
    .find(filter)
    .project<{ _id: ObjectId; filePublicId?: string; mimeType?: string; isImage?: boolean }>({
      filePublicId: 1,
      mimeType: 1,
      isImage: 1,
    })
    .toArray()

  await Promise.all(
    toDelete.map(async (m) => {
      if (!m.filePublicId) return
      const resourceType = m.isImage ? "image" : (m.mimeType || "").startsWith("video/") ? "video" : "raw"
      try {
        await cloudinary.uploader.destroy(m.filePublicId, { resource_type: resourceType })
      } catch (err) {
        console.error("Cloudinary destroy failed for group message", m.filePublicId, err)
      }
    }),
  )

  const result = await messages.updateMany(filter, {
    $set: {
      deleted: true,
      deletedBy: currentUserId,
      deletedAt: new Date(),
      content: "",
      fileUrl: "",
      fileName: "",
      mimeType: "",
      isImage: false,
      filePublicId: "",
    },
  })

  return NextResponse.json({ success: true, modified: result.modifiedCount }, { status: 200 })
}


