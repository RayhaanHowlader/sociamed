# Add Dummy Analytics Data

To add dummy analytics data to your short (ID: 69a30eaf141c04dcd4242854), follow these steps:

## Option 1: Using Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Paste and run this code:

```javascript
fetch('/api/shorts/69a30eaf141c04dcd4242854/add-dummy-analytics', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Dummy data added:', data))
.catch(err => console.error('Error:', err));
```

## Option 2: Using PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/shorts/69a30eaf141c04dcd4242854/add-dummy-analytics" -Method POST -UseBasicParsing
```

## Option 3: Using Node.js Script

Run the script:
```bash
node scripts/add-dummy-analytics.js
```

Make sure to set your MONGODB_URI environment variable first.

## What Gets Added

The dummy data includes:
- **Views**: 150-750 views over the last 30 days
- **Watch Time**: Random watch times between 10-60 seconds per view
- **Completion Rate**: ~75% of views marked as completed
- **Likes**: ~30% of total views
- **Comments**: ~10% of total views with random positive comments

## After Adding Data

1. Refresh the Shorts Analytics Dashboard
2. You should see:
   - Populated graphs showing views over time
   - Accurate statistics for views, likes, comments
   - Average watch time and completion rate
   - Individual short performance metrics
