import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// GET - Fetch messages for a conversation with pagination
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Verify conversation belongs to user
    const conversation = await db.collection('ai_conversations').findOne({
      _id: new ObjectId(conversationId),
      userId: new ObjectId(userId)
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const skip = (page - 1) * limit;
    const messagesCollection = db.collection('ai_messages');

    // Fetch messages with pagination (oldest first for chat display)
    const messages = await messagesCollection
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await messagesCollection.countDocuments({ 
      conversationId: new ObjectId(conversationId) 
    });
    const hasMore = skip + messages.length < total;

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg._id.toString(),
        text: msg.text,
        sender: msg.sender,
        createdAt: msg.createdAt
      })),
      hasMore,
      total
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Save a new message
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, text, sender } = await request.json();

    if (!conversationId || !text || !sender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    
    // Verify conversation belongs to user
    const conversation = await db.collection('ai_conversations').findOne({
      _id: new ObjectId(conversationId),
      userId: new ObjectId(userId)
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Save message
    const messagesCollection = db.collection('ai_messages');
    const newMessage = {
      conversationId: new ObjectId(conversationId),
      userId: new ObjectId(userId),
      sender,
      text,
      createdAt: new Date()
    };

    const result = await messagesCollection.insertOne(newMessage);

    // Update conversation
    await db.collection('ai_conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: text.substring(0, 100),
          updatedAt: new Date()
        },
        $inc: { messageCount: 1 }
      }
    );

    return NextResponse.json({
      message: {
        id: result.insertedId.toString(),
        text: newMessage.text,
        sender: newMessage.sender,
        createdAt: newMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
