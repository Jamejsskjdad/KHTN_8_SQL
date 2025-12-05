// backend/auth/routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const { SECRET } = require('./middleware');

const router = express.Router();

// Đăng ký
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }

  try {
    const pool = await getPool();

    // kiểm tra trùng username/email
    const check = await pool.request()
      .input('username', username)
      .input('email', email)
      .query(`
        SELECT 1 FROM Users
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
        VALUES (@username, @email, @passwordHash, 'user')
      `);

    const user = result.recordset[0];

    const token = jwt.sign(
      { userId: user.UserId, role: user.Role, username },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.Role, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
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
      { userId: user.UserId, role: user.Role, username: user.Username },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.Role, username: user.Username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
