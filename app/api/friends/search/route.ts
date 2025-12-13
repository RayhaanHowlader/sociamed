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

  try {
    const db = await getDb()
    const friends = db.collection("friends")
    const profiles = db.collection("profiles")

    // Get user's friends
    const friendPairs = await friends
      .find({ userId: user.sub })
      .project<{ friendUserId: string }>({ friendUserId: 1, _id: 0 })
      .toArray()
    
    const friendIds = friendPairs.map(f => f.friendUserId)

    if (friendIds.length === 0) {
      return NextResponse.json({ 
        friends: [],
        hasMore: false,
        total: 0,
        page,
        limit
      }, { status: 200 })
    }

    // Build search filter for friend profiles
    let profileFilter: any = { 
      userId: { $in: friendIds },
      name: { $exists: true, $ne: null },
      username: { $exists: true, $ne: null }
    }

    if (search.trim()) {
      profileFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ]
    }

    // Get total count for pagination
    const totalCount = await profiles.countDocuments(profileFilter)

    // Get friend profiles with pagination
    const friendProfiles = await profiles
      .find(profileFilter)
      .project<{ userId: string; name?: string; username?: string; avatarUrl?: string }>({
        userId: 1,
        name: 1,
        username: 1,
        avatarUrl: 1,
      })
      .skip(skip)
      .limit(limit)
      .toArray()

    const formattedFriends = friendProfiles.map(profile => ({
      userId: profile.userId,
      name: profile.name || 'User',
      username: profile.username || '',
      avatarUrl: profile.avatarUrl || '',
    }))

    const hasMore = skip + limit < totalCount

    return NextResponse.json({ 
      friends: formattedFriends, 
      hasMore,
      total: totalCount,
      page,
      limit
    }, { status: 200 })
  } catch (err) {
    console.error('Friends search error:', err)
    return NextResponse.json({ error: "Failed to search friends" }, { status: 500 })
  }
}