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

  getCrossRoomReadCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT room_id) as rooms_count, 
             COUNT(DISTINCT story_id) as chapters_count
      FROM user_story_history
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return {
      roomsCount: result.rooms_count || 0,
      chaptersCount: result.chapters_count || 0
    };
  }

  getSpecificMoodRecordCount(userId, moodTypes) {
    const placeholders = moodTypes.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND mood_type IN (${placeholders})
    `);
    const result = stmt.get(userId, ...moodTypes);
    return result.count || 0;
  }

  getMoodTypeRecordCount(userId) {
    const stmt = db.prepare(`
      SELECT mood_type, COUNT(*) as count
      FROM moods
      WHERE user_id = ?
      GROUP BY mood_type
    `);
    const results = stmt.all(userId);
    const countMap = {};
    results.forEach(r => {
      countMap[r.mood_type] = r.count;
    });
    return countMap;
  }

  getConsecutiveTaskClaimDays(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT DATE(claimed_at) as claim_date
      FROM user_tasks
      WHERE user_id = ? AND is_claimed = 1 AND claimed_at IS NOT NULL
      ORDER BY claim_date DESC
    `);
    const dates = stmt.all(userId);
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const claimDate = new Date(dates[i].claim_date);
      claimDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (claimDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && claimDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (claimDate.getTime() === yesterday.getTime()) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return streak;
  }

  getComboAchievementProgress(userId) {
    const crossRoom = this.getCrossRoomReadCount(userId);
    const moodCounts = this.getMoodTypeRecordCount(userId);
    const consecutiveClaims = this.getConsecutiveTaskClaimDays(userId);
    
    const specificMoodTypes = ['happy', 'calm', 'sad', 'anxious', 'angry'];
    const specificMoodTotal = specificMoodTypes.reduce((sum, type) => sum + (moodCounts[type] || 0), 0);
    const uniqueMoodTypes = Object.keys(moodCounts).filter(k => moodCounts[k] > 0).length;
    
    return {
      crossRoomRead: {
        roomsCount: crossRoom.roomsCount,
        chaptersCount: crossRoom.chaptersCount,
        roomsTarget: 3,
        chaptersTarget: 5
      },
      specificMoodRecord: {
        totalRecords: specificMoodTotal,
        uniqueMoodTypes,
        totalTarget: 10,
        uniqueTarget: 3
      },
      consecutiveTaskClaims: {
        currentStreak: consecutiveClaims,
        target: 3
      }
    };
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
