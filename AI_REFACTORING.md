# AI Assistant Refactoring

## Overview
The AI Assistant component has been refactored from a single large file (~700+ lines) into smaller, reusable components and custom hooks for better maintainability and code organization.

## Component Structure

### Main Component
- **ai-assistant.tsx** (150 lines) - Main orchestrator component

### Sub-Components
1. **ai-sidebar.tsx** (100 lines)
   - Displays conversation list
   - Handles conversation selection
   - Shows loading states
   - "New Conversation" button

2. **ai-conversation-item.tsx** (60 lines)
   - Individual conversation item
   - Delete button with hover effect
   - Selected state styling

3. **ai-chat-header.tsx** (30 lines)
   - Chat header with bot avatar
   - Conversation title
   - Online status indicator

4. **ai-messages-area.tsx** (70 lines)
   - Messages container with scroll
   - Load more messages button
   - Typing indicator
   - Auto-scroll to bottom

5. **ai-message-bubble.tsx** (80 lines)
   - Individual message bubble
   - Copy button
   - Edit button (for user messages)
   - Timestamp display

6. **ai-input-area.tsx** (90 lines)
   - Message input field
   - Voice input button
   - Send button
   - Edit mode indicator

### Custom Hook
- **use-ai-assistant.ts** (200 lines)
  - All state management
  - API calls (conversations, messages, chat)
  - Business logic
  - Event handlers

## Benefits of Refactoring

### 1. Code Organization
- Each component has a single responsibility
- Easy to locate and modify specific features
- Clear separation of concerns

### 2. Reusability
- Components can be reused in other parts of the app
- Easy to create variations (e.g., different message styles)

### 3. Maintainability
- Smaller files are easier to understand
- Changes are isolated to specific components
- Reduced risk of breaking unrelated features

### 4. Testability
- Each component can be tested independently
- Mock props easily for unit tests
- Custom hook can be tested separately

### 5. Performance
- Components can be memoized individually
- Easier to identify performance bottlenecks
- Selective re-rendering

## File Sizes Comparison

### Before Refactoring
- ai-assistant.tsx: ~700 lines

### After Refactoring
- ai-assistant.tsx: 150 lines
- ai-sidebar.tsx: 100 lines
- ai-conversation-item.tsx: 60 lines
- ai-chat-header.tsx: 30 lines
- ai-messages-area.tsx: 70 lines
- ai-message-bubble.tsx: 80 lines
- ai-input-area.tsx: 90 lines
- use-ai-assistant.ts: 200 lines

**Total: 780 lines** (distributed across 8 files)

## Component Hierarchy

```
AIAssistant
├── AISidebar
│   └── AIConversationItem (multiple)
├── AIChatHeader
├── AIMessagesArea
│   └── AIMessageBubble (multiple)
└── AIInputArea
```

## Props Flow

### AIAssistant → AISidebar
- conversations
- selectedConversationId
- loading states
- event handlers

### AIAssistant → AIMessagesArea
- messages
- isTyping
- hasMoreMessages
- event handlers

### AIAssistant → AIInputArea
- inputMessage
- isListening
- isSending
- editingMessageId
- event handlers

## State Management

All state is managed in the `use-ai-assistant` hook:
- Conversations list
- Selected conversation
- Messages
- Input state
- Loading states
- Pagination state

## Event Handlers

### Conversation Events
- `onConversationSelect` - Select a conversation
- `onDeleteConversation` - Delete a conversation
- `onNewConversation` - Create new conversation
- `onLoadMore` - Load more conversations

### Message Events
- `onCopyMessage` - Copy message text
- `onEditMessage` - Edit and resend message
- `onLoadMore` - Load earlier messages

### Input Events
- `onMessageChange` - Update input text
- `onSend` - Send message
- `onKeyDown` - Handle Enter key
- `onVoiceInput` - Toggle voice input
- `onCancelEdit` - Cancel edit mode

## Future Improvements

1. **Memoization**
   - Add React.memo to components
   - Use useMemo for expensive calculations
   - Use useCallback for event handlers

2. **Error Boundaries**
   - Add error boundaries around components
   - Graceful error handling

3. **Loading Skeletons**
   - Replace spinners with skeleton screens
   - Better perceived performance

4. **Virtualization**
   - Implement virtual scrolling for long lists
   - Improve performance with many conversations/messages

5. **Accessibility**
   - Add ARIA labels
   - Keyboard navigation
   - Screen reader support

6. **Testing**
   - Unit tests for each component
   - Integration tests for user flows
   - E2E tests for critical paths

## Migration Guide

If you need to modify the AI Assistant:

1. **Adding a new feature to sidebar** → Edit `ai-sidebar.tsx`
2. **Changing message appearance** → Edit `ai-message-bubble.tsx`
3. **Modifying input behavior** → Edit `ai-input-area.tsx`
4. **Adding new API calls** → Edit `use-ai-assistant.ts`
5. **Changing overall layout** → Edit `ai-assistant.tsx`

## Code Examples

### Using AIMessageBubble
```typescript
<AIMessageBubble
  message={message}
  onCopy={(text) => navigator.clipboard.writeText(text)}
  onEdit={(msg) => setInputMessage(msg.text)}
/>
```

### Using AISidebar
```typescript
<AISidebar
  conversations={conversations}
  selectedConversationId={selectedId}
  loading={loading}
  onConversationSelect={handleSelect}
  onDeleteConversation={handleDelete}
  onNewConversation={handleNew}
/>
```

### Using the Hook
```typescript
const {
  conversations,
  messages,
  handleSendMessage,
  loadConversations
} = useAIAssistant();
```
