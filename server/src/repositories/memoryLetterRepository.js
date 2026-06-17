const db = require('../config/database');

const VALID_STATUSES = ['pending', 'delivered', 'read', 'cancelled'];

class MemoryLetterRepository {
  create(userId, data) {
    const {
      title,
      letterContent,
      sourceDate,
      deliveryDate,
      moodSnapshot,
      roomSnapshot,
      growthSnapshot
    } = data;

    const moodSnapshotStr = moodSnapshot ? JSON.stringify(moodSnapshot) : null;
    const roomSnapshotStr = roomSnapshot ? JSON.stringify(roomSnapshot) : null;
    const growthSnapshotStr = growthSnapshot ? JSON.stringify(growthSnapshot) : null;

    const stmt = db.prepare(`
      INSERT INTO memory_letters (
        user_id, title, letter_content, source_date, delivery_date,
        mood_snapshot, room_snapshot, growth_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      title,
      letterContent,
      sourceDate,
      deliveryDate,
      moodSnapshotStr,
      roomSnapshotStr,
      growthSnapshotStr
    );

    return this.findById(userId, result.lastInsertRowid);
  }

  findById(userId, id) {
    const stmt = db.prepare(`
      SELECT * FROM memory_letters WHERE user_id = ? AND id = ?
    `);
    const result = stmt.get(userId, id);
    return this.formatLetter(result);
  }

  findAll(userId, params = {}) {
    const { status, limit, offset } = params;

    let whereClauses = ['user_id = ?'];
    let queryParams = [userId];

    if (status && VALID_STATUSES.includes(status)) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    let sql = `SELECT * FROM memory_letters ${whereSql} ORDER BY created_at DESC`;

    if (limit) {
      sql += ' LIMIT ?';
      queryParams.push(limit);
      if (offset) {
        sql += ' OFFSET ?';
        queryParams.push(offset);
      }
    }

    const stmt = db.prepare(sql);
    const results = stmt.all(...queryParams);
    return results.map(r => this.formatLetter(r));
  }

  getPendingByDate(date) {
    const stmt = db.prepare(`
      SELECT * FROM memory_letters 
      WHERE status = 'pending' AND delivery_date <= ?
    `);
    const results = stmt.all(date);
    return results.map(r => this.formatLetter(r));
  }

  getTodayDelivered(userId) {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT * FROM memory_letters 
      WHERE user_id = ? AND status = 'delivered' AND DATE(delivered_at) = ?
      ORDER BY delivered_at DESC
    `);
    const results = stmt.all(userId, today);
    return results.map(r => this.formatLetter(r));
  }

  getStats(userId) {
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count FROM memory_letters WHERE user_id = ?
    `);
    const total = totalStmt.get(userId).count;

    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM memory_letters WHERE user_id = ? AND status = 'pending'
    `);
    const pending = pendingStmt.get(userId).count;

    const deliveredStmt = db.prepare(`
      SELECT COUNT(*) as count FROM memory_letters WHERE user_id = ? AND status = 'delivered'
    `);
    const delivered = deliveredStmt.get(userId).count;

    const readStmt = db.prepare(`
      SELECT COUNT(*) as count FROM memory_letters WHERE user_id = ? AND status = 'read'
    `);
    const read = readStmt.get(userId).count;

    return { total, pending, delivered, read };
  }

  deliverLetter(userId, id) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE memory_letters 
      SET status = 'delivered', delivered_at = ?
      WHERE user_id = ? AND id = ? AND status = 'pending'
    `);
    const result = stmt.run(now, userId, id);
    return result.changes > 0;
  }

  markAsRead(userId, id) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE memory_letters 
      SET status = 'read', is_read = 1, read_at = ?
      WHERE user_id = ? AND id = ? AND status IN ('delivered', 'read')
    `);
    const result = stmt.run(now, userId, id);
    return result.changes > 0;
  }

  cancelLetter(userId, id) {
    const stmt = db.prepare(`
      UPDATE memory_letters 
      SET status = 'cancelled'
      WHERE user_id = ? AND id = ? AND status = 'pending'
    `);
    const result = stmt.run(userId, id);
    return result.changes > 0;
  }

  deleteLetter(userId, id) {
    const stmt = db.prepare(`
      DELETE FROM memory_letters WHERE user_id = ? AND id = ?
    `);
    const result = stmt.run(userId, id);
    return result.changes > 0;
  }

  getUpcomingDeliveries(userId, limit = 5) {
    const stmt = db.prepare(`
      SELECT * FROM memory_letters 
      WHERE user_id = ? AND status = 'pending'
      ORDER BY delivery_date ASC
      LIMIT ?
    `);
    const results = stmt.all(userId, limit);
    return results.map(r => this.formatLetter(r));
  }

  getLettersBySourceDate(userId, date) {
    const stmt = db.prepare(`
      SELECT * FROM memory_letters 
      WHERE user_id = ? AND source_date = ?
      ORDER BY created_at DESC
    `);
    const results = stmt.all(userId, date);
    return results.map(r => this.formatLetter(r));
  }

  formatLetter(result) {
    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      title: result.title,
      letterContent: result.letter_content,
      sourceDate: result.source_date,
      deliveryDate: result.delivery_date,
      status: result.status,
      moodSnapshot: result.mood_snapshot ? JSON.parse(result.mood_snapshot) : null,
      roomSnapshot: result.room_snapshot ? JSON.parse(result.room_snapshot) : null,
      growthSnapshot: result.growth_snapshot ? JSON.parse(result.growth_snapshot) : null,
      isRead: result.is_read === 1 || result.is_read === true,
      readAt: result.read_at,
      deliveredAt: result.delivered_at,
      createdAt: result.created_at
    };
  }

  getValidStatuses() {
    return [...VALID_STATUSES];
  }
}

module.exports = new MemoryLetterRepository();
