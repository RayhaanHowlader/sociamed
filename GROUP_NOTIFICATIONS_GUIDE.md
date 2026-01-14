# Group Chat Notifications Guide

## Overview
Browser notifications are **already enabled** for group chats! When a message is sent in a group, all members receive a browser notification (if they're not currently viewing that tab).

## How It Works

### 1. Automatic Notification Trigger
When a user sends a message in a group:
- All other group members receive a browser notification
- Notification only shows if the browser tab is NOT focused
- Prevents spam by not showing notifications for your own messages

### 2. Notification Content
The notification shows:
- **Title**: `[Sender Name] in [Group Name]`
- **Body**: Message content or file type
- **Icon**: Sender's avatar or group icon

### 3. Message Types
Different notifications for different content:
- **Text**: Shows the actual message
- **Photo**: "📷 Sent a photo"
- **Voice**: "🎤 Sent a voice message"
- **File**: "📎 Sent a file: [filename]"
- **Poll**: "📊 Created a poll"

## Implementation Details

### Components Involved

1. **use-notifications.ts**
   - Core notification hook
   - Handles permission requests
   - Shows notifications

2. **use-group-socket.ts**
   - Listens for group messages via WebSocket
   - Triggers notifications when messages arrive
   - Filters out own messages

3. **notification-prompt.tsx**
   - Prompts user to enable notifications
   - Shows 3 seconds after login
   - Can be dismissed

4. **group-chats.tsx**
   - Main group chat component
   - Integrates socket and notifications

### Code Flow

```
User A sends message in Group
    ↓
Socket server broadcasts to all group members
    ↓
User B's browser receives socket event
    ↓
use-group-socket.ts processes the message
    ↓
Checks if message is from another user
    ↓
Calls showNotification() from use-notifications.ts
    ↓
Browser shows notification (if tab not focused)
```

## Testing Notifications

### Method 1: Two Browsers
1. Open app in Chrome (User A)
2. Open app in Firefox/Edge (User B)
3. Both users join same group
4. User A sends message
5. User B should see notification (if Firefox/Edge tab is not focused)

### Method 2: Two Devices
1. Open app on Computer (User A)
2. Open app on Phone (User B)
3. Both users join same group
4. User A sends message
5. User B should see notification on phone

### Method 3: Test Button (Development)
Add the test button to your page:
```typescript
import { NotificationTestButton } from '@/components/nexus/notification-test-button';

// In your component
<NotificationTestButton />
```

## Troubleshooting

### Notifications Not Showing?

#### 1. Check Browser Permission
- Click the lock icon in address bar
- Look for "Notifications" setting
- Make sure it's set to "Allow"

#### 2. Check Browser Support
Supported browsers:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ❌ Incognito/Private mode (usually blocked)

#### 3. Check Tab Focus
- Notifications only show when tab is NOT focused
- Try switching to another tab after sending message

#### 4. Check Console Logs
Open browser console (F12) and look for:
```
[socket] group:message received
[LOCAL-ISOLATION] or notification logs
```

#### 5. Check Permission Status
In browser console, type:
```javascript
Notification.permission
```
Should return: `"granted"`, `"denied"`, or `"default"`

### Common Issues

#### Issue: "Notification permission is 'denied'"
**Solution**: 
1. Click lock icon in address bar
2. Reset notification permission
3. Refresh page
4. Allow when prompted

#### Issue: "Notifications work in Chrome but not Firefox"
**Solution**:
- Firefox has stricter notification policies
- Make sure site is not in "Do Not Disturb" mode
- Check Firefox notification settings

#### Issue: "I see my own messages as notifications"
**Solution**:
- This shouldn't happen - there's a filter
- Check console for errors
- Verify `currentUserId` is set correctly

#### Issue: "Notifications show even when tab is focused"
**Solution**:
- Check `document.hasFocus()` in use-notifications.ts
- This is intentional behavior (can be changed)

## Customization

### Change Notification Duration
Edit `use-notifications.ts`:
```typescript
setTimeout(() => {
  notification.close();
}, 5000); // Change to desired milliseconds
```

### Change Notification Sound
Browsers play default sound. To customize:
```typescript
const audio = new Audio('/notification-sound.mp3');
audio.play();
```

### Change Notification Icon
Edit `use-group-socket.ts`:
```typescript
showNotification({
  title: `${sender?.name} in ${group?.name}`,
  body: notificationBody,
  icon: '/custom-icon.png', // Change this
  // ...
});
```

### Disable Notifications for Specific Groups
Add a mute feature:
```typescript
// In group settings
const [isMuted, setIsMuted] = useState(false);

// In socket handler
if (!isMuted) {
  showNotification({...});
}
```

## Security & Privacy

### What Data is Sent?
- Sender name
- Group name
- Message preview (first 100 chars)
- Message type (text/photo/file)

### What Data is NOT Sent?
- Full message content (only preview)
- User passwords
- Authentication tokens
- Private user data

### Can Notifications Be Intercepted?
- Notifications are local to the browser
- No data is sent to external servers
- Uses browser's native notification API

## Performance

### Impact on Performance
- Minimal CPU usage
- No impact on message sending speed
- Notifications are async (non-blocking)

### Battery Impact
- Negligible on desktop
- Minimal on mobile
- WebSocket connection is efficient

## Browser Notification API

### Supported Features
- ✅ Title and body text
- ✅ Icon/image
- ✅ Click to focus app
- ✅ Auto-close after timeout
- ✅ Tag (prevents duplicates)
- ✅ Data payload

### Not Supported (Yet)
- ❌ Action buttons
- ❌ Rich media (video/audio)
- ❌ Notification history
- ❌ Notification grouping

## Future Enhancements

### Planned Features
1. **Notification Settings**
   - Per-group mute/unmute
   - Notification sound selection
   - Do Not Disturb mode

2. **Rich Notifications**
   - Reply directly from notification
   - Mark as read from notification
   - Quick actions

3. **Smart Notifications**
   - Only notify for mentions
   - Priority messages
   - Scheduled quiet hours

4. **Service Worker**
   - Offline notifications
   - Background sync
   - Push notifications (even when app is closed)

## Code Examples

### Manual Notification Test
```typescript
import { useNotifications } from './use-notifications';

function MyComponent() {
  const { showNotification } = useNotifications();

  const testNotification = () => {
    showNotification({
      title: 'Test',
      body: 'This is a test notification',
      icon: '/icon.png',
      tag: 'test',
      data: { type: 'test' }
    });
  };

  return <button onClick={testNotification}>Test</button>;
}
```

### Check Permission Status
```typescript
import { useNotifications } from './use-notifications';

function MyComponent() {
  const { permission, requestPermission } = useNotifications();

  return (
    <div>
      <p>Permission: {permission}</p>
      {permission === 'default' && (
        <button onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

## FAQ

**Q: Do notifications work on mobile?**
A: Yes, on supported browsers (Chrome, Firefox, Safari).

**Q: Can I disable notifications?**
A: Yes, click "Block" when prompted, or change in browser settings.

**Q: Do notifications work offline?**
A: No, you need an active internet connection for WebSocket.

**Q: Can I get notifications when app is closed?**
A: Not yet. This requires Service Worker implementation (planned).

**Q: Are notifications end-to-end encrypted?**
A: Message content in notifications is not encrypted. Only message preview is shown.

**Q: Can I customize notification appearance?**
A: Limited. Browser controls the appearance. You can change icon, title, and body text.

**Q: Do notifications drain battery?**
A: Minimal impact. WebSocket connection is efficient.

**Q: Can I get notifications for specific keywords?**
A: Not yet. This is a planned feature (mention notifications).

## Support

If notifications are not working:
1. Check browser console for errors
2. Verify WebSocket connection is active
3. Check notification permission status
4. Try in a different browser
5. Clear browser cache and cookies
6. Restart browser

## Summary

✅ **Notifications are already working!**
- Enabled for all group chats
- Shows when messages are received
- Works across all devices
- Respects browser permissions
- Filters out own messages
- Auto-closes after 5 seconds

Just make sure to:
1. Allow notifications when prompted
2. Keep browser tab open (can be in background)
3. Have active internet connection
4. Use supported browser
