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
  const friends = db.collection("friends")
  const profiles = db.collection("profiles")

  const friendDocs = await friends
    .find({ userId: user.sub })
    .project<{ friendUserId: string; createdAt: Date }>({ friendUserId: 1, createdAt: 1 })
    .toArray()

  const friendIds = friendDocs.map((f) => f.friendUserId)
  if (friendIds.length === 0) {
    return NextResponse.json({ friends: [] }, { status: 200 })
  }

  const profileDocs = await profiles
    .find({ userId: { $in: friendIds } })
    .project<{ userId: string; name: string; username: string; avatarUrl?: string }>({
      userId: 1,
      name: 1,
      username: 1,
      avatarUrl: 1,
    })
    .toArray()

  const items = friendDocs.map((f) => {
    const p = profileDocs.find((p) => p.userId === f.friendUserId)
    return {
      userId: f.friendUserId,
      since: f.createdAt,
      name: p?.name ?? "Unknown",
      username: p?.username ?? "",
      avatarUrl: p?.avatarUrl ?? "",
    }
  })

  return NextResponse.json({ friends: items }, { status: 200 })
}


