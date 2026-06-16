const db = require('../config/database');

class MoodRepository {
  create(userId, date, moodType, content = '', tags = []) {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO moods (user_id, record_date, mood_type, content, tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, date, moodType, content, tagsStr);
    return this.findByDate(userId, date);
  }

  findByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT id, user_id, record_date, mood_type, content, tags, created_at
      FROM moods
      WHERE user_id = ? AND record_date = ?
    `);
    const result = stmt.get(userId, date);
    if (result) {
      result.tags = result.tags ? result.tags.split(',').filter(t => t) : [];
    }
    return result;
  }

  findByMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT id, user_id, record_date, mood_type, content, tags, created_at
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      ORDER BY record_date
    `);
    const results = stmt.all(userId, startDate, endDate);
    return results.map(r => ({
      ...r,
      tags: r.tags ? r.tags.split(',').filter(t => t) : []
    }));
  }

  getStats(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const distStmt = db.prepare(`
      SELECT mood_type, COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      GROUP BY mood_type
    `);
    const distribution = distStmt.all(userId, startDate, endDate);
    
    const moodDist = {};
    distribution.forEach(d => {
      moodDist[d.mood_type] = d.count;
    });
    
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
    `);
    const { count: totalThisMonth } = totalStmt.get(userId, startDate, endDate);
    
    const streakDays = this.getStreakDays(userId);
    
    return {
      moodDistribution: moodDist,
      streakDays,
      totalThisMonth
    };
  }

  getStreakDays(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ?
      ORDER BY record_date DESC
    `);
    const dates = stmt.all(userId);
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const recordDate = new Date(dates[i].record_date);
      recordDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && recordDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (recordDate.getTime() === yesterday.getTime()) {
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

  getMoodTypes(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT mood_type
      FROM moods
      WHERE user_id = ?
    `);
    return stmt.all(userId).map(r => r.mood_type);
  }

  delete(userId, date) {
    const stmt = db.prepare(`
      DELETE FROM moods WHERE user_id = ? AND record_date = ?
    `);
    const result = stmt.run(userId, date);
    return result.changes > 0;
  }
}

module.exports = new MoodRepository();
