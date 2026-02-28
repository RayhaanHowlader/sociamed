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

    // Simple AI message generation based on prompt
    // In production, you would integrate with OpenAI, Anthropic, or similar
    const generatedMessage = generateMessage(prompt.trim());

    return NextResponse.json({ message: generatedMessage }, { status: 200 });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
}

function generateMessage(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Weekend plans
  if (lowerPrompt.includes('weekend') && lowerPrompt.includes('plan')) {
    return "Hey! Do you have any plans for the weekend? I was thinking we could hang out if you're free. Let me know! 😊";
  }

  // Thank you messages
  if (lowerPrompt.includes('thank') || lowerPrompt.includes('grateful')) {
    return "Thank you so much for your help! I really appreciate you taking the time to assist me. You're awesome! 🙏";
  }

  // Apology messages
  if (lowerPrompt.includes('apolog') || lowerPrompt.includes('sorry') || lowerPrompt.includes('late')) {
    return "I'm really sorry about that. I didn't mean for this to happen. I hope you can understand, and I'll make sure it doesn't happen again.";
  }

  // Meeting/catch up
  if (lowerPrompt.includes('meet') || lowerPrompt.includes('catch up') || lowerPrompt.includes('coffee')) {
    return "Hey! It's been a while. Would you like to meet up sometime soon? Maybe grab a coffee and catch up? Let me know when you're available! ☕";
  }

  // Birthday wishes
  if (lowerPrompt.includes('birthday') || lowerPrompt.includes('bday')) {
    return "Happy Birthday! 🎉🎂 Wishing you an amazing day filled with joy, laughter, and all the things you love. Hope this year brings you everything you've been hoping for! 🎈";
  }

  // Congratulations
  if (lowerPrompt.includes('congrat') || lowerPrompt.includes('achievement')) {
    return "Congratulations! 🎉 That's such amazing news! I'm so proud of you and all your hard work. You truly deserve this! Keep shining! ✨";
  }

  // Check in / How are you
  if (lowerPrompt.includes('check in') || lowerPrompt.includes('how are you') || lowerPrompt.includes('doing')) {
    return "Hey! Just wanted to check in and see how you're doing. Hope everything is going well with you! Let me know if you need anything. 😊";
  }

  // Invitation
  if (lowerPrompt.includes('invite') || lowerPrompt.includes('party') || lowerPrompt.includes('event')) {
    return "Hey! I'm organizing something fun and would love for you to join us! It's going to be a great time. Are you available? Let me know! 🎊";
  }

  // Help/Support
  if (lowerPrompt.includes('help') || lowerPrompt.includes('support') || lowerPrompt.includes('assist')) {
    return "Hey! I could really use your help with something if you have a moment. Would you be able to assist me? I'd really appreciate it! 🙏";
  }

  // Good morning/night
  if (lowerPrompt.includes('good morning') || lowerPrompt.includes('morning')) {
    return "Good morning! ☀️ Hope you have an amazing day ahead! Let me know if you want to chat later. 😊";
  }

  if (lowerPrompt.includes('good night') || lowerPrompt.includes('goodnight')) {
    return "Good night! 🌙 Sleep well and sweet dreams! Talk to you tomorrow! 😴";
  }

  // Encouragement
  if (lowerPrompt.includes('encourage') || lowerPrompt.includes('motivate') || lowerPrompt.includes('cheer')) {
    return "You've got this! 💪 I believe in you and know you can handle whatever comes your way. Stay strong and keep pushing forward! You're doing amazing! ✨";
  }

  // Miss you
  if (lowerPrompt.includes('miss')) {
    return "Hey! I've been thinking about you lately. Miss hanging out with you! We should definitely catch up soon. Hope you're doing well! 💙";
  }

  // Default friendly message
  return "Hey! Hope you're doing well! Just wanted to reach out and say hi. Let me know if you'd like to chat! 😊";
}
