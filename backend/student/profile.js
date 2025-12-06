// backend/student/profile.js
const { getPool } = require('../db');

/**
 * GET /api/student/profile
 * Trả về thông tin student hiện tại
 */
async function getProfile(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', req.user.userId)
      .query(`
        SELECT UserId, Username, Email, Role, Class
        FROM Users
        WHERE UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Lỗi lấy profile student:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

/**
 * GET /api/student/my-posts
 * Lấy danh sách bài do student hiện tại gửi lên (Posts table)
 */
async function getMyPosts(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', req.user.userId)
      .query(`
        SELECT 
          PostId,
          Title,
          Type,
          LinkOrImage,
          Status,
          CreatedAt
        FROM Posts
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy bài của student:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = { getProfile, getMyPosts };
