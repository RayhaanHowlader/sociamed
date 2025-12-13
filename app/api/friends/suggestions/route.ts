import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = getUserFromRequest(request as any)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '5')
  const search = url.searchParams.get('search') || ''
  const skip = (page - 1) * limit

  const db = await getDb()
  const users = db.collection("users")
  const profiles = db.collection("profiles")
  const friends = db.collection("friends")
  const friendRequests = db.collection("friendRequests")

  // Check if user's profile is complete
  const userProfile = await profiles.findOne({ userId: user.sub })
  if (!userProfile || !userProfile.name || !userProfile.username) {
    return NextResponse.json({ 
      error: "Please complete your profile to continue", 
      suggestions: [],
      hasMore: false,
      total: 0
    }, { status: 403 })
  }

  // Build search filter for profiles
  let profileFilter: any = { 
    userId: { $ne: user.sub }, // Exclude current user
    name: { $exists: true, $ne: null },
    username: { $exists: true, $ne: null }
  }

  if (search.trim()) {
    profileFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ]
  }

  // Get total count for pagination
  const totalCount = await profiles.countDocuments(profileFilter)

  // Get profiles with pagination
  const profileDocs = await profiles
    .find(profileFilter)
    .project<{ userId: string; name?: string; username?: string; avatarUrl?: string; location?: string }>({
      userId: 1,
      name: 1,
      username: 1,
      avatarUrl: 1,
      location: 1,
    })
    .skip(skip)
    .limit(limit)
    .toArray()

  const userIds = profileDocs.map(p => p.userId)

  // Get friend relationships
  const friendPairs = await friends
    .find({ userId: user.sub })
    .project<{ friendUserId: string }>({ friendUserId: 1, _id: 0 })
    .toArray()
  const friendIds = new Set(friendPairs.map((f) => f.friendUserId))

  // Get pending requests
  const pendingRequests = await friendRequests
    .find({
      $or: [
        { fromUserId: user.sub, toUserId: { $in: userIds }, status: "pending" },
        { toUserId: user.sub, fromUserId: { $in: userIds }, status: "pending" },
      ],
    })
    .toArray()

  const suggestions = profileDocs
    .map((profile) => {
      const userId = profile.userId

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

  const hasMore = skip + limit < totalCount

  return NextResponse.json({ 
    suggestions, 
    hasMore,
    total: totalCount,
    page,
    limit
  }, { status: 200 })
}



