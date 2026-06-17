const Database = require('better-sqlite3');
const path = require('path');

require('dotenv').config();
const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);
const db = new Database(resolvedPath, { verbose: console.log });

console.log(`使用数据库路径: ${resolvedPath}`);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('开始创建 notifications 表...');

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'info',
    icon TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    duration INTEGER DEFAULT 4000,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_dismissed INTEGER NOT NULL DEFAULT 0,
    related_type TEXT,
    related_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    read_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);
`);

console.log('notifications 表创建完成！');

const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'");
const result = check.get();
if (result) {
  console.log('✅ 验证通过：notifications 表已存在');
  
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications').get();
  console.log(`当前记录数：${count.c}`);
} else {
  console.error('❌ 验证失败：表不存在');
}

db.close();
