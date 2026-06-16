const db = require('../config/database');

class TaskRepository {
  findAll() {
    const stmt = db.prepare(`SELECT * FROM tasks ORDER BY id`);
    return stmt.all();
  }

  findById(id) {
    const stmt = db.prepare(`SELECT * FROM tasks WHERE id = ?`);
    return stmt.get(id);
  }

  findByType(type) {
    const stmt = db.prepare(`SELECT * FROM tasks WHERE type = ? ORDER BY id`);
    return stmt.all(type);
  }

  getUserTask(userId, taskId, date) {
    const stmt = db.prepare(`
      SELECT * FROM user_tasks
      WHERE user_id = ? AND task_id = ? AND task_date = ?
    `);
    return stmt.get(userId, taskId, date);
  }

  getUserTasksByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? AND ut.task_date = ?
      ORDER BY t.id
    `);
    return stmt.all(userId, date);
  }

  getUserOnceTasks(userId) {
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE t.type = 'once'
      GROUP BY t.id
      ORDER BY t.id
    `);
    return stmt.all(userId);
  }

  updateProgress(userId, taskId, date, progress) {
    const task = this.findById(taskId);
    if (!task) return null;

    const isCompleted = progress >= task.target;
    
    const existing = this.getUserTask(userId, taskId, date);
    
    if (existing) {
      if (existing.is_completed) return existing;
      
      const stmt = db.prepare(`
        UPDATE user_tasks
        SET current_progress = ?, is_completed = ?
        WHERE user_id = ? AND task_id = ? AND task_date = ?
      `);
      stmt.run(progress, isCompleted ? 1 : 0, userId, taskId, date);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_tasks (user_id, task_id, task_date, current_progress, is_completed, is_claimed)
        VALUES (?, ?, ?, ?, ?, 0)
      `);
      stmt.run(userId, taskId, date, progress, isCompleted ? 1 : 0);
    }

    return {
      ...task,
      current_progress: progress,
      is_completed: isCompleted ? 1 : 0,
      is_claimed: 0
    };
  }

  claimReward(userId, taskId, date) {
    const stmt = db.prepare(`
      UPDATE user_tasks
      SET is_claimed = 1
      WHERE user_id = ? AND task_id = ? AND task_date = ? AND is_completed = 1 AND is_claimed = 0
    `);
    const result = stmt.run(userId, taskId, date);
    return result.changes > 0;
  }
}

module.exports = new TaskRepository();
