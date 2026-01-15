import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMMA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Use a simpler approach - just return a message that image generation is not available
    // Or use a free image generation service
    return NextResponse.json({ 
      error: 'Image generation is currently not available. Please try image analysis instead by uploading an image.',
      details: 'The image generation feature requires a paid API plan.'
    }, { status: 503 });

  } catch (error) {
    console.error('Image generation API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
