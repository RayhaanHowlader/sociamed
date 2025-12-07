import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { toUserId } = (await req.json()) as { toUserId?: string }

  if (!toUserId || toUserId === user.sub) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const db = await getDb()
  const profiles = db.collection("profiles")
  const friendRequests = db.collection("friendRequests")
  const friends = db.collection("friends")

  // Check if user's profile is complete
  const userProfile = await profiles.findOne({ userId: user.sub })
  if (!userProfile || !userProfile.name || !userProfile.username) {
    return NextResponse.json({ error: "Please complete your profile to continue" }, { status: 403 })
  }

  const targetProfile = await profiles.findOne({ userId: toUserId })
  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const alreadyFriends = await friends.findOne({ userId: user.sub, friendUserId: toUserId })
  if (alreadyFriends) {
    return NextResponse.json({ error: "You are already friends" }, { status: 400 })
  }

  const existingRequest = await friendRequests.findOne({
    $or: [
      { fromUserId: user.sub, toUserId, status: "pending" },
      { fromUserId: toUserId, toUserId: user.sub, status: "pending" },
    ],
  })

  if (existingRequest) {
    return NextResponse.json({ error: "Friend request already pending" }, { status: 400 })
  }

  const doc = {
    fromUserId: user.sub,
    toUserId,
    status: "pending" as const,
    createdAt: new Date(),
  }

  const result = await friendRequests.insertOne(doc)

  return NextResponse.json({ requestId: result.insertedId, request: doc }, { status: 201 })
}


