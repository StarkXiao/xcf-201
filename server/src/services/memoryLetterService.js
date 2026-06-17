const memoryLetterRepository = require('../repositories/memoryLetterRepository');
const moodRepository = require('../repositories/moodRepository');
const roomRepository = require('../repositories/roomRepository');
const retrospectiveRepository = require('../repositories/retrospectiveRepository');
const prescriptionRepository = require('../repositories/emotionPrescriptionRepository');
const userRepository = require('../repositories/userRepository');
const achievementRepository = require('../repositories/achievementRepository');
const achievementService = require('./achievementService');
const notificationService = require('./notificationService');
const notificationEvents = require('../utils/notificationEvents');

const MIN_DELIVERY_DAYS = 1;
const MAX_DELIVERY_DAYS = 365;

class MemoryLetterService {
  createLetter(userId, data) {
    const {
      title,
      letterContent,
      sourceDate,
      deliveryDate,
      includeMood = true,
      includeRoom = true,
      includeGrowth = true,
      archiveId = null
    } = data;

    if (!title || title.trim().length === 0) {
      throw new Error('信件标题不能为空');
    }

    if (!letterContent || letterContent.trim().length === 0) {
      throw new Error('信件内容不能为空');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!sourceDate || !dateRegex.test(sourceDate)) {
      throw new Error('来源日期格式不正确');
    }

    if (!deliveryDate || !dateRegex.test(deliveryDate)) {
      throw new Error('投递日期格式不正确');
    }

    const source = this.parseDate(sourceDate);
    const delivery = this.parseDate(deliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (source > today) {
      throw new Error('来源日期不能是未来日期');
    }

    const diffTime = delivery.getTime() - source.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < MIN_DELIVERY_DAYS) {
      throw new Error(`投递日期必须至少在来源日期后 ${MIN_DELIVERY_DAYS} 天`);
    }

    if (diffDays > MAX_DELIVERY_DAYS) {
      throw new Error(`投递日期不能超过来源日期后 ${MAX_DELIVERY_DAYS} 天`);
    }

    let moodSnapshot = null;
    let roomSnapshot = null;
    let growthSnapshot = null;

    if (includeMood) {
      moodSnapshot = this.getMoodSnapshot(userId, sourceDate);
    }

    if (includeRoom) {
      roomSnapshot = this.getRoomSnapshot(userId, sourceDate);
    }

    if (includeGrowth) {
      growthSnapshot = this.getGrowthSnapshot(userId, sourceDate, { archiveId });
    }

    const letter = memoryLetterRepository.create(userId, {
      title: title.trim(),
      letterContent: letterContent.trim(),
      sourceDate,
      deliveryDate,
      moodSnapshot,
      roomSnapshot,
      growthSnapshot
    });

    const taskUpdates = [];
    try {
      const letterResult = achievementService.updateTaskProgress(userId, 'memory_letter', 1);
      taskUpdates.push(...letterResult.newlyCompleted);
    } catch (e) {
      console.error('更新任务进度失败:', e);
    }

    const stats = memoryLetterRepository.getStats(userId);
    const newlyUnlockedAchievements = [];
    try {
      const achievements = achievementRepository.checkAndUnlock(
        userId,
        'memory_letters_total',
        stats.total
      );
      newlyUnlockedAchievements.push(...achievements);
    } catch (e) {
      console.error('检查成就解锁失败:', e);
    }

    const notificationEventsList = [];
    const letterCreatedEvent = notificationEvents.createMemoryLetterCreatedEvent(letter);
    notificationEventsList.push(letterCreatedEvent);

    try {
      notificationService.createMemoryLetterCreatedNotification(userId, letter);
    } catch (e) {
      console.error('持久化信件创建通知失败:', e);
    }

    if (newlyUnlockedAchievements && newlyUnlockedAchievements.length > 0) {
      newlyUnlockedAchievements.forEach(achievement => {
        notificationEventsList.push(
          notificationEvents.createAchievementUnlockedEvent(achievement)
        );
      });
    }

    if (taskUpdates.length > 0) {
      taskUpdates.forEach(task => {
        notificationEventsList.push(
          notificationEvents.createTaskCompletedEvent(task)
        );
      });
    }

    return {
      letter,
      stats,
      notificationEvents: notificationEventsList,
      newlyUnlockedAchievements,
      newlyCompletedTasks: taskUpdates
    };
  }

