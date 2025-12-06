// backend/auth/routes.js
const express = require('express');
const { requireAuth } = require('./middleware');
const { register, registerAdmin, login, me } = require('../login');

const router = express.Router();

// Đăng ký student (mặc định role = 'user')
router.post('/register', register);

// Đăng ký admin (tạm thời, sau dùng xong nên xoá hoặc bảo vệ bằng secret)
router.post('/register-admin', registerAdmin);

// Đăng nhập
router.post('/login', login);

// Lấy thông tin user hiện tại
router.get('/me', requireAuth, me);

module.exports = router;
