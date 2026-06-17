const crisisRepo = require('../repositories/crisisCenterRepository');
const moodRepository = require('../repositories/moodRepository');

const MOOD_SCORES = {
  happy: 5,
  calm: 4,
  sad: 2,
  anxious: 1,
  angry: 0
};

const NEGATIVE_MOODS = ['sad', 'anxious', 'angry'];

const ALERT_LEVELS = {
  NORMAL: 'normal',
  GENTLE: 'gentle',
  FIRM: 'firm',
  CRISIS: 'crisis'
};

const SIGNAL_TYPES = {
  NEGATIVE_STREAK: 'negative_streak',
  MOOD_GAP: 'mood_gap',
  FLUCTUATION: 'fluctuation',
  TASK_ABANDON: 'task_abandon',
  STORY_STAGNATION: 'story_stagnation'
};

class CrisisCenterService {
  getFullAnalysis(userId) {
    const recentMoods = crisisRepo.getRecentDaysMoods(userId, 7);
    const recentDates = crisisRepo.getRecentDistinctDates(userId, 7);
    const negativeDays = crisisRepo.getNegativeMoodConsecutiveDays(userId, 7);
    const fluctuationDays = crisisRepo.getHighFluctuationDays(userId, 7);
    const taskCompletions = crisisRepo.getRecentTaskCompletions(userId, 7);
    const storyReadings = crisisRepo.getStoryReadingRecent(userId, 7);
    const roomProgress = crisisRepo.getUnlockedRoomProgress(userId);
    const lastStoryRead = crisisRepo.getLastStoryReadDate(userId);
    const lastMoodDate = crisisRepo.getLastMoodRecordDate(userId);
    const streakDates = crisisRepo.getMoodStreakInfo(userId);

    const signals = [];
    const timeline = this.buildTimeline(recentMoods, taskCompletions, storyReadings, 7);
    const moodSummary = this.analyzeMoodSummary(recentMoods, recentDates, 7);

    const negativeStreakResult = this.checkNegativeStreak(negativeDays);
    if (negativeStreakResult) signals.push(negativeStreakResult);

    const moodGapResult = this.checkMoodGap(recentDates, lastMoodDate, 7);
    if (moodGapResult) signals.push(moodGapResult);

    const fluctuationResult = this.checkFluctuation(fluctuationDays);
    if (fluctuationResult) signals.push(fluctuationResult);

    const taskAbandonResult = this.checkTaskAbandon(taskCompletions, 7);
    if (taskAbandonResult) signals.push(taskAbandonResult);

    const stagnationResult = this.checkStoryStagnation(roomProgress, lastStoryRead, storyReadings);
    if (stagnationResult) signals.push(stagnationResult);

    const overallLevel = this.determineOverallLevel(signals);
    const streakInfo = this.calculateStreakInfo(streakDates);

    return {
      overallLevel,
      signals,
      timeline,
      moodSummary,
      streakInfo,
      roomProgress: roomProgress.map(r => ({
        id: r.id,
        name: r.name,
        totalChapters: r.total_chapters,
        currentChapter: r.current_chapter,
        progressPercent: r.total_chapters > 0 ? Math.round((r.current_chapter / r.total_chapters) * 100) : 0
      })),
      lastMoodDate,
      lastStoryReadDate: lastStoryRead,
      recommendations: this.generateRecommendations(overallLevel, signals),
      supportResources: this.getSupportResources(overallLevel)
    };
  }

  buildTimeline(recentMoods, taskCompletions, storyReadings, days) {
    const timeline = [];
    const today = new Date();

    const moodsByDate = {};
    for (const m of recentMoods) {
      if (!moodsByDate[m.record_date]) moodsByDate[m.record_date] = [];
      moodsByDate[m.record_date].push(m);
    }

    const tasksByDate = {};
    for (const t of taskCompletions) {
      tasksByDate[t.completed_date] = t.completed_count;
    }

    const readingsByDate = {};
    for (const s of storyReadings) {
      readingsByDate[s.read_date] = s.chapters_read;
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const dayMoods = moodsByDate[dateStr] || [];
      const segmentCount = dayMoods.filter(m => ['morning', 'afternoon', 'evening'].includes(m.time_segment)).length;
      const dominantMood = this.getDominantMoodFromList(dayMoods);
      const avgScore = dayMoods.length > 0
        ? dayMoods.reduce((sum, m) => sum + (MOOD_SCORES[m.mood_type] ?? 3), 0) / dayMoods.length
        : null;

      const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

      timeline.push({
        date: dateStr,
        dayOfWeek: dayLabels[date.getDay()],
        isToday: i === 0,
        hasMoodRecord: dayMoods.length > 0,
        segmentCount,
        dominantMood,
        avgScore: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
        moodTypes: [...new Set(dayMoods.map(m => m.mood_type))],
        hasNegativeMood: dayMoods.some(m => NEGATIVE_MOODS.includes(m.mood_type)),
        completedTasks: tasksByDate[dateStr] || 0,
        chaptersRead: readingsByDate[dateStr] || 0
      });
    }

    return timeline;
  }

