const healingMapRepository = require('../repositories/healingMapRepository');
const moodRepository = require('../repositories/moodRepository');
const roomRepository = require('../repositories/roomRepository');
const achievementRepository = require('../repositories/achievementRepository');
const userRepository = require('../repositories/userRepository');

class HealingMapService {
  getOverview(userId) {
    const userStats = userRepository.getStats(userId);
    const totalStages = healingMapRepository.getTotalStages();
    const completedStages = healingMapRepository.getCompletedStageCount(userId);
    const totalMilestones = healingMapRepository.getTotalMilestones();
    const unlockedMilestones = healingMapRepository.getUnlockedMilestoneCount(userId);
    
    const moodRecords = userStats.check_in_days || 0;
    const roomsUnlocked = userStats.unlocked_rooms || 0;
    const achievementsUnlocked = userStats.unlocked_achievements || 0;
    const chaptersRead = roomRepository.getTotalChaptersRead(userId);
    const multiSegmentDays = roomRepository.getMultiSegmentDays(userId);
    const moodTypes = moodRepository.getMoodTypes(userId).length;
    
    const currentProgress = this.calculateOverallProgress(userId);
    const currentStage = this.getCurrentStage(userId);
    const recentUnlocks = healingMapRepository.getRecentUnlocks(userId, 5);
    
    return {
      totalProgress: currentProgress,
      totalStages,
      completedStages,
      totalMilestones,
      unlockedMilestones,
      moodRecords,
      roomsUnlocked,
      achievementsUnlocked,
      chaptersRead,
      multiSegmentDays,
      moodTypes,
      currentStage: currentStage ? {
        id: currentStage.id,
        stageKey: currentStage.stageKey,
        name: currentStage.name,
        description: currentStage.description,
        color: currentStage.color,
        icon: currentStage.icon,
        sortOrder: currentStage.sortOrder,
        progress: currentStage.progress,
        isUnlocked: currentStage.isUnlocked,
        isCompleted: currentStage.isCompleted
      } : null,
      recentUnlocks: recentUnlocks.map(u => this.formatUnlock(u))
    };
  }

  getStages(userId) {
    const stages = healingMapRepository.getUserStages(userId);
    const userStats = this.getUserStats(userId);
    
    let firstUnlocked = false;
    
    return stages.map((stage, index) => {
      let isUnlocked = !!stage.is_unlocked;
      
      if (index === 0 && !isUnlocked) {
        healingMapRepository.unlockStage(userId, stage.id);
        isUnlocked = true;
      }
      
      const progressData = this.calculateStageProgress(stage, userStats);
      
      let status = 'locked';
      if (progressData.isCompleted) {
        status = 'completed';
      } else if (isUnlocked) {
        status = 'active';
      }
      
      return {
        ...this.formatStage(stage),
        progress: progressData.progress,
        requirements: progressData.requirements,
        isUnlocked,
        isCompleted: progressData.isCompleted,
        status,
        unlockedAt: stage.unlocked_at,
        completedAt: stage.completed_at,
        rewardClaimed: !!stage.reward_claimed,
        rewardClaimedAt: stage.reward_claimed_at
      };
    });
  }

  getStageDetail(userId, stageId) {
    const stage = healingMapRepository.getUserStage(userId, stageId);
    if (!stage) {
      throw new Error('阶段不存在');
    }
    
    const userStats = this.getUserStats(userId);
    const milestones = healingMapRepository.getMilestonesByStageId(stageId);
    const userMilestones = healingMapRepository.getUserMilestones(userId)
      .filter(m => m.stage_id === parseInt(stageId));
    
    const progressData = this.calculateStageProgress(stage, userStats);
    
    let isUnlocked = !!stage.is_unlocked;
    const allStages = healingMapRepository.getAllStages();
    const stageIndex = allStages.findIndex(s => s.id === parseInt(stageId));
    if (stageIndex === 0 && !isUnlocked) {
      healingMapRepository.unlockStage(userId, stageId);
      isUnlocked = true;
    }
    
    let status = 'locked';
    if (progressData.isCompleted) {
      status = 'completed';
    } else if (isUnlocked) {
      status = 'active';
    }
    
    const milestonesWithProgress = milestones.map(m => {
      const userM = userMilestones.find(um => um.id === m.id);
      const milestoneProgress = this.calculateMilestoneProgress(m, userStats);
      return {
        id: m.id,
        milestoneKey: m.milestone_key,
        name: m.name,
        description: m.description,
        icon: m.icon,
        requirementType: m.requirement_type,
        requirementValue: m.requirement_value,
        sortOrder: m.sort_order,
        isUnlocked: userM ? !!userM.is_unlocked : milestoneProgress.isCompleted,
        unlockedAt: userM ? userM.unlocked_at : null,
        currentProgress: milestoneProgress.current
      };
    });
    
    const linkedModules = this.getLinkedModules(stage);
    const keyEvents = this.getKeyEvents(userId, stage);
    
    return {
      ...this.formatStage(stage),
      progress: progressData.progress,
      requirements: progressData.requirements,
      isUnlocked,
      isCompleted: progressData.isCompleted,
      status,
      unlockedAt: stage.unlocked_at,
      completedAt: stage.completed_at,
      rewardClaimed: !!stage.reward_claimed,
      rewardClaimedAt: stage.reward_claimed_at,
      milestones: milestonesWithProgress,
      linkedModules,
      keyEvents
    };
  }

