const wishCommissionRepository = require('../repositories/wishCommissionRepository');
const moodRepository = require('../repositories/moodRepository');
const achievementRepository = require('../repositories/achievementRepository');
const notificationEvents = require('../utils/notificationEvents');

class WishCommissionService {
  getCommissionTemplates(userId, params = {}) {
    const templates = wishCommissionRepository.getTemplates(params);
    const templateCount = wishCommissionRepository.getTemplateCount(params);
    
    const userAcceptedTemplates = wishCommissionRepository.getUserCommissions(userId, { status: 'accepted' });
    const acceptedTemplateIds = new Set(userAcceptedTemplates.map(t => t.template_id));
    
    const formattedTemplates = templates.map(template => ({
      ...this.formatTemplate(template),
      isAccepted: acceptedTemplateIds.has(template.id)
    }));
    
    return {
      templates: formattedTemplates,
      total: templateCount
    };
  }

  formatTemplate(template) {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      type: template.commission_type,
      difficulty: template.difficulty,
      target: template.target_value,
      rewardCoins: template.reward_coins,
      rewardExp: template.reward_exp,
      moodType: template.mood_type,
      roomId: template.room_id,
      streakDays: template.streak_days,
      timeLimitHours: template.time_limit_hours,
      acceptLimit: template.accept_limit,
      icon: template.icon,
      isActive: !!template.is_active,
      createdAt: template.created_at
    };
  }

  getCommissionTypes() {
    const types = wishCommissionRepository.getCommissionTypes();
    const typeLabels = {
      'mood_record': { label: '心情记录', icon: 'heart' },
      'mood_content': { label: '心情随笔', icon: 'pen-tool' },
      'mood_multi_segment': { label: '多段记录', icon: 'layers' },
      'mood_variety': { label: '情绪探索', icon: 'palette' },
      'mood_type': { label: '特定情绪', icon: 'smile' },
      'streak': { label: '连续打卡', icon: 'flame' },
      'story_read': { label: '阅读章节', icon: 'book-open' },
      'room_unlock': { label: '解锁房间', icon: 'door-open' },
      'chapter_note': { label: '章节札记', icon: 'feather' },
      'retrospective': { label: '心情回顾', icon: 'rotate-ccw' },
      'commission_complete': { label: '委托成就', icon: 'award' },
      'coin_earning': { label: '星币收获', icon: 'coins' },
      'commission_retro': { label: '委托复盘', icon: 'book-open-check' }
    };
    
    return types.map(t => ({
      type: t.type,
      label: typeLabels[t.type]?.label || t.type,
      icon: typeLabels[t.type]?.icon || 'scroll',
      count: t.count
    }));
  }

  acceptCommission(userId, templateId) {
    const template = wishCommissionRepository.getTemplateById(templateId);
    if (!template) {
      throw new Error('委托不存在');
    }
    
    if (!template.is_active) {
      throw new Error('该委托暂不可接取');
    }
    
    const existing = wishCommissionRepository.getUserCommissionByTemplate(userId, templateId, 'accepted');
    if (existing) {
      throw new Error('你已接取该委托');
    }
    
    if (template.accept_limit > 0) {
      const completedCount = wishCommissionRepository.getCompletedCount(userId, template.commission_type);
      if (completedCount >= template.accept_limit) {
        throw new Error('该委托已达接取上限');
      }
    }
    
    const commissionId = wishCommissionRepository.createUserCommission(userId, template);
    
    this.updateCommissionProgress(userId, commissionId);
    
    const commission = wishCommissionRepository.getUserCommissionById(userId, commissionId);
    
    return this.formatUserCommission(commission);
  }

  getUserCommissions(userId, params = {}) {
    wishCommissionRepository.checkExpiredCommissions(userId);
    
    const commissions = wishCommissionRepository.getUserCommissions(userId, params);
    
    return commissions.map(c => this.formatUserCommission(c));
  }

  formatUserCommission(commission) {
    return {
      id: commission.id,
      templateId: commission.template_id,
      title: commission.title,
      description: commission.description,
      type: commission.commission_type,
      difficulty: commission.difficulty,
      target: commission.target_value,
      current: commission.current_progress || 0,
      rewardCoins: commission.reward_coins,
      rewardExp: commission.reward_exp,
      status: commission.status,
      acceptedAt: commission.accepted_at,
      completedAt: commission.completed_at,
      claimedAt: commission.claimed_at,
      deadline: commission.deadline,
      progressPercent: Math.min(100, Math.floor((commission.current_progress || 0) / commission.target_value * 100))
    };
  }

  updateCommissionProgress(userId, commissionId) {
    const commission = wishCommissionRepository.getUserCommissionById(userId, commissionId);
    if (!commission) return null;
    if (commission.status !== 'accepted') return commission;
    
    const progress = this.calculateProgress(userId, commission);
    const newProgress = Math.min(progress, commission.target_value);
    
    if (newProgress !== commission.current_progress) {
      wishCommissionRepository.updateProgress(userId, commissionId, newProgress);
      
      if (newProgress >= commission.target_value && commission.status === 'accepted') {
        wishCommissionRepository.completeCommission(userId, commissionId);
      }
    }
    
    const updated = wishCommissionRepository.getUserCommissionById(userId, commissionId);
    return this.formatUserCommission(updated);
  }

  calculateProgress(userId, commission) {
    switch (commission.type) {
      case 'mood_record':
        return this.getMoodRecordProgress(userId, commission);
      case 'mood_content':
        return this.getMoodContentProgress(userId, commission);
      case 'mood_multi_segment':
        return this.getMultiSegmentProgress(userId, commission);
      case 'mood_variety':
        return this.getMoodVarietyProgress(userId, commission);
      case 'mood_type':
        return this.getMoodTypeProgress(userId, commission);
      case 'streak':
        return this.getStreakProgress(userId, commission);
      case 'story_read':
        return this.getStoryReadProgress(userId, commission);
      case 'room_unlock':
        return this.getRoomUnlockProgress(userId, commission);
      case 'chapter_note':
        return this.getChapterNoteProgress(userId, commission);
      case 'retrospective':
        return this.getRetrospectiveProgress(userId, commission);
      case 'commission_complete':
        return this.getCommissionCompleteProgress(userId, commission);
      case 'coin_earning':
        return this.getCoinEarningProgress(userId, commission);
      case 'commission_retro':
        return this.getCommissionRetroProgress(userId, commission);
      default:
        return commission.current_progress || 0;
    }
  }

  getMoodRecordProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const moods = moodRepository.findByDate(userId, dateStr);
    
    if (commission.target_value === 1) {
      return moods.length > 0 ? 1 : 0;
    }
    
    return moods.length;
  }

  getMoodContentProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const moods = moodRepository.findByDate(userId, dateStr);
    
    let totalChars = 0;
    moods.forEach(mood => {
      if (mood.content) {
        totalChars += mood.content.length;
      }
    });
    
    return totalChars;
  }

  getMultiSegmentProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const moods = moodRepository.findByDate(userId, dateStr);
    
    const segments = new Set(moods.map(m => m.time_segment));
    return segments.size;
  }

  getMoodVarietyProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const moods = moodRepository.findByDate(userId, dateStr);
    
    const moodTypes = new Set(moods.map(m => m.mood_type));
    
    if (commission.target_value === 1) {
      const allMoods = moodRepository.findByUserId(userId);
      const allTypes = new Set(allMoods.map(m => m.mood_type));
      return allTypes.size > 1 ? 1 : 0;
    }
    
    return moodTypes.size;
  }

  getMoodTypeProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const moods = moodRepository.findByDate(userId, dateStr);
    
    const targetMood = commission.mood_type || commission.moodType;
    const count = moods.filter(m => m.mood_type === targetMood).length;
    
    return count > 0 ? 1 : 0;
  }

  getStreakProgress(userId, commission) {
    const streakDays = moodRepository.getStreakDays(userId);
    const targetDays = commission.streak_days || commission.target_value;
    
    return Math.min(streakDays, targetDays);
  }

  getStoryReadProgress(userId, commission) {
    const db = require('../config/database');
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT story_id) as count
      FROM user_story_history
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result.count || 0;
  }

  getRoomUnlockProgress(userId, commission) {
    const db = require('../config/database');
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_rooms
      WHERE user_id = ? AND is_unlocked = 1
    `);
    const result = stmt.get(userId);
    return result.count || 0;
  }

  getChapterNoteProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const db = require('../config/database');
    const stmt = db.prepare(`
      SELECT content FROM chapter_notes
      WHERE user_id = ? AND DATE(created_at) = ?
    `);
    const notes = stmt.all(userId, dateStr);
    
    let totalChars = 0;
    notes.forEach(note => {
      if (note.content) {
        totalChars += note.content.length;
      }
    });
    
    return totalChars;
  }

  getRetrospectiveProgress(userId, commission) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const db = require('../config/database');
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM mood_retrospectives
      WHERE user_id = ? AND DATE(created_at) = ?
    `);
    const result = stmt.get(userId, dateStr);
    return result.count || 0;
  }

  getCommissionCompleteProgress(userId, commission) {
    const count = wishCommissionRepository.getCompletedCount(userId);
    return count;
  }

  getCoinEarningProgress(userId, commission) {
    const balance = wishCommissionRepository.getStarCoinBalance(userId);
    return balance.total_coins_earned || 0;
  }

  getCommissionRetroProgress(userId, commission) {
    const db = require('../config/database');
    const stmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(MAX(rating), 0) as max_rating
      FROM commission_retrospectives
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    
    if (commission.target_value === 5 && commission.title.includes('成长')) {
      return result.max_rating || 0;
    }
    
    return result.count || 0;
  }

  updateAllCommissions(userId) {
    const commissions = wishCommissionRepository.getUserCommissions(userId, { status: 'accepted' });
    
    const updates = [];
    const newlyCompleted = [];
    
    commissions.forEach(commission => {
      const wasCompleted = commission.current_progress >= commission.target_value;
      const updated = this.updateCommissionProgress(userId, commission.id);
      
      if (updated && updated.current >= updated.target && !wasCompleted) {
        newlyCompleted.push(updated);
      }
      
      if (updated) {
        updates.push(updated);
      }
    });
    
    return { updates, newlyCompleted };
  }

  claimReward(userId, commissionId) {
    const commission = wishCommissionRepository.getUserCommissionById(userId, commissionId);
    if (!commission) {
      throw new Error('委托不存在');
    }
    
    if (commission.status === 'claimed') {
      throw new Error('奖励已领取');
    }
    
    if (commission.status !== 'completed') {
      throw new Error('委托尚未完成');
    }
    
    const success = wishCommissionRepository.claimReward(userId, commissionId);
    if (!success) {
      throw new Error('奖励领取失败');
    }
    
    wishCommissionRepository.createTransaction(
      userId,
      commission.reward_coins,
      'commission_reward',
      'wish_commission',
      commissionId,
      `完成委托「${commission.title}」获得 ${commission.reward_coins} 星币`
    );
    
    const balance = wishCommissionRepository.updateStarCoinBalance(userId, commission.reward_coins);
    
    this.updateAllCommissions(userId);
    
    achievementRepository.checkAndUnlock(userId, 'star_coins_earned', balance.total_coins_earned);
    
    return {
      success: true,
      rewardCoins: commission.reward_coins,
      rewardExp: commission.reward_exp,
      balance: balance.star_coins,
      totalEarned: balance.total_coins_earned
    };
  }

  getStarCoinInfo(userId) {
    const balance = wishCommissionRepository.getStarCoinBalance(userId);
    const transactions = wishCommissionRepository.getTransactions(userId, 10, 0);
    
    return {
      balance: balance.star_coins || 0,
      totalEarned: balance.total_coins_earned || 0,
      recentTransactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.transaction_type,
        sourceType: t.source_type,
        sourceId: t.source_id,
        description: t.description,
        balanceAfter: t.balance_after,
        createdAt: t.created_at
      }))
    };
  }

  createRetrospective(userId, commissionId, data) {
    const commission = wishCommissionRepository.getUserCommissionById(userId, commissionId);
    if (!commission) {
      throw new Error('委托不存在');
    }
    
    if (commission.status !== 'completed' && commission.status !== 'claimed') {
      throw new Error('请先完成委托再进行复盘');
    }
    
    const existing = wishCommissionRepository.getRetrospectiveByCommission(userId, commissionId);
    if (existing) {
      throw new Error('该委托已写过复盘');
    }
    
    const retroId = wishCommissionRepository.createRetrospective(userId, commissionId, data);
    
    this.updateAllCommissions(userId);
    
    return {
      id: retroId,
      commissionId,
      content: data.content,
      moodAfter: data.mood_after,
      insight: data.insight,
      growthTags: data.growth_tags || [],
      rating: data.rating || 0,
      createdAt: new Date().toISOString()
    };
  }

  getRetrospectives(userId, limit = 20, offset = 0) {
    const retros = wishCommissionRepository.getRetrospectives(userId, limit, offset);
    
    return retros.map(r => ({
      id: r.id,
      commissionId: r.commission_id,
      commissionTitle: r.commission_title,
      commissionType: r.commission_type,
      content: r.content,
      moodAfter: r.mood_after,
      insight: r.insight,
      growthTags: r.growth_tags ? JSON.parse(r.growth_tags) : [],
      rating: r.rating,
      createdAt: r.created_at
    }));
  }

  getRetrospectiveByCommission(userId, commissionId) {
    const retro = wishCommissionRepository.getRetrospectiveByCommission(userId, commissionId);
    if (!retro) return null;
    
    return {
      id: retro.id,
      commissionId: retro.commission_id,
      content: retro.content,
      moodAfter: retro.mood_after,
      insight: retro.insight,
      growthTags: retro.growth_tags ? JSON.parse(retro.growth_tags) : [],
      rating: retro.rating,
      createdAt: retro.created_at
    };
  }

  getStats(userId) {
    const accepted = wishCommissionRepository.getUserCommissions(userId, { status: 'accepted' });
    const completed = wishCommissionRepository.getUserCommissions(userId, { status: 'completed' });
    const claimed = wishCommissionRepository.getUserCommissions(userId, { status: 'claimed' });
    const expired = wishCommissionRepository.getUserCommissions(userId, { status: 'expired' });
    const balance = wishCommissionRepository.getStarCoinBalance(userId);
    
    const retroCount = (() => {
      const db = require('../config/database');
      const stmt = db.prepare('SELECT COUNT(*) as count FROM commission_retrospectives WHERE user_id = ?');
      return stmt.get(userId).count || 0;
    })();
    
    const typeStats = (() => {
      const db = require('../config/database');
      const stmt = db.prepare(`
        SELECT commission_type as type, COUNT(*) as count
        FROM user_wish_commissions
        WHERE user_id = ? AND status IN ('completed', 'claimed')
        GROUP BY commission_type
      `);
      return stmt.all(userId);
    })();
    
    return {
      acceptedCount: accepted.length,
      completedCount: completed.length,
      claimedCount: claimed.length,
      expiredCount: expired.length,
      totalCompleted: completed.length + claimed.length,
      retroCount,
      starCoins: balance.star_coins || 0,
      totalEarned: balance.total_coins_earned || 0,
      typeStats
    };
  }

  handleMoodRecord(userId) {
    return this.updateAllCommissions(userId);
  }

  handleStoryRead(userId) {
    return this.updateAllCommissions(userId);
  }

  handleRetrospective(userId) {
    return this.updateAllCommissions(userId);
  }

  handleChapterNote(userId) {
    return this.updateAllCommissions(userId);
  }
}

module.exports = new WishCommissionService();
