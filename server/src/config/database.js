require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

let db;

try {
  db = new Database(resolvedPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log(`数据库连接成功: ${resolvedPath}`);
} catch (error) {
  console.error('数据库连接失败:', error.message);
  process.exit(1);
}

module.exports = db;
