require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);
console.log('\n开始执行数据库迁移...\n');

const migrate = db.transaction(() => {
  const columns = db.prepare("PRAGMA table_info(moods)").all();
  const hasTimeSegment = columns.some(c => c.name === 'time_segment');
  const hasTagWeights = columns.some(c => c.name === 'tag_weights');

  if (!hasTimeSegment || !hasTagWeights) {
    console.log('📝 迁移 moods 表结构...');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS moods_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        record_date DATE NOT NULL,
        time_segment VARCHAR(20) NOT NULL DEFAULT 'day',
        mood_type VARCHAR(20) NOT NULL,
        content TEXT,
        tags VARCHAR(500),
        tag_weights TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, record_date, time_segment)
      )
    `);

    db.exec(`
      INSERT INTO moods_new (id, user_id, record_date, time_segment, mood_type, content, tags, created_at)
      SELECT id, user_id, record_date, 'day' as time_segment, mood_type, content, tags, created_at
      FROM moods
    `);

    db.exec('DROP TABLE IF EXISTS moods');
    db.exec('ALTER TABLE moods_new RENAME TO moods');
    
    console.log('✅ moods 表迁移完成，旧数据已迁移为 day 时段');
  } else {
    console.log('⚠️  moods 表已包含所需字段，跳过迁移');
  }

  const roomColumns = db.prepare("PRAGMA table_info(rooms)").all();
  const hasMultiSegmentDays = roomColumns.some(c => c.name === 'required_multi_segment_days');

  if (!hasMultiSegmentDays) {
    console.log('📝 为 rooms 表添加 required_multi_segment_days 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN required_multi_segment_days INTEGER DEFAULT 0');
    console.log('✅ rooms 表字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 required_multi_segment_days 字段，跳过');
  }

  const indexStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_moods_time_segment'");
  if (!indexStmt.get()) {
    console.log('📝 创建 moods 表索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_moods_time_segment ON moods(time_segment)');
    console.log('✅ 索引创建完成');
  }

  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE id IN (6, 7)').get().count;
  if (taskCount < 2) {
    console.log('📝 添加多段记录相关任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertTask.run(6, '三段心情', '一天内记录早中晚三个时段的心情', 'daily', 3, 25);
    insertTask.run(7, '精准标记', '为心情标签设置权重，总权重达到 10', 'daily', 10, 20);
    insertTask.run(8, '多段达人', '累计 7 天完成三段心情记录', 'once', 7, 150);
    console.log('✅ 多段记录任务添加完成');
  } else {
    console.log('⚠️  多段记录任务已存在，跳过');
  }

  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements WHERE id IN (11, 12, 13)').get().count;
  if (achievementCount < 3) {
    console.log('📝 添加多段记录相关成就...');
    const insertAchievement = db.prepare(`
      INSERT OR IGNORE INTO achievements (id, name, description, icon, condition_type, condition_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAchievement.run(11, '早起记录者', '完成 10 次早晨时段心情记录', '🌅', 'morning_records', 10);
    insertAchievement.run(12, '午后思考者', '完成 10 次下午时段心情记录', '☀️', 'afternoon_records', 10);
    insertAchievement.run(13, '夜行者', '完成 10 次晚间时段心情记录', '🌙', 'evening_records', 10);
    insertAchievement.run(14, '三段修行者', '连续 7 天完成三段心情记录', '🎯', 'multi_segment_streak', 7);
    insertAchievement.run(15, '情绪分析师', '累计设置 50 个标签权重', '📊', 'tag_weight_count', 50);
    console.log('✅ 多段记录成就添加完成');
  } else {
    console.log('⚠️  多段记录成就已存在，跳过');
  }

  const roomUpdates = db.prepare(`
    UPDATE rooms SET 
      unlock_condition = ?,
      required_multi_segment_days = ?
    WHERE id = ?
  `);
  
  roomUpdates.run('多段记录 5 天', 5, 4);
  roomUpdates.run('多段记录 10 天', 10, 5);
  roomUpdates.run('多段记录 15 天', 15, 6);
  console.log('✅ 房间解锁条件更新完成');

  // 迁移 stories 表 - 添加分支字段
  const storyColumns = db.prepare("PRAGMA table_info(stories)").all();
  const hasBranchKey = storyColumns.some(c => c.name === 'branch_key');
  const hasParentId = storyColumns.some(c => c.name === 'parent_id');

  if (!hasBranchKey || !hasParentId) {
    console.log('📝 迁移 stories 表，添加分支结构字段...');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS stories_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        chapter_number INTEGER NOT NULL,
        branch_key VARCHAR(50) NOT NULL DEFAULT 'main',
        parent_id INTEGER DEFAULT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        conditions TEXT,
        branch_label VARCHAR(100),
        is_branch_point BOOLEAN DEFAULT 0,
        is_ending BOOLEAN DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (parent_id) REFERENCES stories(id)
      )
    `);

    db.exec(`
      INSERT INTO stories_new (id, room_id, chapter_number, title, content, sort_order)
      SELECT id, room_id, chapter_number, title, content, chapter_number as sort_order
      FROM stories
    `);

    db.exec('DROP TABLE IF EXISTS stories');
    db.exec('ALTER TABLE stories_new RENAME TO stories');
    
    console.log('✅ stories 表迁移完成');
  } else {
    console.log('⚠️  stories 表已包含分支字段，跳过迁移');
  }

  // 创建 user_room_branches 表
  const branchesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_room_branches'").get();
  if (!branchesTableExists) {
    console.log('📝 创建 user_room_branches 表...');
    db.exec(`
      CREATE TABLE user_room_branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        branch_key VARCHAR(50) NOT NULL,
        current_story_id INTEGER,
        max_chapter_reached INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 0,
        last_read_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (current_story_id) REFERENCES stories(id),
        UNIQUE(user_id, room_id, branch_key)
      )
    `);
    console.log('✅ user_room_branches 表创建完成');
  } else {
    console.log('⚠️  user_room_branches 表已存在，跳过');
  }

  // 创建 user_story_history 表
  const historyTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_story_history'").get();
  if (!historyTableExists) {
    console.log('📝 创建 user_story_history 表...');
    db.exec(`
      CREATE TABLE user_story_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        story_id INTEGER NOT NULL,
        branch_key VARCHAR(50) NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (story_id) REFERENCES stories(id)
      )
    `);
    console.log('✅ user_story_history 表创建完成');
  } else {
    console.log('⚠️  user_story_history 表已存在，跳过');
  }

  // 为 user_rooms 表添加 current_branch 字段
  const userRoomColumns = db.prepare("PRAGMA table_info(user_rooms)").all();
  const hasCurrentBranch = userRoomColumns.some(c => c.name === 'current_branch');

  if (!hasCurrentBranch) {
    console.log('📝 为 user_rooms 表添加 current_branch 字段...');
    db.exec("ALTER TABLE user_rooms ADD COLUMN current_branch VARCHAR(50) DEFAULT 'main'");
    console.log('✅ user_rooms 表字段添加完成');
  } else {
    console.log('⚠️  user_rooms 表已包含 current_branch 字段，跳过');
  }

  // 创建分支相关索引
  const branchIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_stories_branch_key'").get();
  if (!branchIndexExists) {
    console.log('📝 创建分支相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_stories_branch_key ON stories(branch_key)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_stories_parent_id ON stories(parent_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_room_branches_user ON user_room_branches(user_id, room_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_story_history_user ON user_story_history(user_id, room_id)');
    console.log('✅ 分支相关索引创建完成');
  }
});

try {
  migrate();
  console.log('\n🎉 数据库迁移完成！\n');
  
  console.log('迁移后数据统计:');
  const moodCount = db.prepare('SELECT COUNT(*) FROM moods').get()['COUNT(*)'];
  const taskCount = db.prepare('SELECT COUNT(*) FROM tasks').get()['COUNT(*)'];
  const achievementCount = db.prepare('SELECT COUNT(*) FROM achievements').get()['COUNT(*)'];
  console.log(`  心情记录数: ${moodCount}`);
  console.log(`  任务数: ${taskCount}`);
  console.log(`  成就数: ${achievementCount}`);
  
} catch (error) {
  console.error('\n❌ 数据库迁移失败:', error.message);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
