const db = require('../config/database');

class StoryRepository {
  findByRoomId(roomId) {
    const stmt = db.prepare(`
      SELECT id, room_id, chapter_number, branch_key, parent_id, title, content, conditions, branch_label, is_branch_point, is_ending, sort_order
      FROM stories
      WHERE room_id = ?
      ORDER BY sort_order
    `);
    const results = stmt.all(roomId);
    return results.map(r => this.formatStory(r));
  }

  findById(storyId) {
    const stmt = db.prepare(`
      SELECT s.*, r.name as room_name
      FROM stories s
      JOIN rooms r ON s.room_id = r.id
      WHERE s.id = ?
    `);
    const result = stmt.get(storyId);
    return result ? this.formatStory(result) : null;
  }

  findByChapter(roomId, chapterNumber) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE room_id = ? AND chapter_number = ? AND branch_key = 'main'
      ORDER BY sort_order
    `);
    const result = stmt.get(roomId, chapterNumber);
    return result ? this.formatStory(result) : null;
  }

  findByRoomAndBranch(roomId, branchKey) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE room_id = ? AND branch_key = ?
      ORDER BY sort_order
    `);
    const results = stmt.all(roomId, branchKey);
    return results.map(r => this.formatStory(r));
  }

  findBranchesByChapter(roomId, chapterNumber) {
    const stmt = db.prepare(`
      SELECT DISTINCT branch_key, branch_label, chapter_number
      FROM stories
      WHERE room_id = ? AND chapter_number = ?
      ORDER BY sort_order
    `);
    return stmt.all(roomId, chapterNumber);
  }

  getBranchesForRoom(roomId) {
    const stmt = db.prepare(`
      SELECT DISTINCT branch_key, branch_label
      FROM stories
      WHERE room_id = ?
      ORDER BY 
        CASE branch_key 
          WHEN 'main' THEN 0 
          ELSE 1 
        END,
        branch_label
    `);
    return stmt.all(roomId);
  }

  findBranchPoint(roomId, chapterNumber) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE room_id = ? AND chapter_number = ? AND is_branch_point = 1
      LIMIT 1
    `);
    const result = stmt.get(roomId, chapterNumber);
    return result ? this.formatStory(result) : null;
  }

  getChildBranches(roomId, chapterNumber) {
    const stmt = db.prepare(`
      SELECT DISTINCT s.branch_key, s.branch_label, s.conditions, s.chapter_number, s.title
      FROM stories s
      WHERE s.room_id = ? 
        AND s.chapter_number = ? 
        AND s.branch_key != 'main'
      ORDER BY s.sort_order
    `);
    const results = stmt.all(roomId, chapterNumber);
    return results.map(r => ({
      ...r,
      conditions: r.conditions ? JSON.parse(r.conditions) : null
    }));
  }

  getStoryByBranchAndChapter(roomId, branchKey, chapterNumber) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE room_id = ? AND branch_key = ? AND chapter_number = ?
      LIMIT 1
    `);
    const result = stmt.get(roomId, branchKey, chapterNumber);
    return result ? this.formatStory(result) : null;
  }

  getCount() {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM stories`);
    return stmt.get().count;
  }

  formatStory(story) {
    if (!story) return null;
    return {
      ...story,
      conditions: story.conditions ? JSON.parse(story.conditions) : null,
      is_branch_point: !!story.is_branch_point,
      is_ending: !!story.is_ending
    };
  }
}

module.exports = new StoryRepository();
