// backend/admin/routes.js
const express = require('express');
const { requireAuth, requireAdmin } = require('../auth/middleware');
const { getProfile } = require('./profile');
const { getPendingPosts, approvePost, rejectPost  } = require('./dashboard');

const router = express.Router();

/**
 * GET /api/admin/profile
 * YÊU CẦU: admin
 */
router.get('/profile', requireAuth, requireAdmin, getProfile);

// Dashboard: danh sách bài pending
// GET /api/admin/posts/pending
router.get('/posts/pending', requireAuth, requireAdmin, getPendingPosts);

// Duyệt bài
// POST /api/admin/posts/:id/approve
router.post('/posts/:id/approve', requireAuth, requireAdmin, approvePost);

// Nút "Từ chối" trên dashboard sẽ gọi API này
router.delete('/posts/:id/reject', requireAuth, requireAdmin, rejectPost);
module.exports = router;
