import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = (await req.json()) as { action?: "accept" | "decline" }

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 })
  }

  const db = await getDb()
  const friendRequests = db.collection("friendRequests")
  const friends = db.collection("friends")

  const _id = new ObjectId(params.id)
  const requestDoc = await friendRequests.findOne<{ fromUserId: string; toUserId: string; status: string }>({
    _id,
  })

  if (!requestDoc || requestDoc.toUserId !== user.sub || requestDoc.status !== "pending") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  if (action === "decline") {
    await friendRequests.updateOne({ _id }, { $set: { status: "declined", updatedAt: new Date() } })
    return NextResponse.json({ success: true }, { status: 200 })
  }

  await friendRequests.updateOne({ _id }, { $set: { status: "accepted", updatedAt: new Date() } })

  const now = new Date()
  await friends.insertMany([
    { userId: requestDoc.fromUserId, friendUserId: requestDoc.toUserId, createdAt: now },
    { userId: requestDoc.toUserId, friendUserId: requestDoc.fromUserId, createdAt: now },
  ])

  return NextResponse.json({ success: true }, { status: 200 })
}


