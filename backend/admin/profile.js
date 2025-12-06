// backend/admin/profile.js
const { getPool } = require('../db');

/**
 * GET /api/admin/profile
 * Trả về thông tin tài khoản admin hiện tại (dựa trên req.user)
 */
async function getProfile(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', req.user.userId)
      .query(`
        SELECT UserId, Username, Email, Role
        FROM Users
        WHERE UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Lỗi lấy profile admin:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = { getProfile };