  getDominantMoodFromList(moods) {
    if (moods.length === 0) return null;
    const counts = {};
    for (const m of moods) {
      counts[m.mood_type] = (counts[m.mood_type] || 0) + 1;
    }
    let dominant = null;
    let maxCount = 0;
    for (const [mood, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = mood;
      }
    }
    return dominant;
  }

  analyzeMoodSummary(recentMoods, recentDates, days) {
    const totalRecords = recentMoods.length;
    const recordDays = recentDates.length;
    const recordRate = days > 0 ? Math.round((recordDays / days) * 100) : 0;

    const moodCounts = {};
    for (const m of recentMoods) {
      moodCounts[m.mood_type] = (moodCounts[m.mood_type] || 0) + 1;
    }

    let negativeCount = 0;
    for (const mood of NEGATIVE_MOODS) {
      negativeCount += moodCounts[mood] || 0;
    }

    const negativeRate = totalRecords > 0 ? Math.round((negativeCount / totalRecords) * 100) : 0;

    const scores = recentMoods.map(m => MOOD_SCORES[m.mood_type] ?? 3);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : null;

    let trend = 'stable';
    if (scores.length >= 4) {
      const half = Math.floor(scores.length / 2);
      const firstHalfAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const secondHalfAvg = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
      const diff = secondHalfAvg - firstHalfAvg;
      if (diff > 0.5) trend = 'improving';
      else if (diff < -0.5) trend = 'declining';
      else if (this.calculateStdDev(scores) > 1.5) trend = 'volatile';
    }

    return {
      totalRecords,
      recordDays,
      recordRate,
      moodCounts,
      negativeCount,
      negativeRate,
      avgScore,
      trend
    };
  }

  calculateStdDev(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }

  checkNegativeStreak(negativeDays) {
    const consecutive = this.countConsecutiveFromToday(negativeDays.map(d => d.record_date));

    if (consecutive >= 5) {
      return {
        type: SIGNAL_TYPES.NEGATIVE_STREAK,
        level: ALERT_LEVELS.CRISIS,
        title: '持续负面情绪',
        description: `近7天中已有${consecutive}天连续记录负面情绪，请关注自身状态`,
        consecutive,
        totalDays: negativeDays.length
      };
    }
    if (consecutive >= 3) {
      return {
        type: SIGNAL_TYPES.NEGATIVE_STREAK,
        level: ALERT_LEVELS.FIRM,
        title: '负面情绪连续',
        description: `已连续${consecutive}天记录负面情绪，试试记录一件小确幸`,
        consecutive,
        totalDays: negativeDays.length
      };
    }
    if (negativeDays.length >= 4) {
      return {
        type: SIGNAL_TYPES.NEGATIVE_STREAK,
        level: ALERT_LEVELS.GENTLE,
        title: '负面情绪偏多',
        description: `近7天中有${negativeDays.length}天出现负面情绪，注意自我关怀`,
        consecutive,
        totalDays: negativeDays.length
      };
    }
    return null;
  }

  checkMoodGap(recentDates, lastMoodDate, days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let gapDays = days - recentDates.length;

    if (!lastMoodDate) {
      return {
        type: SIGNAL_TYPES.MOOD_GAP,
        level: ALERT_LEVELS.FIRM,
        title: '从未记录心情',
        description: '还没有任何心情记录，从今天开始吧',
        gapDays: 999,
        lastRecordDate: null
      };
    }

    const lastDate = new Date(lastMoodDate);
    lastDate.setHours(0, 0, 0, 0);
    const actualGap = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (actualGap >= 5) {
      return {
        type: SIGNAL_TYPES.MOOD_GAP,
        level: ALERT_LEVELS.FIRM,
        title: '记录中断较久',
        description: `已${actualGap}天未记录心情，记录是了解自己的第一步`,
        gapDays: actualGap,
        lastRecordDate: lastMoodDate
      };
    }
    if (actualGap >= 3) {
      return {
        type: SIGNAL_TYPES.MOOD_GAP,
        level: ALERT_LEVELS.GENTLE,
        title: '记录出现断档',
        description: `已${actualGap}天未记录心情，今天想记录一下吗？`,
        gapDays: actualGap,
        lastRecordDate: lastMoodDate
      };
    }
    return null;
  }

