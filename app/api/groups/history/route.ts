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
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 })
  }

  const db = await getDb()
  const messages = db.collection("groupMessages")

  const docs = await messages
    .find({ groupId })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray()

  const items = docs.map((m) => ({
    id: String(m._id),
    groupId: m.groupId,
    fromUserId: m.fromUserId,
    content: m.content,
    fileUrl: m.fileUrl || "",
    fileName: m.fileName || "",
    mimeType: m.mimeType || "",
    isImage: !!m.isImage,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  }))

  return NextResponse.json({ messages: items }, { status: 200 })
}



