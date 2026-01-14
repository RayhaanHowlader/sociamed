import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get user ID from JWT token
function getUserIdFromToken(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    return decoded.sub;
  } catch {
    return null;
  }
}

// GET - Fetch conversations with pagination
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();
    const conversationsCollection = db.collection('ai_conversations');

    // Fetch conversations with pagination
    const conversations = await conversationsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Count total conversations
    const total = await conversationsCollection.countDocuments({ userId: new ObjectId(userId) });
    const hasMore = skip + conversations.length < total;

    return NextResponse.json({
      conversations: conversations.map((conv: any) => ({
        id: conv._id.toString(),
        title: conv.title,
        lastMessage: conv.lastMessage,
        messageCount: conv.messageCount || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      })),
      hasMore,
      total
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    const db = await getDb();
    const conversationsCollection = db.collection('ai_conversations');

    const newConversation = {
      userId: new ObjectId(userId),
      title: title || 'New Chat',
      lastMessage: "Hello! I'm your AI assistant. How can I help you today?",
      messageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await conversationsCollection.insertOne(newConversation);

    // Create initial AI message
    const messagesCollection = db.collection('ai_messages');
    await messagesCollection.insertOne({
      conversationId: result.insertedId,
      userId: new ObjectId(userId),
      sender: 'ai',
      text: "Hello! I'm your AI assistant. How can I help you today?",
      createdAt: new Date()
    });

    return NextResponse.json({
      conversation: {
        id: result.insertedId.toString(),
        title: newConversation.title,
        lastMessage: newConversation.lastMessage,
        messageCount: 1,
        createdAt: newConversation.createdAt,
        updatedAt: newConversation.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// DELETE - Delete conversation
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Delete conversation
    await db.collection('ai_conversations').deleteOne({
      _id: new ObjectId(conversationId),
      userId: new ObjectId(userId)
    });

    // Delete all messages in conversation
    await db.collection('ai_messages').deleteMany({
      conversationId: new ObjectId(conversationId)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
