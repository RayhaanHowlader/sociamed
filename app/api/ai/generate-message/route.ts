import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check if Open Router API key is configured
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('OPEN_ROUTER_API_KEY not configured');
      return NextResponse.json({ 
        error: 'AI service not configured. Please add OPEN_ROUTER_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    // Call Open Router API (supports multiple models including GPT-3.5)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Nexus Social Media'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates friendly, casual messages for social media chat. Keep messages concise, warm, and natural. Use emojis sparingly and appropriately. Generate only the message text without quotes or extra formatting.'
          },
          {
            role: 'user',
            content: `Generate a friendly message for: ${prompt.trim()}`
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Open Router API error:', error);
      return NextResponse.json({ 
        error: 'Failed to generate message. Please try again.' 
      }, { status: 500 });
    }

    const data = await response.json();
    const generatedMessage = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedMessage) {
      return NextResponse.json({ 
        error: 'Failed to generate message. Please try again.' 
      }, { status: 500 });
    }

    return NextResponse.json({ message: generatedMessage }, { status: 200 });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate message. Please try again.' 
    }, { status: 500 });
  }
}
