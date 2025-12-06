// backend/student/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { getPool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { getProfile, getMyPosts } = require('./profile');

const router = express.Router();

// ====== CẤU HÌNH UPLOAD ẢNH INFOGRAPHIC CHO STUDENT ======
const ROOT_DIR = path.join(__dirname, '..', '..');   // thư mục chứa server.js
const DATA_DIR = path.join(ROOT_DIR, 'data');
const INFO_IMG_DIR = path.join(DATA_DIR, 'inforgraphic_pic');

if (!fs.existsSync(INFO_IMG_DIR)) {
  fs.mkdirSync(INFO_IMG_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, INFO_IMG_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = Date.now().toString();
    cb(null, id + ext);
  }
});

const uploadInfographic = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      return cb(new Error('Chỉ cho phép file PNG/JPG'));
    }
    cb(null, true);
  }
});

// ====== CÁC ROUTE PROFILE CŨ ======
router.get('/profile', requireAuth, getProfile);
router.get('/my-posts', requireAuth, getMyPosts);

// ====== HỌC SINH GỬI BÀI (TEXT/LINK – KHÔNG PHẢI INFOGRAPHIC) ======
router.post('/posts', requireAuth, async (req, res) => {
  const { title, type, linkOrImage } = req.body || {};

  if (!title || !type) {
    return res.status(400).json({ error: 'Thiếu tiêu đề hoặc loại' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', req.user.userId)
      .input('title', title)
      .input('type', type)
      .input('linkOrImage', linkOrImage || null)
      .query(`
        INSERT INTO Posts (UserId, Title, Type, LinkOrImage, Status)
        VALUES (@userId, @title, @type, @linkOrImage, 'pending')
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi student gửi bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ====== HỌC SINH GỬI BÀI INFOGRAPHIC (UPLOAD ẢNH + DB, CHƯA GHI JSON) ======
router.post(
  '/posts/infographic',
  requireAuth,
  uploadInfographic.single('image'),
  async (req, res) => {
    const { title } = req.body || {};

    if (!title || !req.file) {
      return res.status(400).json({ error: 'Thiếu tiêu đề hoặc ảnh' });
    }

    try {
      const pool = await getPool();

      const imagePath = `/inforgraphic_pic/${req.file.filename}`; // đường dẫn public

      await pool.request()
        .input('userId', req.user.userId)
        .input('title', title)
        .input('type', 'inforgraphic')
        .input('linkOrImage', imagePath)
        .query(`
          INSERT INTO Posts (UserId, Title, Type, LinkOrImage, Status)
          VALUES (@userId, @title, @type, @linkOrImage, 'pending')
        `);

      res.json({ success: true });
    } catch (err) {
      console.error('Lỗi student gửi infographic:', err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  }
);

module.exports = router;
