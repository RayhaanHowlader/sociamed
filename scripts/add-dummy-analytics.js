// Script to add dummy analytics data for a short
// Run with: node scripts/add-dummy-analytics.js

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sociamed';
const SHORT_ID = '69a30eaf141c04dcd4242854';

async function addDummyAnalytics() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const shortViews = db.collection('shortViews');
    const shorts = db.collection('shorts');
    
    // Check if short exists
    const short = await shorts.findOne({ _id: new ObjectId(SHORT_ID) });
    if (!short) {
      console.error('Short not found!');
      return;
    }
    
    console.log('Found short:', short.caption || 'Untitled');
    console.log('Adding dummy analytics data...');
    
    // Clear existing views for this short
    await shortViews.deleteMany({ shortId: SHORT_ID });
    console.log('Cleared existing views');
    
    // Generate dummy views for the last 30 days
    const now = new Date();
    const views = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Random number of views per day (0-20)
      const viewsCount = Math.floor(Math.random() * 20) + 1;
      
      for (let j = 0; j < viewsCount; j++) {
        // Random time during the day
        const viewDate = new Date(date);
        viewDate.setHours(Math.floor(Math.random() * 24));
        viewDate.setMinutes(Math.floor(Math.random() * 60));
        
        // Random watch time (5-60 seconds)
        const watchTime = Math.floor(Math.random() * 55) + 5;
        
        // 70% completion rate
        const completed = Math.random() < 0.7;
        
        views.push({
          shortId: SHORT_ID,
          userId: `user_${Math.floor(Math.random() * 100)}`,
          watchTime,
          completed,
          createdAt: viewDate
        });
      }
    }
    
    // Insert all views
    if (views.length > 0) {
      await shortViews.insertMany(views);
      console.log(`Added ${views.length} dummy views`);
    }
    
    // Update short views count
    await shorts.updateOne(
      { _id: new ObjectId(SHORT_ID) },
      { $set: { views: views.length } }
    );
    console.log(`Updated short views count to ${views.length}`);
    
    // Add some likes
    const shortLikes = db.collection('shortLikes');
    await shortLikes.deleteMany({ shortId: SHORT_ID });
    
    const likesCount = Math.floor(views.length * 0.3); // 30% like rate
    const likes = [];
    for (let i = 0; i < likesCount; i++) {
      likes.push({
        shortId: SHORT_ID,
        userId: `user_${Math.floor(Math.random() * 100)}`,
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    if (likes.length > 0) {
      await shortLikes.insertMany(likes);
      console.log(`Added ${likes.length} dummy likes`);
    }
    
    // Add some comments
    const shortComments = db.collection('shortComments');
    await shortComments.deleteMany({ shortId: SHORT_ID });
    
    const commentsCount = Math.floor(views.length * 0.1); // 10% comment rate
    const comments = [];
    const commentTexts = [
      'Great video!',
      'Love this!',
      'Amazing content',
      'Keep it up!',
      'This is awesome',
      'Nice work',
      'Impressive!',
      'Well done',
      'Fantastic!',
      'So cool!'
    ];
    
    for (let i = 0; i < commentsCount; i++) {
      comments.push({
        shortId: SHORT_ID,
        userId: `user_${Math.floor(Math.random() * 100)}`,
        content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
        author: {
          name: `User ${Math.floor(Math.random() * 100)}`,
          username: `user${Math.floor(Math.random() * 100)}`
        },
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    if (comments.length > 0) {
      await shortComments.insertMany(comments);
      console.log(`Added ${comments.length} dummy comments`);
    }
    
    console.log('\nDummy analytics data added successfully!');
    console.log(`Total Views: ${views.length}`);
    console.log(`Total Likes: ${likes.length}`);
    console.log(`Total Comments: ${comments.length}`);
    console.log(`Avg Watch Time: ${(views.reduce((sum, v) => sum + v.watchTime, 0) / views.length).toFixed(1)}s`);
    console.log(`Completion Rate: ${(views.filter(v => v.completed).length / views.length * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

addDummyAnalytics();
