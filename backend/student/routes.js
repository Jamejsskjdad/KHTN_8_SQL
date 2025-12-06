// backend/student/routes.js
const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { getProfile, getMyPosts } = require('./profile');

const router = express.Router();

/**
 * GET /api/student/profile
 */
router.get('/profile', requireAuth, getProfile);

/**
 * GET /api/student/my-posts
 */
router.get('/my-posts', requireAuth, getMyPosts);

/**
 * POST /api/student/posts
 * User gửi bài mới (pending)
 */
router.post('/posts', requireAuth, async (req, res) => {
  const { title, type, linkOrImage } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Thiếu tiêu đề hoặc loại' });
  }

  try {
    const pool = await getPool();

    await pool.request()
      .input('userId', req.user.userId)
      .input('title', title)
      .input('type', type)
      .input('linkOrImage', linkOrImage || null)
      .query(`
        INSERT INTO Posts (UserId, Title, Type, LinkOrImage, Status)
        VALUES (@userId, @title, @type, @linkOrImage, 'pending')
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi student gửi bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