  checkFluctuation(fluctuationDays) {
    if (fluctuationDays.length >= 3) {
      return {
        type: SIGNAL_TYPES.FLUCTUATION,
        level: ALERT_LEVELS.FIRM,
        title: '情绪波动剧烈',
        description: `近7天有${fluctuationDays.length}天出现3种以上情绪切换，情绪起伏较大`,
        fluctuationDays: fluctuationDays.length,
        details: fluctuationDays.map(d => ({
          date: d.record_date,
          types: d.mood_types,
          count: d.mood_type_count
        }))
      };
    }
    if (fluctuationDays.length >= 1) {
      return {
        type: SIGNAL_TYPES.FLUCTUATION,
        level: ALERT_LEVELS.GENTLE,
        title: '情绪波动明显',
        description: `近7天有${fluctuationDays.length}天出现较大情绪波动`,
        fluctuationDays: fluctuationDays.length,
        details: fluctuationDays.map(d => ({
          date: d.record_date,
          types: d.mood_types,
          count: d.mood_type_count
        }))
      };
    }
    return null;
  }

  checkTaskAbandon(taskCompletions, days) {
    const completedDays = taskCompletions.length;
    const abandonDays = days - completedDays;

    if (abandonDays >= 5) {
      return {
        type: SIGNAL_TYPES.TASK_ABANDON,
        level: ALERT_LEVELS.FIRM,
        title: '任务长期未完成',
        description: `近7天仅有${completedDays}天完成了日常任务，可能需要调整目标`,
        completedDays,
        abandonDays
      };
    }
    if (abandonDays >= 3 && completedDays > 0) {
      return {
        type: SIGNAL_TYPES.TASK_ABANDON,
        level: ALERT_LEVELS.GENTLE,
        title: '任务完成断续',
        description: `近7天有${completedDays}天完成了任务，保持节奏很重要`,
        completedDays,
        abandonDays
      };
    }
    if (completedDays === 0 && days > 0) {
      return {
        type: SIGNAL_TYPES.TASK_ABANDON,
        level: ALERT_LEVELS.FIRM,
        title: '任务完全停滞',
        description: '近7天未完成任何日常任务，从小目标开始吧',
        completedDays: 0,
        abandonDays: days
      };
    }
    return null;
  }

