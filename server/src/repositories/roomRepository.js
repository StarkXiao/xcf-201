const db = require('../config/database');

module.exports.db = db;

class RoomRepository {
  findAll(userId) {
    const stmt = db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.cover_image,
        r.unlock_condition,
        r.required_days,
        r.required_multi_segment_days,
        r.required_mood_types,
        r.required_chapters,
        r.required_tasks,
        r.unlock_conditions,
        r.total_chapters,
        r.sort_order,
        COALESCE(ur.is_unlocked, 0) as is_unlocked,
        COALESCE(ur.current_chapter, 0) as current_chapter,
        COALESCE(ur.current_branch, 'main') as current_branch,
        ur.unlocked_at
      FROM rooms r
      LEFT JOIN user_rooms ur ON r.id = ur.room_id AND ur.user_id = ?
      ORDER BY r.sort_order
    `);
    return stmt.all(userId);
  }

  findById(userId, roomId) {
    const stmt = db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.cover_image,
        r.unlock_condition,
        r.required_days,
        r.required_multi_segment_days,
        r.required_mood_types,
        r.required_chapters,
        r.required_tasks,
        r.unlock_conditions,
        r.total_chapters,
        COALESCE(ur.is_unlocked, 0) as is_unlocked,
        COALESCE(ur.current_chapter, 0) as current_chapter,
        COALESCE(ur.current_branch, 'main') as current_branch,
        ur.unlocked_at
      FROM rooms r
      LEFT JOIN user_rooms ur ON r.id = ur.room_id AND ur.user_id = ?
      WHERE r.id = ?
    `);
    return stmt.get(userId, roomId);
  }

  getStories(roomId) {
    const stmt = db.prepare(`
      SELECT id, room_id, chapter_number, title, content
      FROM stories
      WHERE room_id = ?
      ORDER BY chapter_number
    `);
    return stmt.all(roomId);
  }

  getUserRoom(userId, roomId) {
    const stmt = db.prepare(`
      SELECT * FROM user_rooms
      WHERE user_id = ? AND room_id = ?
    `);
    return stmt.get(userId, roomId);
  }

  unlockRoom(userId, roomId) {
    const existing = this.getUserRoom(userId, roomId);
    
    if (existing) {
      if (existing.is_unlocked) {
        return { success: false, message: '房间已解锁' };
      }
      const stmt = db.prepare(`
        UPDATE user_rooms
        SET is_unlocked = 1, unlocked_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND room_id = ?
      `);
      stmt.run(userId, roomId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_rooms (user_id, room_id, current_chapter, is_unlocked, unlocked_at)
        VALUES (?, ?, 0, 1, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, roomId);
    }
    
    return { success: true, message: '房间解锁成功' };
  }

  updateProgress(userId, roomId, chapterNumber) {
    const stmt = db.prepare(`
      UPDATE user_rooms
      SET current_chapter = ?
      WHERE user_id = ? AND room_id = ? AND current_chapter < ?
    `);
    const result = stmt.run(chapterNumber, userId, roomId, chapterNumber);
    return result.changes > 0;
  }

  getUnlockedCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_rooms
      WHERE user_id = ? AND is_unlocked = 1
    `);
    return stmt.get(userId).count;
  }

  getTotalCount() {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM rooms`);
    return stmt.get().count;
  }

  getChaptersRead(userId) {
    const stmt = db.prepare(`
      SELECT SUM(current_chapter) as total
      FROM user_rooms
      WHERE user_id = ? AND is_unlocked = 1
    `);
    return stmt.get(userId).total || 0;
  }

  updateCurrentBranch(userId, roomId, branchKey) {
    const existing = this.getUserRoom(userId, roomId);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE user_rooms
        SET current_branch = ?
        WHERE user_id = ? AND room_id = ?
      `);
      stmt.run(branchKey, userId, roomId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_rooms (user_id, room_id, current_chapter, current_branch, is_unlocked, unlocked_at)
        VALUES (?, ?, 0, ?, 0, NULL)
      `);
      stmt.run(userId, roomId, branchKey);
    }
    
    this.ensureBranchProgress(userId, roomId, branchKey);
    return true;
  }

  ensureBranchProgress(userId, roomId, branchKey) {
    const existing = db.prepare(`
      SELECT * FROM user_room_branches
      WHERE user_id = ? AND room_id = ? AND branch_key = ?
    `).get(userId, roomId, branchKey);
    
    if (!existing) {
      const stmt = db.prepare(`
        INSERT INTO user_room_branches (user_id, room_id, branch_key, current_story_id, max_chapter_reached, is_active, last_read_at)
        VALUES (?, ?, ?, NULL, 0, 0, NULL)
      `);
      stmt.run(userId, roomId, branchKey);
    }
  }

  getBranchProgress(userId, roomId, branchKey) {
    this.ensureBranchProgress(userId, roomId, branchKey);
    return db.prepare(`
      SELECT * FROM user_room_branches
      WHERE user_id = ? AND room_id = ? AND branch_key = ?
    `).get(userId, roomId, branchKey);
  }

  getAllBranchProgress(userId, roomId) {
    return db.prepare(`
      SELECT urb.*, s.branch_label
      FROM user_room_branches urb
      LEFT JOIN (
        SELECT DISTINCT branch_key, branch_label 
        FROM stories 
        WHERE room_id = ?
      ) s ON urb.branch_key = s.branch_key
      WHERE urb.user_id = ? AND urb.room_id = ?
      ORDER BY urb.max_chapter_reached DESC
    `).all(roomId, userId, roomId);
  }

  updateBranchProgress(userId, roomId, branchKey, storyId, chapterNumber) {
    this.ensureBranchProgress(userId, roomId, branchKey);
    
    const stmt = db.prepare(`
      UPDATE user_room_branches
      SET current_story_id = ?, 
          max_chapter_reached = MAX(max_chapter_reached, ?),
          last_read_at = CURRENT_TIMESTAMP,
          is_active = 1
      WHERE user_id = ? AND room_id = ? AND branch_key = ?
    `);
    stmt.run(storyId, chapterNumber, userId, roomId, branchKey);
    
    return true;
  }

  addStoryToHistory(userId, roomId, storyId, branchKey) {
    const existing = db.prepare(`
      SELECT id FROM user_story_history
      WHERE user_id = ? AND room_id = ? AND story_id = ?
    `).get(userId, roomId, storyId);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE user_story_history
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(existing.id);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_story_history (user_id, room_id, story_id, branch_key)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(userId, roomId, storyId, branchKey);
    }
    
    return true;
  }

  getStoryHistory(userId, roomId) {
    return db.prepare(`
      SELECT ush.*, s.title, s.chapter_number, s.branch_key, s.branch_label
      FROM user_story_history ush
      JOIN stories s ON ush.story_id = s.id
      WHERE ush.user_id = ? AND ush.room_id = ?
      ORDER BY ush.read_at DESC
    `).all(userId, roomId);
  }

  getReadStoryIds(userId, roomId) {
    const rows = db.prepare(`
      SELECT story_id FROM user_story_history
      WHERE user_id = ? AND room_id = ?
    `).all(userId, roomId);
    return rows.map(r => r.story_id);
  }

  setActiveBranch(userId, roomId, branchKey) {
    const stmt = db.prepare(`
      UPDATE user_room_branches
      SET is_active = CASE WHEN branch_key = ? THEN 1 ELSE 0 END
      WHERE user_id = ? AND room_id = ?
    `);
    stmt.run(branchKey, userId, roomId);
    
    const roomStmt = db.prepare(`
      UPDATE user_rooms
      SET current_branch = ?
      WHERE user_id = ? AND room_id = ?
    `);
    roomStmt.run(branchKey, userId, roomId);
    
    return true;
  }

  getMultiSegmentDays(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT record_date) as count
      FROM moods
      WHERE user_id = ?
      GROUP BY record_date
      HAVING COUNT(DISTINCT time_segment) >= 3
    `);
    const rows = stmt.all(userId);
    return rows.length;
  }

  getMoodTypeCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT mood_type) as count
      FROM moods
      WHERE user_id = ?
    `);
    return stmt.get(userId).count || 0;
  }

  getTotalChaptersRead(userId) {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(max_chapter_reached), 0) as total
      FROM user_room_branches
      WHERE user_id = ?
    `);
    return stmt.get(userId).total || 0;
  }

  getCompletedTasks(userId, taskIds) {
    if (!taskIds || taskIds.length === 0) return [];
    
    const placeholders = taskIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT DISTINCT ut.task_id
      FROM user_tasks ut
      WHERE ut.user_id = ? 
        AND ut.task_id IN (${placeholders})
        AND ut.is_completed = 1
    `);
    const rows = stmt.all(userId, ...taskIds);
    return rows.map(r => r.task_id);
  }

  getUnlockProgress(userId) {
    return {
      totalRecordDays: this.getRecordDays(userId),
      multiSegmentDays: this.getMultiSegmentDays(userId),
      moodTypeCount: this.getMoodTypeCount(userId),
      totalChaptersRead: this.getTotalChaptersRead(userId)
    };
  }

  getRecordDays(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT record_date) as count
      FROM moods
      WHERE user_id = ?
    `);
    return stmt.get(userId).count || 0;
  }
}

module.exports = new RoomRepository();
