const retrospectiveRepository = require('../repositories/retrospectiveRepository');
const moodRepository = require('../repositories/moodRepository');
const achievementRepository = require('../repositories/achievementRepository');
const achievementService = require('./achievementService');

const VALID_RETROSPECT_TYPES = ['feeling', 'insight', 'gratitude', 'lesson', 'other'];
const VALID_MOOD_TYPES = ['happy', 'calm', 'sad', 'anxious', 'angry'];

class RetrospectiveService {
  createRetrospective(userId, data) {
    const { moodId, recordDate, timeSegment, retrospectType = 'feeling', content, moodShift, tags = [] } = data;

    if (!content || content.trim() === '') {
      throw new Error('回顾内容不能为空');
    }

    if (!retrospectType || !VALID_RETROSPECT_TYPES.includes(retrospectType)) {
      throw new Error('无效的回顾类型');
    }

    if (!recordDate) {
      throw new Error('记录日期不能为空');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(recordDate)) {
      throw new Error('日期格式不正确，请使用 YYYY-MM-DD 格式');
    }

    if (moodShift && !VALID_MOOD_TYPES.includes(moodShift)) {
      throw new Error('无效的心情转变类型');
    }

    if (moodId) {
      const mood = moodRepository.findByDateAndSegment(userId, recordDate, timeSegment);
      if (!mood) {
        throw new Error('对应的心情记录不存在');
      }
    }

    const retrospective = retrospectiveRepository.create(
      userId,
      moodId,
      recordDate,
      timeSegment,
      retrospectType,
      content.trim(),
      moodShift,
      tags
    );

    const taskUpdates = [];

    const retroRecordResult = achievementService.updateTaskProgress(userId, 'retrospective_record', 1);
    taskUpdates.push(...retroRecordResult.newlyCompleted);

    const todayCount = retrospectiveRepository.getCountByDate(userId, this.getTodayStr());
    if (todayCount >= 3) {
      const deepRetroResult = achievementService.updateTaskProgress(userId, 'retrospective_deep', 1);
      taskUpdates.push(...deepRetroResult.newlyCompleted);
    }

    const totalCount = retrospectiveRepository.getTotalCount(userId);

    const newlyUnlockedAchievements = achievementRepository.checkAndUnlock(
      userId,
      'retrospective_count',
      totalCount
    );

    const monthData = this.getMonthRetrospectives(userId, new Date().getFullYear(), new Date().getMonth() + 1);

    return {
      retrospective,
      newlyCompletedTasks: taskUpdates,
      newlyUnlockedAchievements,
      stats: monthData.stats,
      dateRetrospectives: retrospectiveRepository.findByDate(userId, recordDate)
    };
  }

  getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  getRetrospectivesByDate(userId, date) {
    if (!date) {
      throw new Error('日期不能为空');
    }

    const retrospectives = retrospectiveRepository.findByDate(userId, date);
    const count = retrospectiveRepository.getCountByDate(userId, date);

    return {
      retrospectives,
      count
    };
  }

  getMonthRetrospectives(userId, year, month) {
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

    const retrospectives = retrospectiveRepository.findByMonth(userId, year, month);
    const dateMap = retrospectiveRepository.getDateMapByMonth(userId, year, month);
    const stats = retrospectiveRepository.getStats(userId, year, month);

    return {
      retrospectives,
      dateMap: Object.fromEntries(dateMap),
      stats
    };
  }

  deleteRetrospective(userId, id) {
    if (!id) {
      throw new Error('回顾ID不能为空');
    }

    const result = retrospectiveRepository.delete(userId, id);
    if (!result) {
      throw new Error('删除失败，回顾不存在或无权限');
    }

    return { success: true };
  }

  getConfig() {
    return {
      validTypes: VALID_RETROSPECT_TYPES,
      typeLabels: {
        feeling: '感受补写',
        insight: '新的感悟',
        gratitude: '感恩反思',
        lesson: '经验教训',
        other: '其他回顾'
      },
      validMoodTypes: VALID_MOOD_TYPES
    };
  }
}

module.exports = new RetrospectiveService();
