// backend/admin/routes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../auth/middleware');

const { getProfile, updateProfile, changePassword } = require('./profile');
const userManager = require('./manager_user');
const {
  getSummary,
  getPostsByStatus,
  approvePost,
  rejectPost
} = require('./dashboard');


// PROFILE
router.put('/profile', requireAuth, requireAdmin, updateProfile);
router.post('/change-password', requireAuth, requireAdmin, changePassword);
router.get('/profile', requireAuth, requireAdmin, getProfile);

// ==== QUẢN LÝ USER (API mới) ====
// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, userManager.getAllUsers);
// POST /api/admin/users  (tạo user mới)
router.post('/users', requireAuth, requireAdmin, userManager.createUser);
// PUT /api/admin/users/:id
router.put('/users/:id', requireAuth, requireAdmin, userManager.updateUser);
// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, userManager.deleteUser);
// Dashboard: lấy danh sách bài theo trạng thái
router.get('/posts', requireAuth, requireAdmin, getPostsByStatus);
router.get('/posts/summary', requireAuth, requireAdmin, getSummary);
router.post('/posts/:id/approve', requireAuth, requireAdmin, approvePost);
router.post('/posts/:id/reject', requireAuth, requireAdmin, rejectPost);

module.exports = router;