  checkStoryStagnation(roomProgress, lastStoryRead, storyReadings) {
    const hasUnlockedRooms = roomProgress.length > 0;
    if (!hasUnlockedRooms) return null;

    const totalChaptersRead = storyReadings.reduce((sum, s) => sum + s.chapters_read, 0);
    const incompleteRooms = roomProgress.filter(r => r.current_chapter < r.total_chapters);

    if (!lastStoryRead) {
      return {
        type: SIGNAL_TYPES.STORY_STAGNATION,
        level: ALERT_LEVELS.GENTLE,
        title: '剧情尚未开始',
        description: `已解锁${roomProgress.length}个房间但未阅读任何章节，故事在等你`,
        totalRooms: roomProgress.length,
        incompleteRooms: incompleteRooms.length,
        chaptersRead: 0,
        stagnationDays: null
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastRead = new Date(lastStoryRead);
    lastRead.setHours(0, 0, 0, 0);
    const daysSinceRead = Math.floor((today - lastRead) / (1000 * 60 * 60 * 24));

    if (daysSinceRead >= 5 && incompleteRooms.length > 0) {
      return {
        type: SIGNAL_TYPES.STORY_STAGNATION,
        level: ALERT_LEVELS.FIRM,
        title: '剧情停滞较久',
        description: `已${daysSinceRead}天未阅读故事，还有${incompleteRooms.length}个房间的故事待续`,
        totalRooms: roomProgress.length,
        incompleteRooms: incompleteRooms.length,
        chaptersRead: totalChaptersRead,
        stagnationDays: daysSinceRead
      };
    }
    if (daysSinceRead >= 3 && incompleteRooms.length > 0) {
      return {
        type: SIGNAL_TYPES.STORY_STAGNATION,
        level: ALERT_LEVELS.GENTLE,
        title: '剧情暂时搁置',
        description: `已${daysSinceRead}天未推进故事，继续探索未完的旅程`,
        totalRooms: roomProgress.length,
        incompleteRooms: incompleteRooms.length,
        chaptersRead: totalChaptersRead,
        stagnationDays: daysSinceRead
      };
    }
    return null;
  }

  determineOverallLevel(signals) {
    if (signals.length === 0) return ALERT_LEVELS.NORMAL;

    const levels = signals.map(s => s.level);
    if (levels.includes(ALERT_LEVELS.CRISIS)) return ALERT_LEVELS.CRISIS;
    if (levels.filter(l => l === ALERT_LEVELS.FIRM).length >= 2) return ALERT_LEVELS.CRISIS;
    if (levels.includes(ALERT_LEVELS.FIRM)) return ALERT_LEVELS.FIRM;
    if (levels.includes(ALERT_LEVELS.GENTLE)) return ALERT_LEVELS.GENTLE;
    return ALERT_LEVELS.NORMAL;
  }

  calculateStreakInfo(streakDates) {
    if (streakDates.length === 0) {
      return { currentStreak: 0, maxStreak: 0, isBroken: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    for (let i = 0; i < streakDates.length; i++) {
      const recordDate = new Date(streakDates[i]);
      recordDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (recordDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0 && recordDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (recordDate.getTime() === yesterday.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    let maxStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < streakDates.length; i++) {
      const prev = new Date(streakDates[i - 1]);
      const curr = new Date(streakDates[i]);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    const hasToday = streakDates.length > 0 && (() => {
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return streakDates[0] === todayStr;
    })();

    return {
      currentStreak,
      maxStreak,
      isBroken: currentStreak === 0 && streakDates.length > 0,
      hasTodayRecord: hasToday
    };
  }

  countConsecutiveFromToday(dates) {
    if (dates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    const sortedDates = [...dates].sort().reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const recordDate = new Date(sortedDates[i]);
      recordDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (recordDate.getTime() === expectedDate.getTime()) {
        count++;
      } else if (i === 0 && recordDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (recordDate.getTime() === yesterday.getTime()) {
          count++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return count;
  }

  generateRecommendations(level, signals) {
    const recommendations = [];

    for (const signal of signals) {
      switch (signal.type) {
        case SIGNAL_TYPES.NEGATIVE_STREAK:
          recommendations.push({
            type: 'mood_care',
            title: '情绪关怀',
            actions: [
              '试试写下三件今天感恩的小事',
              '到「陪伴对话」和旅伴聊聊天',
              '查看「情绪处方笺」获取个性化建议'
            ],
            priority: signal.level === ALERT_LEVELS.CRISIS ? 'high' : 'normal'
          });
          break;
        case SIGNAL_TYPES.MOOD_GAP:
          recommendations.push({
            type: 'record_reminder',
            title: '记录提醒',
            actions: [
              '每天至少记录一个时段的心情',
              '设置每日提醒帮助养成习惯',
              '从简单的心情选择开始，不用写文字也行'
            ],
            priority: 'normal'
          });
          break;
        case SIGNAL_TYPES.FLUCTUATION:
          recommendations.push({
            type: 'stability',
            title: '情绪稳定',
            actions: [
              '尝试深呼吸或冥想5分钟',
              '规律作息有助于情绪稳定',
              '记录情绪波动的触发因素'
            ],
            priority: 'normal'
          });
          break;
        case SIGNAL_TYPES.TASK_ABANDON:
          recommendations.push({
            type: 'task_adjust',
            title: '任务调整',
            actions: [
              '先完成最简单的一个任务',
              '不必追求完美，完成就是进步',
              '调整目标到可以完成的程度'
            ],
            priority: 'low'
          });
          break;
        case SIGNAL_TYPES.STORY_STAGNATION:
          recommendations.push({
            type: 'story_explore',
            title: '故事探索',
            actions: [
              '每天读一个章节就好',
              '回顾之前的剧情笔记',
              '尝试选择不同的故事分支'
            ],
            priority: 'low'
          });
          break;
      }
    }

    if (level === ALERT_LEVELS.CRISIS) {
      recommendations.unshift({
        type: 'crisis_support',
        title: '专业支持',
        actions: [
          '你并不孤单，寻求帮助是勇敢的选择',
          '拨打24小时心理援助热线：400-161-9995',
          '联系你信任的人聊一聊'
        ],
        priority: 'high'
      });
    }

    return recommendations;
  }

  getSupportResources(level) {
    const base = [
      {
        name: '全国心理援助热线',
        phone: '400-161-9995',
        description: '24小时免费心理危机干预热线',
        type: 'hotline',
        available: '24小时'
      },
      {
        name: '北京心理危机研究与干预中心',
        phone: '010-82951332',
        description: '专业心理危机干预服务',
        type: 'hotline',
        available: '24小时'
      },
      {
        name: '生命热线',
        phone: '400-821-1215',
        description: '面向有自杀倾向及情绪困扰者',
        type: 'hotline',
        available: '每天8:00-22:00'
      }
    ];

    if (level === ALERT_LEVELS.CRISIS || level === ALERT_LEVELS.FIRM) {
      base.push({
        name: '希望24热线',
        phone: '400-161-9995',
        description: '生活危机与心理危机干预',
        type: 'hotline',
        available: '24小时'
      });
    }

    return base;
  }
}

module.exports = new CrisisCenterService();
