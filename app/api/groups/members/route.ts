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

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 })
  }

  const db = await getDb()
  const groups = db.collection("groups")
  const profiles = db.collection("profiles")

  const group = await groups.findOne<{ memberIds?: string[] }>({ _id: new ObjectId(groupId) })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const memberIds = group.memberIds ?? []
  if (memberIds.length === 0) {
    return NextResponse.json({ members: [] }, { status: 200 })
  }

  const memberProfiles = await profiles
    .find({ userId: { $in: memberIds } })
    .project<{ userId: string; name: string; username: string; avatarUrl?: string }>({
      userId: 1,
      name: 1,
      username: 1,
      avatarUrl: 1,
    })
    .toArray()

  const items = memberIds.map((id) => {
    const p = memberProfiles.find((m) => m.userId === id)
    return {
      userId: id,
      name: p?.name ?? "Member",
      username: p?.username ?? "",
      avatarUrl: p?.avatarUrl ?? "",
    }
  })

  return NextResponse.json({ members: items }, { status: 200 })
}



