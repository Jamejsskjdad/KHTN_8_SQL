const bcrypt = require('bcrypt');
const db = require('../db');

// Hỗ trợ cả 2 kiểu export:
// 1) module.exports = getPool
// 2) module.exports = { getPool }
const getPool = typeof db === 'function' ? db : db.getPool;

// Helper: đọc thông tin từ req.user (payload token)
function getIdentityFromReq(req) {
  const u = req.user || {};

  // các khả năng thường gặp
  const userId =
    u.userId ??
    u.UserId ??
    u.id ??
    u.Id ??
    null;

  const username =
    u.username ??
    u.Username ??
    null;

  return { userId, username };
}

// =================== LẤY PROFILE ADMIN ===================
async function getProfile(req, res) {
  const { userId, username } = getIdentityFromReq(req);

  if (!userId && !username) {
    return res.status(401).json({ message: 'Không xác thực được người dùng.' });
  }

  try {
    const pool = await getPool();

    let result;
    if (userId) {
      // Ưu tiên lấy theo UserId
      result = await pool
        .request()
        .input('UserId', userId)
        .query(`
          SELECT UserId, Username, Email, Role, CreatedAt, class
          FROM Users
          WHERE UserId = @UserId
        `);
    } else {
      // fallback: lấy theo Username
      result = await pool
        .request()
        .input('Username', username)
        .query(`
          SELECT UserId, Username, Email, Role, CreatedAt, class
          FROM Users
          WHERE Username = @Username
        `);
    }

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    const user = result.recordset[0];

    res.json({
      UserId: user.UserId,
      Username: user.Username,
      Email: user.Email,
      Role: user.Role,
      CreatedAt: user.CreatedAt,
      Class: user.class
    });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin.' });
  }
}

// =================== CẬP NHẬT HỌ TÊN + EMAIL ===================
async function updateProfile(req, res) {
  let { userId, username } = getIdentityFromReq(req);
  const { fullname, email } = req.body || {};

  if (!fullname || !email) {
    return res.status(400).json({ message: 'Thiếu họ tên hoặc email.' });
  }

  try {
    const pool = await getPool();

    // Nếu token chưa có userId, lấy ra từ Username
    if (!userId && username) {
      const r = await pool
        .request()
        .input('Username', username)
        .query(`
          SELECT UserId FROM Users WHERE Username = @Username
        `);

      if (!r.recordset || r.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
      }

      userId = r.recordset[0].UserId;
    }

    if (!userId) {
      return res.status(401).json({ message: 'Không xác thực được người dùng.' });
    }

    // Ở đây mình map "Họ và tên" vào cột Username (vì bảng không có cột Name riêng)
    await pool
      .request()
      .input('UserId', userId)
      .input('FullName', fullname)
      .input('Email', email)
      .query(`
        UPDATE Users
        SET Username = @FullName,
            Email = @Email
        WHERE UserId = @UserId
      `);

    res.json({ message: 'Cập nhật thông tin thành công.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin.' });
  }
}

// =================== ĐỔI MẬT KHẨU ===================
async function changePassword(req, res) {
  let { userId, username } = getIdentityFromReq(req);
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới.' });
  }

  try {
    const pool = await getPool();

    // Nếu token chưa có userId, lấy ra từ Username
    if (!userId && username) {
      const r = await pool
        .request()
        .input('Username', username)
        .query(`
          SELECT UserId FROM Users WHERE Username = @Username
        `);

      if (!r.recordset || r.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
      }

      userId = r.recordset[0].UserId;
    }

    if (!userId) {
      return res.status(401).json({ message: 'Không xác thực được người dùng.' });
    }

    // Lấy hash hiện tại
    const result = await pool
      .request()
      .input('UserId', userId)
      .query(`
        SELECT PasswordHash
        FROM Users
        WHERE UserId = @UserId
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    const user = result.recordset[0];
    const currentHash = user.PasswordHash;

    const ok = await bcrypt.compare(oldPassword, currentHash);
    if (!ok) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool
      .request()
      .input('UserId', userId)
      .input('NewPasswordHash', newHash)
      .query(`
        UPDATE Users
        SET PasswordHash = @NewPasswordHash
        WHERE UserId = @UserId
      `);

    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
