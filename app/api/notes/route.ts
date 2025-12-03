import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const notes = db.collection("notes")
  const friends = db.collection("friends")

  // Get user's friends
  const friendDocs = await friends
    .find({
      $or: [{ userId: user.sub }, { friendId: user.sub }],
      status: "accepted",
    })
    .toArray()

  const friendIds = new Set<string>()
  friendIds.add(String(user.sub)) // Include current user's own notes

  friendDocs.forEach((doc) => {
    if (String(doc.userId) === String(user.sub)) {
      friendIds.add(String(doc.friendId))
    } else {
      friendIds.add(String(doc.userId))
    }
  })

  // Get notes from friends and current user
  const items = await notes
    .find({
      userId: { $in: Array.from(friendIds) },
    })
    .sort({ createdAt: -1 })
    .limit(50) // Limit to recent 50 notes
    .toArray()

  const result = items.map((note) => ({
    _id: String(note._id),
    userId: String(note.userId),
    text: note.text || "",
    musicUrl: note.musicUrl || "",
    musicTitle: note.musicTitle || "",
    author: note.author,
    createdAt: note.createdAt.toISOString(),
  }))

  return NextResponse.json({ notes: result }, { status: 200 })
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

