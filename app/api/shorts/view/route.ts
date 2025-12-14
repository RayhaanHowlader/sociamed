import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      console.log('View tracking: Unauthorized user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shortId } = await request.json();
    console.log('View tracking request:', { shortId, userId: user.sub });
    
    if (!shortId) {
      return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
    }

    const db = await getDb();
    const shorts = db.collection('shorts');
    const shortViews = db.collection('shortViews');

    // First, check if the short exists
    const existingShort = await shorts.findOne({ _id: new ObjectId(shortId) });
    if (!existingShort) {
      console.log('Short not found:', shortId);
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    console.log('Current short views before update:', existingShort.views);

    // Always increment view count - no time window restrictions
    console.log('Incrementing view count for short:', shortId);

    // Add view record
    const viewRecord = await shortViews.insertOne({
      shortId: shortId,
      userId: String(user.sub),
      createdAt: new Date()
    });
    console.log('Added view record to shortViews collection:', viewRecord.insertedId);

    // Increment view count in shorts collection
    const updateResult = await shorts.updateOne(
      { _id: new ObjectId(shortId) },
      { $inc: { views: 1 } }
    );
    console.log('Updated shorts collection:', updateResult);

    // Get updated view count
    const short = await shorts.findOne(
      { _id: new ObjectId(shortId) },
      { projection: { views: 1 } }
    );

    const views = short?.views || 0;
    console.log('Final view count after update:', views);

    return NextResponse.json({ 
      success: true, 
      views,
      newView: true, // Always true since we always increment
      debug: {
        shortExists: !!existingShort,
        currentViews: views
      }
    });
  } catch (error) {
    console.error('Error tracking short view:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}