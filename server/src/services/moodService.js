const moodRepository = require('../repositories/moodRepository');
const userRepository = require('../repositories/userRepository');
const roomRepository = require('../repositories/roomRepository');
const achievementRepository = require('../repositories/achievementRepository');
const achievementService = require('./achievementService');
const roomService = require('./roomService');
const wishCommissionService = require('./wishCommissionService');
const notificationEvents = require('../utils/notificationEvents');
const crisisCenterService = require('./crisisCenterService');
const healingMapService = require('./healingMapService');

const VALID_MOOD_TYPES = ['happy', 'calm', 'sad', 'anxious', 'angry'];
const VALID_SEGMENTS = ['morning', 'afternoon', 'evening', 'day'];

class MoodService {
  createMood(userId, date, timeSegment, moodType, content = '', tags = [], tagWeights = {}) {
    if (!date) {
      const today = new Date();
      date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    if (!timeSegment) {
      timeSegment = this.detectTimeSegment();
    }
    
    if (!VALID_SEGMENTS.includes(timeSegment)) {
      throw new Error('无效的时段，必须是 morning、afternoon、evening 或 day');
    }
    
    if (!VALID_MOOD_TYPES.includes(moodType)) {
      throw new Error('无效的心情类型');
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('日期格式不正确，请使用 YYYY-MM-DD 格式');
    }
    
    const backfillCheck = moodRepository.canBackfill(userId, date);
    if (!backfillCheck.allowed) {
      throw new Error(backfillCheck.reason);
    }

    if (tagWeights && typeof tagWeights === 'object') {
      for (const tag in tagWeights) {
        const weight = tagWeights[tag];
        if (typeof weight !== 'number' || weight < 1 || weight > 5) {
          throw new Error(`标签 "${tag}" 的权重必须在 1-5 之间`);
        }
      }
    }
    
    const prevStreakDays = moodRepository.getStreakDays(userId);
    
    const mood = moodRepository.create(userId, date, timeSegment, moodType, content, tags, tagWeights);
    
    userRepository.updateStats(userId);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const daySegments = moodRepository.findByDate(userId, date);
    const segmentCount = daySegments.length;
    
    let totalContentLength = 0;
    let totalTagWeight = 0;
    daySegments.forEach(seg => {
      if (seg.content) totalContentLength += seg.content.length;
      if (seg.tag_weights) {
        totalTagWeight += Object.values(seg.tag_weights).reduce((a, b) => a + b, 0);
      }
    });
    
    const mainSegments = daySegments.filter(s => ['morning', 'afternoon', 'evening'].includes(s.time_segment));
    const streakDays = moodRepository.getStreakDays(userId);
    const moodTypes = moodRepository.getMoodTypes(userId);
    const multiSegmentDays = moodRepository.getMultiSegmentDaysCount(userId);
    
    const taskUpdates = [];
    
    const moodRecordResult = achievementService.updateTaskProgress(userId, 'mood_record', 1);
    taskUpdates.push(...moodRecordResult.newlyCompleted);
    
    if (totalContentLength >= 50) {
      const contentResult = achievementService.updateTaskProgress(userId, 'mood_content', 1);
      taskUpdates.push(...contentResult.newlyCompleted);
    }
    
    if (mainSegments.length >= 3) {
      const multiSegResult = achievementService.updateTaskProgress(userId, 'mood_multi_segment', 1);
      taskUpdates.push(...multiSegResult.newlyCompleted);
    }
    
    if (totalTagWeight >= 10) {
      const tagWeightResult = achievementService.updateTaskProgress(userId, 'mood_tag_weight', 1);
      taskUpdates.push(...tagWeightResult.newlyCompleted);
    }
    
    if (moodTypes.length >= 5) {
      const varietyResult = achievementService.updateTaskProgress(userId, 'mood_variety', 1);
      taskUpdates.push(...varietyResult.newlyCompleted);
    }
    
    const newlyUnlockedAchievements = [];
    
    const userStats = userRepository.getStats(userId);
    
    newlyUnlockedAchievements.push(
      ...achievementRepository.checkAndUnlock(userId, 'total_moods', userStats.total_moods),
      ...achievementRepository.checkAndUnlock(userId, 'check_in_streak', streakDays),
      ...achievementRepository.checkAndUnlock(userId, 'morning_records', moodRepository.getSegmentCount(userId, 'morning')),
      ...achievementRepository.checkAndUnlock(userId, 'afternoon_records', moodRepository.getSegmentCount(userId, 'afternoon')),
      ...achievementRepository.checkAndUnlock(userId, 'evening_records', moodRepository.getSegmentCount(userId, 'evening')),
      ...achievementRepository.checkAndUnlock(userId, 'multi_segment_streak', moodRepository.getMultiSegmentStreak(userId)),
      ...achievementRepository.checkAndUnlock(userId, 'tag_weight_count', moodRepository.getTotalTagWeightCount(userId))
    );
    
    const unlockedRooms = this.checkRoomUnlocks(userId, streakDays, multiSegmentDays);
    
    const allAchievements = achievementRepository.getUserAchievements(userId);
    const unlockedCount = allAchievements.filter(a => a.is_unlocked).length;
    const totalCount = achievementRepository.getTotalCount();
    
    if (unlockedCount >= totalCount - 1) {
      newlyUnlockedAchievements.push(
        ...achievementRepository.checkAndUnlock(userId, 'all_achievements', 1)
      );
    }

    const recordDate = new Date(date);
    
    const result = {
      mood,
      dayAggregate: moodRepository.getDayAggregate(userId, date),
      newlyUnlockedAchievements: newlyUnlockedAchievements.filter(a => a),
      newlyUnlockedRooms: unlockedRooms,
      newlyCompletedTasks: taskUpdates,
      stats: moodRepository.getStats(userId, recordDate.getFullYear(), recordDate.getMonth() + 1)
    };
    
    result.notificationEvents = notificationEvents.createBatchEventsFromMoodResult(result);
    
    if (streakDays > prevStreakDays && streakDays >= 2) {
      result.notificationEvents.push(notificationEvents.createStreakContinuedEvent(streakDays));
    }
    
    try {
      wishCommissionService.updateAllCommissions(userId);
    } catch (e) {
      console.error('更新心愿委托进度失败:', e);
    }

    try {
      const crisisNotification = crisisCenterService.getCrisisNotification(userId);
      if (crisisNotification) {
        result.notificationEvents.push(crisisNotification);
      }
      result.crisisAnalysis = crisisCenterService.getFullAnalysis(userId);
    } catch (e) {
      console.error('生成危机预警分析失败:', e);
    }

    try {
      const healingMapUpdate = healingMapService.updateProgress(userId, 'mood_record', 1);
      if (healingMapUpdate.newlyUnlocked && healingMapUpdate.newlyUnlocked.length > 0) {
        result.healingMapUnlocks = healingMapUpdate.newlyUnlocked;
      }
    } catch (e) {
      console.error('更新疗愈地图进度失败:', e);
    }

    return result;
  }

  checkStreakStatus(userId) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const todayMoods = moodRepository.findByDate(userId, todayStr);
    const yesterdayMoods = moodRepository.findByDate(userId, yesterdayStr);
    
    const currentStreak = moodRepository.getStreakDays(userId);
    const hasTodayRecord = todayMoods.length > 0;
    const hasYesterdayRecord = yesterdayMoods.length > 0;
    
    const events = [];
    
    if (!hasTodayRecord && !hasYesterdayRecord && currentStreak > 0) {
      const lastRecordDate = moodRepository.getLastRecordDate(userId);
      events.push(notificationEvents.createStreakBrokenEvent(currentStreak, lastRecordDate));
    }
    
    return {
      currentStreak,
      hasTodayRecord,
      hasYesterdayRecord,
      isBroken: !hasTodayRecord && !hasYesterdayRecord && currentStreak > 0,
      notificationEvents: events
    };
  }

