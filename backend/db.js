// backend/db.js
const sql = require('mssql');

const config = {
  user: 'TruongAdmin',             // ví dụ lúc tạo server: khtn8admin
  password: 'Truong@080904',         // mật khẩu bạn đặt khi tạo server
  server: 'ndt8899.database.windows.net',
  database: 'KHTN_DTB',             // đúng như tên DB trong Azure
  options: {
    encrypt: true,                  // bắt buộc với Azure SQL
    trustServerCertificate: false
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { sql, getPool };
