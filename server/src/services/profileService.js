const moodRepository = require('../repositories/moodRepository');
const roomRepository = require('../repositories/roomRepository');
const achievementRepository = require('../repositories/achievementRepository');
const taskRepository = require('../repositories/taskRepository');
const userRepository = require('../repositories/userRepository');

const MOOD_SCORES = {
  happy: 5,
  calm: 4,
  sad: 2,
  anxious: 1,
  angry: 0
};

const MOOD_LABELS = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气'
};

const MOOD_COLORS = {
  happy: '#fbbf24',
  calm: '#60a5fa',
  sad: '#818cf8',
  anxious: '#f472b6',
  angry: '#ef4444'
};

class ProfileService {
  getGrowthProfile(userId) {
    const moodCurve = this.getMonthlyMoodCurve(userId);
    const roomPreference = this.getRoomExplorationPreference(userId);
    const taskCompletion = this.getTaskCompletionRate(userId);
    const achievementRhythm = this.getAchievementUnlockRhythm(userId);
    const periodSummary = this.generatePeriodSummary(userId, moodCurve, roomPreference, taskCompletion, achievementRhythm);

    return {
      moodCurve,
      roomPreference,
      taskCompletion,
      achievementRhythm,
      periodSummary
    };
  }

  getMonthlyMoodCurve(userId, months = 6) {
    const today = new Date();
    const monthlyData = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const stats = moodRepository.getStats(userId, year, month);
      const aggregates = moodRepository.getMonthAggregates(userId, year, month);

      let avgScore = 0;
      let dominantMood = 'calm';
      let daysWithRecords = 0;
      let totalRecords = 0;
      let moodDistribution = {};

      if (aggregates.length > 0) {
        const totalScore = aggregates.reduce((sum, agg) => sum + agg.averageScore, 0);
        avgScore = totalScore / aggregates.length;
        daysWithRecords = aggregates.length;

        const moodCount = {};
        aggregates.forEach(agg => {
          moodCount[agg.dominantMood] = (moodCount[agg.dominantMood] || 0) + 1;
        });

        let maxCount = 0;
        for (const [mood, count] of Object.entries(moodCount)) {
          if (count > maxCount) {
            maxCount = count;
            dominantMood = mood;
          }
        }

        totalRecords = stats?.totalThisMonth || aggregates.reduce((sum, agg) => sum + agg.segmentCount, 0);
        moodDistribution = stats?.moodDistribution || moodCount;
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const recordRate = daysWithRecords / daysInMonth;

      monthlyData.push({
        year,
        month,
        label: `${year}年${month}月`,
        avgScore: Math.round(avgScore * 10) / 10,
        dominantMood,
        dominantMoodLabel: MOOD_LABELS[dominantMood],
        dominantMoodColor: MOOD_COLORS[dominantMood],
        daysWithRecords,
        totalRecords,
        recordRate: Math.round(recordRate * 100),
        moodDistribution,
        dailyData: aggregates.slice(0, 31).map(agg => ({
          date: agg.record_date,
          day: parseInt(agg.record_date.split('-')[2]),
          score: Math.round(agg.averageScore * 10) / 10,
          dominantMood: agg.dominantMood,
          dominantMoodLabel: MOOD_LABELS[agg.dominantMood],
          moodColor: MOOD_COLORS[agg.dominantMood],
          segmentCount: agg.segmentCount
        }))
      });
    }

    const overallStats = this.calculateOverallMoodStats(monthlyData);

    return {
      monthlyData,
      overallStats,
      moodLabels: MOOD_LABELS,
      moodColors: MOOD_COLORS,
      scoreRange: [0, 5]
    };
  }

