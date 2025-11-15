// Quick script to check posts in database
require('dotenv').config();
const mongoose = require('mongoose');

async function checkPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Post = require('./server/models/post.model');
    const count = await Post.countDocuments();
    console.log(`\n📊 Total posts in database: ${count}`);

    if (count > 0) {
      const posts = await Post.find().limit(5).sort({ createdAt: -1 });
      console.log('\n📝 Recent posts:');
      posts.forEach((post, i) => {
        console.log(`\n${i + 1}. Post ID: ${post._id}`);
        console.log(`   User ID: ${post.userId}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Caption: ${post.caption?.substring(0, 50)}...`);
        console.log(`   Created: ${post.createdAt}`);
      });
    } else {
      console.log('\n❌ No posts found in database');
      console.log('💡 Generate some posts using the AI Post Generator to see data here!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPosts();
