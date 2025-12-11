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

    if (!friendId) {
      return NextResponse.json({ error: 'friendId required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Get recent messages from both collections
    const chatMessages = await db.collection('chatMessages')
      .find({
        $or: [
          { fromUserId: user.sub, toUserId: friendId },
          { fromUserId: friendId, toUserId: user.sub }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const chatHistory = await db.collection('chat_history')
      .find({
        $or: [
          { fromUserId: user.sub, toUserId: friendId },
          { fromUserId: friendId, toUserId: user.sub }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      userId: user.sub,
      friendId,
      chatMessages: {
        count: chatMessages.length,
        messages: chatMessages.map(m => ({
          id: m._id,
          fromUserId: m.fromUserId,
          toUserId: m.toUserId,
          content: m.content?.substring(0, 50) + '...',
          hasSharedPost: !!m.sharedPostData,
          createdAt: m.createdAt
        }))
      },
      chatHistory: {
        count: chatHistory.length,
        messages: chatHistory.map(m => ({
          id: m._id,
          fromUserId: m.fromUserId,
          toUserId: m.toUserId,
          content: m.content?.substring(0, 50) + '...',
          hasSharedPost: !!m.sharedPostData,
          createdAt: m.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}