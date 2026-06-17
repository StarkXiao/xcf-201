-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) DEFAULT 'default_avatar.png',
  check_in_days INTEGER DEFAULT 0,
  total_moods INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 心情记录表
CREATE TABLE IF NOT EXISTS moods (
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
);

-- 房间表
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image VARCHAR(255),
  unlock_condition VARCHAR(255),
  required_days INTEGER DEFAULT 0,
  required_mood_type VARCHAR(20),
  required_multi_segment_days INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

-- 故事章节表（支持分支结构）
CREATE TABLE IF NOT EXISTS stories (
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
);

-- 用户房间关联表
CREATE TABLE IF NOT EXISTS user_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  current_chapter INTEGER DEFAULT 0,
  current_branch VARCHAR(50) DEFAULT 'main',
  is_unlocked BOOLEAN DEFAULT 0,
  unlocked_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  UNIQUE(user_id, room_id)
);

-- 用户房间分支进度表
CREATE TABLE IF NOT EXISTS user_room_branches (
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
);

-- 用户故事阅读历史表（用于回溯）
CREATE TABLE IF NOT EXISTS user_story_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  story_id INTEGER NOT NULL,
  branch_key VARCHAR(50) NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (story_id) REFERENCES stories(id)
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  target INTEGER DEFAULT 1,
  reward INTEGER DEFAULT 0,
  chain_id INTEGER DEFAULT NULL,
  chain_order INTEGER DEFAULT 0,
  reset_type VARCHAR(20) DEFAULT 'none',
  reset_days INTEGER DEFAULT 0,
  icon VARCHAR(50) DEFAULT 'gift'
);

-- 用户任务关联表
CREATE TABLE IF NOT EXISTS user_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT 0,
  is_claimed BOOLEAN DEFAULT 0,
  task_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  UNIQUE(user_id, task_id, task_date)
);

-- 成就表
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL
);

-- 用户成就关联表
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT 0,
  unlocked_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);

-- 心情回顾复写表
CREATE TABLE IF NOT EXISTS mood_retrospectives (
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
);

-- 情绪处方笺表
CREATE TABLE IF NOT EXISTS emotion_prescriptions (
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
);

