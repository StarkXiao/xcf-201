const db = require('../config/database');

class DreamCollectionRepository {
  createEmotionFragment(userId, data) {
    const stmt = db.prepare(`
      INSERT INTO emotion_fragments (user_id, source_type, source_id, emotion_type, title, content, mood_color, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      data.sourceType || 'mood',
      data.sourceId || null,
      data.emotionType,
      data.title,
      data.content,
      data.moodColor || null,
      data.tags || null
    );
    return this.getEmotionFragmentById(result.lastInsertRowid);
  }

  getEmotionFragmentById(id) {
    const stmt = db.prepare('SELECT * FROM emotion_fragments WHERE id = ?');
    return stmt.get(id);
  }

  getEmotionFragments(userId, filters = {}) {
    let sql = 'SELECT * FROM emotion_fragments WHERE user_id = ?';
    const params = [userId];

    if (filters.emotionType) {
      sql += ' AND emotion_type = ?';
      params.push(filters.emotionType);
    }
    if (filters.sourceType) {
      sql += ' AND source_type = ?';
      params.push(filters.sourceType);
    }
    if (filters.isStarred !== undefined) {
      sql += ' AND is_starred = ?';
      params.push(filters.isStarred ? 1 : 0);
    }
    if (filters.keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return db.prepare(sql).all(...params);
  }

  getEmotionFragmentCount(userId, filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM emotion_fragments WHERE user_id = ?';
    const params = [userId];

    if (filters.emotionType) {
      sql += ' AND emotion_type = ?';
      params.push(filters.emotionType);
    }
    if (filters.sourceType) {
      sql += ' AND source_type = ?';
      params.push(filters.sourceType);
    }

    return db.prepare(sql).get(...params).count;
  }

  updateEmotionFragment(id, data) {
    const fields = [];
    const params = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      params.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push('content = ?');
      params.push(data.content);
    }
    if (data.isStarred !== undefined) {
      fields.push('is_starred = ?');
      params.push(data.isStarred ? 1 : 0);
    }
    if (data.tags !== undefined) {
      fields.push('tags = ?');
      params.push(data.tags);
    }
    if (data.moodColor !== undefined) {
      fields.push('mood_color = ?');
      params.push(data.moodColor);
    }

    if (fields.length === 0) return null;

    params.push(id);
    db.prepare(`UPDATE emotion_fragments SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.getEmotionFragmentById(id);
  }

  deleteEmotionFragment(id) {
    const stmt = db.prepare('DELETE FROM emotion_fragments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getEmotionTypeStats(userId) {
    const stmt = db.prepare(`
      SELECT emotion_type, COUNT(*) as count
      FROM emotion_fragments
      WHERE user_id = ?
      GROUP BY emotion_type
      ORDER BY count DESC
    `);
    return stmt.all(userId);
  }

  createStoryCard(userId, data) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO story_cards (user_id, room_id, story_id, card_type, title, excerpt, room_name, branch_label, mood_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId,
      data.roomId,
      data.storyId,
      data.cardType || 'chapter',
      data.title,
      data.excerpt || null,
      data.roomName || null,
      data.branchLabel || null,
      data.moodTheme || null
    );
    return this.getStoryCardByUserAndStory(userId, data.storyId);
  }

  getStoryCardByUserAndStory(userId, storyId) {
    const stmt = db.prepare('SELECT * FROM story_cards WHERE user_id = ? AND story_id = ?');
    return stmt.get(userId, storyId);
  }

  getStoryCards(userId, filters = {}) {
    let sql = 'SELECT * FROM story_cards WHERE user_id = ?';
    const params = [userId];

    if (filters.roomId) {
      sql += ' AND room_id = ?';
      params.push(filters.roomId);
    }
    if (filters.cardType) {
      sql += ' AND card_type = ?';
      params.push(filters.cardType);
    }
    if (filters.moodTheme) {
      sql += ' AND mood_theme = ?';
      params.push(filters.moodTheme);
    }

    sql += ' ORDER BY unlocked_at DESC';

    return db.prepare(sql).all(...params);
  }

  getStoryCardCount(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM story_cards WHERE user_id = ?');
    return stmt.get(userId).count;
  }

  getStoryCardRoomStats(userId) {
    const stmt = db.prepare(`
      SELECT room_id, room_name, COUNT(*) as card_count
      FROM story_cards
      WHERE user_id = ?
      GROUP BY room_id
      ORDER BY card_count DESC
    `);
    return stmt.all(userId);
  }

  deleteStoryCard(id) {
    const stmt = db.prepare('DELETE FROM story_cards WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  createHighlight(userId, data) {
    const stmt = db.prepare(`
      INSERT INTO collection_highlights (user_id, source_type, source_id, room_id, title, content, highlight_note, mood_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      data.sourceType || 'story',
      data.sourceId || null,
      data.roomId || null,
      data.title,
      data.content,
      data.highlightNote || null,
      data.moodTag || null
    );
    return this.getHighlightById(result.lastInsertRowid);
  }

  getHighlightById(id) {
    const stmt = db.prepare('SELECT * FROM collection_highlights WHERE id = ?');
    return stmt.get(id);
  }

  getHighlights(userId, filters = {}) {
    let sql = 'SELECT * FROM collection_highlights WHERE user_id = ?';
    const params = [userId];

    if (filters.sourceType) {
      sql += ' AND source_type = ?';
      params.push(filters.sourceType);
    }
    if (filters.moodTag) {
      sql += ' AND mood_tag = ?';
      params.push(filters.moodTag);
    }
    if (filters.isFavorite !== undefined) {
      sql += ' AND is_favorite = ?';
      params.push(filters.isFavorite ? 1 : 0);
    }
    if (filters.keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    sql += ' ORDER BY is_favorite DESC, created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return db.prepare(sql).all(...params);
  }

  getHighlightCount(userId, filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM collection_highlights WHERE user_id = ?';
    const params = [userId];

    if (filters.sourceType) {
      sql += ' AND source_type = ?';
      params.push(filters.sourceType);
    }
    if (filters.isFavorite !== undefined) {
      sql += ' AND is_favorite = ?';
      params.push(filters.isFavorite ? 1 : 0);
    }

    return db.prepare(sql).get(...params).count;
  }

  updateHighlight(id, data) {
    const fields = [];
    const params = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      params.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push('content = ?');
      params.push(data.content);
    }
    if (data.highlightNote !== undefined) {
      fields.push('highlight_note = ?');
      params.push(data.highlightNote);
    }
    if (data.isFavorite !== undefined) {
      fields.push('is_favorite = ?');
      params.push(data.isFavorite ? 1 : 0);
    }
    if (data.moodTag !== undefined) {
      fields.push('mood_tag = ?');
      params.push(data.moodTag);
    }

    if (fields.length === 0) return null;

    params.push(id);
    db.prepare(`UPDATE collection_highlights SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.getHighlightById(id);
  }

  deleteHighlight(id) {
    const stmt = db.prepare('DELETE FROM collection_highlights WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  createGoal(userId, data) {
    const stmt = db.prepare(`
      INSERT INTO collection_goals (user_id, goal_type, title, description, target_value, related_achievement_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      data.goalType,
      data.title,
      data.description || null,
      data.targetValue || 1,
      data.relatedAchievementId || null
    );
    return this.getGoalById(result.lastInsertRowid);
  }

  getGoalById(id) {
    const stmt = db.prepare('SELECT * FROM collection_goals WHERE id = ?');
    return stmt.get(id);
  }

  getGoals(userId, filters = {}) {
    let sql = 'SELECT * FROM collection_goals WHERE user_id = ?';
    const params = [userId];

    if (filters.goalType) {
      sql += ' AND goal_type = ?';
      params.push(filters.goalType);
    }
    if (filters.isCompleted !== undefined) {
      sql += ' AND is_completed = ?';
      params.push(filters.isCompleted ? 1 : 0);
    }

    sql += ' ORDER BY is_completed ASC, created_at DESC';

    return db.prepare(sql).all(...params);
  }

  updateGoalProgress(id, progress) {
    const goal = this.getGoalById(id);
    if (!goal) return null;

    const isCompleted = progress >= goal.target_value;
    const stmt = db.prepare(`
      UPDATE collection_goals
      SET current_progress = ?, is_completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = ?
    `);
    stmt.run(progress, isCompleted ? 1 : 0, isCompleted ? 1 : 0, id);
    return this.getGoalById(id);
  }

  deleteGoal(id) {
    const stmt = db.prepare('DELETE FROM collection_goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getCollectionOverview(userId) {
    const fragmentCount = this.getEmotionFragmentCount(userId);
    const storyCardCount = this.getStoryCardCount(userId);
    const highlightCount = this.getHighlightCount(userId);
    const goalCount = db.prepare('SELECT COUNT(*) as count FROM collection_goals WHERE user_id = ?').get(userId).count;
    const completedGoalCount = db.prepare('SELECT COUNT(*) as count FROM collection_goals WHERE user_id = ? AND is_completed = 1').get(userId).count;
    const starredFragmentCount = db.prepare('SELECT COUNT(*) as count FROM emotion_fragments WHERE user_id = ? AND is_starred = 1').get(userId).count;
    const favoriteHighlightCount = db.prepare('SELECT COUNT(*) as count FROM collection_highlights WHERE user_id = ? AND is_favorite = 1').get(userId).count;

    const emotionTypeStats = this.getEmotionTypeStats(userId);
    const roomStats = this.getStoryCardRoomStats(userId);

    return {
      fragmentCount,
      storyCardCount,
      highlightCount,
      goalCount,
      completedGoalCount,
      starredFragmentCount,
      favoriteHighlightCount,
      emotionTypeStats,
      roomStats
    };
  }
}

module.exports = new DreamCollectionRepository();
