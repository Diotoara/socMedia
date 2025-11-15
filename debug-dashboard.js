// Debug dashboard stats issue
require('dotenv').config();
const mongoose = require('mongoose');

async function debugDashboard() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Post = require('./server/models/post.model');
    const User = require('./server/models/User');

    // Get all users
    const users = await User.find({}, { _id: 1, email: 1, name: 1 });
    console.log('👥 Users in database:');
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} (${user.email})`);
      console.log(`   User ID: ${user._id}\n`);
    });

    // Get posts count for each user
    console.log('📊 Posts per user:');
    for (const user of users) {
      const count = await Post.countDocuments({ userId: user._id });
      const published = await Post.countDocuments({ userId: user._id, status: 'published' });
      console.log(`${user.name}:`);
      console.log(`   Total: ${count} posts`);
      console.log(`   Published: ${published} posts\n`);
    }

    // Check if there are posts with no matching user
    const allPosts = await Post.find({}, { userId: 1 }).limit(5);
    console.log('🔍 Sample post user IDs:');
    allPosts.forEach((post, i) => {
      console.log(`${i + 1}. Post userId: ${post.userId}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugDashboard();
