import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

const requiredFields = ["name", "username"]

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const db = await getDb()
  const profiles = db.collection("profiles")

  // If userId is provided, fetch that user's profile, otherwise fetch current user's profile
  const targetUserId = userId || user.sub
  const profile = await profiles.findOne({ userId: targetUserId })

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({ profile, isOwnProfile: targetUserId === user.sub }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const db = await getDb()
  const profiles = db.collection("profiles")

  // Ensure username is unique across users
  const existingUsername = await profiles.findOne({
    username: body.username,
    userId: { $ne: user.sub },
  })

  if (existingUsername) {
    return NextResponse.json({ error: "This username is already taken" }, { status: 400 })
  }

  const payload = {
    userId: user.sub,
    email: user.email,
    name: body.name,
    username: body.username.startsWith("@") ? body.username : `@${body.username}`,
    bio: body.bio || "",
    location: body.location || "",
    website: body.website || "",
    avatarUrl: body.avatarUrl || "",
    coverUrl: body.coverUrl || "",
    updatedAt: new Date(),
  }

  const updateResult = await profiles.findOneAndUpdate(
    { userId: user.sub },
    {
      $set: payload,
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  )

  return NextResponse.json({ profile: updateResult?.value ?? payload }, { status: 200 })
}


