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
  const hasRequiredMoodTypes = roomColumns.some(c => c.name === 'required_mood_types');
  const hasRequiredChapters = roomColumns.some(c => c.name === 'required_chapters');
  const hasRequiredTasks = roomColumns.some(c => c.name === 'required_tasks');
  const hasUnlockConditions = roomColumns.some(c => c.name === 'unlock_conditions');

  if (!hasMultiSegmentDays) {
    console.log('📝 为 rooms 表添加 required_multi_segment_days 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN required_multi_segment_days INTEGER DEFAULT 0');
    console.log('✅ required_multi_segment_days 字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 required_multi_segment_days 字段，跳过');
  }

  if (!hasRequiredMoodTypes) {
    console.log('📝 为 rooms 表添加 required_mood_types 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN required_mood_types TEXT DEFAULT NULL');
    console.log('✅ required_mood_types 字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 required_mood_types 字段，跳过');
  }

  if (!hasRequiredChapters) {
    console.log('📝 为 rooms 表添加 required_chapters 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN required_chapters INTEGER DEFAULT 0');
    console.log('✅ required_chapters 字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 required_chapters 字段，跳过');
  }

  if (!hasRequiredTasks) {
    console.log('📝 为 rooms 表添加 required_tasks 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN required_tasks TEXT DEFAULT NULL');
    console.log('✅ required_tasks 字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 required_tasks 字段，跳过');
  }

  if (!hasUnlockConditions) {
    console.log('📝 为 rooms 表添加 unlock_conditions 字段...');
    db.exec('ALTER TABLE rooms ADD COLUMN unlock_conditions TEXT DEFAULT NULL');
    console.log('✅ unlock_conditions 字段添加完成');
  } else {
    console.log('⚠️  rooms 表已包含 unlock_conditions 字段，跳过');
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
      required_days = ?,
      required_multi_segment_days = ?,
      required_mood_types = ?,
      required_chapters = ?,
      required_tasks = ?,
      unlock_conditions = ?
    WHERE id = ?
  `);
  
  roomUpdates.run('默认解锁', 0, 0, null, 0, null, null, 1);
  roomUpdates.run('记录心情 3 天，体验 2 种情绪', 3, 0, '["happy","calm","sad","anxious","angry"]', 0, null, '{"moodTypeCount":2}', 2);
  roomUpdates.run('记录心情 7 天，阅读 3 个章节', 7, 0, null, 3, null, '{"chapters":3}', 3);
  roomUpdates.run('多段记录 5 天，完成「心情随笔」任务', 0, 5, null, 0, '[2]', '{"multiSegmentDays":5,"tasks":[2]}', 4);
  roomUpdates.run('多段记录 10 天，体验 4 种情绪，阅读 5 个章节', 0, 10, '["happy","calm","sad","anxious","angry"]', 5, null, '{"multiSegmentDays":10,"moodTypeCount":4,"chapters":5}', 5);
  roomUpdates.run('多段记录 15 天，完成 3 个长期任务，阅读 10 个章节', 0, 15, null, 10, '[3,4,5]', '{"multiSegmentDays":15,"chapters":10,"tasks":[3,4,5]}', 6);
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

  // 迁移 tasks 表 - 添加连锁任务和重置相关字段
  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all();
  const hasChainId = taskColumns.some(c => c.name === 'chain_id');
  const hasChainOrder = taskColumns.some(c => c.name === 'chain_order');
  const hasResetType = taskColumns.some(c => c.name === 'reset_type');
  const hasResetDays = taskColumns.some(c => c.name === 'reset_days');
  const hasIcon = taskColumns.some(c => c.name === 'icon');

  if (!hasChainId || !hasChainOrder || !hasResetType || !hasResetDays || !hasIcon) {
    console.log('📝 迁移 tasks 表，添加连锁任务和重置字段...');
    
    if (!hasChainId) {
      db.exec('ALTER TABLE tasks ADD COLUMN chain_id INTEGER DEFAULT NULL');
    }
    if (!hasChainOrder) {
      db.exec('ALTER TABLE tasks ADD COLUMN chain_order INTEGER DEFAULT 0');
    }
    if (!hasResetType) {
      db.exec("ALTER TABLE tasks ADD COLUMN reset_type VARCHAR(20) DEFAULT 'none'");
    }
    if (!hasResetDays) {
      db.exec('ALTER TABLE tasks ADD COLUMN reset_days INTEGER DEFAULT 0');
    }
    if (!hasIcon) {
      db.exec("ALTER TABLE tasks ADD COLUMN icon VARCHAR(50) DEFAULT 'gift'");
    }
    
    console.log('✅ tasks 表字段迁移完成');
  } else {
    console.log('⚠️  tasks 表已包含所需字段，跳过迁移');
  }

  // 添加周任务数据
  const weeklyTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE type = 'weekly'").get().count;
  if (weeklyTaskCount === 0) {
    console.log('📝 添加周任务数据...');
    const insertWeeklyTask = db.prepare(`
      INSERT INTO tasks (title, description, type, target, reward, icon, chain_id, chain_order, reset_type, reset_days)
      VALUES (?, ?, 'weekly', ?, ?, ?, ?, ?, 'weekly', 7)
    `);
    
    const weeklyTasks = [
      ['心情周记', '本周记录至少 5 天心情', 5, 50, 'calendar', null, 0],
      ['深度探索', '本周阅读 3 个故事章节', 3, 40, 'book-open', null, 0],
      ['情绪调色板', '本周体验 3 种不同心情', 3, 45, 'palette', null, 0]
    ];
    
    weeklyTasks.forEach(task => insertWeeklyTask.run(...task));
    console.log(`✅ 添加 ${weeklyTasks.length} 个周任务`);
  } else {
    console.log('⚠️  周任务已存在，跳过');
  }

  // 添加连锁任务数据 - 心情记录成长链
  const chainTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE chain_id = 1").get().count;
  if (chainTaskCount === 0) {
    console.log('📝 添加连锁任务数据（心情成长链）...');
    const insertChainTask = db.prepare(`
      INSERT INTO tasks (title, description, type, target, reward, icon, chain_id, chain_order, reset_type, reset_days)
      VALUES (?, ?, 'chain', ?, ?, ?, 1, ?, 'streak', 1)
    `);
    
    const chainTasks = [
      ['初入梦境', '完成第 1 天心情记录', 1, 10, 'moon', 1],
      ['渐入佳境', '连续 3 天记录心情', 3, 25, 'star', 2],
      ['习惯养成', '连续 7 天记录心情', 7, 50, 'flame', 3],
      ['坚持不懈', '连续 14 天记录心情', 14, 100, 'trophy', 4],
      ['梦境大师', '连续 30 天记录心情', 30, 200, 'crown', 5]
    ];
    
    chainTasks.forEach(task => insertChainTask.run(...task));
    console.log(`✅ 添加 ${chainTasks.length} 个连锁任务`);
  } else {
    console.log('⚠️  连锁任务已存在，跳过');
  }

  // 添加任务链索引
  const taskChainIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tasks_chain_id'").get();
  if (!taskChainIndexExists) {
    console.log('📝 创建任务链索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_chain_id ON tasks(chain_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)');
    console.log('✅ 任务链索引创建完成');
  }

  // 为现有任务设置图标
  const iconUpdateCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE icon = 'gift' AND type IN ('daily', 'once')").get().count;
  if (iconUpdateCount > 0) {
    console.log('📝 为现有任务设置图标...');
    
    const taskIcons = {
      1: 'heart',
      2: 'pen-tool',
      3: 'calendar-days',
      4: 'sparkles',
      5: 'book-open',
      6: 'layers',
      7: 'tags',
      8: 'target'
    };
    
    const updateIconStmt = db.prepare('UPDATE tasks SET icon = ? WHERE id = ?');
    for (const [taskId, icon] of Object.entries(taskIcons)) {
      updateIconStmt.run(icon, taskId);
    }
    console.log('✅ 现有任务图标更新完成');
  }

  // 迁移 user_tasks 表 - 添加时间字段
  const userTaskColumns = db.prepare("PRAGMA table_info(user_tasks)").all();
  const hasCompletedAt = userTaskColumns.some(c => c.name === 'completed_at');
  const hasClaimedAt = userTaskColumns.some(c => c.name === 'claimed_at');

  if (!hasCompletedAt || !hasClaimedAt) {
    console.log('📝 迁移 user_tasks 表，添加时间字段...');
    
    if (!hasCompletedAt) {
      db.exec('ALTER TABLE user_tasks ADD COLUMN completed_at DATETIME DEFAULT NULL');
    }
    if (!hasClaimedAt) {
      db.exec('ALTER TABLE user_tasks ADD COLUMN claimed_at DATETIME DEFAULT NULL');
    }
    
    console.log('✅ user_tasks 表字段迁移完成');
  } else {
    console.log('⚠️  user_tasks 表已包含时间字段，跳过迁移');
  }

  // 创建 mood_retrospectives 表
  const retroTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mood_retrospectives'").get();
  if (!retroTableExists) {
    console.log('📝 创建 mood_retrospectives 表...');
    db.exec(`
      CREATE TABLE mood_retrospectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mood_id INTEGER,
        record_date DATE NOT NULL,
        time_segment VARCHAR(20),
        retrospect_type VARCHAR(20) NOT NULL DEFAULT 'feeling',
        content TEXT NOT NULL,
        mood_shift VARCHAR(20),
        tags VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (mood_id) REFERENCES moods(id)
      )
    `);
    console.log('✅ mood_retrospectives 表创建完成');
  } else {
    console.log('⚠️  mood_retrospectives 表已存在，跳过');
  }

  // 创建回顾相关索引
  const retroIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mood_retrospectives_user_id'").get();
  if (!retroIndexExists) {
    console.log('📝 创建回顾相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_user_id ON mood_retrospectives(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_record_date ON mood_retrospectives(record_date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_mood_id ON mood_retrospectives(mood_id)');
    console.log('✅ 回顾相关索引创建完成');
  }

  // 添加回顾相关任务
  const retroDailyTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id IN (20, 21)").get().count;
  if (retroDailyTaskCount < 2) {
    console.log('📝 添加回顾复写每日任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon, reset_type, reset_days)
      VALUES (?, ?, ?, 'daily', ?, ?, ?, 'daily', 1)
    `);
    insertTask.run(20, '每日回顾', '为过去的心情记录添加回顾感受', 1, 15, 'book-open');
    insertTask.run(21, '深度反思', '一天内添加 3 条以上回顾内容', 3, 30, 'sparkles');
    console.log('✅ 回顾每日任务添加完成');
  } else {
    console.log('⚠️  回顾每日任务已存在，跳过');
  }

  // 添加回顾相关长期任务
  const retroOnceTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id IN (22, 23, 24, 25)").get().count;
  if (retroOnceTaskCount < 4) {
    console.log('📝 添加回顾复写长期任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon)
      VALUES (?, ?, ?, 'once', ?, ?, ?)
    `);
    insertTask.run(22, '初次回望', '完成第 1 次心情回顾', 1, 20, 'book-open');
    insertTask.run(23, '回忆收集者', '累计完成 10 次心情回顾', 10, 50, 'book-marked');
    insertTask.run(24, '深度反思者', '累计完成 50 次心情回顾', 50, 100, 'sparkles');
    insertTask.run(25, '时光旅人', '累计完成 100 次心情回顾', 100, 200, 'clock');
    console.log('✅ 回顾长期任务添加完成');
  } else {
    console.log('⚠️  回顾长期任务已存在，跳过');
  }

  // 移除回顾相关成就（改为长期任务）
  const retroAchievementCount = db.prepare("SELECT COUNT(*) as count FROM achievements WHERE condition_type = 'retrospective_count'").get().count;
  if (retroAchievementCount > 0) {
    console.log('📝 迁移回顾成就为长期任务...');
    db.prepare("DELETE FROM achievements WHERE condition_type = 'retrospective_count'").run();
    console.log('✅ 回顾成就迁移完成');
  } else {
    console.log('⚠️  无回顾成就需要迁移，跳过');
  }

  // 创建 chapter_notes 章节札记表
  const chapterNotesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chapter_notes'").get();
  if (!chapterNotesTableExists) {
    console.log('📝 创建 chapter_notes 章节札记表...');
    db.exec(`
      CREATE TABLE chapter_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        story_id INTEGER NOT NULL,
        chapter_number INTEGER NOT NULL,
        branch_key VARCHAR(50) NOT NULL DEFAULT 'main',
        content TEXT NOT NULL,
        mood_tags VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (story_id) REFERENCES stories(id),
        UNIQUE(user_id, story_id)
      )
    `);
    console.log('✅ chapter_notes 表创建完成');
  } else {
    console.log('⚠️  chapter_notes 表已存在，跳过');
  }

  // 创建章节札记相关索引
  const chapterNotesIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_chapter_notes_user_id'").get();
  if (!chapterNotesIndexExists) {
    console.log('📝 创建章节札记相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chapter_notes_user_id ON chapter_notes(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chapter_notes_room_id ON chapter_notes(room_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chapter_notes_story_id ON chapter_notes(story_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chapter_notes_created_at ON chapter_notes(created_at)');
    console.log('✅ 章节札记索引创建完成');
  }

  // 添加章节札记相关任务
  const noteTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id IN (26, 27, 28, 29, 30)").get().count;
  if (noteTaskCount < 5) {
    console.log('📝 添加章节札记相关任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon, reset_type, reset_days)
      VALUES (?, ?, ?, 'daily', ?, ?, ?, 'daily', 1)
    `);
    insertTask.run(26, '章节札记', '阅读故事后写下你的感受和思考', 1, 20, 'book-open');
    insertTask.run(27, '深度札记', '一天内写下 3 条以上章节札记', 3, 35, 'sparkles');
    
    const insertOnceTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon)
      VALUES (?, ?, ?, 'once', ?, ?, ?)
    `);
    insertOnceTask.run(28, '初次提笔', '写下第一篇章节札记', 1, 25, 'pen-tool');
    insertOnceTask.run(29, '札记收藏家', '累计完成 20 篇章节札记', 20, 80, 'book-marked');
    insertOnceTask.run(30, '故事哲人', '累计完成 50 篇章节札记', 50, 150, 'sparkles');
    console.log('✅ 章节札记任务添加完成');
  } else {
    console.log('⚠️  章节札记任务已存在，跳过');
  }

  // 创建 emotion_prescriptions 情绪处方笺表
  const prescriptionTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='emotion_prescriptions'").get();
  if (!prescriptionTableExists) {
    console.log('📝 创建 emotion_prescriptions 情绪处方笺表...');
    db.exec(`
      CREATE TABLE emotion_prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        period_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        mood_trend VARCHAR(20) NOT NULL DEFAULT 'stable',
        avg_mood_score DECIMAL(3,2) DEFAULT 0,
        dominant_mood VARCHAR(20),
        mood_fluctuation DECIMAL(5,2) DEFAULT 0,
        suggestions TEXT,
        companion_advice TEXT,
        room_recommendations TEXT,
        task_recommendations TEXT,
        highlights TEXT,
        insights TEXT,
        is_viewed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, period_type, start_date)
      )
    `);
    console.log('✅ emotion_prescriptions 表创建完成');
  } else {
    console.log('⚠️  emotion_prescriptions 表已存在，跳过');
  }

  // 创建 emotion_stage_archives 情绪阶段档案表
  const archiveTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='emotion_stage_archives'").get();
  if (!archiveTableExists) {
    console.log('📝 创建 emotion_stage_archives 情绪阶段档案表...');
    db.exec(`
      CREATE TABLE emotion_stage_archives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        archive_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
        period_label VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        mood_summary TEXT,
        room_journey TEXT,
        task_accomplishments TEXT,
        growth_insights TEXT,
        title VARCHAR(100),
        total_mood_records INTEGER DEFAULT 0,
        total_chapters_read INTEGER DEFAULT 0,
        total_tasks_completed INTEGER DEFAULT 0,
        avg_mood_score DECIMAL(3,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, archive_type, period_label)
      )
    `);
    console.log('✅ emotion_stage_archives 表创建完成');
  } else {
    console.log('⚠️  emotion_stage_archives 表已存在，跳过');
  }

  // 创建情绪处方笺相关索引
  const prescriptionIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_emotion_prescriptions_user_id'").get();
  if (!prescriptionIndexExists) {
    console.log('📝 创建情绪处方笺相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emotion_prescriptions_user_id ON emotion_prescriptions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emotion_prescriptions_period ON emotion_prescriptions(user_id, period_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emotion_stage_archives_user_id ON emotion_stage_archives(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emotion_stage_archives_period ON emotion_stage_archives(user_id, archive_type)');
    console.log('✅ 情绪处方笺索引创建完成');
  } else {
    console.log('⚠️  情绪处方笺索引已存在，跳过');
  }

  // 添加情绪处方笺相关任务
  const prescriptionTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id IN (31, 32, 33, 34)").get().count;
  if (prescriptionTaskCount < 4) {
    console.log('📝 添加情绪处方笺相关任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon, reset_type, reset_days)
      VALUES (?, ?, ?, 'daily', ?, ?, ?, 'daily', 1)
    `);
    insertTask.run(31, '查看处方笺', '查看今日情绪处方笺的陪伴建议', 1, 10, 'heart-pulse');
    
    const insertOnceTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon)
      VALUES (?, ?, ?, 'once', ?, ?, ?)
    `);
    insertOnceTask.run(32, '初次问诊', '查看第一份情绪处方笺', 1, 30, 'stethoscope');
    insertOnceTask.run(33, '心灵守护者', '累计查看 10 份情绪处方笺', 10, 80, 'shield-heart');
    insertOnceTask.run(34, '情绪疗愈师', '累计查看 30 份情绪处方笺', 30, 200, 'sparkles');
    console.log('✅ 情绪处方笺任务添加完成');
  } else {
    console.log('⚠️  情绪处方笺任务已存在，跳过');
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
