const db = require('../config/database');

class CompanionRepository {
  findAllTemplates() {
    const stmt = db.prepare(`
      SELECT * FROM companion_templates
      ORDER BY is_default DESC, id ASC
    `);
    return stmt.all();
  }

  findTemplateById(id) {
    const stmt = db.prepare(`
      SELECT * FROM companion_templates
      WHERE id = ?
    `);
    return stmt.get(id);
  }

  findUserCompanions(userId) {
    const stmt = db.prepare(`
      SELECT uc.*, ct.name as template_name, ct.avatar, ct.personality as template_personality,
             ct.background_story, ct.traits, ct.base_stats, ct.appearance
      FROM user_companions uc
      JOIN companion_templates ct ON uc.companion_template_id = ct.id
      WHERE uc.user_id = ?
      ORDER BY uc.is_active DESC, uc.unlocked_at DESC
    `);
    return stmt.all(userId);
  }

  findUserCompanionById(userId, companionId) {
    const stmt = db.prepare(`
      SELECT uc.*, ct.name as template_name, ct.avatar, ct.personality as template_personality,
             ct.background_story, ct.traits, ct.base_stats, ct.appearance, ct.unlock_condition
      FROM user_companions uc
      JOIN companion_templates ct ON uc.companion_template_id = ct.id
      WHERE uc.user_id = ? AND uc.id = ?
    `);
    return stmt.get(userId, companionId);
  }

  findActiveCompanion(userId) {
    const stmt = db.prepare(`
      SELECT uc.*, ct.name as template_name, ct.avatar, ct.personality as template_personality,
             ct.background_story, ct.traits, ct.base_stats, ct.appearance
      FROM user_companions uc
      JOIN companion_templates ct ON uc.companion_template_id = ct.id
      WHERE uc.user_id = ? AND uc.is_active = 1
      LIMIT 1
    `);
    return stmt.get(userId);
  }

  findUserCompanionByTemplate(userId, templateId) {
    const stmt = db.prepare(`
      SELECT uc.*, ct.name as template_name, ct.avatar, ct.personality as template_personality,
             ct.background_story, ct.traits, ct.base_stats, ct.appearance
      FROM user_companions uc
      JOIN companion_templates ct ON uc.companion_template_id = ct.id
      WHERE uc.user_id = ? AND uc.companion_template_id = ?
    `);
    return stmt.get(userId, templateId);
  }

  createCompanion(userId, templateId, customName = null) {
    const template = this.findTemplateById(templateId);
    if (!template) return null;

    const name = customName || template.name;
    const baseStats = template.base_stats ? JSON.parse(template.base_stats) : {};

    const stmt = db.prepare(`
      INSERT INTO user_companions (user_id, companion_template_id, name, stats, personality)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      templateId,
      name,
      JSON.stringify(baseStats),
      template.personality
    );

    const userCompanionCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_companions WHERE user_id = ?
    `).get(userId).count;

    if (userCompanionCount === 1) {
      db.prepare(`
        UPDATE user_companions SET is_active = 1 WHERE id = ?
      `).run(result.lastInsertRowid);
    }

    this.insertCompanionAchievements(userId, result.lastInsertRowid);

    return this.findUserCompanionById(userId, result.lastInsertRowid);
  }

  insertCompanionAchievements(userId, companionId) {
    const checkStmt = db.prepare(`
      SELECT id FROM achievements WHERE condition_type IN ('companion_unlocked', 'companion_intimacy', 'companion_level', 'companion_events')
    `);
    const achievements = checkStmt.all();
    
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, progress, is_unlocked)
      VALUES (?, ?, 0, 0)
    `);
    
    achievements.forEach(achievement => {
      insertStmt.run(userId, achievement.id);
    });
  }

  updateCompanionStats(userId, companionId, expChange, intimacyChange) {
    const companion = this.findUserCompanionById(userId, companionId);
    if (!companion) return null;

    let newExp = (companion.experience || 0) + expChange;
    let newIntimacy = Math.max(0, Math.min(100, (companion.intimacy || 0) + intimacyChange));
    let newLevel = companion.level || 1;

    const expToLevel = (level) => level * 100;
    while (newExp >= expToLevel(newLevel)) {
      newExp -= expToLevel(newLevel);
      newLevel++;
    }

    const currentStats = companion.stats ? JSON.parse(companion.stats) : {};
    const levelDiff = newLevel - companion.level;
    if (levelDiff > 0) {
      const baseStats = companion.base_stats ? JSON.parse(companion.base_stats) : {};
      Object.keys(baseStats).forEach(key => {
        currentStats[key] = (currentStats[key] || baseStats[key] || 5) + levelDiff;
      });
    }

    const stmt = db.prepare(`
      UPDATE user_companions 
      SET experience = ?, level = ?, intimacy = ?, stats = ?, 
          current_mood = ?, last_interaction_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    const mood = this.calculateMood(intimacyChange);
    stmt.run(newExp, newLevel, newIntimacy, JSON.stringify(currentStats), mood, companionId, userId);

