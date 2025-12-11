import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, messageId, pin } = await request.json();
    console.log('Pin request:', { groupId, messageId, pin, userId: user.sub });

    if (!groupId || !messageId || typeof pin !== 'boolean') {
      return NextResponse.json({ error: 'Group ID, message ID, and pin status are required' }, { status: 400 });
    }

    const db = await getDb();
    const currentUserId = user.sub;

    // Verify the group exists and user is admin
    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is admin (owner of the group)
    if (group.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Only group admins can pin/unpin messages' }, { status: 403 });
    }

    // Validate messageId format
    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    // Verify the message exists
    const message = await db.collection('groupMessages').findOne({ 
      _id: new ObjectId(messageId),
      groupId: String(groupId)
    });
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (pin) {
      // Pin the message
      await db.collection('groupMessages').updateOne(
        { _id: new ObjectId(messageId) },
        { 
          $set: { 
            pinned: true, 
            pinnedBy: currentUserId, 
            pinnedAt: new Date() 
          } 
        }
      );
    } else {
      // Unpin the message
      await db.collection('groupMessages').updateOne(
        { _id: new ObjectId(messageId) },
        { 
          $unset: { 
            pinned: 1, 
            pinnedBy: 1, 
            pinnedAt: 1 
          } 
        }
      );
    }

    return NextResponse.json({ 
      success: true, 
      messageId,
      pinned: pin
    });

  } catch (error) {
    console.error('Pin message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}