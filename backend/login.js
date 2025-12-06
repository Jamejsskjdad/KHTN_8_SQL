// backend/login.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { getPool } = require('./db');              // vì db.js cùng thư mục backend
const { SECRET } = require('./auth/middleware');  // middleware nằm trong backend/auth

/**
 * Đăng ký student (role mặc định: 'user')
 * POST /api/auth/register
 */
// backend/login.js

async function register(req, res) {
  const { username, email, password, className } = req.body || {};
  // className: tên lớp người dùng nhập, ví dụ "8A1"

  if (!username || !email || !password || !className) {
    return res.status(400).json({ error: 'Thiếu username, email, password hoặc class' });
  }

  try {
    const pool = await getPool();

    // kiểm tra trùng
    const check = await pool.request()
      .input('username', username)
      .input('email', email)
      .query(`
        SELECT 1
        FROM Users
        WHERE Username = @username OR Email = @email
      `);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: 'Username hoặc email đã tồn tại' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('username', username)
      .input('email', email)
      .input('passwordHash', hash)
      .input('class', className) // <-- thêm dòng này
      .query(`
        INSERT INTO Users (Username, Email, PasswordHash, Role, Class)
        OUTPUT INSERTED.UserId, INSERTED.Role
        VALUES (@username, @email, @passwordHash, 'user', @class)
      `);

    const user = result.recordset[0];

    const token = jwt.sign(
      { userId: user.UserId, username, role: user.Role },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      role: user.Role,
      username,
      class: className, // nếu muốn trả về luôn
    });
  } catch (err) {
    console.error('Lỗi register:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}
// 👉 THÊM HÀM MỚI: registerAdmin (tạo user có role = 'admin')
async function registerAdmin(req, res) {
    const { username, email, password } = req.body || {};
  
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Thiếu username, email hoặc password' });
    }
  
    try {
      const pool = await getPool();
  
      const check = await pool.request()
        .input('username', username)
        .input('email', email)
        .query(`
          SELECT 1
          FROM Users
          WHERE Username = @username OR Email = @email
        `);
  
      if (check.recordset.length > 0) {
        return res.status(400).json({ error: 'Username hoặc email đã tồn tại' });
      }
  
      const hash = await bcrypt.hash(password, 10);
  
      const result = await pool.request()
        .input('username', username)
        .input('email', email)
        .input('passwordHash', hash)
        .query(`
          INSERT INTO Users (Username, Email, PasswordHash, Role)
          OUTPUT INSERTED.UserId, INSERTED.Role
          VALUES (@username, @email, @passwordHash, 'admin')
        `);
  
      const user = result.recordset[0];
  
      const token = jwt.sign(
        { userId: user.UserId, username, role: user.Role },
        SECRET,
        { expiresIn: '7d' }
      );
  
      res.json({
        token,
        role: user.Role,      // 'admin'
        username,
      });
    } catch (err) {
      console.error('Lỗi registerAdmin:', err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  }
/**
 * Đăng nhập (dùng cho cả admin & student)
 * POST /api/auth/login
 */
async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu username hoặc password' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT TOP 1 UserId, Username, Email, PasswordHash, Role
        FROM Users
        WHERE Username = @username
      `);

    if (result.recordset.length === 0) {
      return res.status(400).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    }

    const user = result.recordset[0];

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    }

    const token = jwt.sign(
      { userId: user.UserId, username: user.Username, role: user.Role },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      role: user.Role,       // 'admin' hoặc 'user'
      username: user.Username,
    });
  } catch (err) {
    console.error('Lỗi login:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

/**
 * Lấy thông tin user hiện tại từ token
 * GET /api/auth/me
 */
async function me(req, res) {
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
    console.error('Lỗi GET /me:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = {
  register,
  registerAdmin,
  login,
  me,
};