  calculateOverallMoodStats(monthlyData) {
    const validMonths = monthlyData.filter(m => m.daysWithRecords > 0);
    if (validMonths.length === 0) {
      return {
        avgScore: 0,
        trend: 'stable',
        trendValue: 0,
        mostCommonMood: 'calm',
        mostCommonMoodLabel: MOOD_LABELS.calm,
        totalDays: 0,
        totalRecords: 0,
        avgRecordRate: 0
      };
    }

    const totalAvg = validMonths.reduce((sum, m) => sum + m.avgScore * m.daysWithRecords, 0);
    const totalDays = validMonths.reduce((sum, m) => sum + m.daysWithRecords, 0);
    const totalRecords = validMonths.reduce((sum, m) => sum + m.totalRecords, 0);
    const avgScore = totalAvg / totalDays;
    const avgRecordRate = Math.round(validMonths.reduce((sum, m) => sum + m.recordRate, 0) / validMonths.length);

    let trend = 'stable';
    let trendValue = 0;
    if (validMonths.length >= 2) {
      const recent = validMonths[validMonths.length - 1].avgScore;
      const earlier = validMonths[0].avgScore;
      trendValue = Math.round((recent - earlier) * 10) / 10;
      if (trendValue > 0.3) trend = 'improving';
      else if (trendValue < -0.3) trend = 'declining';
    }

    const moodCount = {};
    validMonths.forEach(m => {
      for (const [mood, count] of Object.entries(m.moodDistribution || {})) {
        moodCount[mood] = (moodCount[mood] || 0) + count;
      }
    });

    let maxCount = 0;
    let mostCommonMood = 'calm';
    for (const [mood, count] of Object.entries(moodCount)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonMood = mood;
      }
    }

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      trend,
      trendValue,
      mostCommonMood,
      mostCommonMoodLabel: MOOD_LABELS[mostCommonMood],
      totalDays,
      totalRecords,
      avgRecordRate
    };
  }

  getRoomExplorationPreference(userId) {
    const rooms = roomRepository.findAll(userId);
    const allBranchProgress = {};
    const readingHistory = [];
    const roomPreferences = [];

    for (const room of rooms) {
      const branchProgress = roomRepository.getAllBranchProgress(userId, room.id);
      allBranchProgress[room.id] = branchProgress;

      const history = roomRepository.getStoryHistory(userId, room.id);
      readingHistory.push(...history.map(h => ({
        ...h,
        roomId: room.id,
        roomName: room.name
      })));

      const totalChapters = room.total_chapters || 0;
      const currentChapter = room.current_chapter || 0;
      const progress = totalChapters > 0 ? Math.round((currentChapter / totalChapters) * 100) : 0;

      const totalBranchChapters = branchProgress.reduce((sum, bp) => sum + bp.max_chapter_reached, 0);
      const readingTime = this.estimateReadingTime(totalBranchChapters);

      const recentActivity = history.slice(0, 5).map(h => ({
        title: h.title,
        chapter: h.chapter_number,
        readAt: h.read_at,
        branch: h.branch_label || h.branch_key
      }));

      roomPreferences.push({
        id: room.id,
        name: room.name,
        description: room.description,
        isUnlocked: !!room.is_unlocked,
        unlockedAt: room.unlocked_at,
        totalChapters,
        currentChapter,
        progress,
        branchCount: branchProgress.length,
        totalBranchChapters,
        readingTime,
        lastReadAt: branchProgress.find(bp => bp.last_read_at)?.last_read_at || null,
        recentActivity,
        branchDetails: branchProgress.map(bp => ({
          branchKey: bp.branch_key,
          branchLabel: bp.branch_label || bp.branch_key,
          maxChapterReached: bp.max_chapter_reached,
          lastReadAt: bp.last_read_at,
          isActive: !!bp.is_active
        }))
      });
    }

    roomPreferences.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.totalBranchChapters - a.totalBranchChapters;
    });

    const unlockedRooms = roomPreferences.filter(r => r.isUnlocked);
    const totalReadingTime = unlockedRooms.reduce((sum, r) => sum + r.readingTime, 0);
    const totalChaptersRead = unlockedRooms.reduce((sum, r) => sum + r.totalBranchChapters, 0);

    const activityByRoom = {};
    readingHistory.forEach(h => {
      if (!activityByRoom[h.roomId]) {
        activityByRoom[h.roomId] = {
          roomId: h.roomId,
          roomName: h.roomName,
          count: 0
        };
      }
      activityByRoom[h.roomId].count++;
    });

    const sortedActivity = Object.values(activityByRoom).sort((a, b) => b.count - a.count);
    const favoriteRoom = sortedActivity[0] || null;

    return {
      rooms: roomPreferences,
      totalRooms: rooms.length,
      unlockedRooms: unlockedRooms.length,
      totalReadingTime,
      totalChaptersRead,
      favoriteRoom,
      readingHistory: readingHistory.sort((a, b) => new Date(b.read_at) - new Date(a.read_at)).slice(0, 20),
      activityDistribution: sortedActivity
    };
  }

  estimateReadingTime(chapterCount) {
    const minutesPerChapter = 5;
    return chapterCount * minutesPerChapter;
  }

  getTaskCompletionRate(userId) {
    const today = new Date();
    const taskStats = this.calculateTaskStats(userId);
    const monthlyTrend = this.getTaskMonthlyTrend(userId, 6);
    const typeBreakdown = this.getTaskTypeBreakdown(userId);
    const streakData = this.getTaskClaimStreak(userId);

    const completionRate = taskStats.totalAssigned > 0
      ? Math.round((taskStats.totalCompleted / taskStats.totalAssigned) * 100)
      : 0;

    return {
      overall: {
        totalAssigned: taskStats.totalAssigned,
        totalCompleted: taskStats.totalCompleted,
        totalClaimed: taskStats.totalClaimed,
        completionRate,
        claimRate: taskStats.totalCompleted > 0
          ? Math.round((taskStats.totalClaimed / taskStats.totalCompleted) * 100)
          : 0,
        totalRewards: taskStats.totalRewards
      },
      typeBreakdown,
      monthlyTrend,
      streakData,
      recentTasks: this.getRecentTasks(userId, 10)
    };
  }

  calculateTaskStats(userId) {
    const dailyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'daily');
    const weeklyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'weekly');
    const onceCompleted = taskRepository.getCompletedTaskCountByType(userId, 'once');
    const chainCompleted = taskRepository.getCompletedTaskCountByType(userId, 'chain');
    const totalClaimed = taskRepository.getClaimedRewardsTotal(userId);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const dailyTasks = taskRepository.getUserDailyTasks(userId, today);
    const weeklyTasks = taskRepository.getUserWeeklyTasks(userId, today);
    const onceTasks = taskRepository.getUserOnceTasks(userId);

    const totalAssigned = dailyTasks.length + weeklyTasks.length + onceTasks.length +
      Math.max(dailyCompleted, weeklyCompleted, onceCompleted, chainCompleted);

    return {
      totalAssigned,
      totalCompleted: dailyCompleted + weeklyCompleted + onceCompleted + chainCompleted,
      totalClaimed,
      totalRewards: totalClaimed,
      dailyCompleted,
      weeklyCompleted,
      onceCompleted,
      chainCompleted
    };
  }

  getTaskMonthlyTrend(userId, months = 6) {
    const today = new Date();
    const trend = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

      const completedCount = taskRepository.getCompletedTasksInDateRange(userId, startDate, endDate);
      const claimedCount = taskRepository.getClaimedTasksInDateRange(userId, startDate, endDate);
      const rewardsEarned = taskRepository.getRewardsEarnedInDateRange(userId, startDate, endDate);

      const dailyTarget = daysInMonth;
      const completionRate = dailyTarget > 0 ? Math.round((completedCount / dailyTarget) * 100) : 0;

      trend.push({
        year,
        month,
        label: `${year}年${month}月`,
        completed: completedCount,
        claimed: claimedCount,
        rewards: rewardsEarned || 0,
        completionRate: Math.min(100, completionRate)
      });
    }

    return trend;
  }

  getTaskTypeBreakdown(userId) {
    const dailyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'daily');
    const weeklyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'weekly');
    const onceCompleted = taskRepository.getCompletedTaskCountByType(userId, 'once');
    const chainCompleted = taskRepository.getCompletedTaskCountByType(userId, 'chain');

    const total = dailyCompleted + weeklyCompleted + onceCompleted + chainCompleted;

    return [
      {
        type: 'daily',
        label: '每日任务',
        count: dailyCompleted,
        percentage: total > 0 ? Math.round((dailyCompleted / total) * 100) : 0,
        color: '#22c55e'
      },
      {
        type: 'weekly',
        label: '周任务',
        count: weeklyCompleted,
        percentage: total > 0 ? Math.round((weeklyCompleted / total) * 100) : 0,
        color: '#a855f7'
      },
      {
        type: 'chain',
        label: '成长链',
        count: chainCompleted,
        percentage: total > 0 ? Math.round((chainCompleted / total) * 100) : 0,
        color: '#f97316'
      },
      {
        type: 'once',
        label: '长期任务',
        count: onceCompleted,
        percentage: total > 0 ? Math.round((onceCompleted / total) * 100) : 0,
        color: '#eab308'
      }
    ];
  }

  getTaskClaimStreak(userId) {
    const claimDates = taskRepository.getClaimDates(userId);
    if (claimDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalClaimDays: 0
      };
    }

    const sortedDates = [...new Set(claimDates.map(d => d.split('T')[0]))].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const claimDate = new Date(sortedDates[i]);
      claimDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (claimDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else {
        if (i === 0) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          if (claimDate.getTime() === yesterday.getTime()) {
            tempStreak++;
            currentStreak = tempStreak;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    let maxStreak = 0;
    tempStreak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        const diff = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    }
    longestStreak = Math.max(longestStreak, maxStreak);

    return {
      currentStreak,
      longestStreak,
      totalClaimDays: sortedDates.length
    };
  }

  getRecentTasks(userId, limit = 10) {
    return taskRepository.getRecentCompletedTasks(userId, limit);
  }

  getAchievementUnlockRhythm(userId) {
    const achievements = achievementRepository.getUserAchievements(userId);
    const unlockedAchievements = achievements.filter(a => a.is_unlocked);

    const timeline = this.buildAchievementTimeline(unlockedAchievements);
    const monthlyDistribution = this.getAchievementMonthlyDistribution(unlockedAchievements, 12);
    const categoryBreakdown = this.getAchievementCategoryBreakdown(achievements);
    const unlockPattern = this.analyzeUnlockPattern(unlockedAchievements);

    return {
      totalCount: achievements.length,
      unlockedCount: unlockedAchievements.length,
      completionRate: achievements.length > 0
        ? Math.round((unlockedAchievements.length / achievements.length) * 100)
        : 0,
      timeline,
      monthlyDistribution,
      categoryBreakdown,
      unlockPattern,
      recentUnlocks: unlockedAchievements
        .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlockedAt: a.unlocked_at
        }))
    };
  }

  buildAchievementTimeline(achievements) {
    const sorted = [...achievements].sort((a, b) => new Date(a.unlocked_at) - new Date(b.unlocked_at));

    return sorted.map((a, index) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
      unlockedAt: a.unlocked_at,
      order: index + 1,
      conditionType: a.condition_type
    }));
  }

  getAchievementMonthlyDistribution(achievements, months = 12) {
    const today = new Date();
    const distribution = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      const count = achievements.filter(a => {
        if (!a.unlocked_at) return false;
        const unlockDate = new Date(a.unlocked_at);
        return unlockDate.getFullYear() === year && unlockDate.getMonth() + 1 === month;
      }).length;

      distribution.push({
        year,
        month,
        label: `${year}年${month}月`,
        monthStr,
        count
      });
    }

    return distribution;
  }

  getAchievementCategoryBreakdown(achievements) {
    const categories = {
      mood: { label: '心情记录', count: 0, icon: 'heart' },
      room: { label: '房间探索', count: 0, icon: 'door-open' },
      task: { label: '任务完成', count: 0, icon: 'target' },
      social: { label: '社交互动', count: 0, icon: 'users' },
      other: { label: '其他', count: 0, icon: 'star' }
    };

    achievements.forEach(a => {
      const type = a.condition_type || '';
      if (type.includes('mood') || type.includes('check_in') || type.includes('record')) {
        categories.mood.count++;
      } else if (type.includes('room') || type.includes('chapter') || type.includes('story')) {
        categories.room.count++;
      } else if (type.includes('task') || type.includes('coin') || type.includes('claim')) {
        categories.task.count++;
      } else if (type.includes('social') || type.includes('friend')) {
        categories.social.count++;
      } else {
        categories.other.count++;
      }
    });

    const total = achievements.length;
    return Object.entries(categories).map(([key, value]) => ({
      key,
      ...value,
      percentage: total > 0 ? Math.round((value.count / total) * 100) : 0
    }));
  }

  analyzeUnlockPattern(achievements) {
    if (achievements.length < 2) {
      return {
        avgInterval: 0,
        pace: 'steady',
        bursts: 0,
        quietPeriods: 0,
        recommendation: '继续保持，解锁更多成就吧！'
      };
    }

    const sorted = [...achievements].sort((a, b) => new Date(a.unlocked_at) - new Date(b.unlocked_at));
    const intervals = [];

    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].unlocked_at);
      const d2 = new Date(sorted[i].unlocked_at);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      intervals.push(diff);
    }

    const avgInterval = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0;

    let bursts = 0;
    let quietPeriods = 0;
    intervals.forEach(d => {
      if (d <= 1) bursts++;
      if (d >= 7) quietPeriods++;
    });

    let pace = 'steady';
    let recommendation = '保持稳定的节奏，继续探索！';
    if (avgInterval <= 2) {
      pace = 'fast';
      recommendation = '你的成就解锁速度很快，太棒了！';
    } else if (avgInterval >= 10) {
      pace = 'slow';
      recommendation = '尝试更频繁地使用应用，解锁更多成就！';
    }

    if (bursts > intervals.length * 0.5) {
      pace = 'burst';
      recommendation = '你喜欢集中爆发式解锁成就，继续保持热情！';
    }

    return {
      avgInterval,
      pace,
      bursts,
      quietPeriods,
      recommendation
    };
  }

  generatePeriodSummary(userId, moodCurve, roomPreference, taskCompletion, achievementRhythm) {
    const periods = [];
    const today = new Date();

    const currentMonth = {
      period: 'currentMonth',
      label: '本月总结',
      startDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
      endDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      data: this.generateMonthSummary(moodCurve, roomPreference, taskCompletion, achievementRhythm, 0)
    };

    const lastMonth = {
      period: 'lastMonth',
      label: '上月总结',
      startDate: this.getMonthRange(today, -1).start,
      endDate: this.getMonthRange(today, -1).end,
      data: this.generateMonthSummary(moodCurve, roomPreference, taskCompletion, achievementRhythm, 1)
    };

    const thisQuarter = {
      period: 'thisQuarter',
      label: '本季度总结',
      startDate: this.getQuarterRange(today, 0).start,
      endDate: this.getQuarterRange(today, 0).end,
      data: this.generateQuarterSummary(moodCurve, roomPreference, taskCompletion, achievementRhythm, 0)
    };

    periods.push(currentMonth, lastMonth, thisQuarter);

    const overall = this.generateOverallSummary(userId, moodCurve, roomPreference, taskCompletion, achievementRhythm);

    return {
      periods,
      overall,
      insights: this.generateInsights(moodCurve, roomPreference, taskCompletion, achievementRhythm)
    };
  }

  getMonthRange(today, offset) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + offset);
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      end: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
    };
  }

  getQuarterRange(today, offset) {
    const date = new Date(today);
    const quarter = Math.floor(date.getMonth() / 3) + offset;
    const year = date.getFullYear() + Math.floor(quarter / 4);
    const q = ((quarter % 4) + 4) % 4;
    const startMonth = q * 3;
    const endMonth = q * 3 + 2;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    return {
      start: `${year}-${String(startMonth + 1).padStart(2, '0')}-01`,
      end: `${year}-${String(endMonth + 1).padStart(2, '0')}-${lastDay}`
    };
  }

  generateMonthSummary(moodCurve, roomPreference, taskCompletion, achievementRhythm, monthOffset) {
    const moodData = moodCurve.monthlyData[moodCurve.monthlyData.length - 1 - monthOffset];
    const taskData = taskCompletion.monthlyTrend[taskCompletion.monthlyTrend.length - 1 - monthOffset];
    const achievementData = achievementRhythm.monthlyDistribution[achievementRhythm.monthlyDistribution.length - 1 - monthOffset];

    if (!moodData || !taskData) {
      return null;
    }

    return {
      mood: {
        avgScore: moodData.avgScore,
        dominantMood: moodData.dominantMoodLabel,
        recordDays: moodData.daysWithRecords,
        recordRate: moodData.recordRate
      },
      tasks: {
        completed: taskData.completed,
        claimed: taskData.claimed,
        rewards: taskData.rewards,
        completionRate: taskData.completionRate
      },
      achievements: {
        unlocked: achievementData?.count || 0
      },
      rooms: {
        chaptersRead: this.estimateChaptersInMonth(roomPreference, monthOffset),
        readingTime: this.estimateReadingTime(this.estimateChaptersInMonth(roomPreference, monthOffset))
      }
    };
  }

  estimateChaptersInMonth(roomPreference, monthOffset) {
    const today = new Date();
    const targetMonth = new Date(today);
    targetMonth.setMonth(targetMonth.getMonth() - monthOffset);
    const targetMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;

    let count = 0;
    roomPreference.readingHistory.forEach(h => {
      const readMonth = h.read_at?.substring(0, 7);
      if (readMonth === targetMonthStr) {
        count++;
      }
    });

    return count;
  }

  generateQuarterSummary(moodCurve, roomPreference, taskCompletion, achievementRhythm, quarterOffset) {
    const startIdx = moodCurve.monthlyData.length - 3 * (quarterOffset + 1);
    const endIdx = moodCurve.monthlyData.length - 3 * quarterOffset;
    const quarterMoodData = moodCurve.monthlyData.slice(Math.max(0, startIdx), endIdx);

    const startTaskIdx = taskCompletion.monthlyTrend.length - 3 * (quarterOffset + 1);
    const endTaskIdx = taskCompletion.monthlyTrend.length - 3 * quarterOffset;
    const quarterTaskData = taskCompletion.monthlyTrend.slice(Math.max(0, startTaskIdx), endTaskIdx);

    if (quarterMoodData.length === 0) {
      return null;
    }

    const avgScore = quarterMoodData.reduce((sum, m) => sum + m.avgScore * m.daysWithRecords, 0) /
      quarterMoodData.reduce((sum, m) => sum + m.daysWithRecords, 0);

    const totalCompleted = quarterTaskData.reduce((sum, t) => sum + t.completed, 0);
    const totalRewards = quarterTaskData.reduce((sum, t) => sum + t.rewards, 0);

    const totalAchievements = achievementRhythm.monthlyDistribution
      .slice(Math.max(0, startIdx), endIdx)
      .reduce((sum, a) => sum + a.count, 0);

    const moodCount = {};
    quarterMoodData.forEach(m => {
      if (m.dominantMood) {
        moodCount[m.dominantMood] = (moodCount[m.dominantMood] || 0) + 1;
      }
    });

    let dominantMood = 'calm';
    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodCount)) {
      if (count > maxCount) {
        maxCount = count;
        dominantMood = mood;
      }
    }

    return {
      mood: {
        avgScore: Math.round(avgScore * 10) / 10,
        dominantMood: MOOD_LABELS[dominantMood],
        recordDays: quarterMoodData.reduce((sum, m) => sum + m.daysWithRecords, 0),
        avgRecordRate: Math.round(quarterMoodData.reduce((sum, m) => sum + m.recordRate, 0) / quarterMoodData.length)
      },
      tasks: {
        completed: totalCompleted,
        rewards: totalRewards,
        avgCompletionRate: Math.round(quarterTaskData.reduce((sum, t) => sum + t.completionRate, 0) / quarterTaskData.length)
      },
      achievements: {
        unlocked: totalAchievements
      },
      rooms: {
        chaptersRead: quarterMoodData.length * 5
      }
    };
  }

  generateOverallSummary(userId, moodCurve, roomPreference, taskCompletion, achievementRhythm) {
    const userStats = userRepository.getStats(userId);
    const joinDate = userRepository.findById(userId)?.created_at;

    let daysSinceJoin = 0;
    if (joinDate) {
      const joined = new Date(joinDate);
      const today = new Date();
      daysSinceJoin = Math.floor((today - joined) / (1000 * 60 * 60 * 24));
    }

    return {
      userStats: {
        joinDate,
        daysSinceJoin,
        checkInDays: userStats?.check_in_days || 0,
        totalMoods: userStats?.total_moods || 0,
        unlockedRooms: userStats?.unlocked_rooms || 0,
        unlockedAchievements: userStats?.unlocked_achievements || 0
      },
      averages: {
        avgMoodScore: moodCurve.overallStats.avgScore,
        avgDailyMoods: daysSinceJoin > 0 ? Math.round((userStats?.total_moods || 0) / daysSinceJoin * 10) / 10 : 0,
        avgWeeklyTasks: daysSinceJoin > 0 ? Math.round(taskCompletion.overall.totalCompleted / daysSinceJoin * 70) / 10 : 0,
        avgReadingTimePerWeek: daysSinceJoin > 0 ? Math.round(roomPreference.totalReadingTime / daysSinceJoin * 7) : 0
      },
      title: this.generateUserTitle(moodCurve, roomPreference, taskCompletion, achievementRhythm)
    };
  }

  generateUserTitle(moodCurve, roomPreference, taskCompletion, achievementRhythm) {
    const titles = [];

    if (moodCurve.overallStats.avgRecordRate >= 80) {
      titles.push('勤奋记录者');
    } else if (moodCurve.overallStats.avgRecordRate >= 50) {
      titles.push('坚持达人');
    }

    if (moodCurve.overallStats.trend === 'improving') {
      titles.push('情绪上升期');
    } else if (moodCurve.overallStats.avgScore >= 4) {
      titles.push('快乐旅人');
    }

    if (roomPreference.unlockedRooms >= 4) {
      titles.push('房间探索家');
    } else if (roomPreference.totalChaptersRead >= 20) {
      titles.push('故事爱好者');
    }

    if (taskCompletion.streakData.currentStreak >= 7) {
      titles.push('连续挑战者');
    } else if (taskCompletion.overall.completionRate >= 80) {
      titles.push('任务完成达人');
    }

    if (achievementRhythm.completionRate >= 70) {
      titles.push('成就收集者');
    } else if (achievementRhythm.unlockedCount >= 10) {
      titles.push('成就猎人');
    }

    if (titles.length === 0) {
      titles.push('梦境旅者');
    }

    return titles.slice(0, 3);
  }

  generateInsights(moodCurve, roomPreference, taskCompletion, achievementRhythm) {
    const insights = [];

    if (moodCurve.overallStats.trend === 'improving') {
      insights.push({
        type: 'positive',
        icon: 'trending-up',
        title: '情绪持续向好',
        message: `近几个月你的情绪评分提升了 ${moodCurve.overallStats.trendValue} 分，继续保持积极的心态！`
      });
    } else if (moodCurve.overallStats.trend === 'declining') {
      insights.push({
        type: 'warning',
        icon: 'trending-down',
        title: '情绪需要关注',
        message: `近几个月你的情绪评分有所下降，建议多做一些让自己开心的事情。`
      });
    }

    const favRoom = roomPreference.favoriteRoom;
    if (favRoom) {
      insights.push({
        type: 'info',
        icon: 'heart',
        title: '最爱房间',
        message: `你最喜欢在「${favRoom.roomName}」阅读故事，已经访问了 ${favRoom.count} 次。`
      });
    }

    if (taskCompletion.streakData.currentStreak >= 3) {
      insights.push({
        type: 'positive',
        icon: 'flame',
        title: '火热连续中',
        message: `你已经连续 ${taskCompletion.streakData.currentStreak} 天完成任务，继续保持！`
      });
    }

    if (achievementRhythm.unlockPattern.bursts > 0) {
      insights.push({
        type: 'info',
        icon: 'zap',
        title: '爆发力十足',
        message: `你有 ${achievementRhythm.unlockPattern.bursts} 次集中解锁成就的经历，充满热情！`
      });
    }

    if (moodCurve.overallStats.mostCommonMood === 'happy' || moodCurve.overallStats.mostCommonMood === 'calm') {
      insights.push({
        type: 'positive',
        icon: 'smile',
        title: '心态平和',
        message: `你最常体验的情绪是「${moodCurve.overallStats.mostCommonMoodLabel}」，保持这份平和。`
      });
    }

    const readingTime = roomPreference.totalReadingTime;
    if (readingTime >= 60) {
      insights.push({
        type: 'info',
        icon: 'book-open',
        title: '阅读达人',
        message: `你已经累计阅读了约 ${Math.round(readingTime / 60)} 小时的故事，真是个爱读书的人！`
      });
    }

    return insights;
  }
}

module.exports = new ProfileService();
