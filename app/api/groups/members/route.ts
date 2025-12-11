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

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get("groupId")
  const memberId = searchParams.get("memberId")

  if (!groupId || !memberId) {
    return NextResponse.json({ error: "groupId and memberId are required" }, { status: 400 })
  }

  const db = await getDb()
  const groups = db.collection("groups")
  const profiles = db.collection("profiles")
  const notifications = db.collection("notifications")

  const group = await groups.findOne<{ ownerId?: string; memberIds?: string[]; name?: string }>({
    _id: new ObjectId(groupId),
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  // Check if user is the admin/owner
  if (group.ownerId !== user.sub) {
    return NextResponse.json({ error: "Only group admin can remove members" }, { status: 403 })
  }

  // Cannot remove yourself
  if (memberId === user.sub) {
    return NextResponse.json({ error: "Cannot remove yourself from the group" }, { status: 400 })
  }

  // Check if member is in the group
  const memberIds = group.memberIds ?? []
  if (!memberIds.includes(memberId)) {
    return NextResponse.json({ error: "Member not found in group" }, { status: 404 })
  }

  // Remove member from group
  await groups.updateOne(
    { _id: new ObjectId(groupId) },
    { $pull: { memberIds: memberId } } as any
  )

  // Get admin profile for notification
  const adminProfile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: user.sub,
  })

  // Get removed member profile
  const removedMemberProfile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: memberId,
  })

  // Create notification for removed member
  const notificationDoc = {
    userId: memberId,
    type: "group_removed",
    groupId: String(groupId),
    groupName: group.name || "Group",
    removedBy: user.sub,
    removedByProfile: {
      name: adminProfile?.name || "Admin",
      username: adminProfile?.username || "",
      avatarUrl: adminProfile?.avatarUrl || "",
    },
    createdAt: new Date(),
    read: false,
  }

  const notificationResult = await notifications.insertOne(notificationDoc)

  return NextResponse.json(
    {
      success: true,
      notification: {
        id: String(notificationResult.insertedId),
        ...notificationDoc,
        createdAt: notificationDoc.createdAt.toISOString(),
      },
    },
    { status: 200 }
  )
}



