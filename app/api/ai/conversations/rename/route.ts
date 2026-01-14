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

// PATCH - Rename conversation
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, title } = await request.json();

    if (!conversationId || !title) {
      return NextResponse.json({ error: 'Conversation ID and title required' }, { status: 400 });
    }

    if (title.trim().length === 0 || title.length > 100) {
      return NextResponse.json({ error: 'Title must be between 1 and 100 characters' }, { status: 400 });
    }

    const db = await getDb();
    
    // Update conversation title
    const result = await db.collection('ai_conversations').updateOne(
      {
        _id: new ObjectId(conversationId),
        userId: new ObjectId(userId)
      },
      {
        $set: {
          title: title.trim(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      title: title.trim()
    });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    return NextResponse.json({ error: 'Failed to rename conversation' }, { status: 500 });
  }
}
