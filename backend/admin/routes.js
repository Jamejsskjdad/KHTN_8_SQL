const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../auth/middleware');

// LẤY THÊM updateProfile và changePassword
const { getProfile, updateProfile, changePassword } = require('./profile');

const {
  getSummary,
  getPostsByStatus,
  approvePost,
  rejectPost
} = require('./dashboard');


// PROFILE
router.put('/profile', requireAuth, requireAdmin, updateProfile);
router.post('/change-password', requireAuth, requireAdmin, changePassword);
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
