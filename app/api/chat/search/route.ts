import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');
    const query = searchParams.get('query');

    if (!friendId || !query) {
      return NextResponse.json({ error: 'Friend ID and search query are required' }, { status: 400 });
    }

    const db = await getDb();
    const currentUserId = user.sub;

    // Verify friendship
    const friendship = await db.collection('friends').findOne({
      $or: [
        { userId: currentUserId, friendUserId: friendId },
        { friendUserId: currentUserId, userId: friendId }
      ]
    });

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 });
    }

    // Search messages in both collections
    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    const searchQuery = {
      $and: [
        {
          $or: [
            { fromUserId: currentUserId, toUserId: friendId },
            { fromUserId: friendId, toUserId: currentUserId }
          ]
        },
        {
          $or: [
            { content: { $regex: searchRegex } },
            { fileName: { $regex: searchRegex } }
          ]
        },
        { deleted: { $ne: true } }
      ]
    };

    const [chatMessagesResults, chatHistoryResults] = await Promise.all([
      db.collection('chatMessages')
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
      db.collection('chat_history')
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
    ]);

    // Combine and deduplicate results
    const messageMap = new Map();
    [...chatHistoryResults, ...chatMessagesResults].forEach(item => {
      const id = String(item._id);
      if (!messageMap.has(id)) {
        messageMap.set(id, item);
      }
    });

    const messages = Array.from(messageMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)
      .map((m) => ({
        id: String(m._id),
        fromUserId: String(m.fromUserId),
        toUserId: String(m.toUserId),
        content: m.content || '',
        fileUrl: m.fileUrl || '',
        fileName: m.fileName || '',
        mimeType: m.mimeType || '',
        isImage: Boolean(m.isImage),
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        sharedPostData: m.sharedPostData,
        sharedShort: m.sharedShort,
      }));

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Chat search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}