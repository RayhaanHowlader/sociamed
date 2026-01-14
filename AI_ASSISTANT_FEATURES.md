# AI Assistant - Enhanced Features

## Overview
The AI Assistant has been completely upgraded with database persistence, lazy loading, and advanced message management features.

## New Features

### 1. Database Persistence
- **Conversations Storage**: All conversations are now stored in MongoDB
- **Messages Storage**: Every message (user and AI) is saved to the database
- **Persistent History**: Conversations persist across sessions and devices
- **Collections Used**:
  - `ai_conversations` - Stores conversation metadata
  - `ai_messages` - Stores all messages

### 2. Lazy Loading & Pagination
- **Conversations**: Load 20 conversations at a time
- **Messages**: Load 50 messages per conversation
- **Infinite Scroll**: "Load More" buttons for both conversations and messages
- **Performance**: Only loads what's needed, reducing initial load time

### 3. Copy & Edit Features
- **Copy Message**: Click copy icon to copy any message text to clipboard
- **Edit & Resend**: Click edit icon on user messages to edit and resend
- **Visual Feedback**: Hover over messages to see action buttons

### 4. Conversation Management
- **Create New**: Start fresh conversations anytime
- **Delete Conversations**: Remove unwanted conversations (with confirmation)
- **Auto-Update**: Conversation list updates with latest message preview
- **Timestamps**: Shows when conversations were last updated

### 5. Enhanced UI/UX
- **Loading States**: Spinners and loading indicators
- **Empty States**: Helpful messages when no conversations exist
- **Mobile Responsive**: Fully optimized for mobile devices
- **Smooth Animations**: Fade-in effects for new messages

## API Endpoints

### Conversations API (`/api/ai/conversations`)

#### GET - Fetch Conversations
```typescript
GET /api/ai/conversations?page=1&limit=20
Response: {
  conversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  hasMore: boolean;
  total: number;
}
```

#### POST - Create Conversation
```typescript
POST /api/ai/conversations
Body: { title?: string }
Response: { conversation: {...} }
```

#### DELETE - Delete Conversation
```typescript
DELETE /api/ai/conversations?id=conversationId
Response: { success: boolean }
```

### Messages API (`/api/ai/messages`)

#### GET - Fetch Messages
```typescript
GET /api/ai/messages?conversationId=xxx&page=1&limit=50
Response: {
  messages: Array<{
    id: string;
    text: string;
    sender: 'ai' | 'user';
    createdAt: Date;
  }>;
  hasMore: boolean;
  total: number;
}
```

#### POST - Save Message
```typescript
POST /api/ai/messages
Body: {
  conversationId: string;
  text: string;
  sender: 'ai' | 'user';
}
Response: { message: {...} }
```

### Chat API (`/api/ai/chat`)

#### POST - Send Message & Get AI Response
```typescript
POST /api/ai/chat
Body: {
  message: string;
  chatHistory: Array<Message>;
  conversationId?: string;
}
Response: {
  response: string;
  timestamp: string;
}
```

## Database Schema

### ai_conversations Collection
```typescript
{
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### ai_messages Collection
```typescript
{
  _id: ObjectId;
  conversationId: ObjectId;
  userId: ObjectId;
  sender: 'ai' | 'user';
  text: string;
  createdAt: Date;
}
```

## Usage Examples

### Creating a New Conversation
```typescript
const response = await fetch('/api/ai/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ title: 'My New Chat' })
});
const { conversation } = await response.json();
```

### Loading Messages with Pagination
```typescript
const response = await fetch(
  `/api/ai/messages?conversationId=${id}&page=1&limit=50`,
  { credentials: 'include' }
);
const { messages, hasMore } = await response.json();
```

### Sending a Message
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    message: 'Hello AI!',
    chatHistory: previousMessages,
    conversationId: currentConversationId
  })
});
const { response: aiResponse } = await response.json();
```

## Component Features

### State Management
- `conversations` - List of all conversations
- `messages` - Messages for selected conversation
- `selectedConversationId` - Currently active conversation
- `loading` - Initial loading state
- `loadingMore` - Pagination loading state
- `hasMoreConversations` - More conversations available
- `hasMoreMessages` - More messages available

### Key Functions
- `loadConversations(page)` - Load conversations with pagination
- `loadMessages(conversationId, page)` - Load messages with pagination
- `handleNewConversation()` - Create new conversation
- `handleDeleteConversation(id)` - Delete conversation
- `handleSendMessage(text)` - Send message and get AI response
- `handleCopyMessage(text)` - Copy message to clipboard
- `handleEditMessage(message)` - Edit and resend message
- `handleLoadMoreConversations()` - Load next page of conversations
- `handleLoadMoreMessages()` - Load earlier messages

## Performance Optimizations

1. **Lazy Loading**: Only loads data when needed
2. **Pagination**: Limits data transfer per request
3. **Memoization**: Uses useCallback for stable function references
4. **Efficient Updates**: Updates only affected conversations/messages
5. **Scroll Management**: Auto-scrolls to new messages smoothly

## Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Users can only access their own conversations
- **Validation**: Input validation on all API endpoints
- **Error Handling**: Graceful error handling with user feedback

## Future Enhancements

- [ ] Search conversations and messages
- [ ] Export conversation history
- [ ] Share conversations with other users
- [ ] Message reactions and favorites
- [ ] Voice message support
- [ ] File attachments in conversations
- [ ] Conversation folders/categories
- [ ] AI model selection per conversation
- [ ] Conversation templates
- [ ] Bulk delete conversations

## Troubleshooting

### Conversations Not Loading
- Check MongoDB connection
- Verify JWT token is valid
- Check browser console for errors

### Messages Not Saving
- Verify conversationId is provided
- Check MongoDB write permissions
- Ensure user is authenticated

### Pagination Not Working
- Check hasMore flags
- Verify page numbers are incrementing
- Check API response structure

## Testing

### Test Conversation Creation
1. Click "+ New Conversation"
2. Verify conversation appears in list
3. Check MongoDB for new document

### Test Message Persistence
1. Send a message
2. Refresh the page
3. Verify message is still there

### Test Lazy Loading
1. Create 25+ conversations
2. Scroll to bottom of list
3. Click "Load More"
4. Verify new conversations load

### Test Copy/Edit
1. Send a message
2. Hover over message
3. Click copy icon - verify clipboard
4. Click edit icon - verify input populated
