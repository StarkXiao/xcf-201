const db = require('../config/database');

module.exports.db = db;

class HealingMapRepository {
  getAllStages() {
    const stmt = db.prepare(`
      SELECT * FROM healing_stages
      ORDER BY sort_order
    `);
    return stmt.all();
  }

  getStageByKey(stageKey) {
    const stmt = db.prepare(`
      SELECT * FROM healing_stages
      WHERE stage_key = ?
    `);
    return stmt.get(stageKey);
  }

  getStageById(stageId) {
    const stmt = db.prepare(`
      SELECT * FROM healing_stages
      WHERE id = ?
    `);
    return stmt.get(stageId);
  }

  getMilestonesByStageId(stageId) {
    const stmt = db.prepare(`
      SELECT * FROM healing_milestones
      WHERE stage_id = ?
      ORDER BY sort_order
    `);
    return stmt.all(stageId);
  }

  getAllMilestones() {
    const stmt = db.prepare(`
      SELECT hm.*, hs.stage_key, hs.name as stage_name, hs.color as stage_color
      FROM healing_milestones hm
      JOIN healing_stages hs ON hm.stage_id = hs.id
      ORDER BY hs.sort_order, hm.sort_order
    `);
    return stmt.all();
  }

  getUserStages(userId) {
    const stmt = db.prepare(`
      SELECT 
        hs.*,
        COALESCE(uhs.progress, 0) as progress,
        COALESCE(uhs.is_unlocked, 0) as is_unlocked,
        COALESCE(uhs.is_completed, 0) as is_completed,
        uhs.unlocked_at,
        uhs.completed_at,
        COALESCE(uhs.reward_claimed, 0) as reward_claimed,
        uhs.reward_claimed_at
      FROM healing_stages hs
      LEFT JOIN user_healing_stages uhs ON hs.id = uhs.stage_id AND uhs.user_id = ?
      ORDER BY hs.sort_order
    `);
    return stmt.all(userId);
  }

  getUserStage(userId, stageId) {
    const stmt = db.prepare(`
      SELECT 
        hs.*,
        COALESCE(uhs.progress, 0) as progress,
        COALESCE(uhs.is_unlocked, 0) as is_unlocked,
        COALESCE(uhs.is_completed, 0) as is_completed,
        uhs.unlocked_at,
        uhs.completed_at,
        COALESCE(uhs.reward_claimed, 0) as reward_claimed,
        uhs.reward_claimed_at
      FROM healing_stages hs
      LEFT JOIN user_healing_stages uhs ON hs.id = uhs.stage_id AND uhs.user_id = ?
      WHERE hs.id = ?
    `);
    return stmt.get(userId, stageId);
  }

  getUserMilestones(userId) {
    const stmt = db.prepare(`
      SELECT 
        hm.*,
        hs.stage_key,
        hs.name as stage_name,
        hs.color as stage_color,
        COALESCE(uhm.is_unlocked, 0) as is_unlocked,
        uhm.unlocked_at,
        COALESCE(uhm.current_progress, 0) as current_progress
      FROM healing_milestones hm
      JOIN healing_stages hs ON hm.stage_id = hs.id
      LEFT JOIN user_healing_milestones uhm ON hm.id = uhm.milestone_id AND uhm.user_id = ?
      ORDER BY hs.sort_order, hm.sort_order
    `);
    return stmt.all(userId);
  }

  getMilestoneById(milestoneId) {
    const stmt = db.prepare(`
      SELECT * FROM healing_milestones WHERE id = ?
    `);
    return stmt.get(milestoneId);
  }

  getUserMilestoneByMilestoneId(userId, milestoneId) {
    const stmt = db.prepare(`
      SELECT * FROM user_healing_milestones
      WHERE user_id = ? AND milestone_id = ?
    `);
    return stmt.get(userId, milestoneId);
  }

