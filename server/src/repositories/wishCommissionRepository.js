const db = require('../config/database');

class WishCommissionRepository {
  getTemplates(params = {}) {
    const { type, difficulty, isActive = true, limit, offset } = params;
    
    let whereClauses = [];
    let queryParams = [];
    
    if (isActive !== null && isActive !== undefined) {
      whereClauses.push('is_active = ?');
      queryParams.push(isActive ? 1 : 0);
    }
    
    if (type) {
      whereClauses.push('commission_type = ?');
      queryParams.push(type);
    }
    
    if (difficulty) {
      whereClauses.push('difficulty = ?');
      queryParams.push(difficulty);
    }
    
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    let sql = `SELECT * FROM wish_commission_templates ${whereSql} ORDER BY sort_order ASC, id ASC`;
    
    if (limit) {
      sql += ' LIMIT ?';
      queryParams.push(limit);
      if (offset) {
        sql += ' OFFSET ?';
        queryParams.push(offset);
      }
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...queryParams);
  }

  getTemplateById(id) {
    const stmt = db.prepare('SELECT * FROM wish_commission_templates WHERE id = ?');
    return stmt.get(id);
  }

  getTemplateCount(params = {}) {
    const { type, difficulty, isActive = true } = params;
    
    let whereClauses = [];
    let queryParams = [];
    
    if (isActive !== null && isActive !== undefined) {
      whereClauses.push('is_active = ?');
      queryParams.push(isActive ? 1 : 0);
    }
    
    if (type) {
      whereClauses.push('commission_type = ?');
      queryParams.push(type);
    }
    
    if (difficulty) {
      whereClauses.push('difficulty = ?');
      queryParams.push(difficulty);
    }
    
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM wish_commission_templates ${whereSql}`);
    return stmt.get(...queryParams).count;
  }

  getUserCommissions(userId, params = {}) {
    const { status, type, limit, offset } = params;
    
    let whereClauses = ['user_id = ?'];
    let queryParams = [userId];
    
    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }
    
    if (type) {
      whereClauses.push('commission_type = ?');
      queryParams.push(type);
    }
    
    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    
    let sql = `SELECT * FROM user_wish_commissions ${whereSql} ORDER BY id DESC`;
    
    if (limit) {
      sql += ' LIMIT ?';
      queryParams.push(limit);
      if (offset) {
        sql += ' OFFSET ?';
        queryParams.push(offset);
      }
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...queryParams);
  }

  getUserCommissionById(userId, id) {
    const stmt = db.prepare('SELECT * FROM user_wish_commissions WHERE id = ? AND user_id = ?');
    return stmt.get(id, userId);
  }

  getUserCommissionByTemplate(userId, templateId, status = null) {
    let sql = 'SELECT * FROM user_wish_commissions WHERE user_id = ? AND template_id = ?';
    const params = [userId, templateId];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY id DESC LIMIT 1';
    
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  }

  createUserCommission(userId, template) {
    const deadline = template.time_limit_hours > 0 
      ? new Date(Date.now() + template.time_limit_hours * 60 * 60 * 1000).toISOString()
      : null;
    
    const stmt = db.prepare(`
      INSERT INTO user_wish_commissions 
      (user_id, template_id, title, description, commission_type, difficulty, target_value, reward_coins, reward_exp, status, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?)
    `);
    
    const result = stmt.run(
      userId,
      template.id,
      template.title,
      template.description,
      template.commission_type,
      template.difficulty,
      template.target_value,
      template.reward_coins,
      template.reward_exp,
      deadline
    );
    
    return result.lastInsertRowid;
  }

  updateProgress(userId, commissionId, progress) {
    const stmt = db.prepare(`
      UPDATE user_wish_commissions 
      SET current_progress = ?
      WHERE id = ? AND user_id = ?
    `);
    return stmt.run(progress, commissionId, userId);
  }

  incrementProgress(userId, commissionId, amount = 1) {
    const stmt = db.prepare(`
      UPDATE user_wish_commissions 
      SET current_progress = current_progress + ?
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(amount, commissionId, userId);
    
    const commission = this.getUserCommissionById(userId, commissionId);
    return commission;
  }

