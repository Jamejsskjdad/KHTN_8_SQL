// backend/fix_infographic_titles.js
// Chạy: node fix_infographic_titles.js

const fs = require("fs").promises;
const path = require("path");

// THƯ MỤC CHỨA JSON INFOGRAPHIC
// data nằm ngay dưới backend => dùng __dirname, "data", ...
const TARGET_DIR = path.join(__dirname, "data", "inforgraphic_json");


function capitalizeFirst(str) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function processFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    let json = JSON.parse(raw);

    let changed = false;

    // Nếu file là mảng
    if (Array.isArray(json)) {
      json.forEach((item) => {
        if (item && typeof item === "object" && item.title) {
          const newTitle = capitalizeFirst(item.title);
          if (newTitle !== item.title) {
            item.title = newTitle;
            changed = true;
          }
        }
      });
    }
    // Nếu file là object đơn
    else if (json && typeof json === "object" && json.title) {
      const newTitle = capitalizeFirst(json.title);
      if (newTitle !== json.title) {
        json.title = newTitle;
        changed = true;
      }
    }

    if (!changed) return;

    await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf8");
    console.log("✔ Đã sửa tiêu đề:", path.basename(filePath));
  } catch (err) {
    console.error("Lỗi xử lý file:", filePath, "-", err.message);
  }
}

async function main() {
  console.log("=== BẮT ĐẦU SỬA TIÊU ĐỀ INFOGRAPHIC ===");
  console.log("Thư mục:", TARGET_DIR);

  try {
    const files = await fs.readdir(TARGET_DIR);

    for (const file of files) {
      if (file.endsWith(".json")) {
        await processFile(path.join(TARGET_DIR, file));
      }
    }
  } catch (err) {
    console.error("Không đọc được thư mục infographic_json:", err.message);
  }

  console.log("=== HOÀN TẤT ===");
}

main();
