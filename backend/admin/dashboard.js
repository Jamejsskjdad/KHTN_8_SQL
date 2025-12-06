// backend/admin/dashboard.js
const { getPool } = require('../db');

/**
 * GET /api/admin/posts/pending
 * Lấy danh sách bài đang chờ duyệt
 */
async function getPendingPosts(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        p.PostId,
        p.Title,
        p.Type,
        p.LinkOrImage,
        p.Status,
        p.CreatedAt,
        u.Username AS CreatedBy
      FROM Posts p
      JOIN Users u ON p.UserId = u.UserId
      WHERE p.Status = 'pending'
      ORDER BY p.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy bài pending:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

/**
 * POST /api/admin/posts/:id/approve
 * Duyệt 1 bài (chỉ đổi Status = 'approved')
 * TODO: nếu muốn, sau này thêm bước ghi ra file JSON để hiện trên trang chính
 */
async function approvePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'PostId không hợp lệ' });
  }

  try {
    const pool = await getPool();

    // Cập nhật trạng thái
    const result = await pool.request()
      .input('postId', postId)
      .query(`
        UPDATE Posts
        SET Status = 'approved'
        WHERE PostId = @postId;

        SELECT @@ROWCOUNT AS AffectedRows;
      `);

    const affected = result.recordset[0]?.AffectedRows || 0;
    if (!affected) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết để duyệt' });
    }

    // (tuỳ bạn) thêm logic ghi ra JSON ở đây

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi duyệt bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = {
  getPendingPosts,
  approvePost,
};
