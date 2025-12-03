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
  const friendRequests = db.collection("friendRequests")
  const profiles = db.collection("profiles")

  const requests = await friendRequests
    .find({ toUserId: user.sub, status: "pending" })
    .sort({ createdAt: -1 })
    .toArray()

  const fromIds = requests.map((r) => r.fromUserId)
  const fromProfiles = await profiles
    .find({ userId: { $in: fromIds } })
    .project<{ userId: string; name: string; username: string; avatarUrl?: string }>({
      userId: 1,
      name: 1,
      username: 1,
      avatarUrl: 1,
    })
    .toArray()

  const items = requests.map((r) => {
    const p = fromProfiles.find((fp) => fp.userId === r.fromUserId)
    return {
      id: r._id,
      fromUserId: r.fromUserId,
      createdAt: r.createdAt,
      profile: {
        name: p?.name ?? "Unknown",
        username: p?.username ?? "",
        avatarUrl: p?.avatarUrl ?? "",
      },
    }
  })

  return NextResponse.json({ requests: items }, { status: 200 })
}


