const db = require('../config/database');

class CrisisCenterRepository {
  getRecentDaysMoods(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT record_date, time_segment, mood_type, content, tags, tag_weights, created_at
      FROM moods
      WHERE user_id = ? AND record_date >= date('now', '-' || ? || ' days')
      ORDER BY record_date DESC, 
        CASE time_segment 
          WHEN 'morning' THEN 1 
          WHEN 'afternoon' THEN 2 
          WHEN 'evening' THEN 3 
          WHEN 'day' THEN 4 
          ELSE 5 
        END
    `);
    return stmt.all(userId, days);
  }

  getRecentDaysAggregates(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT record_date, mood_type, COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date >= date('now', '-' || ? || ' days')
      GROUP BY record_date, mood_type
      ORDER BY record_date DESC
    `);
    return stmt.all(userId, days);
  }

  getRecentDistinctDates(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ? AND record_date >= date('now', '-' || ? || ' days')
      ORDER BY record_date DESC
    `);
    return stmt.all(userId, days).map(r => r.record_date);
  }

  getRecentTaskCompletions(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT DATE(completed_at) as completed_date, COUNT(*) as completed_count
      FROM user_tasks
      WHERE user_id = ? 
        AND is_completed = 1 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) >= date('now', '-' || ? || ' days')
      GROUP BY DATE(completed_at)
      ORDER BY completed_date DESC
    `);
    return stmt.all(userId, days);
  }

  getUncompletedDailyTasksRecent(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT t.id, t.title, t.type, t.target, ut.task_date, ut.is_completed, ut.current_progress
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE t.type = 'daily'
        AND (ut.task_date IS NULL OR ut.task_date >= date('now', '-' || ? || ' days'))
      ORDER BY ut.task_date DESC, t.id
    `);
    return stmt.all(userId, days);
  }

  getStoryReadingRecent(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT DATE(ush.read_at) as read_date, COUNT(*) as chapters_read
      FROM user_story_history ush
      WHERE ush.user_id = ? 
        AND ush.read_at IS NOT NULL
        AND DATE(ush.read_at) >= date('now', '-' || ? || ' days')
      GROUP BY DATE(ush.read_at)
      ORDER BY read_date DESC
    `);
    return stmt.all(userId, days);
  }

  getUnlockedRoomProgress(userId) {
    const stmt = db.prepare(`
      SELECT 
        r.id, r.name, r.total_chapters,
        COALESCE(ur.current_chapter, 0) as current_chapter,
        COALESCE(ur.is_unlocked, 0) as is_unlocked,
        ur.unlocked_at
      FROM rooms r
      LEFT JOIN user_rooms ur ON r.id = ur.room_id AND ur.user_id = ?
      WHERE COALESCE(ur.is_unlocked, 0) = 1
      ORDER BY ur.unlocked_at DESC
    `);
    return stmt.all(userId);
  }

  getLastStoryReadDate(userId) {
    const stmt = db.prepare(`
      SELECT MAX(read_at) as last_read_at
      FROM user_story_history
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result?.last_read_at || null;
  }

  getLastMoodRecordDate(userId) {
    const stmt = db.prepare(`
      SELECT MAX(record_date) as last_record_date
      FROM moods
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result?.last_record_date || null;
  }

  getMoodStreakInfo(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ?
      ORDER BY record_date DESC
      LIMIT 30
    `);
    return stmt.all(userId).map(r => r.record_date);
  }

  getNegativeMoodConsecutiveDays(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT record_date, GROUP_CONCAT(mood_type) as mood_types
      FROM moods
      WHERE user_id = ? 
        AND record_date >= date('now', '-' || ? || ' days')
        AND mood_type IN ('sad', 'anxious', 'angry')
      GROUP BY record_date
      ORDER BY record_date DESC
    `);
    return stmt.all(userId, days);
  }

  getHighFluctuationDays(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT record_date, 
        COUNT(DISTINCT mood_type) as mood_type_count,
        GROUP_CONCAT(DISTINCT mood_type) as mood_types
      FROM moods
      WHERE user_id = ? AND record_date >= date('now', '-' || ? || ' days')
      GROUP BY record_date
      HAVING mood_type_count >= 3
      ORDER BY record_date DESC
    `);
    return stmt.all(userId, days);
  }
}

module.exports = new CrisisCenterRepository();
