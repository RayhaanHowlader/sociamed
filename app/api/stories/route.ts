import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

// Initialize TTL index on first request
let ttlIndexCreated = false

async function ensureTTLIndex() {
  if (ttlIndexCreated) return

  try {
    const db = await getDb()
    const stories = db.collection("stories")

    // Try to create the TTL index directly
    // This will create the collection if it doesn't exist
    // If the index already exists, MongoDB will ignore the duplicate
    await stories.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    console.log("TTL index created on stories collection")
    ttlIndexCreated = true
  } catch (error: any) {
    // If collection doesn't exist or index already exists, that's fine
    if (error?.code === 26 || error?.codeName === 'NamespaceNotFound') {
      // Collection doesn't exist yet - it will be created on first insert
      console.log("Stories collection doesn't exist yet, will be created on first story")
    } else if (error?.code === 85 || error?.codeName === 'IndexOptionsConflict') {
      // Index already exists with different options - that's fine
      console.log("TTL index already exists")
    } else {
      console.error("Error creating TTL index:", error)
    }
    ttlIndexCreated = true // Set to true to avoid retrying
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureTTLIndex()

  const db = await getDb()
  const stories = db.collection("stories")
  const friends = db.collection("friends")

  // Get user's friends
  const friendDocs = await friends
    .find({
      $or: [{ userId: user.sub }, { friendId: user.sub }],
      status: "accepted",
    })
    .toArray()

  const friendIds = new Set<string>()
  friendIds.add(String(user.sub)) // Include current user's own stories

  friendDocs.forEach((doc) => {
    if (String(doc.userId) === String(user.sub)) {
      friendIds.add(String(doc.friendId))
    } else {
      friendIds.add(String(doc.userId))
    }
  })

  // Get stories from friends and current user, excluding expired ones
  const now = new Date()
  const items = await stories
    .find({
      userId: { $in: Array.from(friendIds) },
      expiresAt: { $gt: now }, // Only get non-expired stories
    })
    .sort({ createdAt: -1 })
    .toArray()

  // Group stories by user
  const storiesByUser = new Map<string, any[]>()

  items.forEach((story) => {
    const userId = String(story.userId)
    if (!storiesByUser.has(userId)) {
      storiesByUser.set(userId, [])
    }
    storiesByUser.get(userId)!.push({
      _id: String(story._id),
      userId: String(story.userId),
      type: story.type, // "text", "image", or "video"
      content: story.content || "",
      mediaUrl: story.mediaUrl || "",
      mediaPublicId: story.mediaPublicId || "",
      author: story.author,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
    })
  })

  // Convert to array format
  const result = Array.from(storiesByUser.entries()).map(([userId, userStories]) => ({
    userId,
    author: userStories[0].author,
    stories: userStories,
    storyCount: userStories.length,
  }))

  return NextResponse.json({ stories: result }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureTTLIndex()

  const { type, content, mediaUrl, mediaPublicId } = (await req.json()) as {
    type?: "text" | "image" | "video"
    content?: string
    mediaUrl?: string
    mediaPublicId?: string
  }

  if (!type || !["text", "image", "video"].includes(type)) {
    return NextResponse.json({ error: "Invalid story type" }, { status: 400 })
  }

  if (type === "text" && !content?.trim()) {
    return NextResponse.json({ error: "Text content is required for text stories" }, { status: 400 })
  }

  if ((type === "image" || type === "video") && !mediaUrl) {
    return NextResponse.json({ error: "Media URL is required for image/video stories" }, { status: 400 })
  }

  const db = await getDb()
  const profiles = db.collection("profiles")
  const stories = db.collection("stories")

  const profile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: user.sub,
  })

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile before creating stories" }, { status: 403 })
  }

  // Check if user has created a story in the last 24 hours
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const recentStory = await stories.findOne({
    userId: user.sub,
    createdAt: { $gte: twentyFourHoursAgo }, // Created within last 24 hours
  })

  if (recentStory) {
    const timeUntilNext = new Date(recentStory.createdAt.getTime() + 24 * 60 * 60 * 1000)
    const hoursRemaining = Math.ceil((timeUntilNext.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    return NextResponse.json(
      { 
        error: "You can only create one story every 24 hours",
        hoursRemaining,
        nextAvailableAt: timeUntilNext.toISOString(),
      },
      { status: 429 } // 429 Too Many Requests
    )
  }

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

  const doc = {
    userId: user.sub,
    type,
    content: content?.trim() || "",
    mediaUrl: mediaUrl || "",
    mediaPublicId: mediaPublicId || "",
    author: {
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl || "",
    },
    createdAt: now,
    expiresAt, // TTL field
  }

  const result = await stories.insertOne(doc)

  return NextResponse.json(
    {
      story: {
        _id: String(result.insertedId),
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        expiresAt: doc.expiresAt.toISOString(),
      },
    },
    { status: 201 },
  )
}

