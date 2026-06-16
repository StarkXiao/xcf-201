const db = require('../config/database');

class UserRepository {
  create(username, email, passwordHash) {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(username, email, passwordHash);
    
    const userRoomStmt = db.prepare(`
      INSERT INTO user_rooms (user_id, room_id, current_chapter, is_unlocked, unlocked_at)
      SELECT ?, id, 0, 1, CURRENT_TIMESTAMP
      FROM rooms
      WHERE required_days = 0
    `);
    userRoomStmt.run(result.lastInsertRowid);
    
    const userAchievementStmt = db.prepare(`
      INSERT INTO user_achievements (user_id, achievement_id, progress, is_unlocked)
      SELECT ?, id, 0, 0
      FROM achievements
    `);
    userAchievementStmt.run(result.lastInsertRowid);
    
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT id, username, email, avatar, check_in_days, total_moods, created_at
      FROM users
      WHERE id = ?
    `);
    return stmt.get(id);
  }

  findByUsername(username) {
    const stmt = db.prepare(`
      SELECT * FROM users WHERE username = ?
    `);
    return stmt.get(username);
  }

  findByEmail(email) {
    const stmt = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `);
    return stmt.get(email);
  }

  updateStats(userId) {
    const updateStmt = db.prepare(`
      UPDATE users
      SET total_moods = (
        SELECT COUNT(*) FROM moods WHERE user_id = ?
      ),
      check_in_days = (
        SELECT COUNT(DISTINCT record_date) 
        FROM moods 
        WHERE user_id = ?
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(userId, userId, userId);
    return this.findById(userId);
  }

  updateAvatar(userId, avatar) {
    const stmt = db.prepare(`
      UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(avatar, userId);
    return this.findById(userId);
  }

  getStats(userId) {
    const stmt = db.prepare(`
      SELECT 
        check_in_days,
        total_moods,
        (SELECT COUNT(*) FROM user_rooms WHERE user_id = ? AND is_unlocked = 1) as unlocked_rooms,
        (SELECT COUNT(*) FROM user_achievements WHERE user_id = ? AND is_unlocked = 1) as unlocked_achievements
      FROM users
      WHERE id = ?
    `);
    return stmt.get(userId, userId, userId);
  }
}

module.exports = new UserRepository();
