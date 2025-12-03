import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { toUserId, content, fileUrl, fileName, mimeType, isImage } = (await req.json()) as {
    toUserId?: string
    content?: string
    fileUrl?: string
    fileName?: string
    mimeType?: string
    isImage?: boolean
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
    createdAt,
  }

  const result = await chatMessages.insertOne(doc)

  return NextResponse.json({ message: { ...doc, _id: result.insertedId } }, { status: 201 })
}


