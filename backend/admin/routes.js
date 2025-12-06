// backend/admin/routes.js
const express = require('express');
const { requireAuth, requireAdmin } = require('../auth/middleware');
const { getProfile } = require('./profile');
const {
  getPostsByStatus,
  getSummary,
  approvePost,
  rejectPost,
} = require('./dashboard');

const router = express.Router();

/**
 * GET /api/admin/profile
 * YÊU CẦU: admin
 */
router.get('/profile', requireAuth, requireAdmin, getProfile);

// Dashboard: lấy danh sách bài theo trạng thái
// GET /api/admin/posts?status=pending|approved|rejected|all
router.get('/posts', requireAuth, requireAdmin, getPostsByStatus);

// Thống kê nhanh
// GET /api/admin/posts/summary
router.get('/posts/summary', requireAuth, requireAdmin, getSummary);

// Duyệt bài
// POST /api/admin/posts/:id/approve
router.post('/posts/:id/approve', requireAuth, requireAdmin, approvePost);

// Từ chối bài
// POST /api/admin/posts/:id/reject
router.post('/posts/:id/reject', requireAuth, requireAdmin, rejectPost);

module.exports = router;
