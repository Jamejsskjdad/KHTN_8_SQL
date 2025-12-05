// backend/student/routes.js
const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

// User gửi bài mới (pending)
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
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