-- 情绪阶段档案表
CREATE TABLE IF NOT EXISTS emotion_stage_archives (
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
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_moods_user_id ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_record_date ON moods(record_date);
CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_user_id ON mood_retrospectives(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_record_date ON mood_retrospectives(record_date);
CREATE INDEX IF NOT EXISTS idx_mood_retrospectives_mood_id ON mood_retrospectives(mood_id);
CREATE INDEX IF NOT EXISTS idx_stories_room_id ON stories(room_id);
CREATE INDEX IF NOT EXISTS idx_stories_branch_key ON stories(branch_key);
CREATE INDEX IF NOT EXISTS idx_stories_parent_id ON stories(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_rooms_user_id ON user_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_branches_user ON user_room_branches(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_user_story_history_user ON user_story_history(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_date ON user_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_prescriptions_user_id ON emotion_prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_prescriptions_period ON emotion_prescriptions(user_id, period_type);
-- 梦境收藏馆 - 情绪片段表
CREATE TABLE IF NOT EXISTS emotion_fragments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'mood',
  source_id INTEGER,
  emotion_type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  mood_color VARCHAR(20),
  tags VARCHAR(500),
  is_starred BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 梦境收藏馆 - 房间故事卡表
CREATE TABLE IF NOT EXISTS story_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  story_id INTEGER NOT NULL,
  card_type VARCHAR(20) NOT NULL DEFAULT 'chapter',
  title VARCHAR(200) NOT NULL,
  excerpt TEXT,
  room_name VARCHAR(100),
  branch_label VARCHAR(100),
  mood_theme VARCHAR(20),
  is_unlocked BOOLEAN DEFAULT 1,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (story_id) REFERENCES stories(id),
  UNIQUE(user_id, story_id)
);

-- 梦境收藏馆 - 高光收藏表
CREATE TABLE IF NOT EXISTS collection_highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'story',
  source_id INTEGER,
  room_id INTEGER,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  highlight_note TEXT,
  mood_tag VARCHAR(20),
  is_favorite BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 梦境收藏馆 - 收藏目标表
CREATE TABLE IF NOT EXISTS collection_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL DEFAULT 1,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  related_achievement_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_achievement_id) REFERENCES achievements(id)
);

-- 创建梦境收藏馆相关索引
CREATE INDEX IF NOT EXISTS idx_emotion_fragments_user_id ON emotion_fragments(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_fragments_source ON emotion_fragments(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_emotion_fragments_emotion ON emotion_fragments(user_id, emotion_type);
CREATE INDEX IF NOT EXISTS idx_emotion_fragments_starred ON emotion_fragments(user_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_story_cards_user_id ON story_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_story_cards_room ON story_cards(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_collection_highlights_user_id ON collection_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_highlights_source ON collection_highlights(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_collection_highlights_favorite ON collection_highlights(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_collection_goals_user_id ON collection_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_goals_type ON collection_goals(user_id, goal_type);
CREATE INDEX IF NOT EXISTS idx_emotion_stage_archives_user_id ON emotion_stage_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_stage_archives_period ON emotion_stage_archives(user_id, archive_type);

-- 同行旅伴系统 - 旅伴模板表
CREATE TABLE IF NOT EXISTS companion_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  personality TEXT NOT NULL,
  appearance TEXT,
  background_story TEXT,
  traits TEXT,
  avatar VARCHAR(255),
  base_stats TEXT,
  unlock_condition TEXT,
  is_default BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 同行旅伴系统 - 用户旅伴表
CREATE TABLE IF NOT EXISTS user_companions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  companion_template_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  intimacy INTEGER DEFAULT 0,
  stats TEXT,
  personality TEXT,
  current_mood VARCHAR(20) DEFAULT 'neutral',
  is_active BOOLEAN DEFAULT 0,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_interaction_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_template_id) REFERENCES companion_templates(id),
  UNIQUE(user_id, companion_template_id)
);

-- 同行旅伴系统 - 旅伴对话表
CREATE TABLE IF NOT EXISTS companion_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  companion_id INTEGER NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  sender_role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  emotion_trigger TEXT,
  intimacy_change INTEGER DEFAULT 0,
  exp_change INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_id) REFERENCES user_companions(id)
);

-- 同行旅伴系统 - 旅伴事件表
CREATE TABLE IF NOT EXISTS companion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companion_template_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  trigger_condition TEXT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT,
  choices TEXT,
  rewards TEXT,
  required_intimacy INTEGER DEFAULT 0,
  required_level INTEGER DEFAULT 0,
  is_unique BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (companion_template_id) REFERENCES companion_templates(id)
);

-- 同行旅伴系统 - 用户事件记录表
CREATE TABLE IF NOT EXISTS user_companion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  companion_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  choice_made TEXT,
  reward_claimed BOOLEAN DEFAULT 0,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_id) REFERENCES user_companions(id),
  FOREIGN KEY (event_id) REFERENCES companion_events(id),
  UNIQUE(user_id, companion_id, event_id)
);

-- 同行旅伴系统 - 旅伴成长日志表
CREATE TABLE IF NOT EXISTS companion_growth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  companion_id INTEGER NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_detail TEXT,
  exp_change INTEGER DEFAULT 0,
  intimacy_change INTEGER DEFAULT 0,
  source_type VARCHAR(50),
  source_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_id) REFERENCES user_companions(id)
);

-- 创建同行旅伴系统索引
CREATE INDEX IF NOT EXISTS idx_user_companions_user_id ON user_companions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companions_active ON user_companions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_companion_conversations_user ON companion_conversations(user_id, companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_conversations_created ON companion_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_companion_events_template ON companion_events(companion_template_id);
CREATE INDEX IF NOT EXISTS idx_user_companion_events_user ON user_companion_events(user_id, companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_growth_logs_user ON companion_growth_logs(user_id, companion_id);

-- 回忆邮局 - 信件表
CREATE TABLE IF NOT EXISTS memory_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  letter_content TEXT NOT NULL,
  source_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  mood_snapshot TEXT,
  room_snapshot TEXT,
  growth_snapshot TEXT,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 回忆邮局 - 信件内容详情表（可选，用于存储更详细的快照数据）
CREATE TABLE IF NOT EXISTS memory_letter_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  letter_id INTEGER NOT NULL,
  detail_type VARCHAR(30) NOT NULL,
  detail_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (letter_id) REFERENCES memory_letters(id)
);

-- 创建回忆邮局相关索引
CREATE INDEX IF NOT EXISTS idx_memory_letters_user_id ON memory_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_letters_status ON memory_letters(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memory_letters_delivery ON memory_letters(user_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_memory_letter_details_letter ON memory_letter_details(letter_id);
