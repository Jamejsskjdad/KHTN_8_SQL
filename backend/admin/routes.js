// backend/admin/routes.js
const express = require('express');
const { getPool } = require('../db');
const { requireAuth, requireAdmin } = require('../auth/middleware');

const router = express.Router();

// Lấy danh sách bài pending
router.get('/posts/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.PostId, p.Title, p.Type, p.LinkOrImage, p.CreatedAt,
             u.Username AS CreatedBy
      FROM Posts p
      JOIN Users u ON p.UserId = u.UserId
      WHERE p.Status = 'pending'
      ORDER BY p.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Duyệt bài
router.post('/posts/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) return res.status(400).json({ error: 'PostId không hợp lệ' });

  try {
    const pool = await getPool();
    // cập nhật status
    await pool.request()
      .input('postId', postId)
      .query(`
        UPDATE Posts
        SET Status = 'approved'
        WHERE PostId = @postId
      `);

    // TODO: thêm bước ghi post này vào hệ thống JSON (videos/comics/...),
    // giống như cách bạn đang thêm nội dung hiện tại.

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
