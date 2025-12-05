const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const authRoutes = require('./backend/auth/routes');
// sau này thêm:
const studentRoutes = require('./backend/student/routes');
const adminRoutes = require('./backend/admin/routes');

const app = express();
const PORT = 3000;

app.use(express.json());  // để đọc body JSON

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
const INFO_IMG_DIR = path.join(DATA_DIR, 'inforgraphic_pic');   // 👈 tên thư mục ngoài thực tế
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
app.use('/inforgraphic_pic', express.static(INFO_IMG_DIR));  // 👈 đường dẫn public

/**
 * Cấu hình multer để upload ảnh PNG/JPG cho inforgraphic
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, INFO_IMG_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = Date.now().toString(); // dùng timestamp làm tên file ảnh
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
 * - Nếu type = inforgraphic: nhận file ảnh, tạo JSON trong inforgraphic_json
 * - Các type khác: giữ cách cũ (dùng link)
 */
app.post('/api/content', upload.single('image'), (req, res) => {
  const { type, title, link } = req.body;

  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  // Trường hợp inforgraphic: phải có file ảnh
  if (type === 'inforgraphic') {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const id = Date.now().toString();
    const imagePath = `/inforgraphic_pic/${req.file.filename}`; // 👈 trỏ đến thư mục ảnh

    const newItem = {
      __backendId: id,
      id,
      type: 'inforgraphic',
      title,
      link: imagePath, // 👈 JSON chỉ đường tới ảnh
      createdAt: new Date().toISOString()
    };

    const jsonPath = path.join(INFO_JSON_DIR, `${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(newItem, null, 2), 'utf8');

    return res.json(newItem);
  }

  // Các loại khác: giữ logic cũ (dùng link)
  const id = Date.now().toString();
  const newItem = {
    __backendId: id,
    id,
    type,
    title, 
    link,
    createdAt: new Date().toISOString()
  };

  const filePath = path.join(DATA_DIR, type, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf8');

  res.json(newItem);
});

/**
 * DELETE /api/content/:id – xoá item
 * - Nếu là inforgraphic: xoá cả JSON và file ảnh
 * - Nếu là loại khác: xoá JSON như cũ
 */
app.delete('/api/content/:id', (req, res) => {
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
