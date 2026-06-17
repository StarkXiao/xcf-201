const db = require('../config/database');

class CompanionConversationRepository {
  createMessage(userId, companionId, message) {
    const stmt = db.prepare(`
      INSERT INTO companion_conversations 
      (user_id, companion_id, message_type, sender_role, content, context, 
       emotion_trigger, intimacy_change, exp_change)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      companionId,
      message.message_type || 'text',
      message.sender_role,
      message.content,
      message.context ? JSON.stringify(message.context) : null,
      message.emotion_trigger || null,
      message.intimacy_change || 0,
      message.exp_change || 0
    );

    return this.findMessageById(result.lastInsertRowid);
  }

  findMessageById(id) {
    const stmt = db.prepare(`
      SELECT * FROM companion_conversations WHERE id = ?
    `);
    return stmt.get(id);
  }

  getConversationHistory(userId, companionId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM companion_conversations
      WHERE user_id = ? AND companion_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const messages = stmt.all(userId, companionId, limit, offset);
    return messages.reverse();
  }

  getTodayMessageCount(userId, companionId) {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM companion_conversations
      WHERE user_id = ? AND companion_id = ? 
        AND sender_role = 'user'
        AND DATE(created_at) = ?
    `);
    return stmt.get(userId, companionId, today).count;
  }

  getTotalUserMessages(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM companion_conversations
      WHERE user_id = ? AND sender_role = 'user'
    `);
    return stmt.get(userId).count;
  }

  clearConversation(userId, companionId) {
    const stmt = db.prepare(`
      DELETE FROM companion_conversations
      WHERE user_id = ? AND companion_id = ?
    `);
    return stmt.run(userId, companionId);
  }

  getRecentContext(userId, companionId, limit = 10) {
    const stmt = db.prepare(`
      SELECT content, sender_role, emotion_trigger, created_at
      FROM companion_conversations
      WHERE user_id = ? AND companion_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, companionId, limit).reverse();
  }
}

module.exports = new CompanionConversationRepository();
