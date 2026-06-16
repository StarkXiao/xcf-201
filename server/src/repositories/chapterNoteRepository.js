const db = require('../config/database');

class ChapterNoteRepository {
  create(userId, roomId, storyId, chapterNumber, branchKey, content, moodTags = []) {
    const tagsStr = Array.isArray(moodTags) ? moodTags.join(',') : moodTags;
    
    const existing = this.findByStoryId(userId, storyId);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE chapter_notes 
        SET content = ?, mood_tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND story_id = ?
      `);
      stmt.run(content, tagsStr, userId, storyId);
      return this.findById(existing.id);
    }
    
    const stmt = db.prepare(`
      INSERT INTO chapter_notes (user_id, room_id, story_id, chapter_number, branch_key, content, mood_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, roomId, storyId, chapterNumber, branchKey, content, tagsStr);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT cn.*, s.title as story_title, s.chapter_number, r.name as room_name
      FROM chapter_notes cn
      JOIN stories s ON cn.story_id = s.id
      JOIN rooms r ON cn.room_id = r.id
      WHERE cn.id = ?
    `);
    const result = stmt.get(id);
    return this.formatNote(result);
  }

  findByStoryId(userId, storyId) {
    const stmt = db.prepare(`
      SELECT cn.*, s.title as story_title, s.chapter_number, r.name as room_name
      FROM chapter_notes cn
      JOIN stories s ON cn.story_id = s.id
      JOIN rooms r ON cn.room_id = r.id
      WHERE cn.user_id = ? AND cn.story_id = ?
    `);
    const result = stmt.get(userId, storyId);
    return this.formatNote(result);
  }

  findByRoomId(userId, roomId) {
    const stmt = db.prepare(`
      SELECT cn.*, s.title as story_title, s.chapter_number, r.name as room_name
      FROM chapter_notes cn
      JOIN stories s ON cn.story_id = s.id
      JOIN rooms r ON cn.room_id = r.id
      WHERE cn.user_id = ? AND cn.room_id = ?
      ORDER BY cn.chapter_number ASC
    `);
    const results = stmt.all(userId, roomId);
    return results.map(r => this.formatNote(r));
  }

  findByUserId(userId, limit = null, offset = 0) {
    let limitClause = '';
    let params = [userId];
    
    if (limit) {
      limitClause = 'LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const stmt = db.prepare(`
      SELECT cn.*, s.title as story_title, s.chapter_number, r.name as room_name, s.branch_label
      FROM chapter_notes cn
      JOIN stories s ON cn.story_id = s.id
      JOIN rooms r ON cn.room_id = r.id
      WHERE cn.user_id = ?
      ORDER BY cn.created_at DESC
      ${limitClause}
    `);
    const results = stmt.all(...params);
    return results.map(r => this.formatNote(r));
  }

  getTotalCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ?
    `);
    return stmt.get(userId).count;
  }

  getCountByRoom(userId, roomId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ? AND room_id = ?
    `);
    return stmt.get(userId, roomId).count;
  }

  getCountByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ? AND DATE(created_at) = ?
    `);
    return stmt.get(userId, date).count;
  }

  getCountByMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
    `);
    return stmt.get(userId, startDate, endDate).count;
  }

  getStats(userId, year, month) {
    let dateCondition = '';
    let params = [userId];
    
    if (year && month) {
      dateCondition = 'AND created_at BETWEEN ? AND ?';
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      params.push(startDate, endDate);
    }
    
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ? ${dateCondition}
    `);
    const totalCount = totalStmt.get(...params).count;

    const roomStmt = db.prepare(`
      SELECT room_id, COUNT(*) as count
      FROM chapter_notes
      WHERE user_id = ? ${dateCondition}
      GROUP BY room_id
    `);
    const roomDistribution = {};
    roomStmt.all(...params).forEach(item => {
      roomDistribution[item.room_id] = item.count;
    });

    const totalContentStmt = db.prepare(`
      SELECT SUM(LENGTH(content)) as total_length
      FROM chapter_notes
      WHERE user_id = ? ${dateCondition}
    `);
    const totalContentLength = totalContentStmt.get(...params).total_length || 0;

    const daysStmt = db.prepare(`
      SELECT COUNT(DISTINCT DATE(created_at)) as count
      FROM chapter_notes
      WHERE user_id = ? ${dateCondition}
    `);
    const daysWithNotes = daysStmt.get(...params).count;

    return {
      totalCount,
      daysWithNotes,
      roomDistribution,
      totalContentLength,
      avgContentLength: totalCount > 0 ? Math.round(totalContentLength / totalCount) : 0
    };
  }

  getLatestNotes(userId, limit = 10) {
    return this.findByUserId(userId, limit);
  }

  delete(userId, id) {
    const stmt = db.prepare(`
      DELETE FROM chapter_notes WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  formatNote(result) {
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      roomId: result.room_id,
      roomName: result.room_name,
      storyId: result.story_id,
      storyTitle: result.story_title,
      chapterNumber: result.chapter_number,
      branchKey: result.branch_key,
      branchLabel: result.branch_label,
      content: result.content,
      moodTags: result.mood_tags ? result.mood_tags.split(',').filter(t => t) : [],
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }
}

module.exports = new ChapterNoteRepository();
