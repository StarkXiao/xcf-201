require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const dataDir = path.dirname(resolvedPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`创建数据目录: ${dataDir}`);
}

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

console.log('\n开始创建数据库表...');

const statements = schemaSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

const createTable = db.transaction(() => {
  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (error) {
      console.error(`执行 SQL 失败: ${stmt.substring(0, 50)}...`);
      console.error(`错误信息: ${error.message}`);
      throw error;
    }
  }
});

try {
  createTable();
  console.log('\n✅ 数据库表创建成功！');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('\n已创建的表:');
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  - ${table.name} (${count.count} 条记录)`);
  });
  
} catch (error) {
  console.error('\n❌ 数据库初始化失败:', error.message);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
