import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, callId, offer, answer, candidate, calleeId } = await req.json();

    // This is a simple signaling server endpoint
    // In a production environment, you might want to store call states in a database
    // For now, we'll just validate the request and let the socket server handle the signaling

    switch (action) {
      case 'offer':
        if (!callId || !offer || !calleeId) {
          return NextResponse.json({ error: 'Missing required fields for offer' }, { status: 400 });
        }
        break;
      
      case 'answer':
        if (!callId || !answer) {
          return NextResponse.json({ error: 'Missing required fields for answer' }, { status: 400 });
        }
        break;
      
      case 'ice-candidate':
        if (!callId || !candidate) {
          return NextResponse.json({ error: 'Missing required fields for ICE candidate' }, { status: 400 });
        }
        break;
      
      case 'end':
      case 'reject':
        if (!callId) {
          return NextResponse.json({ error: 'Missing call ID' }, { status: 400 });
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Video call API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}