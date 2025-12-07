import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const after = searchParams.get("after") // ISO timestamp string

  const db = await getDb()
  const notes = db.collection("notes")
  const friends = db.collection("friends")

  // Get user's friends
  // Friends are stored as: { userId: user.sub, friendUserId: friend.sub }
  // We need to check both directions since friendship is bidirectional
  const friendDocs = await friends
    .find({
      $or: [{ userId: String(user.sub) }, { friendUserId: String(user.sub) }],
    })
    .toArray()

  const friendIds = new Set<string>()
  friendIds.add(String(user.sub)) // Include current user's own notes

  friendDocs.forEach((doc) => {
    const docUserId = String(doc.userId)
    const docFriendUserId = String(doc.friendUserId)
    const currentUserId = String(user.sub)

    if (docUserId === currentUserId) {
      // User is the requester, friend is friendUserId
      friendIds.add(docFriendUserId)
    } else if (docFriendUserId === currentUserId) {
      // User is the friend, requester is userId
      friendIds.add(docUserId)
    }
  })

  // Build query - get notes after a certain timestamp if provided
  const query: any = {
    userId: { $in: Array.from(friendIds) },
  }

  // If after timestamp is provided, only get notes after that time
  if (after) {
    query.createdAt = { $lt: new Date(after) }
  }

  // Get notes from friends and current user
  const items = await notes
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  // Check if there are more notes to load
  const hasMore = items.length === limit

  const result = items.map((note) => ({
    _id: String(note._id),
    userId: String(note.userId),
    text: note.text || "",
    musicUrl: note.musicUrl || "",
    musicTitle: note.musicTitle || "",
    author: note.author,
    createdAt: note.createdAt.toISOString(),
  }))

  return NextResponse.json({ notes: result, hasMore }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text, musicUrl, musicTitle } = (await req.json()) as {
    text?: string
    musicUrl?: string
    musicTitle?: string
  }

  if (!text?.trim() && !musicUrl) {
    return NextResponse.json(
      { error: "Please add text or music to your note" },
      { status: 400 }
    )
  }

  const db = await getDb()
  const profiles = db.collection("profiles")
  const notes = db.collection("notes")

  const profile = await profiles.findOne<{ name: string; username: string; avatarUrl?: string }>({
    userId: user.sub,
  })

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile before creating notes" }, { status: 403 })
  }

  const now = new Date()

  const doc = {
    userId: user.sub,
    text: text?.trim() || "",
    musicUrl: musicUrl || "",
    musicTitle: musicTitle || "",
    author: {
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl || "",
    },
    createdAt: now,
  }

  const result = await notes.insertOne(doc)

  return NextResponse.json(
    {
      note: {
        _id: String(result.insertedId),
        ...doc,
        createdAt: doc.createdAt.toISOString(),
      },
    },
    { status: 201 },
  )
}

