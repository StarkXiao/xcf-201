require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);
console.log('\n开始执行疗愈地图数据库迁移...\n');

const migrate = db.transaction(() => {
  const stagesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='healing_stages'").get();
  if (!stagesTableExists) {
    console.log('📝 创建 healing_stages 疗愈阶段表...');
    db.exec(`
      CREATE TABLE healing_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#8b5cf6',
        icon VARCHAR(50) DEFAULT 'map',
        sort_order INTEGER DEFAULT 0,
        requirements TEXT,
        rewards TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ healing_stages 表创建完成');
  } else {
    console.log('⚠️  healing_stages 表已存在，跳过');
  }

  const milestonesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='healing_milestones'").get();
  if (!milestonesTableExists) {
    console.log('📝 创建 healing_milestones 里程碑表...');
    db.exec(`
      CREATE TABLE healing_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER NOT NULL,
        milestone_key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'trophy',
        requirement_type VARCHAR(50) NOT NULL,
        requirement_value INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (stage_id) REFERENCES healing_stages(id)
      )
    `);
    console.log('✅ healing_milestones 表创建完成');
  } else {
    console.log('⚠️  healing_milestones 表已存在，跳过');
  }

  const userStagesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_healing_stages'").get();
  if (!userStagesTableExists) {
    console.log('📝 创建 user_healing_stages 用户阶段进度表...');
    db.exec(`
      CREATE TABLE user_healing_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stage_id INTEGER NOT NULL,
        progress DECIMAL(5,2) DEFAULT 0,
        is_unlocked BOOLEAN DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        unlocked_at DATETIME,
        completed_at DATETIME,
        reward_claimed BOOLEAN DEFAULT 0,
        reward_claimed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (stage_id) REFERENCES healing_stages(id),
        UNIQUE(user_id, stage_id)
      )
    `);
    console.log('✅ user_healing_stages 表创建完成');
  } else {
    console.log('⚠️  user_healing_stages 表已存在，跳过');
  }

  const userMilestonesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_healing_milestones'").get();
  if (!userMilestonesTableExists) {
    console.log('📝 创建 user_healing_milestones 用户里程碑表...');
    db.exec(`
      CREATE TABLE user_healing_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        milestone_id INTEGER NOT NULL,
        is_unlocked BOOLEAN DEFAULT 0,
        unlocked_at DATETIME,
        current_progress INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (milestone_id) REFERENCES healing_milestones(id),
        UNIQUE(user_id, milestone_id)
      )
    `);
    console.log('✅ user_healing_milestones 表创建完成');
  } else {
    console.log('⚠️  user_healing_milestones 表已存在，跳过');
  }

  const journeyEventsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='healing_journey_events'").get();
  if (!journeyEventsTableExists) {
    console.log('📝 创建 healing_journey_events 旅程事件表...');
    db.exec(`
      CREATE TABLE healing_journey_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_title VARCHAR(200) NOT NULL,
        event_description TEXT,
        related_module VARCHAR(50),
        related_id INTEGER,
        event_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ healing_journey_events 表创建完成');
  } else {
    console.log('⚠️  healing_journey_events 表已存在，跳过');
  }

  const stageIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_healing_stages_key'").get();
  if (!stageIndexExists) {
    console.log('📝 创建疗愈阶段相关索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_healing_stages_key ON healing_stages(stage_key)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_healing_milestones_stage ON healing_milestones(stage_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_healing_stages_user ON user_healing_stages(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_healing_milestones_user ON user_healing_milestones(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_healing_journey_events_user ON healing_journey_events(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_healing_journey_events_date ON healing_journey_events(user_id, event_date)');
    console.log('✅ 疗愈阶段索引创建完成');
  } else {
    console.log('⚠️  疗愈阶段索引已存在，跳过');
  }

  const stageCount = db.prepare('SELECT COUNT(*) as count FROM healing_stages').get().count;
  if (stageCount === 0) {
    console.log('📝 插入疗愈阶段数据...');
    
    const insertStage = db.prepare(`
      INSERT INTO healing_stages (stage_key, name, description, color, icon, sort_order, requirements, rewards)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const stages = [
      [
        'awakening',
        '觉醒之始',
        '踏上疗愈旅程的第一步，开始觉察自己的情绪变化',
        '#8b5cf6',
        'sprout',
        1,
        JSON.stringify({
          mood_records: 3,
          mood_types: 2
        }),
        JSON.stringify({
          type: 'companion',
          companion_template_id: 1,
          title: '初心者'
        })
      ],
      [
        'exploration',
        '探索之旅',
        '深入探索内心世界，在故事中寻找共鸣与启发',
        '#3b82f6',
        'compass',
        2,
        JSON.stringify({
          mood_records: 7,
          rooms_unlocked: 2,
          chapters_read: 5
        }),
        JSON.stringify({
          type: 'title',
          title: '梦境探索者',
          star_coins: 100
        })
      ],
      [
        'understanding',
        '理解之光',
        '逐渐理解情绪的规律，学会与自己的内心对话',
        '#22c55e',
        'lightbulb',
        3,
        JSON.stringify({
          mood_records: 14,
          achievements_unlocked: 5,
          multi_segment_days: 3
        }),
        JSON.stringify({
          type: 'companion',
          companion_template_id: 2,
          title: '情绪观察者'
        })
      ],
      [
        'acceptance',
        '接纳之心',
        '学会接纳自己的所有情绪，无论是喜悦还是悲伤',
        '#f97316',
        'heart',
        4,
        JSON.stringify({
          mood_records: 30,
          chapters_read: 15,
          achievements_unlocked: 10
        }),
        JSON.stringify({
          type: 'title',
          title: '自我接纳者',
          star_coins: 200
        })
      ],
      [
        'integration',
        '融合之境',
        '将疗愈经验融入日常生活，成为更好的自己',
        '#ec4899',
        'sparkles',
        5,
        JSON.stringify({
          mood_records: 60,
          rooms_unlocked: 5,
          chapters_read: 30,
          achievements_unlocked: 15
        }),
        JSON.stringify({
          type: 'companion',
          companion_template_id: 3,
          title: '心灵融合者'
        })
      ],
      [
        'transcendence',
        '超越之巅',
        '完成疗愈之旅，成为自己人生的主人',
        '#fbbf24',
        'crown',
        6,
        JSON.stringify({
          mood_records: 100,
          rooms_unlocked: 6,
          chapters_read: 50,
          achievements_unlocked: 20
        }),
        JSON.stringify({
          type: 'title',
          title: '梦境大师',
          star_coins: 500
        })
      ]
    ];

    stages.forEach(stage => insertStage.run(...stage));
    console.log(`✅ 插入 ${stages.length} 个疗愈阶段`);
  } else {
    console.log('⚠️  疗愈阶段数据已存在，跳过');
  }

  const milestoneCount = db.prepare('SELECT COUNT(*) as count FROM healing_milestones').get().count;
  if (milestoneCount === 0) {
    console.log('📝 插入里程碑数据...');
    
    const insertMilestone = db.prepare(`
      INSERT INTO healing_milestones (stage_id, milestone_key, name, description, icon, requirement_type, requirement_value, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const milestones = [
      [1, 'first_mood', '初次记录', '写下第一条心情记录', 'pen-tool', 'mood_records', 1, 1],
      [1, 'three_days', '三日坚持', '连续记录 3 天心情', 'calendar-days', 'mood_records', 3, 2],
      [1, 'two_moods', '情绪初体验', '体验 2 种不同的情绪', 'palette', 'mood_types', 2, 3],
      
      [2, 'week_streak', '一周坚持', '连续记录 7 天心情', 'flame', 'mood_records', 7, 1],
      [2, 'second_room', '新房间解锁', '解锁第二个房间', 'door-open', 'rooms_unlocked', 2, 2],
      [2, 'five_chapters', '故事入门', '阅读 5 个故事章节', 'book-open', 'chapters_read', 5, 3],
      
      [3, 'two_weeks', '两周成长', '累计记录 14 天心情', 'calendar', 'mood_records', 14, 1],
      [3, 'five_achievements', '初露锋芒', '解锁 5 个成就', 'trophy', 'achievements_unlocked', 5, 2],
      [3, 'multi_segment', '三段记录', '体验 3 天多时段心情记录', 'layers', 'multi_segment_days', 3, 3],
      
      [4, 'monthly_record', '月度坚持', '累计记录 30 天心情', 'calendar-days', 'mood_records', 30, 1],
      [4, 'fifteen_chapters', '深度阅读', '阅读 15 个故事章节', 'book-marked', 'chapters_read', 15, 2],
      [4, 'ten_achievements', '成就达人', '解锁 10 个成就', 'award', 'achievements_unlocked', 10, 3],
      
      [5, 'sixty_days', '两个月', '累计记录 60 天心情', 'calendar-days', 'mood_records', 60, 1],
      [5, 'five_rooms', '广结善缘', '解锁 5 个房间', 'home', 'rooms_unlocked', 5, 2],
      [5, 'thirty_chapters', '博览群书', '阅读 30 个故事章节', 'library', 'chapters_read', 30, 3],
      [5, 'fifteen_achievements', '成就收藏家', '解锁 15 个成就', 'medal', 'achievements_unlocked', 15, 4],
      
      [6, 'hundred_days', '百日修行', '累计记录 100 天心情', 'crown', 'mood_records', 100, 1],
      [6, 'all_rooms', '全房间解锁', '解锁所有房间', 'castle', 'rooms_unlocked', 6, 2],
      [6, 'fifty_chapters', '故事大师', '阅读 50 个故事章节', 'book-open-check', 'chapters_read', 50, 3],
      [6, 'twenty_achievements', '全成就解锁', '解锁 20 个成就', 'trophy', 'achievements_unlocked', 20, 4]
    ];

    milestones.forEach(m => insertMilestone.run(...m));
    console.log(`✅ 插入 ${milestones.length} 个里程碑`);
  } else {
    console.log('⚠️  里程碑数据已存在，跳过');
  }
});

try {
  migrate();
  console.log('\n🎉 疗愈地图数据库迁移完成！\n');
  
  console.log('迁移后数据统计:');
  const stageCount = db.prepare('SELECT COUNT(*) FROM healing_stages').get()['COUNT(*)'];
  const milestoneCount = db.prepare('SELECT COUNT(*) FROM healing_milestones').get()['COUNT(*)'];
  console.log(`  疗愈阶段数: ${stageCount}`);
  console.log(`  里程碑数: ${milestoneCount}`);
  
} catch (error) {
  console.error('\n❌ 疗愈地图数据库迁移失败:', error.message);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
