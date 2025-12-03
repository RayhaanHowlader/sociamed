import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const groups = db.collection("groups")

  const items = await groups
    .find({ memberIds: String(user.sub) })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()

  return NextResponse.json({ groups: items }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, icon, memberIds } = (await req.json()) as {
    name?: string
    icon?: string
    memberIds?: string[]
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 })
  }

  const finalIcon = icon && icon.trim() ? icon.trim() : "💬"

  const uniqueMemberIds = new Set<string>()
  uniqueMemberIds.add(String(user.sub))
  ;(memberIds ?? []).forEach((id) => {
    if (id) uniqueMemberIds.add(String(id))
  })

  const db = await getDb()
  const groups = db.collection("groups")

  const doc = {
    name: name.trim(),
    icon: finalIcon,
    ownerId: String(user.sub),
    memberIds: Array.from(uniqueMemberIds),
    createdAt: new Date(),
    lastMessage: "",
    lastActivityAt: new Date(),
    isPrivate: false,
    // Permissions: by default only owner can edit & add; these can be relaxed later
    allowMemberEdit: false,
    allowMemberInvite: false,
  }

  const result = await groups.insertOne(doc)

  return NextResponse.json({ group: { ...doc, _id: result.insertedId } }, { status: 201 })
}



