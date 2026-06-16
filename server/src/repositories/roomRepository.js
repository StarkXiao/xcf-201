const db = require('../config/database');

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
        r.total_chapters,
        r.sort_order,
        COALESCE(ur.is_unlocked, 0) as is_unlocked,
        COALESCE(ur.current_chapter, 0) as current_chapter,
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
        r.total_chapters,
        COALESCE(ur.is_unlocked, 0) as is_unlocked,
        COALESCE(ur.current_chapter, 0) as current_chapter,
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
}

module.exports = new RoomRepository();
