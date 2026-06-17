require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);
console.log('\n开始执行心愿委托模块数据库迁移...\n');

const migrate = db.transaction(() => {
  const commissionTemplateTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wish_commission_templates'").get();
  if (!commissionTemplateTableExists) {
    console.log('📝 创建 wish_commission_templates 心愿委托模板表...');
    db.exec(`
      CREATE TABLE wish_commission_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        commission_type VARCHAR(30) NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'normal',
        target_value INTEGER NOT NULL DEFAULT 1,
        reward_coins INTEGER NOT NULL DEFAULT 0,
        reward_exp INTEGER DEFAULT 0,
        mood_type VARCHAR(20),
        room_id INTEGER,
        streak_days INTEGER DEFAULT 0,
        time_limit_hours INTEGER DEFAULT 0,
        accept_limit INTEGER DEFAULT 0,
        icon VARCHAR(50) DEFAULT 'scroll',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `);
    console.log('✅ wish_commission_templates 表创建完成');
  } else {
    console.log('⚠️  wish_commission_templates 表已存在，跳过');
  }

  const userCommissionTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_wish_commissions'").get();
  if (!userCommissionTableExists) {
    console.log('📝 创建 user_wish_commissions 用户心愿委托表...');
    db.exec(`
      CREATE TABLE user_wish_commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        commission_type VARCHAR(30) NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'normal',
        target_value INTEGER NOT NULL DEFAULT 1,
        current_progress INTEGER DEFAULT 0,
        reward_coins INTEGER NOT NULL DEFAULT 0,
        reward_exp INTEGER DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'accepted',
        accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        claimed_at DATETIME,
        deadline DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (template_id) REFERENCES wish_commission_templates(id)
      )
    `);
    console.log('✅ user_wish_commissions 表创建完成');
  } else {
    console.log('⚠️  user_wish_commissions 表已存在，跳过');
  }

  const commissionRetroTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commission_retrospectives'").get();
  if (!commissionRetroTableExists) {
    console.log('📝 创建 commission_retrospectives 委托复盘表...');
    db.exec(`
      CREATE TABLE commission_retrospectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commission_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        mood_after VARCHAR(20),
        insight TEXT,
        growth_tags VARCHAR(500),
        rating INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (commission_id) REFERENCES user_wish_commissions(id)
      )
    `);
    console.log('✅ commission_retrospectives 表创建完成');
  } else {
    console.log('⚠️  commission_retrospectives 表已存在，跳过');
  }

  const starCoinTxTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='star_coin_transactions'").get();
  if (!starCoinTxTableExists) {
    console.log('📝 创建 star_coin_transactions 星币流水表...');
    db.exec(`
      CREATE TABLE star_coin_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        transaction_type VARCHAR(30) NOT NULL,
        source_type VARCHAR(30),
        source_id INTEGER,
        description VARCHAR(500),
        balance_after INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ star_coin_transactions 表创建完成');
  } else {
    console.log('⚠️  star_coin_transactions 表已存在，跳过');
  }

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasStarCoins = userColumns.some(c => c.name === 'star_coins');
  const hasTotalEarned = userColumns.some(c => c.name === 'total_coins_earned');

  if (!hasStarCoins) {
    console.log('📝 为 users 表添加 star_coins 字段...');
    db.exec('ALTER TABLE users ADD COLUMN star_coins INTEGER DEFAULT 0');
    console.log('✅ star_coins 字段添加完成');
  } else {
    console.log('⚠️  users 表已包含 star_coins 字段，跳过');
  }

  if (!hasTotalEarned) {
    console.log('📝 为 users 表添加 total_coins_earned 字段...');
    db.exec('ALTER TABLE users ADD COLUMN total_coins_earned INTEGER DEFAULT 0');
    console.log('✅ total_coins_earned 字段添加完成');
  } else {
    console.log('⚠️  users 表已包含 total_coins_earned 字段，跳过');
  }

  const templateIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_commission_templates_type'").get();
  if (!templateIndexExists) {
    console.log('📝 创建心愿委托相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_commission_templates_type ON wish_commission_templates(commission_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_commission_templates_difficulty ON wish_commission_templates(difficulty)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_commission_templates_active ON wish_commission_templates(is_active)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_commissions_user_id ON user_wish_commissions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_commissions_status ON user_wish_commissions(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_commissions_template ON user_wish_commissions(template_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_commission_retros_user ON commission_retrospectives(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_commission_retros_commission ON commission_retrospectives(commission_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_star_coin_tx_user ON star_coin_transactions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_star_coin_tx_type ON star_coin_transactions(transaction_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_star_coin_tx_created ON star_coin_transactions(created_at)');
    console.log('✅ 心愿委托相关索引创建完成');
  } else {
    console.log('⚠️  心愿委托索引已存在，跳过');
  }

  const templateCount = db.prepare('SELECT COUNT(*) as count FROM wish_commission_templates').get().count;
  if (templateCount === 0) {
    console.log('📦 导入心愿委托模板数据...');
    
    const insertTemplate = db.prepare(`
      INSERT INTO wish_commission_templates 
      (title, description, commission_type, difficulty, target_value, reward_coins, reward_exp, mood_type, room_id, streak_days, time_limit_hours, accept_limit, icon, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const templates = [
      ['晨光心情', '在早晨时段记录一次心情，开启美好的一天', 'mood_record', 'easy', 1, 15, 5, null, null, 0, 12, 0, 'sunrise', 1, 1],
      ['午间随笔', '在下午时段记录心情并写下 50 字以上随笔', 'mood_content', 'easy', 50, 20, 8, null, null, 0, 0, 0, 'pen-tool', 2, 1],
      ['夜的独白', '在晚间时段记录心情，与自己对话', 'mood_record', 'easy', 1, 15, 5, null, null, 0, 0, 0, 'moon', 3, 1],
      ['三段修行', '一天内完成早中晚三个时段的心情记录', 'mood_multi_segment', 'normal', 3, 40, 15, null, null, 0, 0, 0, 'layers', 4, 1],
      
      ['情绪探索者', '记录一种从未记录过的心情类型', 'mood_variety', 'normal', 1, 35, 12, null, null, 0, 0, 0, 'palette', 5, 1],
      ['心情调色板', '一天内记录两种不同类型的心情', 'mood_variety', 'normal', 2, 30, 10, null, null, 0, 0, 0, 'paintbrush', 6, 1],
      
      ['坚持的力量', '连续 3 天记录心情', 'streak', 'normal', 3, 50, 20, null, null, 3, 0, 0, 'flame', 7, 1],
      ['七日之约', '连续 7 天记录心情', 'streak', 'hard', 7, 120, 50, null, null, 7, 0, 0, 'calendar-days', 8, 1],
      ['半月谈', '连续 15 天记录心情', 'streak', 'hard', 15, 280, 120, null, null, 15, 0, 0, 'trophy', 9, 1],
      
      ['故事开篇', '阅读一个房间的第一章故事', 'story_read', 'easy', 1, 20, 8, null, null, 0, 0, 0, 'book-open', 10, 1],
      ['章节行者', '阅读 3 个故事章节', 'story_read', 'normal', 3, 45, 18, null, null, 0, 0, 0, 'book-marked', 11, 1],
      ['房间探险家', '解锁一个新的剧情房间', 'room_unlock', 'normal', 1, 60, 25, null, null, 0, 0, 0, 'door-open', 12, 1],
      
      ['深度札记', '为故事章节写下 100 字以上的札记', 'chapter_note', 'normal', 100, 35, 15, null, null, 0, 0, 0, 'feather', 13, 1],
      ['回顾过往', '为过去的心情记录添加一条回顾', 'retrospective', 'easy', 1, 15, 6, null, null, 0, 0, 0, 'rotate-ccw', 14, 1],
      
      ['快乐使者', '记录一次开心的心情', 'mood_type', 'easy', 1, 18, 7, 'happy', null, 0, 0, 0, 'smile', 15, 1],
      ['平静之心', '记录一次平静的心情', 'mood_type', 'easy', 1, 18, 7, 'calm', null, 0, 0, 0, 'cloud', 16, 1],
      ['拥抱忧伤', '记录一次难过的心情', 'mood_type', 'easy', 1, 20, 8, 'sad', null, 0, 0, 0, 'cloud-rain', 17, 1],
      ['焦虑退散', '记录一次焦虑的心情', 'mood_type', 'easy', 1, 20, 8, 'anxious', null, 0, 0, 0, 'wind', 18, 1],
      ['怒火平息', '记录一次愤怒的心情', 'mood_type', 'easy', 1, 22, 9, 'angry', null, 0, 0, 0, 'flame-kindling', 19, 1],
      
      ['心愿收藏家', '完成 5 个心愿委托', 'commission_complete', 'normal', 5, 80, 30, null, null, 0, 0, 0, 'sparkles', 20, 1],
      ['委托达人', '完成 15 个心愿委托', 'commission_complete', 'hard', 15, 200, 80, null, null, 0, 0, 0, 'award', 21, 1],
      
      ['星币学徒', '累计获得 100 星币', 'coin_earning', 'easy', 100, 30, 10, null, null, 0, 0, 0, 'coins', 22, 1],
      ['星币行者', '累计获得 500 星币', 'coin_earning', 'normal', 500, 100, 40, null, null, 0, 0, 0, 'gem', 23, 1],
      
      ['复盘大师', '为 5 个已完成的委托写下复盘', 'commission_retro', 'normal', 5, 70, 25, null, null, 0, 0, 0, 'book-open-check', 24, 1],
      ['成长见证', '完成一次委托复盘并获得 5 星评价', 'commission_retro', 'normal', 5, 50, 20, null, null, 0, 0, 0, 'star', 25, 1],
    ];

    templates.forEach(t => insertTemplate.run(...t));
    console.log(`✅ 导入 ${templates.length} 个心愿委托模板`);
  } else {
    console.log('⚠️  心愿委托模板数据已存在，跳过');
  }
});

try {
  migrate();
  console.log('\n🎉 心愿委托模块数据库迁移完成！\n');
  
  console.log('迁移后数据统计:');
  const templateCount = db.prepare('SELECT COUNT(*) FROM wish_commission_templates').get()['COUNT(*)'];
  console.log(`  心愿委托模板数: ${templateCount}`);
  
} catch (error) {
  console.error('\n❌ 心愿委托模块迁移失败:', error.message);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
