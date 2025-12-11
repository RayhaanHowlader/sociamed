import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const currentUserId = user.sub;

    // Verify the group exists and user is a member
    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    if (!group.memberIds.includes(currentUserId)) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get all pinned messages for this group
    const pinnedMessages = await db.collection('groupMessages')
      .find({ 
        groupId: String(groupId),
        pinned: true,
        deleted: { $ne: true }
      })
      .sort({ pinnedAt: -1 }) // Most recently pinned first
      .toArray();

    // Format the messages
    const messages = pinnedMessages.map((m) => ({
      id: String(m._id),
      groupId: String(m.groupId),
      fromUserId: m.fromUserId,
      content: m.content || '',
      fileUrl: m.fileUrl || '',
      fileName: m.fileName || '',
      mimeType: m.mimeType || '',
      filePublicId: m.filePublicId || '',
      isImage: Boolean(m.isImage),
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      deleted: Boolean(m.deleted),
      deletedBy: m.deletedBy,
      pinned: true,
      pinnedBy: m.pinnedBy,
      pinnedAt: m.pinnedAt instanceof Date ? m.pinnedAt.toISOString() : String(m.pinnedAt)
    }));

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get pinned messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}