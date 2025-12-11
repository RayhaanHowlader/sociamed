import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: {
    userId: string
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const friendUserId = params.userId

  if (!friendUserId || friendUserId === user.sub) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const db = await getDb()
  const friends = db.collection("friends")
  const groups = db.collection("groups")

  // Check if they are friends
  const friendship1 = await friends.findOne({
    userId: user.sub,
    friendUserId: friendUserId,
  })

  const friendship2 = await friends.findOne({
    userId: friendUserId,
    friendUserId: user.sub,
  })

  if (!friendship1 && !friendship2) {
    return NextResponse.json({ error: "You are not friends with this user" }, { status: 400 })
  }

  // Remove both friendship records
  await friends.deleteMany({
    $or: [
      { userId: user.sub, friendUserId: friendUserId },
      { userId: friendUserId, friendUserId: user.sub },
    ],
  })

  // Remove from groups where both users are members
  // Find all groups where both users are members
  const userGroups = await groups
    .find({
      memberIds: { $all: [String(user.sub), friendUserId] },
    })
    .toArray()

  for (const group of userGroups) {
    const memberIds = group.memberIds || []
    const isCurrentUserOwner = group.ownerId === String(user.sub)
    const isFriendOwner = group.ownerId === friendUserId

    if (memberIds.includes(String(user.sub)) && memberIds.includes(friendUserId)) {
      // If current user is owner, remove friend from group
      if (isCurrentUserOwner) {
        await groups.updateOne(
          { _id: group._id },
          { $pull: { memberIds: friendUserId } } as any
        )
      }
      // If friend is owner, remove current user from group
      else if (isFriendOwner) {
        await groups.updateOne(
          { _id: group._id },
          { $pull: { memberIds: String(user.sub) } } as any
        )
      }
      // If neither is owner, remove both from the group
      else {
        await groups.updateOne(
          { _id: group._id },
          { $pull: { memberIds: { $in: [String(user.sub), friendUserId] } } } as any
        )
      }
    }
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

