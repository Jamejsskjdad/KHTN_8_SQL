const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const authRoutes = require('./backend/auth/routes');
const studentRoutes = require('./backend/student/routes');
const adminRoutes = require('./backend/admin/routes');

// 👉 THÊM DÒNG NÀY ĐỂ DÙNG requireAuth, requireAdmin
const { requireAuth, requireAdmin } = require('./backend/auth/middleware');

const app = express();
const PORT = 3000;

app.use(express.json());
// 👉 THÊM ROUTE NÀY TRƯỚC static
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// static files
app.use(express.static(path.join(__dirname, 'public')));

// mount API
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

// Thư mục dữ liệu chung
const DATA_DIR = path.join(__dirname, 'data');

// Các loại nội dung (thêm inforgraphic)
const TYPES = [
  'videos',
  'comics',
  'flashcards',
  'games',
  'experiments',
  'quizzes',
  'inforgraphic'          // 👈 CHUẨN: inforgraphic
];

// Thư mục riêng cho inforgraphic
const INFO_IMG_DIR = path.join(DATA_DIR, 'inforgraphic_pic');
const INFO_JSON_DIR = path.join(DATA_DIR, 'inforgraphic_json');

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

ensureFolder(DATA_DIR);
TYPES.forEach(type => {
  if (type !== 'inforgraphic') {
    ensureFolder(path.join(DATA_DIR, type));
  }
});
ensureFolder(INFO_IMG_DIR);
ensureFolder(INFO_JSON_DIR);

// Serve ảnh inforgraphic
app.use('/inforgraphic_pic', express.static(INFO_IMG_DIR));

/**
 * Cấu hình multer để upload ảnh PNG/JPG cho inforgraphic
 */
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

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
      return cb(new Error('Chỉ cho phép file PNG hoặc JPG'));
    }
    cb(null, true);
  }
});

/**
 * Đọc tất cả item trong 1 type
 */
function readType(type) {
  const folder = type === 'inforgraphic'
    ? INFO_JSON_DIR
    : path.join(DATA_DIR, type);

  if (!fs.existsSync(folder)) return [];

  const files = fs.readdirSync(folder);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = fs.readFileSync(path.join(folder, f), 'utf8');
      return JSON.parse(content);
    });
}

/**
 * GET /api/content – trả về toàn bộ nội dung
 * 👉 Cho phép mọi người (guest, student, admin) gọi
 */
app.get('/api/content', (req, res) => {
  let allContent = [];
  TYPES.forEach(type => {
    allContent = allContent.concat(readType(type));
  });
  res.json(allContent);
});

/**
 * POST /api/content – thêm item mới
 * 👉 CHỈ ADMIN được phép (requireAuth + requireAdmin)
 */
app.post(
  '/api/content',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  (req, res) => {
    const { type, title, link } = req.body;

    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Inforgraphic: phải có file ảnh
    if (type === 'inforgraphic') {
      if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const id = Date.now().toString();
      const imagePath = `/inforgraphic_pic/${req.file.filename}`;

      const newItem = {
        __backendId: id,
        id,
        type: 'inforgraphic',
        title,
        link: imagePath,
        createdAt: new Date().toISOString()
      };

      const jsonPath = path.join(INFO_JSON_DIR, `${id}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(newItem, null, 2), 'utf8');

      return res.json(newItem);
    }

    // Các loại khác: giữ link
    const id = Date.now().toString();
    const newItem = {
      __backendId: id,
      id,
      type,
      title,
      link,
      authorName: 'Admin',    // admin đăng trực tiếp
      authorClass: null,      // admin không có lớp
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(DATA_DIR, type, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf8');

    res.json(newItem);
  }
);

/**
 * DELETE /api/content/:id – xoá item
 * 👉 CHỈ ADMIN được phép
 */
app.delete('/api/content/:id', requireAuth, requireAdmin, (req, res) => {
  const id = req.params.id;
  let deleted = false;

  // Thử xoá trong inforgraphic trước
  const infoJsonPath = path.join(INFO_JSON_DIR, `${id}.json`);

  if (fs.existsSync(infoJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
      const imgName = path.basename(data.link || '');
      const imgPath = path.join(INFO_IMG_DIR, imgName);

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }

      fs.unlinkSync(infoJsonPath);
      deleted = true;
    } catch (err) {
      console.error('Error deleting inforgraphic:', err);
    }
  }

  // Nếu không phải inforgraphic, duyệt các loại còn lại
  if (!deleted) {
    TYPES.forEach(type => {
      if (type === 'inforgraphic') return;
      const filePath = path.join(DATA_DIR, type, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }
    });
  }

  if (!deleted) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