  detectTimeSegment() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'day';
  }

  checkRoomUnlocks(userId, streakDays, multiSegmentDays) {
    const rooms = roomRepository.findAll(userId);
    const newlyUnlocked = [];
    
    for (const room of rooms) {
      if (!room.is_unlocked) {
        const checkResult = roomService.checkRoomUnlockConditions(userId, room);
        
        if (checkResult.canUnlock) {
          const result = roomRepository.unlockRoom(userId, room.id);
          if (result.success) {
            roomRepository.ensureBranchProgress(userId, room.id, 'main');
            roomRepository.setActiveBranch(userId, room.id, 'main');
            newlyUnlocked.push(room);
          }
        }
      }
    }
    
    if (newlyUnlocked.length > 0) {
      achievementRepository.checkAndUnlock(userId, 'rooms_unlocked', roomRepository.getUnlockedCount(userId));
    }
    
    return newlyUnlocked;
  }

  getMoodByDate(userId, date) {
    const segments = moodRepository.findByDate(userId, date);
    const aggregate = moodRepository.getDayAggregate(userId, date);
    return {
      segments,
      aggregate
    };
  }

  getMoodsByMonth(userId, year, month) {
    if (!year || !month) {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }
    
    year = parseInt(year);
    month = parseInt(month);
    
    if (month < 1 || month > 12) {
      throw new Error('月份必须在 1-12 之间');
    }
    
    const records = moodRepository.findByMonth(userId, year, month);
    const aggregates = moodRepository.getMonthAggregates(userId, year, month);
    const stats = moodRepository.getStats(userId, year, month);
    
    return {
      records,
      aggregates,
      stats
    };
  }

  deleteMood(userId, date, timeSegment = null) {
    const result = moodRepository.delete(userId, date, timeSegment);
    if (result) {
      userRepository.updateStats(userId);
    }
    return result;
  }

  getConfig() {
    return {
      validSegments: VALID_SEGMENTS,
      validMoodTypes: VALID_MOOD_TYPES,
      backfillDays: moodRepository.getBackfillDays(),
      segmentLabels: {
        morning: '早晨',
        afternoon: '下午',
        evening: '晚间',
        day: '全天'
      }
    };
  }
}

module.exports = new MoodService();
