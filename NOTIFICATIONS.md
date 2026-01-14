# Browser Notifications Feature

## Overview
The application now supports browser push notifications for real-time message alerts. Users will receive Chrome/browser notifications when they receive messages, even when the tab is not focused.

## Features

### Direct Messages
- Get notified when receiving a new direct message
- Shows sender's name and avatar
- Different notification text for:
  - Text messages
  - Photos (📷 Sent a photo)
  - Voice messages (🎤 Sent a voice message)
  - Files (📎 Sent a file: filename)
  - Shared posts (📝 Shared a post)

### Group Messages
- Get notified when receiving a group message
- Shows sender's name and group name
- Same notification types as direct messages
- Additional support for polls (📊 Created a poll)

## How It Works

### Permission Request
- A friendly prompt appears 3 seconds after login
- Users can enable or dismiss the prompt
- Dismissal is remembered in localStorage
- Can be re-enabled from browser settings

### Smart Notifications
- Only shows when the browser tab is NOT focused
- Prevents duplicate notifications for your own messages
- Auto-closes after 5 seconds
- Click notification to focus the app and open the chat

## Implementation Files

### Core Files
- `components/nexus/use-notifications.ts` - Main notification hook
- `components/nexus/notification-prompt.tsx` - Permission prompt UI
- `components/nexus/direct-messages.tsx` - Direct message notifications
- `components/nexus/use-group-socket.ts` - Group message notifications
- `app/page.tsx` - Notification prompt integration

### Key Functions

#### `useNotifications()` Hook
```typescript
const { showNotification, requestPermission, isSupported, permission } = useNotifications();

// Show a notification
showNotification({
  title: 'John Doe',
  body: 'Hey, how are you?',
  icon: '/avatar.jpg',
  tag: 'message-123',
  data: { type: 'message', userId: '123' }
});
```

#### Permission States
- `default` - Not yet requested
- `granted` - User allowed notifications
- `denied` - User blocked notifications

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (macOS/iOS)
- Opera: Full support

## Testing

### Test Direct Messages
1. Open the app in two different browsers/devices
2. Log in as different users
3. Send a message from one device
4. Verify notification appears on the other device (if tab is not focused)

### Test Group Messages
1. Create a group with multiple members
2. Open the app on different devices with different users
3. Send a message in the group
4. Verify all members receive notifications

## Customization

### Change Notification Duration
Edit `use-notifications.ts`:
```typescript
setTimeout(() => {
  notification.close();
}, 5000); // Change to desired milliseconds
```

### Change Prompt Delay
Edit `notification-prompt.tsx`:
```typescript
const timer = setTimeout(() => {
  setShow(true);
}, 3000); // Change to desired milliseconds
```

### Add Custom Icons
Place icon files in `/public` folder and reference them:
```typescript
icon: '/icon-192x192.png'
```

## Privacy & Security
- Notifications only show when user has granted permission
- No sensitive message content in notifications (optional)
- Notifications auto-close after 5 seconds
- User can revoke permission anytime from browser settings

## Troubleshooting

### Notifications Not Showing
1. Check browser permission settings
2. Ensure the tab is not focused (notifications only show when tab is in background)
3. Check browser console for errors
4. Verify `Notification.permission === 'granted'`

### Permission Prompt Not Appearing
1. Check if already dismissed (clear localStorage)
2. Verify browser supports notifications
3. Check if permission was already granted/denied

### Notifications Showing for Own Messages
- This is prevented by checking `message.fromUserId !== currentUserId`
- Verify currentUserId is set correctly

## Future Enhancements
- [ ] Service Worker for offline notifications
- [ ] Notification sound customization
- [ ] Notification grouping for multiple messages
- [ ] Rich notifications with action buttons
- [ ] Desktop notification persistence
