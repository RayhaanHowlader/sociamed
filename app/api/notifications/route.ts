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
  const notifications = db.collection("notifications")

  // Get other notifications (group removals, etc.) - only unread ones
  const otherNotifications = await notifications
    .find({ userId: user.sub, read: { $ne: true } })
    .sort({ createdAt: -1 })
    .toArray()

  // Format notifications
  const formattedNotifications = otherNotifications.map((notif) => ({
    id: String(notif._id),
    type: notif.type || "unknown",
    createdAt: notif.createdAt,
    userId: notif.userId,
    groupId: notif.groupId,
    groupName: notif.groupName,
    removedBy: notif.removedBy,
    removedByProfile: notif.removedByProfile || {},
    read: notif.read || false,
  }))

  return NextResponse.json({ notifications: formattedNotifications }, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { notificationIds } = (await req.json()) as { notificationIds?: string[] }

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return NextResponse.json({ error: "notificationIds array is required" }, { status: 400 })
  }

  const db = await getDb()
  const notifications = db.collection("notifications")
  const { ObjectId } = await import("mongodb")

  const objectIds = notificationIds
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter((id): id is NonNullable<typeof id> => id !== null)

  if (objectIds.length === 0) {
    return NextResponse.json({ error: "No valid notification IDs provided" }, { status: 400 })
  }

  await notifications.updateMany(
    { _id: { $in: objectIds }, userId: user.sub },
    { $set: { read: true, readAt: new Date() } }
  )

  return NextResponse.json({ success: true }, { status: 200 })
}

