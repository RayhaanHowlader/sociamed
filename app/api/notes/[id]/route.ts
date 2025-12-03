import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { id: string }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  if (!id) {
    return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
  }

  const db = await getDb()
  const notes = db.collection("notes")

  // Check if note exists and belongs to user
  const note = await notes.findOne({
    _id: new ObjectId(id),
    userId: user.sub,
  })

  if (!note) {
    return NextResponse.json(
      { error: "Note not found or you don't have permission to delete it" },
      { status: 404 }
    )
  }

  // Delete the note
  await notes.deleteOne({ _id: new ObjectId(id) })

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params
  const { text, musicUrl, musicTitle } = (await req.json()) as {
    text?: string
    musicUrl?: string
    musicTitle?: string
  }

  if (!id) {
    return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
  }

  if (!text?.trim() && !musicUrl?.trim()) {
    return NextResponse.json(
      { error: "Please add text or music to your note" },
      { status: 400 }
    )
  }

  const db = await getDb()
  const notes = db.collection("notes")

  // Check if note exists and belongs to user
  const note = await notes.findOne({
    _id: new ObjectId(id),
    userId: user.sub,
  })

  if (!note) {
    return NextResponse.json(
      { error: "Note not found or you don't have permission to edit it" },
      { status: 404 }
    )
  }

  // Update the note
  const updateDoc: any = {}
  if (text !== undefined) updateDoc.text = text.trim()
  if (musicUrl !== undefined) updateDoc.musicUrl = musicUrl.trim()
  if (musicTitle !== undefined) updateDoc.musicTitle = musicTitle.trim()

  await notes.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateDoc }
  )

  // Fetch updated note
  const updatedNote = await notes.findOne({ _id: new ObjectId(id) })

  if (!updatedNote) {
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
  }

  return NextResponse.json(
    {
      note: {
        _id: String(updatedNote._id),
        userId: String(updatedNote.userId),
        text: updatedNote.text || "",
        musicUrl: updatedNote.musicUrl || "",
        musicTitle: updatedNote.musicTitle || "",
        author: updatedNote.author,
        createdAt: updatedNote.createdAt.toISOString(),
      },
    },
    { status: 200 }
  )
}

