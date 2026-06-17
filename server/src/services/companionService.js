const companionRepository = require('../repositories/companionRepository');
const moodRepository = require('../repositories/moodRepository');
const roomRepository = require('../repositories/roomRepository');
const achievementRepository = require('../repositories/achievementRepository');
const userRepository = require('../repositories/userRepository');
const taskRepository = require('../repositories/taskRepository');

class CompanionService {
  getCompanionList(userId) {
    const templates = companionRepository.findAllTemplates();
    const userCompanions = companionRepository.findUserCompanions(userId);
    const userStats = userRepository.getStats(userId);
    const moodStats = moodRepository.getStats(userId);
    const roomStats = roomRepository.getUnlockProgress(userId);
    const achievementStats = achievementRepository.getUserAchievements(userId);
    
    const unlockedCount = achievementStats.filter(a => a.is_unlocked).length;
    const multiSegmentDays = this.getMultiSegmentDays(userId);

    return templates.map(template => {
      const userCompanion = userCompanions.find(uc => uc.companion_template_id === template.id);
      const unlockCondition = template.unlock_condition ? JSON.parse(template.unlock_condition) : { type: 'default' };
      const unlockProgress = this.getUnlockProgress(unlockCondition, userStats, moodStats, roomStats, unlockedCount, multiSegmentDays);
      const isUnlocked = !!userCompanion || unlockProgress.progress >= 100;

      return {
        template: {
          id: template.id,
          name: template.name,
          avatar: template.avatar,
          personality: template.personality ? JSON.parse(template.personality) : null,
          appearance: template.appearance ? JSON.parse(template.appearance) : null,
          backgroundStory: template.background_story,
          traits: template.traits ? JSON.parse(template.traits) : null,
          baseStats: template.base_stats ? JSON.parse(template.base_stats) : null,
          isDefault: !!template.is_default
        },
        isUnlocked,
        unlockCondition,
        unlockProgress,
        companion: userCompanion ? this.formatCompanionData(userCompanion) : null
      };
    });
  }

  getUnlockProgress(condition, userStats, moodStats, roomStats, unlockedAchievements, multiSegmentDays) {
    let current = 0;
    let target = 1;
    let description = '';

    switch (condition.type) {
      case 'default':
        current = 1;
        target = 1;
        description = '默认解锁';
        break;
      case 'mood_record':
        current = userStats?.check_in_days || 0;
        target = condition.value || 7;
        description = `记录心情 ${target} 天`;
        break;
      case 'chapters_read':
        current = roomStats?.totalChaptersRead || 0;
        target = condition.value || 10;
        description = `阅读 ${target} 个故事章节`;
        break;
      case 'achievements':
        current = unlockedAchievements || 0;
        target = condition.value || 5;
        description = `解锁 ${target} 个成就`;
        break;
      case 'multi_segment_days':
        current = multiSegmentDays || 0;
        target = condition.value || 15;
        description = `多段记录 ${target} 天`;
        break;
      default:
        current = 0;
        target = 1;
        description = '未解锁';
    }

    return {
      current,
      target,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100,
      description
    };
  }

  getMultiSegmentDays(userId) {
    const stmt = moodRepository.db.prepare(`
      SELECT COUNT(DISTINCT record_date) as count
      FROM moods
      WHERE user_id = ? AND time_segment != 'day'
      GROUP BY record_date
      HAVING COUNT(*) >= 2
    `);
    const result = stmt.all(userId);
    return result.length;
  }

