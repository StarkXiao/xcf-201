const db = require('../config/database');

class NotificationRepository {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO notifications
      (user_id, type, category, icon, title, message, data,
       priority, duration, related_type, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.type,
      data.category || 'info',
      data.icon || null,
      data.title,
      data.message,
      data.data ? JSON.stringify(data.data) : null,
      data.priority || 'normal',
      data.duration || 4000,
      data.relatedType || null,
      data.relatedId || null
    );

    return this.findById(result.lastInsertRowid);
  }

  batchCreate(notifications) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return [];
    }

    const stmt = db.prepare(`
      INSERT INTO notifications
      (user_id, type, category, icon, title, message, data,
       priority, duration, related_type, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      const results = [];
      for (const item of items) {
        const result = stmt.run(
          item.userId,
          item.type,
          item.category || 'info',
          item.icon || null,
          item.title,
          item.message,
          item.data ? JSON.stringify(item.data) : null,
          item.priority || 'normal',
          item.duration || 4000,
          item.relatedType || null,
          item.relatedId || null
        );
        results.push(result.lastInsertRowid);
      }
      return results;
    });

    const ids = insertMany(notifications);
    return ids.map(id => this.findById(id));
  }

  findById(id) {
    const stmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
    const result = stmt.get(id);
    return this.formatNotification(result);
  }

  findByUserId(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      includeRead = false,
      includeDismissed = false
    } = options;

    const conditions = ['user_id = ?'];
    const params = [userId];

    if (!includeRead) {
      conditions.push('is_read = 0');
    }
    if (!includeDismissed) {
      conditions.push('is_dismissed = 0');
    }

    const where = conditions.join(' AND ');
    const stmt = db.prepare(`
      SELECT * FROM notifications
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    params.push(limit, offset);
    const results = stmt.all(...params);
    return results.map(r => this.formatNotification(r));
  }

  getUnreadCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0
    `);
    const result = stmt.get(userId);
    return result ? result.count : 0;
  }

  markAsRead(userId, id) {
    const stmt = db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  markAllAsRead(userId) {
    const stmt = db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now', 'localtime')
      WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0
    `);
    const result = stmt.run(userId);
    return result.changes;
  }

  dismiss(userId, id) {
    const stmt = db.prepare(`
      UPDATE notifications SET is_dismissed = 1
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  clearOld(userId, days = 30) {
    const stmt = db.prepare(`
      DELETE FROM notifications
      WHERE user_id = ? AND created_at < datetime('now', 'localtime', ?)
    `);
    const result = stmt.run(userId, `-${days} days`);
    return result.changes;
  }

  findByRelated(userId, relatedType, relatedId) {
    const stmt = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND related_type = ? AND related_id = ?
      ORDER BY created_at DESC
    `);
    const results = stmt.all(userId, relatedType, relatedId);
    return results.map(r => this.formatNotification(r));
  }

  formatNotification(result) {
    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      type: result.type,
      category: result.category,
      icon: result.icon,
      title: result.title,
      message: result.message,
      data: result.data ? JSON.parse(result.data) : null,
      priority: result.priority,
      duration: result.duration,
      isRead: !!result.is_read,
      isDismissed: !!result.is_dismissed,
      relatedType: result.related_type,
      relatedId: result.related_id,
      createdAt: result.created_at,
      readAt: result.read_at
    };
  }
}

module.exports = new NotificationRepository();
