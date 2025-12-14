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

    const { pollId, optionIds } = await request.json();

    if (!pollId || !optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 });
    }

    const db = await getDb();
    const polls = db.collection('polls');
    const groups = db.collection('groups');

    // Get the poll
    const poll = await polls.findOne({ _id: new ObjectId(pollId) });
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if poll has expired
    if (new Date() > new Date(poll.expiresAt)) {
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 });
    }

    // Check if user is a member of the group
    const group = await groups.findOne({
      _id: new ObjectId(poll.groupId),
      members: { $elemMatch: { userId: user.sub } }
    });

    if (!group) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check if user has already voted
    const hasVoted = poll.options.some((option: any) => 
      option.voters && option.voters.includes(user.sub)
    );

    if (hasVoted) {
      return NextResponse.json({ error: 'You have already voted' }, { status: 400 });
    }

    // Validate option IDs
    const validOptionIds = poll.options.map((option: any) => option.id);
    const invalidOptions = optionIds.filter((id: string) => !validOptionIds.includes(id));
    
    if (invalidOptions.length > 0) {
      return NextResponse.json({ error: 'Invalid option IDs' }, { status: 400 });
    }

    // Check multiple choice restriction
    if (!poll.allowMultiple && optionIds.length > 1) {
      return NextResponse.json({ error: 'Multiple choices not allowed' }, { status: 400 });
    }

    // Update poll with votes
    const updateOperations: any = {};
    let totalVotesIncrement = 0;

    optionIds.forEach((optionId: string) => {
      updateOperations[`options.$[option_${optionId}].votes`] = { $inc: 1 };
      updateOperations[`options.$[option_${optionId}].voters`] = { $push: user.sub };
      totalVotesIncrement++;
    });

    // Build array filters for the update
    const arrayFilters = optionIds.map((optionId: string) => ({
      [`option_${optionId}.id`]: optionId
    }));

    // Perform the update
    const updateResult = await polls.updateOne(
      { _id: new ObjectId(pollId) },
      {
        $inc: { totalVotes: totalVotesIncrement },
        ...Object.keys(updateOperations).reduce((acc, key) => {
          if (key.includes('.votes')) {
            acc[key] = updateOperations[key];
          }
          return acc;
        }, {} as any)
      },
      { arrayFilters }
    );

    // Update voters arrays separately (MongoDB limitation with array filters)
    for (const optionId of optionIds) {
      await polls.updateOne(
        { 
          _id: new ObjectId(pollId),
          'options.id': optionId
        },
        {
          $addToSet: { 'options.$.voters': user.sub },
          $inc: { 'options.$.votes': 1 }
        }
      );
    }

    // Get updated poll
    const updatedPoll = await polls.findOne({ _id: new ObjectId(pollId) });

    return NextResponse.json({
      success: true,
      poll: updatedPoll
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    return NextResponse.json(
      { error: 'Failed to vote on poll' },
      { status: 500 }
    );
  }
}