import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    
    // Get all messages from chat_history that don't exist in chatMessages
    const chatHistoryMessages = await db.collection('chat_history').find({}).toArray();
    const chatMessages = await db.collection('chatMessages').find({}).toArray();
    
    // Create a set of existing message IDs in chatMessages for quick lookup
    const existingIds = new Set(chatMessages.map(m => m._id.toString()));
    
    // Filter out messages that already exist in chatMessages
    const messagesToMigrate = chatHistoryMessages.filter(m => !existingIds.has(m._id.toString()));
    
    if (messagesToMigrate.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No messages to migrate',
        migrated: 0 
      });
    }
    
    // Insert messages into chatMessages collection
    await db.collection('chatMessages').insertMany(messagesToMigrate);
    
    return NextResponse.json({ 
      success: true, 
      message: `Migrated ${messagesToMigrate.length} messages`,
      migrated: messagesToMigrate.length 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}