// backend/admin/manager_user.js
const { sql, getPool } = require('../db');  // dùng backend/db.js
const bcrypt = require('bcrypt');

/**
 * GET /api/admin/users
 * Lấy toàn bộ danh sách user để hiển thị ở trang quản lý.
 */
async function getAllUsers(req, res) {
    try {
      const pool = await getPool();
  
      const result = await pool.request().query(`
        SELECT 
          UserId      AS id,
          Username    AS username,
          Email       AS email,
          Role        AS role,
          CreatedAt   AS createdAt,
          [class]     AS className,
          Fullname    AS fullName
        FROM Users
        ORDER BY CreatedAt DESC, UserId DESC
      `);
  
      console.log('API /api/admin/users ->', result.recordset); // <== THÊM DÒNG NÀY
  
      return res.json(result.recordset);
    } catch (err) {
      console.error('Lỗi getAllUsers:', err);
      return res
        .status(500)
        .json({ error: 'Lỗi server khi lấy danh sách người dùng' });
    }
  }
  

/**
 * PUT /api/admin/users/:id
 * Cập nhật thông tin user.
 * Body: { fullName, email, className, role, password? }
 *  - password: nếu không gửi hoặc rỗng => không đổi mật khẩu
 */
async function updateUser(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { fullName, email, className, role, password } = req.body || {};

  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'UserId không hợp lệ' });
  }

  if (!fullName || !email || !role) {
    return res
      .status(400)
      .json({ error: 'fullName, email, role là bắt buộc' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('UserId', sql.Int, userId);
    request.input('Fullname', sql.NVarChar(50), fullName);
    request.input('Email', sql.NVarChar(255), email);
    request.input('Class', sql.NVarChar(50), className || null);
    request.input('Role', sql.NVarChar(20), role);

    let updateSql = `
      UPDATE Users
      SET 
        Fullname = @Fullname,
        Email    = @Email,
        [class]  = @Class,
        Role     = @Role
    `;

    // Nếu có password mới → hash rồi cập nhật
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      request.input('PasswordHash', sql.NVarChar(255), hash);
      updateSql += `, PasswordHash = @PasswordHash`;
    }

    updateSql += ` WHERE UserId = @UserId`;

    const result = await request.query(updateSql);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: 'Không tìm thấy user cần cập nhật' });
    }

    return res.json({ message: 'Cập nhật người dùng thành công' });
  } catch (err) {
    console.error('Lỗi updateUser:', err);
    return res
      .status(500)
      .json({ error: 'Lỗi server khi cập nhật người dùng' });
  }
}

module.exports = {
  getAllUsers,
  updateUser,
};
