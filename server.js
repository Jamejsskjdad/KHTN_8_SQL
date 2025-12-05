const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Cho phép đọc JSON từ body
app.use(express.json());

// Serve static: index.html, css, js...
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
// Đổi thành:
const TYPES = ['videos', 'comics', 'flashcards', 'games', 'experiments', 'quizzes'];

// Đảm bảo thư mục tồn tại
function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}
ensureFolder(DATA_DIR);
TYPES.forEach(type => ensureFolder(path.join(DATA_DIR, type)));

// Đọc tất cả item trong 1 type
function readType(type) {
  const folder = path.join(DATA_DIR, type);
  const files = fs.readdirSync(folder);
  const items = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = fs.readFileSync(path.join(folder, f), 'utf8');
      return JSON.parse(content);
    });
  return items;
}

// API: lấy toàn bộ content
app.get('/api/content', (req, res) => {
  let allContent = [];
  TYPES.forEach(type => {
    allContent = allContent.concat(readType(type));
  });
  res.json(allContent);
});

// API: thêm item
app.post('/api/content', (req, res) => {
  const { type, title, description, link } = req.body;

  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const id = Date.now().toString();
  const newItem = {
    __backendId: id,
    id,
    type,
    title,
    description,
    link,
    createdAt: new Date().toISOString()
  };

  const filePath = path.join(DATA_DIR, type, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf8');

  res.json(newItem);
});

// API: xoá item
app.delete('/api/content/:id', (req, res) => {
  const id = req.params.id;
  let deleted = false;

  TYPES.forEach(type => {
    const filePath = path.join(DATA_DIR, type, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
  });

  if (!deleted) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
