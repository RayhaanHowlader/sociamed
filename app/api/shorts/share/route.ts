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

    const { shortId, friendIds, message } = await request.json();

    if (!shortId || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'Short ID and friend IDs are required' }, { status: 400 });
    }

    const db = await getDb();
    const currentUserId = user.sub;
    console.log('Share short debug:', { currentUserId, shortId, friendIds, message });

    // Get the short details
    const short = await db.collection('shorts').findOne({ _id: new ObjectId(shortId) });
    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    // Get current user profile
    const currentUserProfile = await db.collection('profiles').findOne({ userId: currentUserId });
    if (!currentUserProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify friendships and get valid friend IDs
    const friendships = await db.collection('friends').find({
      $or: [
        { userId: currentUserId, friendUserId: { $in: friendIds } },
        { friendUserId: currentUserId, userId: { $in: friendIds } }
      ]
    }).toArray();

    const validFriendIds = new Set<string>();
    friendships.forEach(friendship => {
      if (friendship.userId === currentUserId) {
        validFriendIds.add(friendship.friendUserId);
      } else if (friendship.friendUserId === currentUserId) {
        validFriendIds.add(friendship.userId);
      }
    });

    const filteredFriendIds = friendIds.filter(id => validFriendIds.has(id));
    console.log('Share short debug:', {
      currentUserId,
      friendIds,
      friendshipsFound: friendships.length,
      validFriendIds: Array.from(validFriendIds),
      filteredFriendIds
    });

    if (filteredFriendIds.length === 0) {
      return NextResponse.json({ error: 'No valid friends selected' }, { status: 400 });
    }

    // Create shared messages for each friend
    const sharedMessages = [];
    const timestamp = new Date();

    for (const friendId of filteredFriendIds) {
      const sharedMessage = {
        fromUserId: currentUserId,
        toUserId: friendId,
        content: message || '',
        type: 'shared_short',
        sharedShort: {
          _id: short._id,
          caption: short.caption,
          videoUrl: short.videoUrl,
          duration: short.duration,
          author: {
            name: short.author?.name || 'Unknown',
            username: short.author?.username || 'unknown',
            avatarUrl: short.author?.avatarUrl || ''
          },
          createdAt: short.createdAt
        },
        sharedBy: {
          name: currentUserProfile.name || 'Unknown',
          username: currentUserProfile.username || 'unknown',
          avatarUrl: currentUserProfile.avatarUrl || ''
        },
        createdAt: timestamp,
        seen: false
      };

      // Save to both collections for compatibility
      const chatResult = await db.collection('chatMessages').insertOne(sharedMessage);
      const historyMessage = {
        ...sharedMessage,
        _id: chatResult.insertedId
      };
      await db.collection('chat_history').insertOne(historyMessage);

      // Add socket-compatible format
      sharedMessages.push({
        ...sharedMessage,
        id: chatResult.insertedId.toString(),
        createdAt: timestamp.toISOString()
      });
    }

    // Update short stats (optional)
    await db.collection('shorts').updateOne(
      { _id: new ObjectId(shortId) },
      { $inc: { 'stats.shares': filteredFriendIds.length } }
    );

    return NextResponse.json({
      success: true,
      sharedCount: filteredFriendIds.length,
      sharedMessages
    });

  } catch (error) {
    console.error('Share short error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}