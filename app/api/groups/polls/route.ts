import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, question, options, allowMultiple, anonymous, duration } = await request.json();

    if (!groupId || !question || !options || options.length < 2) {
      return NextResponse.json({ error: 'Invalid poll data' }, { status: 400 });
    }

    const db = await getDb();
    const groups = db.collection('groups');
    const profiles = db.collection('profiles');
    const polls = db.collection('polls');

    // Check if user is a member of the group
    const group = await groups.findOne({
      _id: new ObjectId(groupId),
      members: { $elemMatch: { userId: user.sub } }
    });

    if (!group) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get user profile
    const profile = await profiles.findOne({ userId: user.sub });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create poll options with IDs
    const pollOptions = options.map((text: string, index: number) => ({
      id: `option_${index}`,
      text: text.trim(),
      votes: 0,
      voters: []
    }));

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (duration || 24));

    const pollDoc = {
      groupId: groupId,
      question: question.trim(),
      options: pollOptions,
      allowMultiple: allowMultiple || false,
      anonymous: anonymous || false,
      createdBy: user.sub,
      createdAt: new Date(),
      expiresAt: expiresAt,
      totalVotes: 0,
      author: {
        name: profile.name,
        username: profile.username,
        avatarUrl: profile.avatarUrl || ''
      }
    };

    const result = await polls.insertOne(pollDoc);

    // Add poll message to group chat
    const chatMessages = db.collection('chatMessages');
    const messageDoc = {
      groupId: groupId,
      senderId: user.sub,
      senderName: profile.name,
      senderAvatar: profile.avatarUrl || '',
      content: '',
      type: 'poll',
      pollId: result.insertedId.toString(),
      createdAt: new Date(),
      edited: false,
      reactions: []
    };

    await chatMessages.insertOne(messageDoc);

    return NextResponse.json({
      success: true,
      poll: { ...pollDoc, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID required' }, { status: 400 });
    }

    const db = await getDb();
    const groups = db.collection('groups');
    const polls = db.collection('polls');

    // Check if user is a member of the group
    const group = await groups.findOne({
      _id: new ObjectId(groupId),
      members: { $elemMatch: { userId: user.sub } }
    });

    if (!group) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get polls for this group
    const groupPolls = await polls
      .find({ groupId: groupId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ polls: groupPolls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}