  getJourney(userId, limit = 50) {
    const events = [];
    
    const journeyEvents = healingMapRepository.getJourneyEvents(userId, limit);
    journeyEvents.forEach(e => {
      events.push({
        id: e.id,
        type: e.event_type,
        title: e.event_title,
        description: e.event_description,
        relatedModule: e.related_module,
        relatedId: e.related_id,
        date: e.event_date,
        createdAt: e.created_at
      });
    });
    
    const moodDates = moodRepository.getUniqueDates(userId);
    moodDates.slice(0, limit).forEach(d => {
      events.push({
        id: `mood_${d.record_date}`,
        type: 'mood_record',
        title: '心情记录',
        description: '记录了今天的心情',
        relatedModule: 'calendar',
        relatedId: d.record_date,
        date: d.record_date,
        createdAt: d.record_date
      });
    });
    
    const milestones = healingMapRepository.getUserMilestones(userId)
      .filter(m => m.is_unlocked);
    milestones.forEach(m => {
      events.push({
        id: `milestone_${m.id}`,
        type: 'milestone',
        title: m.name,
        description: m.description,
        relatedModule: 'milestone',
        relatedId: m.id,
        date: m.unlocked_at ? m.unlocked_at.split('T')[0] : null,
        createdAt: m.unlocked_at
      });
    });
    
    const rooms = roomRepository.findAll(userId)
      .filter(r => r.is_unlocked);
    rooms.forEach(r => {
      events.push({
        id: `room_${r.id}`,
        type: 'room_unlock',
        title: `解锁「${r.name}」`,
        description: r.description,
        relatedModule: 'room',
        relatedId: r.id,
        date: r.unlocked_at ? r.unlocked_at.split('T')[0] : null,
        createdAt: r.unlocked_at
      });
    });
    
    const achievements = achievementRepository.getUserAchievements(userId)
      .filter(a => a.is_unlocked);
    achievements.forEach(a => {
      events.push({
        id: `achievement_${a.id}`,
        type: 'achievement',
        title: a.name,
        description: a.description,
        relatedModule: 'achievement',
        relatedId: a.id,
        date: a.unlocked_at ? a.unlocked_at.split('T')[0] : null,
        createdAt: a.unlocked_at
      });
    });
    
    events.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB - dateA;
    });
    
    return events.slice(0, limit);
  }

  getMilestones(userId) {
    const stages = healingMapRepository.getAllStages();
    const allMilestones = healingMapRepository.getUserMilestones(userId);
    const userStats = this.getUserStats(userId);
    
    const stagesWithMilestones = stages.map(stage => {
      const stageMilestones = allMilestones.filter(m => m.stage_id === stage.id);
      
      const formattedMilestones = stageMilestones.map(m => {
        const progress = this.calculateMilestoneProgress(m, userStats);
        return {
          id: m.id,
          milestoneKey: m.milestone_key,
          name: m.name,
          description: m.description,
          icon: m.icon,
          requirementType: m.requirement_type,
          requirementValue: m.requirement_value,
          sortOrder: m.sort_order,
          isUnlocked: !!m.is_unlocked || progress.isCompleted,
          unlockedAt: m.unlocked_at,
          currentProgress: progress.current
        };
      });
      
      return {
        id: stage.id,
        stageKey: stage.stage_key,
        name: stage.name,
        color: stage.color,
        icon: stage.icon,
        milestones: formattedMilestones
      };
    });
    
    return {
      stages: stagesWithMilestones,
      totalCount: allMilestones.length,
      unlockedCount: allMilestones.filter(m => m.is_unlocked).length
    };
  }

  getUnlocks(userId) {
    const recentUnlocks = healingMapRepository.getRecentUnlocks(userId, 20);
    
    const milestones = recentUnlocks
      .filter(u => u.unlock_type === 'milestone')
      .map(u => this.formatUnlock(u));
    
    const stages = recentUnlocks
      .filter(u => u.unlock_type === 'stage')
      .map(u => this.formatUnlock(u));
    
    const achievements = achievementRepository.getUserAchievements(userId)
      .filter(a => a.is_unlocked)
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        type: 'achievement',
        unlockedAt: a.unlocked_at
      }));
    
    const rooms = roomRepository.findAll(userId)
      .filter(r => r.is_unlocked)
      .map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: 'door-open',
        type: 'room',
        unlockedAt: r.unlocked_at
      }));
    
    return {
      milestones,
      stages,
      achievements,
      rooms
    };
  }

  claimStageReward(userId, stageId) {
    const result = healingMapRepository.claimStageReward(userId, stageId);
    return result;
  }

  updateProgress(userId, eventType, amount = 1) {
    const newlyUnlocked = [];
    
    const userStats = this.getUserStats(userId);
    const milestones = healingMapRepository.getAllMilestones();
    
    milestones.forEach(milestone => {
      const progress = this.calculateMilestoneProgress(milestone, userStats);
      
      if (progress.isCompleted) {
        const userMilestone = healingMapRepository.getUserMilestoneByMilestoneId(userId, milestone.id);
        if (!userMilestone || !userMilestone.is_unlocked) {
          healingMapRepository.updateUserMilestoneProgress(userId, milestone.id, progress.current);
          
          newlyUnlocked.push({
            type: 'milestone',
            milestone: {
              id: milestone.id,
              name: milestone.name,
              description: milestone.description
            }
          });
          
          healingMapRepository.addJourneyEvent(
            userId,
            'milestone',
            `达成里程碑：${milestone.name}`,
            milestone.description,
            'milestone',
            milestone.id
          );
        }
      } else {
        healingMapRepository.updateUserMilestoneProgress(userId, milestone.id, progress.current);
      }
    });
    
    const stages = healingMapRepository.getAllStages();
    stages.forEach(stage => {
      const progressData = this.calculateStageProgress(stage, userStats);
      healingMapRepository.updateUserStageProgress(userId, stage.id, progressData.progress);
      
      if (progressData.isCompleted) {
        const userStage = healingMapRepository.getUserStage(userId, stage.id);
        if (userStage && !userStage.is_completed) {
          newlyUnlocked.push({
            type: 'stage',
            stage: {
              id: stage.id,
              name: stage.name,
              description: stage.description
            }
          });
          
          healingMapRepository.addJourneyEvent(
            userId,
            'stage_complete',
            `完成阶段：${stage.name}`,
            stage.description,
            'stage',
            stage.id
          );
        }
      }
    });
    
    const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
    let prevCompleted = true;
    sortedStages.forEach((stage, index) => {
      if (index === 0) {
        const userStage = healingMapRepository.getUserStage(userId, stage.id);
        if (!userStage || !userStage.is_unlocked) {
          healingMapRepository.unlockStage(userId, stage.id);
        }
      } else if (prevCompleted) {
        const userStage = healingMapRepository.getUserStage(userId, stage.id);
        if (!userStage || !userStage.is_unlocked) {
          healingMapRepository.unlockStage(userId, stage.id);
          
          healingMapRepository.addJourneyEvent(
            userId,
            'stage_unlock',
            `解锁新阶段：${stage.name}`,
            stage.description,
            'stage',
            stage.id
          );
        }
      }
      
      const userStage = healingMapRepository.getUserStage(userId, stage.id);
      prevCompleted = userStage && userStage.is_completed;
    });
    
    return {
      newlyUnlocked,
      updatedStats: userStats
    };
  }

  getUserStats(userId) {
    const userStats = userRepository.getStats(userId);
    const moodRecords = userStats.check_in_days || 0;
    const roomsUnlocked = userStats.unlocked_rooms || 0;
    const achievementsUnlocked = userStats.unlocked_achievements || 0;
    const chaptersRead = roomRepository.getTotalChaptersRead(userId);
    const multiSegmentDays = roomRepository.getMultiSegmentDays(userId);
    const moodTypes = moodRepository.getMoodTypes(userId).length;
    
    return {
      moodRecords,
      roomsUnlocked,
      achievementsUnlocked,
      chaptersRead,
      multiSegmentDays,
      moodTypes
    };
  }

  calculateOverallProgress(userId) {
    const stages = this.getStages(userId);
    if (stages.length === 0) return 0;
    
    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round((totalProgress / stages.length) * 100) / 100;
  }

  getCurrentStage(userId) {
    const stages = this.getStages(userId);
    return stages.find(s => !s.isCompleted && s.isUnlocked) || stages[stages.length - 1];
  }

  calculateStageProgress(stage, userStats) {
    let requirements = {};
    if (stage.requirements) {
      if (typeof stage.requirements === 'string') {
        try {
          requirements = JSON.parse(stage.requirements);
        } catch (e) {
          requirements = {};
        }
      } else {
        requirements = stage.requirements;
      }
    }
    
    const reqList = [];
    let totalWeight = 0;
    let weightedProgress = 0;
    
    Object.entries(requirements).forEach(([type, target]) => {
      const current = this.getRequirementValue(type, userStats);
      const progress = Math.min(100, target > 0 ? (current / target) * 100 : 0);
      const weight = 1;
      
      reqList.push({
        type,
        name: this.getRequirementName(type),
        current,
        target,
        progress: Math.round(progress * 10) / 10
      });
      
      totalWeight += weight;
      weightedProgress += progress * weight;
    });
    
    const finalProgress = totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 10) / 10 : 0;
    const isCompleted = finalProgress >= 100;
    
    return {
      progress: finalProgress,
      isCompleted,
      requirements: reqList
    };
  }

  calculateMilestoneProgress(milestone, userStats) {
    const current = this.getRequirementValue(milestone.requirement_type, userStats);
    const target = milestone.requirement_value;
    const isCompleted = current >= target;
    
    return {
      current,
      target,
      isCompleted,
      progress: target > 0 ? Math.min(100, (current / target) * 100) : 0
    };
  }

  getRequirementValue(type, userStats) {
    switch (type) {
      case 'mood_records':
        return userStats.moodRecords;
      case 'mood_types':
        return userStats.moodTypes;
      case 'rooms_unlocked':
        return userStats.roomsUnlocked;
      case 'chapters_read':
        return userStats.chaptersRead;
      case 'achievements_unlocked':
        return userStats.achievementsUnlocked;
      case 'multi_segment_days':
        return userStats.multiSegmentDays;
      default:
        return 0;
    }
  }

  getRequirementName(type) {
    const names = {
      'mood_records': '心情记录天数',
      'mood_types': '体验情绪种类',
      'rooms_unlocked': '解锁房间数',
      'chapters_read': '阅读章节数',
      'achievements_unlocked': '解锁成就数',
      'multi_segment_days': '多段记录天数'
    };
    return names[type] || type;
  }

  formatStage(stage) {
    let rewards = null;
    if (stage.rewards) {
      if (typeof stage.rewards === 'string') {
        try {
          rewards = JSON.parse(stage.rewards);
        } catch (e) {
          rewards = null;
        }
      } else {
        rewards = stage.rewards;
      }
    }
    
    return {
      id: stage.id,
      stageKey: stage.stage_key,
      name: stage.name,
      description: stage.description,
      color: stage.color,
      icon: stage.icon,
      sortOrder: stage.sort_order,
      rewards
    };
  }

  formatUnlock(unlock) {
    return {
      id: unlock.id,
      key: unlock.milestone_key,
      name: unlock.name,
      description: unlock.description,
      icon: unlock.icon,
      type: unlock.unlock_type || 'milestone',
      stageId: unlock.stage_id,
      stageKey: unlock.stage_key,
      stageName: unlock.stage_name,
      stageColor: unlock.stage_color,
      unlockedAt: unlock.unlocked_at
    };
  }

  getLinkedModules(stage) {
    const modules = [];
    
    const stageKey = stage.stage_key;
    
    modules.push({
      key: 'calendar',
      name: '心情日历',
      description: '记录心情，觉察情绪变化',
      icon: 'calendar',
      route: '/calendar'
    });
    
    if (['exploration', 'understanding', 'acceptance', 'integration', 'transcendence'].includes(stageKey)) {
      modules.push({
        key: 'rooms',
        name: '剧情房间',
        description: '在故事中探索内心世界',
        icon: 'door-open',
        route: '/rooms'
      });
    }
    
    if (['understanding', 'acceptance', 'integration', 'transcendence'].includes(stageKey)) {
      modules.push({
        key: 'achievements',
        name: '任务成就',
        description: '完成任务，解锁成就',
        icon: 'trophy',
        route: '/achievements'
      });
    }
    
    modules.push({
      key: 'profile',
      name: '个人中心',
      description: '查看成长数据和个人资料',
      icon: 'user',
      route: '/profile'
    });
    
    return modules;
  }

  getKeyEvents(userId, stage) {
    const events = [];
    
    const milestones = healingMapRepository.getMilestonesByStageId(stage.id);
    const userMilestones = healingMapRepository.getUserMilestones(userId)
      .filter(m => m.stage_id === stage.id && m.is_unlocked);
    
    userMilestones.forEach(m => {
      events.push({
        id: `milestone_${m.id}`,
        type: 'milestone',
        title: m.name,
        description: m.description,
        date: m.unlocked_at ? m.unlocked_at.split('T')[0] : null,
        icon: 'trophy'
      });
    });
    
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return events.slice(0, 5);
  }
}

module.exports = new HealingMapService();
