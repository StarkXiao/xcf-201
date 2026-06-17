const db = require('../config/database');

class CompanionEventRepository {
  findAllEvents() {
    const stmt = db.prepare(`
      SELECT ce.*, ct.name as companion_name
      FROM companion_events ce
      LEFT JOIN companion_templates ct ON ce.companion_template_id = ct.id
      ORDER BY ce.sort_order ASC
    `);
    return stmt.all();
  }

  findEventById(id) {
    const stmt = db.prepare(`
      SELECT ce.*, ct.name as companion_name
      FROM companion_events ce
      LEFT JOIN companion_templates ct ON ce.companion_template_id = ct.id
      WHERE ce.id = ?
    `);
    return stmt.get(id);
  }

  findEventsByCompanion(companionTemplateId) {
    const stmt = db.prepare(`
      SELECT * FROM companion_events
      WHERE companion_template_id = ? OR companion_template_id IS NULL
      ORDER BY sort_order ASC
    `);
    return stmt.all(companionTemplateId);
  }

  findEventsByType(eventType) {
    const stmt = db.prepare(`
      SELECT * FROM companion_events
      WHERE event_type = ?
      ORDER BY sort_order ASC
    `);
    return stmt.all(eventType);
  }

  findAvailableEvents(userId, companionId, companionTemplateId, level, intimacy) {
    const completedEventIds = this.getUserCompletedEventIds(userId, companionId);
    
    const placeholders = completedEventIds.length > 0 
      ? completedEventIds.map(() => '?').join(', ')
      : 'NULL';

    const stmt = db.prepare(`
      SELECT * FROM companion_events
      WHERE (companion_template_id = ? OR companion_template_id IS NULL)
        AND required_level <= ?
        AND required_intimacy <= ?
        AND (is_unique = 0 OR id NOT IN (${placeholders}))
      ORDER BY sort_order ASC
    `);

    const params = [companionTemplateId, level, intimacy];
    if (completedEventIds.length > 0) {
      params.push(...completedEventIds);
    }

    return stmt.all(...params);
  }

  getUserCompletedEventIds(userId, companionId) {
    const stmt = db.prepare(`
      SELECT event_id FROM user_companion_events
      WHERE user_id = ? AND companion_id = ?
    `);
    return stmt.all(userId, companionId).map(row => row.event_id);
  }

  getUserEvents(userId, companionId) {
    const stmt = db.prepare(`
      SELECT uce.*, ce.title, ce.description, ce.event_type, ce.rewards, ce.is_unique
      FROM user_companion_events uce
      JOIN companion_events ce ON uce.event_id = ce.id
      WHERE uce.user_id = ? AND uce.companion_id = ?
      ORDER BY uce.completed_at DESC
    `);
    return stmt.all(userId, companionId);
  }

  hasCompletedEvent(userId, companionId, eventId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_companion_events
      WHERE user_id = ? AND companion_id = ? AND event_id = ?
    `);
    return stmt.get(userId, companionId, eventId).count > 0;
  }

  completeEvent(userId, companionId, eventId, choiceMade = null, rewardClaimed = false) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO user_companion_events
      (user_id, companion_id, event_id, choice_made, reward_claimed)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      companionId,
      eventId,
      choiceMade ? JSON.stringify(choiceMade) : null,
      rewardClaimed ? 1 : 0
    );

    return this.findUserEvent(userId, companionId, eventId);
  }

  findUserEvent(userId, companionId, eventId) {
    const stmt = db.prepare(`
      SELECT uce.*, ce.title, ce.description, ce.content, ce.choices, 
             ce.rewards, ce.event_type, ce.is_unique
      FROM user_companion_events uce
      JOIN companion_events ce ON uce.event_id = ce.id
      WHERE uce.user_id = ? AND uce.companion_id = ? AND uce.event_id = ?
    `);
    return stmt.get(userId, companionId, eventId);
  }

  claimReward(userId, companionId, eventId) {
    const stmt = db.prepare(`
      UPDATE user_companion_events
      SET reward_claimed = 1
      WHERE user_id = ? AND companion_id = ? AND event_id = ?
    `);
    stmt.run(userId, companionId, eventId);
    return this.findUserEvent(userId, companionId, eventId);
  }

  getCompletedCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_companion_events
      WHERE user_id = ? AND reward_claimed = 1
    `);
    return stmt.get(userId).count;
  }

  findTriggeredEvents(userId, companionId, triggerType, triggerData = {}) {
    const allEvents = this.findAllEvents();
    const completedIds = this.getUserCompletedEventIds(userId, companionId);

    return allEvents.filter(event => {
      if (event.is_unique && completedIds.includes(event.id)) return false;

      try {
        const condition = event.trigger_condition ? JSON.parse(event.trigger_condition) : null;
        if (!condition) return false;

        return this.matchCondition(condition, triggerType, triggerData);
      } catch (e) {
        return false;
      }
    });
  }

  matchCondition(condition, triggerType, triggerData) {
    if (condition.type !== triggerType) return false;

    switch (triggerType) {
      case 'mood_record':
        return condition.mood === triggerData.mood;
      case 'chapter_complete':
      case 'task_complete':
      case 'achievement_unlock':
      case 'companion_level_up':
      case 'first_companion':
      case 'weekly_checkin':
      case 'user_birthday':
        return true;
      case 'intimacy_threshold':
        return triggerData.intimacy >= condition.value;
      case 'inactive_days':
        return triggerData.inactiveDays >= condition.value;
      default:
        return false;
    }
  }
}

module.exports = new CompanionEventRepository();
