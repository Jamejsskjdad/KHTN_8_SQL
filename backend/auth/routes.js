// backend/auth/routes.js
const express = require('express');
const { requireAuth } = require('./middleware');
const { register, login, me } = require('../login'); // ../login vì login.js nằm ở backend/

const router = express.Router();

// Đăng ký (student) – mặc định role = 'user'
router.post('/register', register);

// Đăng nhập (cho cả admin và student)
router.post('/login', login);

// Lấy thông tin user hiện tại qua token
router.get('/me', requireAuth, me);

module.exports = router;
