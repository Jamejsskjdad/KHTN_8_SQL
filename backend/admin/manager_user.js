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
/**
 * POST /api/admin/users
 * Tạo mới một user
 * Body: { fullName, username, email, password, className, role }
 */
async function createUser(req, res) {
    const { fullName, username, email, password, className, role } = req.body || {};
  
    // Validate cơ bản
    if (!fullName || !username || !email || !password || !role) {
      return res.status(400).json({
        error: 'fullName, username, email, password, role là bắt buộc',
      });
    }
  
    try {
      const pool = await getPool();
  
      // 1. Kiểm tra trùng username / email
      const checkReq = pool.request();
      checkReq.input('Username', sql.NVarChar(50), username);
      checkReq.input('Email', sql.NVarChar(255), email);
  
      const checkResult = await checkReq.query(`
        SELECT TOP 1 UserId
        FROM Users
        WHERE Username = @Username OR Email = @Email
      `);
  
      if (checkResult.recordset.length > 0) {
        return res
          .status(400)
          .json({ error: 'Username hoặc email đã tồn tại' });
      }
  
      // 2. Hash password
      const passwordHash = await bcrypt.hash(password, 10);
  
      // Chuẩn hoá role về 'admin' | 'user'
      const normalizedRole =
        String(role).toLowerCase() === 'admin' ? 'admin' : 'user';
  
      // 3. Insert user mới
      const insertReq = pool.request();
      insertReq.input('Username', sql.NVarChar(50), username);
      insertReq.input('Email', sql.NVarChar(255), email);
      insertReq.input('PasswordHash', sql.NVarChar(255), passwordHash);
      insertReq.input('Role', sql.NVarChar(20), normalizedRole);
      insertReq.input('Class', sql.NVarChar(50), className || null);
      insertReq.input('Fullname', sql.NVarChar(50), fullName);
  
      const insertResult = await insertReq.query(`
        INSERT INTO Users (Username, Email, PasswordHash, Role, CreatedAt, [class], Fullname)
        OUTPUT 
          INSERTED.UserId    AS id,
          INSERTED.Username  AS username,
          INSERTED.Email     AS email,
          INSERTED.Role      AS role,
          INSERTED.CreatedAt AS createdAt,
          INSERTED.[class]   AS className,
          INSERTED.Fullname  AS fullName
        VALUES (
          @Username,
          @Email,
          @PasswordHash,
          @Role,
          GETUTCDATE(),
          @Class,
          @Fullname
        )
      `);
  
      const newUser = insertResult.recordset[0];
  
      return res.status(201).json(newUser);
    } catch (err) {
      console.error('Lỗi createUser:', err);
      return res
        .status(500)
        .json({ error: 'Lỗi server khi tạo người dùng' });
    }
  }
  
module.exports = {
  getAllUsers,
  updateUser,
  createUser,  
};
