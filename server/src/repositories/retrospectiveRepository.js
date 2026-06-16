const db = require('../config/database');

const VALID_RETROSPECT_TYPES = ['feeling', 'insight', 'gratitude', 'lesson', 'other'];

class RetrospectiveRepository {
  create(userId, moodId, recordDate, timeSegment, retrospectType, content, moodShift, tags = []) {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    
    const stmt = db.prepare(`
      INSERT INTO mood_retrospectives (user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, moodId, recordDate, timeSegment, retrospectType, content, moodShift, tagsStr);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT id, user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags, created_at
      FROM mood_retrospectives
      WHERE id = ?
    `);
    const result = stmt.get(id);
    return this.formatRetrospective(result);
  }

  findByMoodId(userId, moodId) {
    const stmt = db.prepare(`
      SELECT id, user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags, created_at
      FROM mood_retrospectives
      WHERE user_id = ? AND mood_id = ?
      ORDER BY created_at DESC
    `);
    const results = stmt.all(userId, moodId);
    return results.map(r => this.formatRetrospective(r));
  }

  findByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT id, user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags, created_at
      FROM mood_retrospectives
      WHERE user_id = ? AND record_date = ?
      ORDER BY created_at DESC
    `);
    const results = stmt.all(userId, date);
    return results.map(r => this.formatRetrospective(r));
  }

  findByMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT id, user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags, created_at
      FROM mood_retrospectives
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      ORDER BY record_date DESC, created_at DESC
    `);
    const results = stmt.all(userId, startDate, endDate);
    return results.map(r => this.formatRetrospective(r));
  }

  getCountByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ? AND record_date = ?
    `);
    return stmt.get(userId, date).count;
  }

  getCountByMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
    `);
    return stmt.get(userId, startDate, endDate).count;
  }

  getTotalCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ?
    `);
    return stmt.get(userId).count;
  }

  getDateMapByMonth(userId, year, month) {
    const retros = this.findByMonth(userId, year, month);
    const dateMap = new Map();
    
    for (const retro of retros) {
      if (!dateMap.has(retro.record_date)) {
        dateMap.set(retro.record_date, []);
      }
      dateMap.get(retro.record_date).push(retro);
    }
    
    return dateMap;
  }

  getStats(userId, year, month) {
    let dateCondition = '';
    let params = [userId];
    
    if (year && month) {
      dateCondition = 'AND record_date BETWEEN ? AND ?';
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      params.push(startDate, endDate);
    }
    
    const typeStmt = db.prepare(`
      SELECT retrospect_type, COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ? ${dateCondition}
      GROUP BY retrospect_type
    `);
    const typeDistribution = {};
    typeStmt.all(...params).forEach(item => {
      typeDistribution[item.retrospect_type] = item.count;
    });

    const dayCountStmt = db.prepare(`
      SELECT COUNT(DISTINCT record_date) as count
      FROM mood_retrospectives
      WHERE user_id = ? ${dateCondition}
    `);
    const daysWithRetros = dayCountStmt.get(...params).count;

    const totalCountStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ? ${dateCondition}
    `);
    const totalCount = totalCountStmt.get(...params).count;

    const totalContentLengthStmt = db.prepare(`
      SELECT SUM(LENGTH(content)) as total_length
      FROM mood_retrospectives
      WHERE user_id = ? ${dateCondition}
    `);
    const totalContentLength = totalContentLengthStmt.get(...params).total_length || 0;

    return {
      totalCount,
      daysWithRetros,
      typeDistribution,
      totalContentLength,
      avgContentLength: totalCount > 0 ? Math.round(totalContentLength / totalCount) : 0
    };
  }

  getLatestRetros(userId, limit = 10) {
    const stmt = db.prepare(`
      SELECT id, user_id, mood_id, record_date, time_segment, retrospect_type, content, mood_shift, tags, created_at
      FROM mood_retrospectives
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const results = stmt.all(userId, limit);
    return results.map(r => this.formatRetrospective(r));
  }

  delete(userId, id) {
    const stmt = db.prepare(`
      DELETE FROM mood_retrospectives WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  formatRetrospective(result) {
    if (!result) return null;
    
    return {
      ...result,
      tags: result.tags ? result.tags.split(',').filter(t => t) : []
    };
  }

  getValidTypes() {
    return [...VALID_RETROSPECT_TYPES];
  }
}

module.exports = new RetrospectiveRepository();
