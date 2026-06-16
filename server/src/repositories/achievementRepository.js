const db = require('../config/database');

class AchievementRepository {
  findAll() {
    const stmt = db.prepare(`SELECT * FROM achievements ORDER BY id`);
    return stmt.all();
  }

  findById(id) {
    const stmt = db.prepare(`SELECT * FROM achievements WHERE id = ?`);
    return stmt.get(id);
  }

  findByConditionType(conditionType) {
    const stmt = db.prepare(`
      SELECT * FROM achievements WHERE condition_type = ? ORDER BY condition_value
    `);
    return stmt.all(conditionType);
  }

  getUserAchievements(userId) {
    const stmt = db.prepare(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.condition_type,
        a.condition_value,
        COALESCE(ua.progress, 0) as progress,
        COALESCE(ua.is_unlocked, 0) as is_unlocked,
        ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.id
    `);
    return stmt.all(userId);
  }

  getUserAchievement(userId, achievementId) {
    const stmt = db.prepare(`
      SELECT * FROM user_achievements
      WHERE user_id = ? AND achievement_id = ?
    `);
    return stmt.get(userId, achievementId);
  }

  updateProgress(userId, achievementId, progress) {
    const achievement = this.findById(achievementId);
    if (!achievement) return null;

    const isUnlocked = progress >= achievement.condition_value;
    
    const existing = this.getUserAchievement(userId, achievementId);
    
    if (existing) {
      if (existing.is_unlocked) return existing;
      
      const stmt = db.prepare(`
        UPDATE user_achievements
        SET progress = ?, is_unlocked = ?, unlocked_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE unlocked_at END
        WHERE user_id = ? AND achievement_id = ?
      `);
      stmt.run(progress, isUnlocked ? 1 : 0, isUnlocked ? 1 : 0, userId, achievementId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, progress, is_unlocked, unlocked_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(userId, achievementId, progress, isUnlocked ? 1 : 0, isUnlocked ? new Date().toISOString() : null);
    }

    return {
      ...achievement,
      progress,
      is_unlocked: isUnlocked ? 1 : 0,
      unlocked_at: isUnlocked ? new Date().toISOString() : null
    };
  }

  getUnlockedCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_achievements
      WHERE user_id = ? AND is_unlocked = 1
    `);
    return stmt.get(userId).count;
  }

  getTotalCount() {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM achievements`);
    return stmt.get().count;
  }

  checkAndUnlock(userId, conditionType, currentValue) {
    const achievements = this.findByConditionType(conditionType);
    const newlyUnlocked = [];

    for (const achievement of achievements) {
      if (currentValue >= achievement.condition_value) {
        const existing = this.getUserAchievement(userId, achievement.id);
        if (!existing || !existing.is_unlocked) {
          this.updateProgress(userId, achievement.id, currentValue);
          newlyUnlocked.push(achievement);
        }
      }
    }

    return newlyUnlocked;
  }
}

module.exports = new AchievementRepository();