  getLetterDetail(userId, id) {
    const letter = memoryLetterRepository.findById(userId, id);
    if (!letter) {
      throw new Error('信件不存在');
    }

    if (letter.status === 'pending') {
      return {
        ...letter,
        letterContent: null,
        moodSnapshot: null,
        roomSnapshot: null,
        growthSnapshot: null,
        locked: true
      };
    }

    return letter;
  }

  getLetters(userId, params = {}) {
    const { status, page = 1, pageSize = 10 } = params;

    const offset = (page - 1) * pageSize;
    const letters = memoryLetterRepository.findAll(userId, {
      status,
      limit: pageSize,
      offset
    });

    const totalCount = this.getTotalCount(userId, status);

    return {
      letters,
      totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }

  getTotalCount(userId, status = null) {
    const stats = memoryLetterRepository.getStats(userId);
    if (status === 'pending') return stats.pending;
    if (status === 'delivered') return stats.delivered;
    if (status === 'read') return stats.read;
    return stats.total;
  }

  getStats(userId) {
    return memoryLetterRepository.getStats(userId);
  }

  getUpcomingDeliveries(userId, limit = 5) {
    return memoryLetterRepository.getUpcomingDeliveries(userId, limit);
  }

  getMoodSnapshot(userId, date) {
    const dayAggregate = moodRepository.getDayAggregate(userId, date);
    if (!dayAggregate) return null;

    return {
      date,
      dominantMood: dayAggregate.dominantMood,
      averageScore: dayAggregate.averageScore,
      segmentCount: dayAggregate.segmentCount,
      moodTypes: dayAggregate.moodTypes,
      tags: dayAggregate.tags || [],
      segments: dayAggregate.segments.map(s => ({
        timeSegment: s.time_segment,
        moodType: s.mood_type,
        content: s.content,
        tags: s.tags
      }))
    };
  }

  getRoomSnapshot(userId, date) {
    const userRooms = roomRepository.findAll(userId);
    const unlockedRooms = userRooms.filter(r => r.is_unlocked);

    const dateObj = this.parseDate(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const chaptersReadToday = [];
    for (const room of unlockedRooms) {
      const history = roomRepository.getStoryHistory(userId, room.id);
      const todayHistory = history.filter(h => {
        const readAt = new Date(h.read_at);
        return readAt >= startOfDay && readAt <= endOfDay;
      });
      if (todayHistory.length > 0) {
        chaptersReadToday.push({
          roomId: room.id,
          roomName: room.name,
          chapters: todayHistory.map(h => ({
            storyId: h.story_id,
            chapterNumber: h.chapter_number,
            title: h.title,
            branchKey: h.branch_key
          }))
        });
      }
    }

    return {
      date,
      totalUnlockedRooms: unlockedRooms.length,
      chaptersReadToday,
      totalChaptersRead: chaptersReadToday.reduce(
        (sum, r) => sum + r.chapters.length, 0
      )
    };
  }

  getGrowthSnapshot(userId, date, options = {}) {
    const archive = options.archiveId
      ? prescriptionRepository.findArchiveById(options.archiveId)
      : prescriptionRepository.findArchiveByDate(userId, date);

    const retrospectives = retrospectiveRepository.findByDate(userId, date);
    const userStats = userRepository.getStats(userId);

    let stageArchive = null;
    if (archive && archive.userId === userId) {
      stageArchive = {
        id: archive.id,
        archiveType: archive.archiveType,
        periodLabel: archive.periodLabel,
        startDate: archive.startDate,
        endDate: archive.endDate,
        title: archive.title,
        moodSummary: archive.moodSummary,
        roomJourney: archive.roomJourney,
        taskAccomplishments: archive.taskAccomplishments,
        growthInsights: archive.growthInsights,
        totalMoodRecords: archive.totalMoodRecords,
        totalChaptersRead: archive.totalChaptersRead,
        totalTasksCompleted: archive.totalTasksCompleted,
        avgMoodScore: archive.avgMoodScore
      };
    }

    return {
      date,
      stageArchive,
      retrospectives: retrospectives.map(r => ({
        id: r.id,
        type: r.retrospect_type,
        content: r.content,
        moodShift: r.mood_shift,
        tags: r.tags
      })),
      retrospectiveCount: retrospectives.length,
      statsAtTime: {
        totalMoods: userStats.total_moods,
        checkInDays: userStats.check_in_days
      }
    };
  }

  getAvailableArchivesForDate(userId, date) {
    return prescriptionRepository.findAllArchivesByDate(userId, date);
  }

  checkAndDeliverLetters(userId) {
    const today = this.getTodayString();
    const pendingLetters = userId
      ? memoryLetterRepository.findAll(userId, { status: 'pending' })
      : memoryLetterRepository.getPendingByDate(today);

    const deliveredToday = [];
    const notificationEventsList = [];

    for (const letter of pendingLetters) {
      if (letter.deliveryDate <= today) {
        const letterUserId = letter.userId || userId;
        const success = memoryLetterRepository.deliverLetter(letterUserId, letter.id);
        if (success) {
          const deliveredLetter = memoryLetterRepository.findById(letterUserId, letter.id);
          deliveredToday.push(deliveredLetter);
          const deliveredEvent = notificationEvents.createMemoryLetterDeliveredEvent(deliveredLetter);
          notificationEventsList.push(deliveredEvent);

          try {
            notificationService.createMemoryLetterDeliveredNotification(letterUserId, deliveredLetter);
          } catch (e) {
            console.error('持久化信件投递通知失败:', e);
          }
        }
      }
    }

    const deliveredByUser = {};
    for (const letter of deliveredToday) {
      const uid = letter.userId || userId;
      if (!deliveredByUser[uid]) {
        deliveredByUser[uid] = [];
      }
      deliveredByUser[uid].push(letter);
    }

    return {
      deliveredCount: deliveredToday.length,
      deliveredLetters: deliveredToday,
      deliveredByUser,
      notificationEvents: notificationEventsList
    };
  }

  markAsRead(userId, id) {
    const letter = memoryLetterRepository.findById(userId, id);
    if (!letter) {
      throw new Error('信件不存在');
    }

    if (letter.status === 'pending') {
      throw new Error('信件尚未投递，无法标记已读');
    }

    const success = memoryLetterRepository.markAsRead(userId, id);
    if (!success) {
      throw new Error('标记已读失败');
    }

    const updatedLetter = memoryLetterRepository.findById(userId, id);

    const taskUpdates = [];
    if (letter.status !== 'read') {
      try {
        const result = achievementService.updateTaskProgress(userId, 'memory_letter_read', 1);
        taskUpdates.push(...result.newlyCompleted);
      } catch (e) {
        console.error('更新任务进度失败:', e);
      }
    }

    const notificationEventsList = [];
    if (taskUpdates.length > 0) {
      taskUpdates.forEach(task => {
        notificationEventsList.push(
          notificationEvents.createTaskCompletedEvent(task)
        );
      });
    }

    return {
      letter: updatedLetter,
      notificationEvents: notificationEventsList,
      newlyCompletedTasks: taskUpdates
    };
  }

  cancelLetter(userId, id) {
    const letter = memoryLetterRepository.findById(userId, id);
    if (!letter) {
      throw new Error('信件不存在');
    }

    if (letter.status !== 'pending') {
      throw new Error('只能取消待投递的信件');
    }

    const success = memoryLetterRepository.cancelLetter(userId, id);
    if (!success) {
      throw new Error('取消信件失败');
    }

    return { success: true };
  }

  deleteLetter(userId, id) {
    const letter = memoryLetterRepository.findById(userId, id);
    if (!letter) {
      throw new Error('信件不存在');
    }

    const success = memoryLetterRepository.deleteLetter(userId, id);
    if (!success) {
      throw new Error('删除信件失败');
    }

    return { success: true };
  }

  getAvailableSourceDates(userId) {
    const moodDates = moodRepository.getUniqueDates(userId);
    return moodDates.map(d => d.record_date).sort().reverse();
  }

  getConfig() {
    return {
      minDeliveryDays: MIN_DELIVERY_DAYS,
      maxDeliveryDays: MAX_DELIVERY_DAYS,
      validStatuses: memoryLetterRepository.getValidStatuses(),
      statusLabels: {
        pending: '待投递',
        delivered: '已投递',
        read: '已阅读',
        cancelled: '已取消'
      }
    };
  }

  generateLetterContent(data) {
    const { moodSnapshot, roomSnapshot, growthSnapshot, customContent = '' } = data;

    let content = '';

    if (moodSnapshot) {
      const moodLabels = {
        happy: '开心',
        calm: '平静',
        sad: '难过',
        anxious: '焦虑',
        angry: '愤怒'
      };

      content += `【今日心情】\n`;
      content += `主导情绪：${moodLabels[moodSnapshot.dominantMood] || moodSnapshot.dominantMood}\n`;
      content += `记录时段：${moodSnapshot.segmentCount} 个\n\n`;

      if (moodSnapshot.segments && moodSnapshot.segments.length > 0) {
        for (const seg of moodSnapshot.segments) {
          const segLabels = {
            morning: '早晨',
            afternoon: '下午',
            evening: '晚间',
            day: '全天'
          };
          content += `${segLabels[seg.timeSegment] || seg.timeSegment}：${moodLabels[seg.moodType] || seg.moodType}\n`;
          if (seg.content) {
            content += `${seg.content}\n`;
          }
          content += '\n';
        }
      }
    }

    if (roomSnapshot && roomSnapshot.chaptersReadToday.length > 0) {
      content += `【今日房间故事】\n`;
      for (const room of roomSnapshot.chaptersReadToday) {
        content += `📖 ${room.roomName}\n`;
        for (const chapter of room.chapters) {
          content += `  第${chapter.chapterNumber}章：${chapter.title}\n`;
        }
        content += '\n';
      }
    }

    if (growthSnapshot) {
      if (growthSnapshot.stageArchive) {
        const archive = growthSnapshot.stageArchive;
        content += `【${archive.title || archive.periodLabel} 阶段总结】\n`;
        content += `📅 周期：${archive.startDate} ~ ${archive.endDate}\n`;
        content += `📊 情绪记录：${archive.totalMoodRecords || 0} 条 | 平均得分：${(archive.avgMoodScore || 0).toFixed(1)}\n`;
        content += `📖 阅读章节：${archive.totalChaptersRead || 0} 章 | 完成任务：${archive.totalTasksCompleted || 0} 个\n\n`;

        if (archive.growthInsights && Array.isArray(archive.growthInsights) && archive.growthInsights.length > 0) {
          content += `💡 成长洞察：\n`;
          archive.growthInsights.forEach((insight, idx) => {
            const text = typeof insight === 'string' ? insight : (insight.text || insight.content || JSON.stringify(insight));
            content += `  ${idx + 1}. ${text}\n`;
          });
          content += '\n';
        }

        if (archive.taskAccomplishments && Array.isArray(archive.taskAccomplishments) && archive.taskAccomplishments.length > 0) {
          content += `🏆 阶段成就：\n`;
          archive.taskAccomplishments.forEach((task, idx) => {
            const text = typeof task === 'string' ? task : (task.title || task.name || JSON.stringify(task));
            content += `  ✅ ${text}\n`;
          });
          content += '\n';
        }
      }

      if (growthSnapshot.retrospectives && growthSnapshot.retrospectives.length > 0) {
        content += `【当日成长回顾】\n`;
        for (const retro of growthSnapshot.retrospectives) {
          const typeLabels = {
            feeling: '感受',
            thought: '思考',
            insight: '洞察',
            gratitude: '感恩'
          };
          content += `✨ ${typeLabels[retro.type] || retro.type}\n`;
          content += `${retro.content}\n\n`;
        }
      }
    }

    if (customContent) {
      content += `【想对未来的自己说】\n${customContent}\n`;
    }

    return content;
  }

  parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = new MemoryLetterService();
