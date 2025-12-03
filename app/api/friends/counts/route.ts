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

  // Each friendship is stored in both directions, so the number of
  // "friends" for this user is simply the count of documents where
  // userId === current user.
  const count = await friends.countDocuments({ userId: String(user.sub) })

  return NextResponse.json(
    {
      followers: count,
      following: count,
    },
    { status: 200 },
  )
}


