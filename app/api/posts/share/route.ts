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

    const { postId, friendIds, message } = await request.json();

    if (!postId || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'Post ID and friend IDs are required' }, { status: 400 });
    }

    const db = await getDb();
    const currentUserId = user.sub;

    // Verify the post exists
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Use author info from the post itself (it's already embedded)
    const postAuthor = post.author;
    console.log('Post author from post:', postAuthor);

    // Get current user info from profiles collection
    const currentUser = await db.collection('profiles').findOne(
      { userId: currentUserId },
      { projection: { name: 1, username: 1, avatarUrl: 1 } }
    );

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify all friend IDs are valid friends of the current user
    const friendships = await db.collection('friends').find({
      $or: [
        { userId: currentUserId, friendUserId: { $in: friendIds } },
        { friendUserId: currentUserId, userId: { $in: friendIds } }
      ]
    }).toArray();

    const validFriendIds = new Set();
    friendships.forEach((friendship: any) => {
      if (friendship.userId === currentUserId) {
        validFriendIds.add(friendship.friendUserId);
      } else {
        validFriendIds.add(friendship.userId);
      }
    });

    const filteredFriendIds = friendIds.filter((id: string) => validFriendIds.has(id));
    
    if (filteredFriendIds.length === 0) {
      return NextResponse.json({ error: 'No valid friends selected' }, { status: 400 });
    }

    // Create the shared post message content
    const postUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/post/${postId}`;
    const shareContent = message 
      ? `${message}\n\n📎 Shared a post by ${postAuthor?.name || 'Unknown'}: ${post.content ? post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '') : 'View post'}\n${postUrl}`
      : `📎 Shared a post by ${postAuthor?.name || 'Unknown'}: ${post.content ? post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '') : 'View post'}\n${postUrl}`;

    // Create chat messages for each friend - format for chat_history (ObjectIds)
    const chatHistoryMessages = filteredFriendIds.map((friendId: string) => ({
      fromUserId: new ObjectId(currentUserId),
      toUserId: new ObjectId(friendId),
      content: shareContent,
      sharedPostId: new ObjectId(postId),
      sharedPostData: {
        content: post.content,
        imageUrl: post.imageUrl,
        author: {
          userId: post.userId,
          name: postAuthor?.name || 'Unknown',
          username: postAuthor?.username || 'unknown',
          avatarUrl: postAuthor?.avatarUrl || ''
        },
        createdAt: post.createdAt
      },
      createdAt: new Date(),
      status: 'sent',
      deleted: false
    }));

    // Create chat messages for chatMessages collection (strings)
    const chatMessages = filteredFriendIds.map((friendId: string) => ({
      fromUserId: currentUserId,
      toUserId: friendId,
      content: shareContent,
      sharedPostId: postId,
      sharedPostData: {
        content: post.content,
        imageUrl: post.imageUrl,
        author: {
          userId: post.userId,
          name: postAuthor?.name || 'Unknown',
          username: postAuthor?.username || 'unknown',
          avatarUrl: postAuthor?.avatarUrl || ''
        },
        createdAt: post.createdAt
      },
      createdAt: new Date(),
      status: 'sent',
      deleted: false,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      isImage: false,
      filePublicId: ''
    }));

    // Insert all chat messages to both collections for compatibility
    const [result, historyResult] = await Promise.all([
      db.collection('chatMessages').insertMany(chatMessages),
      db.collection('chat_history').insertMany(chatHistoryMessages)
    ]);

    // Update post share count
    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { 'stats.shares': filteredFriendIds.length } }
    );

    // Return the messages with their IDs for socket emission
    const messagesWithIds = chatMessages.map((chatMessage, index) => ({
      id: result.insertedIds[index].toString(),
      fromUserId: currentUserId,
      toUserId: chatMessage.toUserId.toString(),
      content: chatMessage.content,
      sharedPostId: chatMessage.sharedPostId.toString(),
      sharedPostData: chatMessage.sharedPostData,
      createdAt: chatMessage.createdAt.toISOString(),
      status: 'sent'
    }));

    // Create notifications for each friend
    const notifications = filteredFriendIds.map((friendId: string) => ({
      userId: new ObjectId(friendId),
      type: 'post_shared',
      fromUserId: new ObjectId(currentUserId),
      fromUser: {
        name: currentUser.name,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl
      },
      postId: new ObjectId(postId),
      message: `${currentUser.name} shared a post with you`,
      createdAt: new Date(),
      read: false
    }));

    await db.collection('notifications').insertMany(notifications);

    return NextResponse.json({ 
      success: true, 
      sharedCount: filteredFriendIds.length,
      messageIds: result.insertedIds,
      messages: messagesWithIds
    });

  } catch (error) {
    console.error('Share post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}