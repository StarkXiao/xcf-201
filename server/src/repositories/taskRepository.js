const db = require('../config/database');

module.exports.db = db;

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

  findByChainId(chainId) {
    const stmt = db.prepare(`SELECT * FROM tasks WHERE chain_id = ? ORDER BY chain_order ASC`);
    return stmt.all(chainId);
  }

  getWeekStartDate(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }

  getUserTask(userId, taskId, date) {
    const task = this.findById(taskId);
    if (!task) return null;

    let taskDate;
    
    if (task.type === 'daily') {
      taskDate = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (task.type === 'weekly') {
      taskDate = this.getWeekStartDate(new Date(date));
    } else {
      taskDate = this.getTaskPermanentDate(userId, taskId);
    }

    const stmt = db.prepare(`
      SELECT * FROM user_tasks
      WHERE user_id = ? AND task_id = ? AND task_date = ?
    `);
    return stmt.get(userId, taskId, taskDate);
  }

  getUserTasksByDate(userId, date) {
    const todayStr = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const weekStart = this.getWeekStartDate(new Date(todayStr));

    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed,
        ut.task_date as user_task_date
      FROM tasks t
      LEFT JOIN user_tasks ut 
        ON t.id = ut.task_id 
        AND ut.user_id = ? 
        AND (
          (t.type = 'daily' AND ut.task_date = ?) OR
          (t.type = 'weekly' AND ut.task_date = ?) OR
          (t.type IN ('once', 'chain') AND ut.user_id = ? AND ut.task_id = t.id)
        )
      ORDER BY t.type, t.chain_order, t.id
    `);
    return stmt.all(userId, todayStr, weekStart, userId);
  }

  getUserDailyTasks(userId, date) {
    const dateStr = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? AND ut.task_date = ?
      WHERE t.type = 'daily'
      ORDER BY t.id
    `);
    return stmt.all(userId, dateStr);
  }

  getUserWeeklyTasks(userId, date) {
    const weekStart = this.getWeekStartDate(date ? new Date(date) : new Date());
    
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? AND ut.task_date = ?
      WHERE t.type = 'weekly'
      ORDER BY t.id
    `);
    return stmt.all(userId, weekStart);
  }

  getUserChainTasks(userId) {
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE t.type = 'chain'
      ORDER BY t.chain_id, t.chain_order
    `);
    return stmt.all(userId);
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
      ORDER BY t.id
    `);
    return stmt.all(userId);
  }

  updateProgress(userId, taskId, progress, date = new Date()) {
    const task = this.findById(taskId);
    if (!task) return null;

    let taskDate;
    if (task.type === 'daily') {
      taskDate = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (task.type === 'weekly') {
      taskDate = this.getWeekStartDate(date ? new Date(date) : new Date());
    } else {
      taskDate = this.getTaskPermanentDate(userId, taskId);
    }

    const isCompleted = progress >= task.target;
    
    const existing = this.getUserTask(userId, taskId, taskDate);
    
    if (existing) {
      if (existing.is_completed) return existing;
      
      const stmt = db.prepare(`
        UPDATE user_tasks
        SET current_progress = ?, is_completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE user_id = ? AND task_id = ? AND task_date = ?
      `);
      stmt.run(progress, isCompleted ? 1 : 0, isCompleted ? 1 : 0, userId, taskId, taskDate);
    } else {
      const stmt = db.prepare(`
        INSERT INTO user_tasks (user_id, task_id, task_date, current_progress, is_completed, is_claimed, completed_at)
        VALUES (?, ?, ?, ?, ?, 0, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
      `);
      stmt.run(userId, taskId, taskDate, progress, isCompleted ? 1 : 0, isCompleted ? 1 : 0);
    }

    return {
      ...task,
      current_progress: progress,
      is_completed: isCompleted ? 1 : 0,
      is_claimed: 0
    };
  }

  getTaskPermanentDate(userId, taskId) {
    const stmt = db.prepare(`
      SELECT task_date FROM user_tasks 
      WHERE user_id = ? AND task_id = ? 
      LIMIT 1
    `);
    const result = stmt.get(userId, taskId);
    return result ? result.task_date : '9999-12-31';
  }

  incrementProgress(userId, taskId, amount = 1, date = new Date()) {
    const task = this.findById(taskId);
    if (!task) return null;

    let taskDate;
    if (task.type === 'daily') {
      taskDate = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (task.type === 'weekly') {
      taskDate = this.getWeekStartDate(date ? new Date(date) : new Date());
    } else {
      const existing = this.getUserTask(userId, taskId, date);
      taskDate = existing ? existing.task_date : '9999-12-31';
    }

    const existing = this.getUserTask(userId, taskId, taskDate);
    const currentProgress = existing ? existing.current_progress : 0;
    const newProgress = Math.min(currentProgress + amount, task.target);

    return this.updateProgress(userId, taskId, newProgress, taskDate);
  }

  claimReward(userId, taskId, date = new Date()) {
    const task = this.findById(taskId);
    if (!task) return false;

    let taskDate;
    if (task.type === 'daily') {
      taskDate = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (task.type === 'weekly') {
      taskDate = this.getWeekStartDate(date ? new Date(date) : new Date());
    } else {
      const existing = this.getUserTask(userId, taskId, date);
      taskDate = existing ? existing.task_date : '9999-12-31';
    }

    const stmt = db.prepare(`
      UPDATE user_tasks
      SET is_claimed = 1, claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND task_id = ? AND task_date = ? AND is_completed = 1 AND is_claimed = 0
    `);
    const result = stmt.run(userId, taskId, taskDate);
    return result.changes > 0;
  }

  checkAndResetStreakTask(userId, taskId, currentDate = new Date()) {
    const task = this.findById(taskId);
    if (!task || task.reset_type !== 'streak') return { reset: false };

    const userTask = this.getUserTask(userId, taskId, currentDate);
    if (!userTask || !userTask.is_completed) return { reset: false };

    const lastCompleted = userTask.completed_at ? new Date(userTask.completed_at) : null;
    if (!lastCompleted) return { reset: false };

    const resetDays = task.reset_days || 1;
    const now = new Date(currentDate);
    const diffTime = Math.abs(now - lastCompleted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > resetDays) {
      this.resetTaskProgress(userId, taskId, currentDate);
      return { reset: true, reason: 'streak_broken', days: diffDays };
    }

    return { reset: false };
  }

  resetTaskProgress(userId, taskId, date = new Date()) {
    const task = this.findById(taskId);
    if (!task) return false;

    let taskDate;
    if (task.type === 'daily') {
      taskDate = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (task.type === 'weekly') {
      taskDate = this.getWeekStartDate(date ? new Date(date) : new Date());
    } else {
      const existing = this.getUserTask(userId, taskId, date);
      taskDate = existing ? existing.task_date : '9999-12-31';
    }

    const stmt = db.prepare(`
      UPDATE user_tasks
      SET current_progress = 0, is_completed = 0, is_claimed = 0, completed_at = NULL, claimed_at = NULL
      WHERE user_id = ? AND task_id = ? AND task_date = ?
    `);
    const result = stmt.run(userId, taskId, taskDate);
    return result.changes > 0;
  }

  getChainTasksWithStatus(userId, chainId) {
    const tasks = this.findByChainId(chainId);
    const userTasks = {};
    
    const stmt = db.prepare(`
      SELECT 
        t.id,
        COALESCE(ut.current_progress, 0) as current_progress,
        COALESCE(ut.is_completed, 0) as is_completed,
        COALESCE(ut.is_claimed, 0) as is_claimed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE t.chain_id = ?
      ORDER BY t.chain_order ASC
    `);
    
    const results = stmt.all(userId, chainId);
    results.forEach(r => {
      userTasks[r.id] = r;
    });

    let prevCompleted = true;
    return tasks.map(task => {
      const userTask = userTasks[task.id] || { current_progress: 0, is_completed: 0, is_claimed: 0 };
      const isUnlocked = prevCompleted;
      if (userTask.is_completed) {
        prevCompleted = true;
      } else {
        prevCompleted = false;
      }
      
      return {
        ...task,
        current: userTask.current_progress || 0,
        isCompleted: !!userTask.is_completed,
        isClaimed: !!userTask.is_claimed,
        isUnlocked
      };
    });
  }

  getCompletedTaskCountByType(userId, type) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT task_id) as count
      FROM user_tasks
      WHERE user_id = ? AND is_completed = 1
      AND task_id IN (SELECT id FROM tasks WHERE type = ?)
    `);
    return stmt.get(userId, type).count;
  }

  getClaimedRewardsTotal(userId) {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(t.reward), 0) as total
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = ? AND ut.is_claimed = 1
    `);
    return stmt.get(userId).total;
  }

  getCompletedTasksInDateRange(userId, startDate, endDate) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_tasks
      WHERE user_id = ? 
        AND is_completed = 1 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) BETWEEN ? AND ?
    `);
    return stmt.get(userId, startDate, endDate).count;
  }

  getClaimedTasksInDateRange(userId, startDate, endDate) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_tasks
      WHERE user_id = ? 
        AND is_claimed = 1 
        AND claimed_at IS NOT NULL
        AND DATE(claimed_at) BETWEEN ? AND ?
    `);
    return stmt.get(userId, startDate, endDate).count;
  }

  getRewardsEarnedInDateRange(userId, startDate, endDate) {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(t.reward), 0) as total
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = ? 
        AND ut.is_claimed = 1 
        AND ut.claimed_at IS NOT NULL
        AND DATE(ut.claimed_at) BETWEEN ? AND ?
    `);
    return stmt.get(userId, startDate, endDate).total;
  }

  getClaimDates(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT DATE(claimed_at) as claim_date
      FROM user_tasks
      WHERE user_id = ? AND is_claimed = 1 AND claimed_at IS NOT NULL
      ORDER BY claim_date DESC
    `);
    return stmt.all(userId).map(r => r.claim_date);
  }

  getRecentCompletedTasks(userId, limit = 10) {
    const stmt = db.prepare(`
      SELECT 
        t.id,
        t.title,
        t.type,
        t.reward,
        ut.completed_at,
        ut.is_claimed,
        ut.claimed_at
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = ? AND ut.is_completed = 1
      ORDER BY ut.completed_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  }
}

module.exports = new TaskRepository();