  getActiveCompanion(userId) {
    const companion = companionRepository.findActiveCompanion(userId);
    if (!companion) {
      const templates = companionRepository.findAllTemplates();
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        return this.unlockCompanion(userId, defaultTemplate.id);
      }
      return null;
    }
    return this.formatCompanionData(companion);
  }

  getCompanionDetail(userId, companionId) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) return null;

    const growthLogs = companionRepository.getGrowthLogs(userId, companionId, 20);
    const events = require('../repositories/companionEventRepository').getUserEvents(userId, companionId);
    const conversations = require('../repositories/companionConversationRepository').getConversationHistory(userId, companionId, 20);

    return {
      ...this.formatCompanionData(companion),
      growthLogs: growthLogs.map(log => ({
        ...log,
        actionDetail: log.action_detail,
        expChange: log.exp_change,
        intimacyChange: log.intimacy_change,
        sourceType: log.source_type,
        sourceId: log.source_id,
        createdAt: log.created_at
      })),
      events: events.map(event => ({
        ...event,
        choiceMade: event.choice_made ? JSON.parse(event.choice_made) : null,
        rewards: event.rewards ? JSON.parse(event.rewards) : null,
        completedAt: event.completed_at
      })),
      recentConversations: conversations,
      stats: {
        totalConversations: require('../repositories/companionConversationRepository').getTotalUserMessages(userId),
        totalEvents: events.length,
        daysTogether: this.getDaysTogether(companion.unlocked_at)
      }
    };
  }

  getDaysTogether(unlockDate) {
    if (!unlockDate) return 0;
    const start = new Date(unlockDate);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  unlockCompanion(userId, templateId, customName = null) {
    const existing = companionRepository.findUserCompanionByTemplate(userId, templateId);
    if (existing) {
      return {
        success: false,
        message: '你已经拥有这位旅伴了',
        companion: this.formatCompanionData(existing)
      };
    }

    const companion = companionRepository.createCompanion(userId, templateId, customName);
    if (!companion) {
      return {
        success: false,
        message: '解锁旅伴失败'
      };
    }

    companionRepository.addGrowthLog(
      userId,
      companion.id,
      'unlock',
      `解锁了旅伴 ${companion.name}`,
      50,
      15,
      'companion',
      templateId
    );

    const triggerService = require('./companionEventService');
    triggerService.checkAndTriggerEvents(userId, companion.id, 'first_companion', {});

    taskRepository.updateTaskProgress(userId, 'companion_daily', 1);
    taskRepository.updateTaskProgress(userId, 'companion_unlock', 1);

    return {
      success: true,
      message: `成功解锁旅伴 ${companion.name}！`,
      companion: this.formatCompanionData(companion)
    };
  }

  setActiveCompanion(userId, companionId) {
    const companion = companionRepository.setActiveCompanion(userId, companionId);
    if (!companion) {
      return {
        success: false,
        message: '切换旅伴失败'
      };
    }
    return {
      success: true,
      message: `已切换到 ${companion.name}`,
      companion: this.formatCompanionData(companion)
    };
  }

  addExperienceFromAction(userId, actionType, sourceId = null) {
    const companion = companionRepository.findActiveCompanion(userId);
    if (!companion) return null;

    let expGain = 0;
    let intimacyGain = 0;
    let actionDetail = '';

    switch (actionType) {
      case 'mood_record':
        expGain = 10;
        intimacyGain = 3;
        actionDetail = '记录了心情';
        break;
      case 'chapter_read':
        expGain = 15;
        intimacyGain = 5;
        actionDetail = '阅读了故事章节';
        break;
      case 'task_complete':
        expGain = 8;
        intimacyGain = 2;
        actionDetail = '完成了任务';
        break;
      case 'achievement_unlock':
        expGain = 25;
        intimacyGain = 8;
        actionDetail = '解锁了成就';
        break;
      case 'retrospective':
        expGain = 12;
        intimacyGain = 4;
        actionDetail = '写下了回顾';
        break;
      case 'chapter_note':
        expGain = 18;
        intimacyGain = 6;
        actionDetail = '写下了章节札记';
        break;
      default:
        expGain = 5;
        intimacyGain = 1;
        actionDetail = '进行了互动';
    }

    const result = companionRepository.updateCompanionStats(userId, companion.id, expGain, intimacyGain);
    
    companionRepository.addGrowthLog(
      userId,
      companion.id,
      actionType,
      actionDetail,
      expGain,
      intimacyGain,
      actionType,
      sourceId
    );

    if (result.leveledUp) {
      const eventService = require('./companionEventService');
      eventService.checkAndTriggerEvents(userId, companion.id, 'companion_level_up', { 
        newLevel: result.newLevel,
        oldLevel: result.oldLevel
      });
    }

    return {
      companion: this.formatCompanionData(result),
      expGain,
      intimacyGain,
      leveledUp: result.leveledUp,
      oldLevel: result.oldLevel,
      newLevel: result.newLevel
    };
  }

  formatCompanionData(companion) {
    if (!companion) return null;
    
    const expForNextLevel = companionRepository.getExpForNextLevel(companion.level);
    const expForCurrentLevel = companionRepository.getExpForNextLevel(companion.level - 1);
    const levelProgress = Math.round(((companion.experience || 0) / expForNextLevel) * 100);

    return {
      id: companion.id,
      templateId: companion.companion_template_id,
      name: companion.name,
      templateName: companion.template_name,
      avatar: companion.avatar,
      level: companion.level,
      experience: companion.experience || 0,
      expForNextLevel,
      expForCurrentLevel,
      levelProgress,
      intimacy: companion.intimacy || 0,
      intimacyLevel: this.getIntimacyLevel(companion.intimacy || 0),
      stats: companion.stats ? JSON.parse(companion.stats) : {},
      personality: companion.personality ? JSON.parse(companion.personality) : 
                   companion.template_personality ? JSON.parse(companion.template_personality) : null,
      appearance: companion.appearance ? JSON.parse(companion.appearance) : null,
      backgroundStory: companion.background_story,
      traits: companion.traits ? JSON.parse(companion.traits) : null,
      baseStats: companion.base_stats ? JSON.parse(companion.base_stats) : null,
      currentMood: companion.current_mood || 'neutral',
      isActive: !!companion.is_active,
      unlockedAt: companion.unlocked_at,
      lastInteractionAt: companion.last_interaction_at
    };
  }

  getIntimacyLevel(intimacy) {
    if (intimacy >= 100) return { level: 5, name: '灵魂伴侣', color: '#ec4899' };
    if (intimacy >= 70) return { level: 4, name: '知心好友', color: '#f97316' };
    if (intimacy >= 40) return { level: 3, name: '亲密伙伴', color: '#eab308' };
    if (intimacy >= 20) return { level: 2, name: '熟悉朋友', color: '#22c55e' };
    if (intimacy >= 5) return { level: 1, name: '初识同伴', color: '#60a5fa' };
    return { level: 0, name: '陌生人', color: '#9ca3af' };
  }

  checkUnlockConditions(userId) {
    const templates = companionRepository.findAllTemplates();
    const userCompanions = companionRepository.findUserCompanions(userId);
    const newlyUnlocked = [];

    templates.forEach(template => {
      const hasCompanion = userCompanions.some(uc => uc.companion_template_id === template.id);
      if (hasCompanion) return;

      const unlockCondition = template.unlock_condition ? JSON.parse(template.unlock_condition) : null;
      if (!unlockCondition || unlockCondition.type === 'default') return;

      const userStats = userRepository.getStats(userId);
      const moodStats = moodRepository.getStats(userId);
      const roomStats = roomRepository.getUnlockProgress(userId);
      const achievementStats = achievementRepository.getUserAchievements(userId);
      const unlockedCount = achievementStats.filter(a => a.is_unlocked).length;
      const multiSegmentDays = this.getMultiSegmentDays(userId);

      const progress = this.getUnlockProgress(unlockCondition, userStats, moodStats, roomStats, unlockedCount, multiSegmentDays);
      
      if (progress.progress >= 100) {
        newlyUnlocked.push({
          templateId: template.id,
          templateName: template.name,
          avatar: template.avatar
        });
      }
    });

    return newlyUnlocked;
  }
}

module.exports = new CompanionService();
