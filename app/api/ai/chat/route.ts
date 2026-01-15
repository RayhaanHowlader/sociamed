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

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory, conversationId, image } = await request.json();

    if (!message && !image) {
      return NextResponse.json({ error: 'Message or image is required' }, { status: 400 });
    }

    // Use different API keys for different purposes
    const textApiKey = process.env.OPEN_ROUTER_API_KEY;
    const imageApiKey = process.env.GEMMA_API_KEY;
    
    const apiKey = image ? imageApiKey : textApiKey;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Determine which model to use based on whether image is present
    // For images: Use Qwen Vision with Gemma API key
    // For text: Use GPT-3.5 with original API key
    const model = image ? 'qwen/qwen-2-vl-7b-instruct' : 'openai/gpt-3.5-turbo';
    
    // Prepare system message
    const systemMessage = {
      role: 'system',
      content: image 
        ? 'You are a helpful AI assistant with vision capabilities integrated into a social media platform called Nexus. You can analyze images and help users understand what they see. Be friendly, detailed, and helpful when describing images.'
        : 'You are a helpful AI assistant integrated into a social media platform called Nexus. You help users with various questions and tasks. Be friendly, concise, and helpful.'
    };

    // Prepare messages for OpenRouter API
    let messages: any[] = [
      systemMessage,
      // Add chat history
      ...(chatHistory || []).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    // Add current message with or without image
    if (image) {
      // For vision models, send image as part of content array
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message || 'What do you see in this image? Please describe it in detail.'
          },
          {
            type: 'image_url',
            image_url: {
              url: image // base64 data URL
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nexus Social Media AI Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: image ? 2000 : 1000, // More tokens for image analysis
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to get AI response',
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json({ error: 'Invalid response from AI service' }, { status: 500 });
    }

    const aiResponse = data.choices[0].message.content;

    // Save messages to database if conversationId is provided
    const userId = getUserIdFromToken(request);
    if (userId && conversationId) {
      try {
        const db = await getDb();
        const messagesCollection = db.collection('ai_messages');
        const conversationsCollection = db.collection('ai_conversations');

        // Save user message
        const userMessageDoc: any = {
          conversationId: new ObjectId(conversationId),
          userId: new ObjectId(userId),
          sender: 'user',
          text: message || 'Sent an image',
          createdAt: new Date()
        };
        
        if (image) {
          userMessageDoc.hasImage = true;
          userMessageDoc.imageData = image; // Store base64 image
        }

        await messagesCollection.insertOne(userMessageDoc);

        // Save AI response
        await messagesCollection.insertOne({
          conversationId: new ObjectId(conversationId),
          userId: new ObjectId(userId),
          sender: 'ai',
          text: aiResponse,
          createdAt: new Date()
        });

        // Update conversation
        await conversationsCollection.updateOne(
          { _id: new ObjectId(conversationId) },
          {
            $set: {
              lastMessage: image ? '📷 Image analysis' : message.substring(0, 100),
              updatedAt: new Date()
            },
            $inc: { messageCount: 2 }
          }
        );
      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
        // Continue even if DB save fails
      }
    }

    return NextResponse.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString(),
      modelUsed: model
    });

  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}