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

// ===== HÀM GHI ITEM VÀO data/ GIỐNG /api/content =====

function saveApprovedPostToData(post) {
  const { Type: type, Title: title, LinkOrImage } = post;

  if (!TYPES.includes(type)) {
    console.warn('Loại nội dung không hợp lệ, bỏ qua:', type);
    return null;
  }

  const id = Date.now().toString();

  // Trường hợp infographic: ở đây ta KHÔNG xử lý file ảnh,
  // chỉ ghi JSON, link trỏ đến LinkOrImage (có thể là URL ngoài)
  let folder;
  let link;

  if (type === 'inforgraphic') {
    folder = INFO_JSON_DIR;
    link = LinkOrImage || ''; // có thể là link ảnh / drive v.v.
  } else {
    folder = path.join(DATA_DIR, type);
    link = LinkOrImage || '';
  }

  const newItem = {
    __backendId: id,
    id,
    type,
    title,
    link,
    createdAt: new Date().toISOString(),
  };

  const filePath =
    type === 'inforgraphic'
      ? path.join(INFO_JSON_DIR, `${id}.json`)
      : path.join(DATA_DIR, type, `${id}.json`);

  fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf8');

  return newItem;
}

// ====== API HANDLERS ======

/**
 * GET /api/admin/posts/pending
 * Lấy danh sách bài đang chờ duyệt
 */
async function getPendingPosts(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
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
      WHERE p.Status = 'pending'
      ORDER BY p.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy bài pending:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

/**
 * POST /api/admin/posts/:id/approve
 * - Đổi Status = 'approved'
 * - Ghi 1 JSON tương ứng vào thư mục data/ để website hiển thị
 */
async function approvePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'PostId không hợp lệ' });
  }

  try {
    const pool = await getPool();

    // Lấy thông tin bài trước
    const result = await pool.request()
      .input('postId', postId)
      .query(`
        SELECT TOP 1 PostId, Title, Type, LinkOrImage, Status
        FROM Posts
        WHERE PostId = @postId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const post = result.recordset[0];

    if (post.Status === 'approved') {
      // Nếu muốn tránh ghi trùng file JSON, có thể chỉ return luôn
      return res.status(400).json({ error: 'Bài viết này đã được duyệt trước đó' });
    }

    // Cập nhật trạng thái trong DB
    await pool.request()
      .input('postId', postId)
      .query(`
        UPDATE Posts
        SET Status = 'approved'
        WHERE PostId = @postId
      `);

    // Ghi vào thư mục data/ để hiển thị ngoài website
    const newItem = saveApprovedPostToData(post);
    if (!newItem) {
      return res.status(500).json({ error: 'Duyệt bài nhưng không ghi được file dữ liệu' });
    }

    res.json({ success: true, item: newItem });
  } catch (err) {
    console.error('Lỗi duyệt bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

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
        SELECT TOP 1 PostId, Type, LinkOrImage
        FROM Posts
        WHERE PostId = @postId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const post = result.recordset[0];

    // Nếu là infographic thì xoá ảnh luôn
    if (post.Type === 'inforgraphic' && post.LinkOrImage) {
      const imgName = path.basename(post.LinkOrImage);
      const imgPath = path.join(INFO_IMG_DIR, imgName);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    // Xoá record trong bảng Posts
    await pool.request()
      .input('postId', postId)
      .query(`DELETE FROM Posts WHERE PostId = @postId`);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi reject bài:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = {
  getPendingPosts,
  approvePost,
  rejectPost,
};