  updateUserMilestoneProgress(userId, milestoneId, progress) {
    const milestone = this.getMilestoneById(milestoneId);
    if (!milestone) return null;

    const isUnlocked = progress >= milestone.requirement_value;
    
    const existing = this.getUserMilestoneByMilestoneId(userId, milestoneId);
    
    if (existing) {
      if (existing.is_unlocked) return existing;
      
      const stmt = db.prepare(`
        UPDATE user_healing_milestones
        SET current_progress = ?, 
            is_unlocked = ?, 
            unlocked_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE unlocked_at END
        WHERE user_id = ? AND milestone_id = ?
      `);
      stmt.run(progress, isUnlocked ? 1 : 0, isUnlocked ? 1 : 0, userId, milestoneId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_healing_milestones (user_id, milestone_id, current_progress, is_unlocked, unlocked_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(userId, milestoneId, progress, isUnlocked ? 1 : 0, isUnlocked ? new Date().toISOString() : null);
    }

    return {
      ...milestone,
      current_progress: progress,
      is_unlocked: isUnlocked ? 1 : 0,
      unlocked_at: isUnlocked ? new Date().toISOString() : null
    };
  }

  updateUserStageProgress(userId, stageId, progress) {
    const existing = db.prepare(`
      SELECT * FROM user_healing_stages WHERE user_id = ? AND stage_id = ?
    `).get(userId, stageId);

    const isCompleted = progress >= 100;

    if (existing) {
      const stmt = db.prepare(`
        UPDATE user_healing_stages
        SET progress = ?,
            is_completed = CASE WHEN ? = 1 THEN 1 ELSE is_completed END,
            completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE user_id = ? AND stage_id = ?
      `);
      stmt.run(progress, isCompleted ? 1 : 0, isCompleted ? 1 : 0, userId, stageId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_healing_stages (user_id, stage_id, progress, is_unlocked, is_completed, unlocked_at)
        VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, stageId, progress, isCompleted ? 1 : 0);
    }

    return this.getUserStage(userId, stageId);
  }

  unlockStage(userId, stageId) {
    const existing = db.prepare(`
      SELECT * FROM user_healing_stages WHERE user_id = ? AND stage_id = ?
    `).get(userId, stageId);

    if (existing) {
      if (existing.is_unlocked) return { success: false, message: '阶段已解锁' };
      
      const stmt = db.prepare(`
        UPDATE user_healing_stages
        SET is_unlocked = 1, unlocked_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND stage_id = ?
      `);
      stmt.run(userId, stageId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_healing_stages (user_id, stage_id, progress, is_unlocked, is_completed, unlocked_at)
        VALUES (?, ?, 0, 1, 0, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, stageId);
    }

    return { success: true, message: '阶段解锁成功' };
  }

  claimStageReward(userId, stageId) {
    const userStage = db.prepare(`
      SELECT * FROM user_healing_stages WHERE user_id = ? AND stage_id = ?
    `).get(userId, stageId);

    if (!userStage) {
      return { success: false, message: '阶段不存在' };
    }

    if (!userStage.is_completed) {
      return { success: false, message: '阶段尚未完成' };
    }

    if (userStage.reward_claimed) {
      return { success: false, message: '奖励已领取' };
    }

    const stmt = db.prepare(`
      UPDATE user_healing_stages
      SET reward_claimed = 1, reward_claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND stage_id = ?
    `);
    const result = stmt.run(userId, stageId);

    if (result.changes > 0) {
      const stage = this.getStageById(stageId);
      let rewards = null;
      if (stage.rewards) {
        if (typeof stage.rewards === 'string') {
          try {
            rewards = JSON.parse(stage.rewards);
          } catch (e) {
            rewards = null;
          }
        } else {
          rewards = stage.rewards;
        }
      }
      return { success: true, message: '奖励领取成功', rewards };
    }

    return { success: false, message: '奖励领取失败' };
  }

  addJourneyEvent(userId, eventType, eventTitle, eventDescription, relatedModule, relatedId, eventDate) {
    const date = eventDate || new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO healing_journey_events 
      (user_id, event_type, event_title, event_description, related_module, related_id, event_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, eventType, eventTitle, eventDescription, relatedModule, relatedId, date);
    return result.lastInsertRowid;
  }

  getJourneyEvents(userId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM healing_journey_events
      WHERE user_id = ?
      ORDER BY event_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  }

  getRecentUnlocks(userId, limit = 10) {
    const stmt = db.prepare(`
      SELECT 
        uhm.id,
        hm.milestone_key,
        hm.name,
        hm.description,
        hm.icon,
        hm.requirement_type,
        hm.stage_id,
        hs.stage_key,
        hs.name as stage_name,
        hs.color as stage_color,
        uhm.unlocked_at,
        'milestone' as unlock_type
      FROM user_healing_milestones uhm
      JOIN healing_milestones hm ON uhm.milestone_id = hm.id
      JOIN healing_stages hs ON hm.stage_id = hs.id
      WHERE uhm.user_id = ? AND uhm.is_unlocked = 1
      
      UNION ALL
      
      SELECT 
        uhs.id,
        hs.stage_key as milestone_key,
        hs.name,
        hs.description,
        hs.icon,
        'stage' as requirement_type,
        hs.id as stage_id,
        hs.stage_key,
        hs.name as stage_name,
        hs.color as stage_color,
        uhs.completed_at as unlocked_at,
        'stage' as unlock_type
      FROM user_healing_stages uhs
      JOIN healing_stages hs ON uhs.stage_id = hs.id
      WHERE uhs.user_id = ? AND uhs.is_completed = 1
      
      ORDER BY unlocked_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, userId, limit);
  }

  getTotalMilestones() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM healing_milestones');
    return stmt.get().count;
  }

  getUnlockedMilestoneCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM user_healing_milestones 
      WHERE user_id = ? AND is_unlocked = 1
    `);
    return stmt.get(userId).count;
  }

  getCompletedStageCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM user_healing_stages 
      WHERE user_id = ? AND is_completed = 1
    `);
    return stmt.get(userId).count;
  }

  getTotalStages() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM healing_stages');
    return stmt.get().count;
  }
}

module.exports = new HealingMapRepository();