    this.updateAchievementProgress(userId, companionId, newLevel, newIntimacy);

    return {
      ...this.findUserCompanionById(userId, companionId),
      leveledUp: levelDiff > 0,
      oldLevel: companion.level,
      newLevel
    };
  }

  calculateMood(intimacyChange) {
    if (intimacyChange >= 10) return 'excited';
    if (intimacyChange >= 5) return 'happy';
    if (intimacyChange > 0) return 'content';
    if (intimacyChange === 0) return 'neutral';
    if (intimacyChange >= -5) return 'sad';
    return 'disappointed';
  }

  updateAchievementProgress(userId, companionId, level, intimacy) {
    const unlockedCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_companions WHERE user_id = ?
    `).get(userId).count;

    db.prepare(`
      UPDATE user_achievements 
      SET progress = ?
      WHERE user_id = ? AND achievement_id IN (
        SELECT id FROM achievements WHERE condition_type = 'companion_unlocked' AND condition_value <= ?
      )
    `).run(unlockedCount, userId, unlockedCount);

    db.prepare(`
      UPDATE user_achievements 
      SET progress = ?, is_unlocked = CASE WHEN condition_value <= ? THEN 1 ELSE 0 END
      WHERE user_id = ? AND achievement_id IN (
        SELECT id FROM achievements WHERE condition_type = 'companion_level'
      )
    `).run(level, level, userId);

    db.prepare(`
      UPDATE user_achievements 
      SET progress = ?, is_unlocked = CASE WHEN condition_value <= ? THEN 1 ELSE 0 END
      WHERE user_id = ? AND achievement_id IN (
        SELECT id FROM achievements WHERE condition_type = 'companion_intimacy'
      )
    `).run(intimacy, intimacy, userId);

    const eventCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_companion_events 
      WHERE user_id = ? AND reward_claimed = 1
    `).get(userId).count;

    db.prepare(`
      UPDATE user_achievements 
      SET progress = ?, is_unlocked = CASE WHEN condition_value <= ? THEN 1 ELSE 0 END
      WHERE user_id = ? AND achievement_id IN (
        SELECT id FROM achievements WHERE condition_type = 'companion_events'
      )
    `).run(eventCount, eventCount, userId);
  }

  setActiveCompanion(userId, companionId) {
    db.prepare(`
      UPDATE user_companions SET is_active = 0 WHERE user_id = ?
    `).run(userId);

    db.prepare(`
      UPDATE user_companions SET is_active = 1 WHERE id = ? AND user_id = ?
    `).run(companionId, userId);

    return this.findActiveCompanion(userId);
  }

  addGrowthLog(userId, companionId, actionType, actionDetail, expChange, intimacyChange, sourceType = null, sourceId = null) {
    const stmt = db.prepare(`
      INSERT INTO companion_growth_logs 
      (user_id, companion_id, action_type, action_detail, exp_change, intimacy_change, source_type, source_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, companionId, actionType, actionDetail, expChange, intimacyChange, sourceType, sourceId);
  }

  getGrowthLogs(userId, companionId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM companion_growth_logs
      WHERE user_id = ? AND companion_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, companionId, limit);
  }

  getExpForNextLevel(level) {
    return level * 100;
  }
}

module.exports = new CompanionRepository();
