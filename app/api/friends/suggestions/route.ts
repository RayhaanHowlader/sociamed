import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = getUserFromRequest(request as any)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const users = db.collection("users")
  const profiles = db.collection("profiles")
  const friends = db.collection("friends")
  const friendRequests = db.collection("friendRequests")

  // All registered users except the current one
  const userDocs = await users
    .find({ email: { $exists: true } })
    .project<{ _id: string; email: string }>({ _id: 1, email: 1 })
    .toArray()

  const userIds = userDocs.map((u) => String(u._id))

  const profileDocs = await profiles
    .find({ userId: { $in: userIds } })
    .project<{ userId: string; name?: string; username?: string; avatarUrl?: string; location?: string }>({
      userId: 1,
      name: 1,
      username: 1,
      avatarUrl: 1,
      location: 1,
    })
    .toArray()

  const friendPairs = await friends
    .find({ userId: user.sub })
    .project<{ friendUserId: string }>({ friendUserId: 1, _id: 0 })
    .toArray()
  const friendIds = new Set(friendPairs.map((f) => f.friendUserId))

  const pendingRequests = await friendRequests
    .find({
      $or: [
        { fromUserId: user.sub, toUserId: { $in: userIds }, status: "pending" },
        { toUserId: user.sub, fromUserId: { $in: userIds }, status: "pending" },
      ],
    })
    .toArray()

  const suggestions = userDocs
    .map((u) => {
      const userId = String(u._id)

      // Skip the current user – we don't want to suggest ourselves
      if (userId === String(user.sub)) {
        return null
      }

      // Only include people who have completed a profile
      const profile = profileDocs.find((p) => p.userId === userId)
      if (!profile) {
        return null
      }

      let status: "none" | "friends" | "outgoing" | "incoming" = "none"
      if (friendIds.has(userId)) {
        status = "friends"
      } else {
        const req = pendingRequests.find(
          (r) =>
            (r.fromUserId === user.sub && r.toUserId === userId) ||
            (r.toUserId === user.sub && r.fromUserId === userId),
        )
        if (req) {
          status = req.fromUserId === user.sub ? "outgoing" : "incoming"
        }
      }

      return {
        userId,
        name: profile.name,
        username: profile.username,
        avatarUrl: profile.avatarUrl ?? "",
        location: profile.location ?? "",
        status,
      }
    })
    .filter(Boolean)

  return NextResponse.json({ suggestions }, { status: 200 })
}



