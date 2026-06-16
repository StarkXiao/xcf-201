const db = require('../config/database');

class StoryRepository {
  findByRoomId(roomId) {
    const stmt = db.prepare(`
      SELECT id, room_id, chapter_number, title, content
      FROM stories
      WHERE room_id = ?
      ORDER BY chapter_number
    `);
    return stmt.all(roomId);
  }

  findById(storyId) {
    const stmt = db.prepare(`
      SELECT s.*, r.name as room_name
      FROM stories s
      JOIN rooms r ON s.room_id = r.id
      WHERE s.id = ?
    `);
    return stmt.get(storyId);
  }

  findByChapter(roomId, chapterNumber) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE room_id = ? AND chapter_number = ?
    `);
    return stmt.get(roomId, chapterNumber);
  }

  getCount() {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM stories`);
    return stmt.get().count;
  }
}

module.exports = new StoryRepository();
