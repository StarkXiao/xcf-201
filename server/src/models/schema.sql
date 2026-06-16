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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_moods_user_id ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_record_date ON moods(record_date);
CREATE INDEX IF NOT EXISTS idx_stories_room_id ON stories(room_id);
CREATE INDEX IF NOT EXISTS idx_stories_branch_key ON stories(branch_key);
CREATE INDEX IF NOT EXISTS idx_stories_parent_id ON stories(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_rooms_user_id ON user_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_branches_user ON user_room_branches(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_user_story_history_user ON user_story_history(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_date ON user_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
