import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const storyId = params.id
  if (!storyId || !ObjectId.isValid(storyId)) {
    return NextResponse.json({ error: "Invalid story ID" }, { status: 400 })
  }

  const { type, content, mediaItems } = (await req.json()) as {
    type?: "text" | "image" | "video"
    content?: string
    mediaItems?: Array<{ url: string; publicId: string; type: "image" | "video" }>
  }

  const db = await getDb()
  const stories = db.collection("stories")

  // Check if story exists and belongs to user
  const story = await stories.findOne({ _id: new ObjectId(storyId) })
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 })
  }

  if (String(story.userId) !== String(user.sub)) {
    return NextResponse.json({ error: "You can only edit your own stories" }, { status: 403 })
  }

  // Check if story has expired
  const now = new Date()
  if (story.expiresAt < now) {
    return NextResponse.json({ error: "Cannot edit expired story" }, { status: 400 })
  }

  // Update story
  const updateDoc: any = {}
  if (type) updateDoc.type = type
  if (content !== undefined) updateDoc.content = content?.trim() || ""
  if (mediaItems) {
    updateDoc.mediaItems = mediaItems
    // Update legacy fields for backward compatibility
    if (mediaItems.length > 0) {
      updateDoc.mediaUrl = mediaItems[0].url
      updateDoc.mediaPublicId = mediaItems[0].publicId
    }
  }

  await stories.updateOne(
    { _id: new ObjectId(storyId) },
    { $set: updateDoc }
  )

  // Fetch updated story
  const updatedStory = await stories.findOne({ _id: new ObjectId(storyId) })
  if (!updatedStory) {
    return NextResponse.json({ error: "Story not found after update" }, { status: 404 })
  }

  // Convert old format to new format if needed
  const mediaItemsArray = updatedStory.mediaItems || (updatedStory.mediaUrl ? [{
    url: updatedStory.mediaUrl,
    publicId: updatedStory.mediaPublicId || "",
    type: updatedStory.type as "image" | "video"
  }] : [])

  return NextResponse.json(
    {
      story: {
        _id: String(updatedStory._id),
        userId: String(updatedStory.userId),
        type: updatedStory.type,
        content: updatedStory.content || "",
        mediaUrl: updatedStory.mediaUrl || "",
        mediaPublicId: updatedStory.mediaPublicId || "",
        mediaItems: mediaItemsArray,
        author: updatedStory.author,
        createdAt: updatedStory.createdAt.toISOString(),
        expiresAt: updatedStory.expiresAt.toISOString(),
      },
    },
    { status: 200 }
  )
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const storyId = params.id
  if (!storyId || !ObjectId.isValid(storyId)) {
    return NextResponse.json({ error: "Invalid story ID" }, { status: 400 })
  }

  const db = await getDb()
  const stories = db.collection("stories")

  // Check if story exists and belongs to user
  const story = await stories.findOne({ _id: new ObjectId(storyId) })
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 })
  }

  if (String(story.userId) !== String(user.sub)) {
    return NextResponse.json({ error: "You can only delete your own stories" }, { status: 403 })
  }

  await stories.deleteOne({ _id: new ObjectId(storyId) })

  return NextResponse.json({ success: true }, { status: 200 })
}

