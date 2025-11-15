const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const Post = require('../models/post.model');
const { authMiddleware } = require('../middleware/auth.middleware');

// Get dashboard stats
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user._id;
    console.log('[Stats] Fetching stats for userId:', userId);

    // Get actual posts count from Post model
    const totalPosts = await Post.countDocuments({ userId });
    console.log('[Stats] Total posts found:', totalPosts);
    
    // Get published posts count
    const publishedPosts = await Post.countDocuments({ 
      userId,
      status: 'published'
    });

    // Get posts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPosts = await Post.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get posts from last 7 days for engagement calculation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyPosts = await Post.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Calculate stats
    const activeUsers = 1; // Current user

    // Calculate changes
    const postsChange = recentPosts > 0 && totalPosts > 0 
      ? `+${Math.min(100, Math.round((recentPosts / totalPosts) * 100))}%` 
      : '+0%';
    
    const aiChange = publishedPosts > 0 
      ? `+${Math.min(100, Math.round((publishedPosts / Math.max(totalPosts, 1)) * 100))}%` 
      : '+0%';

    // Calculate engagement rate (published vs total)
    const engagementRate = totalPosts > 0 
      ? Math.round((publishedPosts / totalPosts) * 100) 
      : 0;

    res.json({
      totalPosts: totalPosts.toString(),
      aiGenerated: publishedPosts.toString(),
      engagement: `${engagementRate}%`,
      activeUsers: activeUsers.toString(),
      postsChange,
      aiChange,
      engagementChange: weeklyPosts > 0 ? `+${weeklyPosts}` : '+0%',
      usersChange: '+0%'
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      totalPosts: '0',
      aiGenerated: '0',
      engagement: '0%',
      activeUsers: '1',
      postsChange: '+0%',
      aiChange: '+0%',
      engagementChange: '+0%',
      usersChange: '+0%'
    });
  }
});

module.exports = router;
