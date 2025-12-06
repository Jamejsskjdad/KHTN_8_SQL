// backend/admin/dashboard.js
const { getPool } = require('../db');
const fs = require('fs');
const path = require('path');

// ROOT project (thư mục chứa server.js)
const ROOT_DIR = path.join(__dirname, '..', '..');
// /data
const DATA_DIR = path.join(ROOT_DIR, 'data');

const TYPES = [
  'videos',
  'comics',
  'flashcards',
  'games',
  'experiments',
  'quizzes',
  'inforgraphic',
];

// Thư mục riêng cho infographic
const INFO_IMG_DIR = path.join(DATA_DIR, 'inforgraphic_pic');
const INFO_JSON_DIR = path.join(DATA_DIR, 'inforgraphic_json');

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

ensureFolder(DATA_DIR);
TYPES.forEach((type) => {
  if (type !== 'inforgraphic') {
    ensureFolder(path.join(DATA_DIR, type));
  }
});
ensureFolder(INFO_IMG_DIR);
ensureFolder(INFO_JSON_DIR);

// =====================================================
// GHI FILE JSON CHO BÀI ĐÃ DUYỆT (phục vụ website chính)
// =====================================================

// Dùng khi ADMIN DUYỆT bài từ bảng Posts
function saveApprovedPostToData(post) {
  const {
    Type: type,
    Title: title,
    LinkOrImage,
    CreatedAt,
    AuthorName,
    AuthorClass,
  } = post;

  if (!TYPES.includes(type)) {
    console.warn('Loại nội dung không hợp lệ, bỏ qua:', type);
    return null;
  }

  const id = Date.now().toString();

  const link = LinkOrImage || '';

  // Ưu tiên tên từ DB, fallback 'Admin'
  const authorName  = AuthorName  || 'Admin';
  const authorClass = AuthorClass || null;

  const createdAtIso = CreatedAt
    ? new Date(CreatedAt).toISOString()
    : new Date().toISOString();

  const newItem = {
    __backendId: id,
    id,
    type,
    title,
    link,
    authorName,
    authorClass,
    createdAt: createdAtIso,
  };

  const filePath =
    type === 'inforgraphic'
      ? path.join(INFO_JSON_DIR, `${id}.json`)
      : path.join(DATA_DIR, type, `${id}.json`);

  fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf8');

  return newItem;
}

// =====================================================
// API: LẤY DANH SÁCH BÀI THEO TRẠNG THÁI
// GET /api/admin/posts?status=pending|approved|rejected|all
// =====================================================

async function getPostsByStatus(req, res) {
  const rawStatus = (req.query.status || 'all').toLowerCase();
  const allowed = ['pending', 'approved', 'rejected'];
  const status = allowed.includes(rawStatus) ? rawStatus : 'all';

  try {
    const pool = await getPool();
    const request = pool.request();

    let whereClause = '';
    if (status !== 'all') {
      whereClause = 'WHERE p.Status = @status';
      request.input('status', status);
    }

    const result = await request.query(`
      SELECT 
        p.PostId,
        p.Title,
        p.Type,
        p.LinkOrImage,
        p.Status,
        p.CreatedAt,
        u.Username AS CreatedBy
      FROM Posts p
      JOIN Users u ON p.UserId = u.UserId
      ${whereClause}
      ORDER BY p.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// =====================================================
// API: THỐNG KÊ NHANH
// GET /api/admin/posts/summary
// =====================================================

async function getSummary(req, res) {
  try {
    const pool = await getPool();

    // Đếm số bài theo trạng thái
    const postsResult = await pool.request().query(`
      SELECT
        SUM(CASE WHEN Status = 'pending'  THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN Status = 'approved' THEN 1 ELSE 0 END) AS Approved,
        SUM(CASE WHEN Status = 'rejected' THEN 1 ELSE 0 END) AS Rejected
      FROM Posts
    `);

    const row = postsResult.recordset[0] || {};
    const pending  = row.Pending  || 0;
    const approved = row.Approved || 0;
    const rejected = row.Rejected || 0;

    // "Người dùng hoạt động" – tạm tính số user có bài trong 30 ngày gần nhất
    const usersResult = await pool.request().query(`
      SELECT COUNT(DISTINCT UserId) AS ActiveUsers
      FROM Posts
      WHERE CreatedAt >= DATEADD(DAY, -30, GETDATE())
    `);
    const activeUsers =
      (usersResult.recordset[0] && usersResult.recordset[0].ActiveUsers) || 0;

    res.json({ pending, approved, rejected, activeUsers });
  } catch (err) {
    console.error('Lỗi lấy summary:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// =====================================================
// API: DUYỆT BÀI
// POST /api/admin/posts/:id/approve
// =====================================================

async function approvePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'PostId không hợp lệ' });
  }

  try {
    const pool = await getPool();

    // Lấy bài + thông tin người đăng để ghi vào JSON
    const result = await pool.request()
      .input('postId', postId)
      .query(`
        SELECT TOP 1
          p.PostId,
          p.Title,
          p.Type,
          p.LinkOrImage,
          p.Status,
          p.CreatedAt,
          u.Username AS AuthorName,  -- dùng Username làm "họ tên"
          u.class    AS AuthorClass  -- cột class trong bảng Users
        FROM Posts p
        JOIN Users u ON p.UserId = u.UserId
        WHERE p.PostId = @postId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const post = result.recordset[0];

    if (post.Status === 'approved') {
      return res
        .status(400)
        .json({ error: 'Bài viết này đã được duyệt trước đó' });
    }

    // Cập nhật trạng thái
    await pool.request()
      .input('postId', postId)
      .query(`
        UPDATE Posts
        SET Status = 'approved'
        WHERE PostId = @postId
      `);

    // Ghi JSON (kèm authorName, authorClass, createdAt)
    const newItem = saveApprovedPostToData(post);
    if (!newItem) {
      return res.status(500).json({
        error: 'Duyệt bài nhưng không ghi được file dữ liệu',
      });
    }

    res.json({ success: true, item: newItem });
  } catch (err) {
    console.error('Lỗi duyệt bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// =====================================================
// API: TỪ CHỐI BÀI
// POST /api/admin/posts/:id/reject
// =====================================================

async function rejectPost(req, res) {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'PostId không hợp lệ' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('postId', postId)
      .query(`
        SELECT TOP 1 PostId, Type, LinkOrImage, Status
        FROM Posts
        WHERE PostId = @postId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const post = result.recordset[0];

    if (post.Status === 'rejected') {
      return res
        .status(400)
        .json({ error: 'Bài viết này đã bị từ chối trước đó' });
    }

    // Nếu là infographic, có thể xóa ảnh để tiết kiệm dung lượng
    if (post.Type === 'inforgraphic' && post.LinkOrImage) {
      const imgName = path.basename(post.LinkOrImage);
      const imgPath = path.join(INFO_IMG_DIR, imgName);
      if (fs.existsSync(imgPath)) {
        try {
          fs.unlinkSync(imgPath);
        } catch (e) {
          console.warn('Không xoá được ảnh infographic khi reject:', e);
        }
      }
    }

    // Chỉ cập nhật trạng thái, KHÔNG xoá record
    await pool.request()
      .input('postId', postId)
      .query(`
        UPDATE Posts
        SET Status = 'rejected'
        WHERE PostId = @postId
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi reject bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// =====================================================

module.exports = {
  getPostsByStatus,
  getSummary,
  approvePost,
  rejectPost,
  saveApprovedPostToData,
};