  completeCommission(userId, commissionId) {
    const stmt = db.prepare(`
      UPDATE user_wish_commissions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND status = 'accepted'
    `);
    const result = stmt.run(commissionId, userId);
    return result.changes > 0;
  }

  claimReward(userId, commissionId) {
    const stmt = db.prepare(`
      UPDATE user_wish_commissions 
      SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND status = 'completed'
    `);
    const result = stmt.run(commissionId, userId);
    return result.changes > 0;
  }

  getCompletedCount(userId, type = null) {
    let sql = 'SELECT COUNT(*) as count FROM user_wish_commissions WHERE user_id = ? AND status IN (?, ?)';
    const params = [userId, 'completed', 'claimed'];
    
    if (type) {
      sql += ' AND commission_type = ?';
      params.push(type);
    }
    
    const stmt = db.prepare(sql);
    return stmt.get(...params).count;
  }

  getRetrospectiveByCommission(userId, commissionId) {
    const stmt = db.prepare('SELECT * FROM commission_retrospectives WHERE user_id = ? AND commission_id = ?');
    return stmt.get(userId, commissionId);
  }

  createRetrospective(userId, commissionId, data) {
    const stmt = db.prepare(`
      INSERT INTO commission_retrospectives 
      (user_id, commission_id, content, mood_after, insight, growth_tags, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      commissionId,
      data.content,
      data.mood_after || null,
      data.insight || null,
      data.growth_tags ? JSON.stringify(data.growth_tags) : null,
      data.rating || 0
    );
    
    return result.lastInsertRowid;
  }

  getRetrospectives(userId, limit = 20, offset = 0) {
    const stmt = db.prepare(`
      SELECT cr.*, uwc.title as commission_title, uwc.commission_type
      FROM commission_retrospectives cr
      LEFT JOIN user_wish_commissions uwc ON cr.commission_id = uwc.id
      WHERE cr.user_id = ?
      ORDER BY cr.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(userId, limit, offset);
  }

  getStarCoinBalance(userId) {
    const stmt = db.prepare('SELECT star_coins, total_coins_earned FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  updateStarCoinBalance(userId, amount) {
    const stmt = db.prepare(`
      UPDATE users 
      SET star_coins = star_coins + ?,
          total_coins_earned = CASE WHEN ? > 0 THEN total_coins_earned + ? ELSE total_coins_earned END
      WHERE id = ?
    `);
    stmt.run(amount, amount, amount, userId);
    
    const result = db.prepare('SELECT star_coins, total_coins_earned FROM users WHERE id = ?').get(userId);
    return result;
  }

  createTransaction(userId, amount, transactionType, sourceType, sourceId, description) {
    const balance = this.getStarCoinBalance(userId);
    const balanceAfter = balance.star_coins + amount;
    
    const stmt = db.prepare(`
      INSERT INTO star_coin_transactions 
      (user_id, amount, transaction_type, source_type, source_id, description, balance_after)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      amount,
      transactionType,
      sourceType || null,
      sourceId || null,
      description || null,
      balanceAfter
    );
    
    return {
      id: result.lastInsertRowid,
      balanceAfter
    };
  }

  getTransactions(userId, limit = 20, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM star_coin_transactions 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  }

  getCommissionTypes() {
    const stmt = db.prepare(`
      SELECT DISTINCT commission_type as type, 
             COUNT(*) as count 
      FROM wish_commission_templates 
      WHERE is_active = 1
      GROUP BY commission_type
      ORDER BY commission_type
    `);
    return stmt.all();
  }

  checkExpiredCommissions(userId) {
    const stmt = db.prepare(`
      UPDATE user_wish_commissions 
      SET status = 'expired'
      WHERE user_id = ? AND status = 'accepted' AND deadline IS NOT NULL AND deadline < CURRENT_TIMESTAMP
    `);
    const result = stmt.run(userId);
    return result.changes;
  }
}

module.exports = new WishCommissionRepository();
