# AI Message Generator Setup

The AI Message Generator uses OpenAI's GPT-3.5 Turbo model to generate contextual messages based on any prompt.

## Setup Instructions

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the API key (it starts with `sk-`)

### 2. Add API Key to Environment Variables

Add the following to your `.env.local` file:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Restart Your Development Server

After adding the API key, restart your Next.js server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Usage

1. Click the sparkles (✨) icon in the message input
2. Describe what you want to say (e.g., "give suggestion for scoring good score in exam")
3. Click "Generate"
4. The AI will generate a contextual, friendly message
5. Click "Use Message" to insert it into your chat

## Features

- **Any Topic**: Generate messages about any topic, not just predefined templates
- **Contextual**: AI understands the context and generates appropriate messages
- **Friendly Tone**: Messages are casual, warm, and natural
- **Smart Emojis**: Appropriate emoji usage based on context
- **Fast**: Typically generates in 1-3 seconds

## Example Prompts

- "give suggestion for scoring good score in exam"
- "ask about their weekend plans"
- "congratulate them on their new job"
- "apologize for missing the meeting"
- "invite them to a party"
- "thank them for their help"
- "ask how they're doing"
- "share exciting news about a project"

## Cost

OpenAI charges per token used. GPT-3.5 Turbo is very affordable:
- ~$0.0015 per 1000 tokens for input
- ~$0.002 per 1000 tokens for output
- Each message generation costs approximately $0.0001-0.0003

## Alternative: Free Local AI (Optional)

If you don't want to use OpenAI, you can integrate with free alternatives:

1. **Ollama** (Local, Free)
   - Install Ollama locally
   - Run models like Llama 2 or Mistral
   - No API costs

2. **Hugging Face** (Free tier available)
   - Use their Inference API
   - Free tier: 30,000 characters/month

3. **Google Gemini** (Free tier)
   - Generous free tier
   - Good quality responses

Let me know if you'd like help setting up any of these alternatives!
