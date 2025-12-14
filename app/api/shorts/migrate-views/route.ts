import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const shorts = db.collection('shorts');

    // Update all shorts that don't have a views field
    const result = await shorts.updateMany(
      { views: { $exists: false } },
      { $set: { views: 0 } }
    );

    console.log('Migration result:', result);

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${result.modifiedCount} shorts with views field`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error migrating shorts views:', error);
    return NextResponse.json(
      { error: 'Failed to migrate views' },
      { status: 500 }
    );
  }
}