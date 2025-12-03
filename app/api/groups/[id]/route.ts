import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const groupId = params.id
  if (!groupId) {
    return NextResponse.json({ error: "Group id is required" }, { status: 400 })
  }

  const db = await getDb()
  const groups = db.collection("groups")

  const _id = new ObjectId(groupId)
  const existing = await groups.findOne<{ ownerId?: string }>({ _id })

  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  if (existing.ownerId && existing.ownerId !== String(user.sub)) {
    return NextResponse.json({ error: "Only the group owner can delete this group" }, { status: 403 })
  }

  await groups.deleteOne({ _id })

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const groupId = params.id
  if (!groupId) {
    return NextResponse.json({ error: "Group id is required" }, { status: 400 })
  }

  const { name, icon, allowMemberEdit, allowMemberInvite, addMemberIds } = (await req.json()) as {
    name?: string
    icon?: string
    allowMemberEdit?: boolean
    allowMemberInvite?: boolean
    addMemberIds?: string[]
  }

  const db = await getDb()
  const groups = db.collection("groups")

  const _id = new ObjectId(groupId)
  const existing = await groups.findOne<{
    ownerId?: string
    memberIds?: string[]
    allowMemberEdit?: boolean
    allowMemberInvite?: boolean
  }>({ _id })

  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const currentUserId = String(user.sub)
  const isOwner = existing.ownerId === currentUserId
  const isMember = (existing.memberIds ?? []).includes(currentUserId)

  if (!isMember) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
  }

  // Only owner or allowed members can update settings
  const canEditMeta = isOwner || (existing.allowMemberEdit && isMember)
  const canInvite = isOwner || (existing.allowMemberInvite && isMember)

  const update: any = {}

  if (name !== undefined || icon !== undefined || allowMemberEdit !== undefined || allowMemberInvite !== undefined) {
    if (!canEditMeta) {
      return NextResponse.json({ error: "You are not allowed to edit group settings" }, { status: 403 })
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 })
      }
      update.name = name.trim()
    }

    if (icon !== undefined && icon.trim()) {
      update.icon = icon.trim()
    }

    if (allowMemberEdit !== undefined) {
      update.allowMemberEdit = !!allowMemberEdit
    }

    if (allowMemberInvite !== undefined) {
      update.allowMemberInvite = !!allowMemberInvite
    }
  }

  const updateOps: any = {}
  if (Object.keys(update).length > 0) {
    updateOps.$set = update
  }

  if (addMemberIds && addMemberIds.length > 0) {
    if (!canInvite) {
      return NextResponse.json({ error: "You are not allowed to add members" }, { status: 403 })
    }

    updateOps.$addToSet = {
      memberIds: { $each: addMemberIds.map((id) => String(id)) },
    }
  }

  if (Object.keys(updateOps).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  await groups.updateOne({ _id }, updateOps)

  const updated = await groups.findOne({ _id })

  return NextResponse.json({ group: updated }, { status: 200 })
}



