const moodRepository = require('../repositories/moodRepository');
const roomRepository = require('../repositories/roomRepository');
const taskRepository = require('../repositories/taskRepository');
const achievementRepository = require('../repositories/achievementRepository');
const prescriptionRepository = require('../repositories/emotionPrescriptionRepository');
const achievementService = require('./achievementService');
const notificationEvents = require('../utils/notificationEvents');

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
  sad: '忧伤',
  anxious: '焦虑',
  angry: '愤怒'
};

const MOOD_EMOJIS = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  anxious: '😰',
  angry: '😠'
};

const COMPANION_ADVICE = {
  improving: [
    { title: '继续保持', content: '你的情绪正在向好的方向发展，继续保持积极的心态！', icon: '✨' },
    { title: '分享快乐', content: '好的心情值得分享，试着和身边的人聊聊你的开心事吧。', icon: '💝' },
    { title: '记录美好', content: '把这些美好的时刻记录下来，未来回看时会很温暖。', icon: '📝' }
  ],
  declining: [
    { title: '温柔以待', content: '情绪低落是正常的，给自己一些时间和空间，好好休息。', icon: '🌙' },
    { title: '寻找出口', content: '试试把烦恼写下来，或者找个信任的人倾诉。', icon: '🍃' },
    { title: '温暖陪伴', content: '去读一个治愈的故事吧，梦境旅馆的房间会陪伴你。', icon: '🏠' },
    { title: '小小改变', content: '出去散散步，或者听一首喜欢的歌，小小改变也会有帮助。', icon: '🎵' }
  ],
  stable: [
    { title: '平和心境', content: '情绪稳定是很珍贵的状态，享受这份内心的宁静。', icon: '🌸' },
    { title: '探索自己', content: '平静的时候最适合深度思考，不妨回顾一下近期的成长。', icon: '🔮' },
    { title: '保持节奏', content: '继续保持规律的生活作息，稳定的节奏带来稳定的情绪。', icon: '⏰' }
  ],
  volatile: [
    { title: '接纳波动', content: '情绪起伏是生活的一部分，试着接纳而不是抗拒。', icon: '🌊' },
    { title: '发现规律', content: '留意情绪波动的触发点，了解自己的情绪模式。', icon: '📊' },
    { title: '稳定锚点', content: '建立一些日常小习惯，作为情绪波动时的稳定锚点。', icon: '⚓' }
  ],
  low: [
    { title: '关爱自己', content: '最近可能压力比较大，多给自己一些关爱和照顾。', icon: '💗' },
    { title: '寻求支持', content: '不要独自承受，和朋友家人聊聊，或者寻求专业帮助。', icon: '🤝' },
    { title: '小步前进', content: '不要对自己太苛责，每天完成一件小事就很棒了。', icon: '🌱' },
    { title: '房间疗愈', content: '去治愈系的房间坐坐，故事会给你力量。', icon: '🚪' }
  ],
  high: [
    { title: '享受当下', content: '尽情享受这份好心情吧！', icon: '🎉' },
    { title: '传递能量', content: '好情绪会传染，把你的快乐带给身边的人吧。', icon: '☀️' },
    { title: '乘胜追击', content: '状态好的时候适合挑战稍微难一点的任务。', icon: '🚀' }
  ]
};

const MOOD_BASED_SUGGESTIONS = {
  happy: [
    '用文字记录下这份开心的原因',
    '和朋友分享你的好心情',
    '趁着状态好多完成几个任务'
  ],
  calm: [
    '适合进行深度思考和规划',
    '可以尝试冥想或放松练习',
    '读一个需要专注的故事章节'
  ],
  sad: [
    '允许自己悲伤，不要压抑情绪',
    '听听舒缓的音乐，看看治愈的内容',
    '和信任的人聊聊你的感受'
  ],
  anxious: [
    '做几个深呼吸，慢慢吐气',
    '把让你焦虑的事情写下来，一一分析',
    '做一些能让你专注的小事转移注意力'
  ],
  angry: [
    '先离开让你生气的环境，冷静一下',
    '通过运动或书写释放情绪',
    '等情绪平复后再回头看这件事'
  ]
};

class EmotionPrescriptionService {
  generateWeeklyPrescription(userId) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startDateStr = this.formatDate(weekStart);
    const endDateStr = this.formatDate(weekEnd);
    
    const existing = prescriptionRepository.findPrescriptionByDateRange(userId, 'weekly', startDateStr, endDateStr);
    if (existing) {
      return existing;
    }
    
    const analysis = this.analyzeMoodTrend(userId, startDateStr, endDateStr);
    const suggestions = this.generateSuggestions(analysis);
    const companionAdvice = this.generateCompanionAdvice(analysis);
    const roomRecommendations = this.generateRoomRecommendations(userId, analysis);
    const taskRecommendations = this.generateTaskRecommendations(analysis);
    const highlights = this.generateHighlights(userId, analysis, startDateStr, endDateStr);
    const insights = this.generateInsights(analysis);
    
    const prescription = prescriptionRepository.createPrescription({
      userId,
      periodType: 'weekly',
      startDate: startDateStr,
      endDate: endDateStr,
      moodTrend: analysis.trend,
      avgMoodScore: analysis.avgScore,
      dominantMood: analysis.dominantMood,
      moodFluctuation: analysis.fluctuation,
      suggestions,
      companionAdvice,
      roomRecommendations,
      taskRecommendations,
      highlights,
      insights
    });
    
    this.updateTaskProgress(userId);
    
    return prescription;
  }

  generateDailyPrescription(userId) {
    const today = new Date();
    const dateStr = this.formatDate(today);
    
    const existing = prescriptionRepository.findPrescriptionByDateRange(userId, 'daily', dateStr, dateStr);
    if (existing) {
      return existing;
    }
    
    const analysis = this.analyzeRecentMood(userId, 7);
    const suggestions = this.generateSuggestions(analysis);
    const companionAdvice = this.generateCompanionAdvice(analysis);
    const roomRecommendations = this.generateRoomRecommendations(userId, analysis);
    const taskRecommendations = this.generateTaskRecommendations(analysis);
    const highlights = this.generateHighlights(userId, analysis, dateStr, dateStr);
    const insights = this.generateInsights(analysis);
    
    const prescription = prescriptionRepository.createPrescription({
      userId,
      periodType: 'daily',
      startDate: dateStr,
      endDate: dateStr,
      moodTrend: analysis.trend,
      avgMoodScore: analysis.avgScore,
      dominantMood: analysis.dominantMood,
      moodFluctuation: analysis.fluctuation,
      suggestions,
      companionAdvice,
      roomRecommendations,
      taskRecommendations,
      highlights,
      insights
    });
    
    return prescription;
  }

  analyzeMoodTrend(userId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dailyAggregates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = this.formatDate(currentDate);
      const agg = moodRepository.getDayAggregate(userId, dateStr);
      if (agg) {
        dailyAggregates.push(agg);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (dailyAggregates.length === 0) {
      return {
        trend: 'stable',
        avgScore: 3,
        dominantMood: 'calm',
        fluctuation: 0,
        recordDays: 0,
        totalRecords: 0,
        scores: [],
        moodDistribution: {}
      };
    }
    
    const scores = dailyAggregates.map(a => a.averageScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const variance = scores.length > 1 
      ? scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
      : 0;
    const fluctuation = Math.sqrt(variance);
    
    let trend = 'stable';
    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      
      if (diff > 0.3) trend = 'improving';
      else if (diff < -0.3) trend = 'declining';
    }
    
    if (fluctuation > 1.2) {
      trend = 'volatile';
    }
    
    if (avgScore < 2 && scores.length >= 3) {
      trend = 'low';
    } else if (avgScore >= 4.2 && scores.length >= 3) {
      trend = 'high';
    }
    
    const moodCount = {};
    dailyAggregates.forEach(agg => {
      moodCount[agg.dominantMood] = (moodCount[agg.dominantMood] || 0) + 1;
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
      trend,
      avgScore: Math.round(avgScore * 10) / 10,
      dominantMood,
      fluctuation: Math.round(fluctuation * 100) / 100,
      recordDays: dailyAggregates.length,
      totalRecords: dailyAggregates.reduce((sum, a) => sum + a.segmentCount, 0),
      scores,
      moodDistribution: moodCount
    };
  }

  analyzeRecentMood(userId, days = 7) {
    const today = new Date();
    const end = this.formatDate(today);
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    return this.analyzeMoodTrend(userId, this.formatDate(start), end);
  }

  generateSuggestions(analysis) {
    const suggestions = [];
    
    const moodSuggestions = MOOD_BASED_SUGGESTIONS[analysis.dominantMood] || [];
    moodSuggestions.slice(0, 2).forEach(s => {
      suggestions.push({
        type: 'mood',
        title: `关于${MOOD_LABELS[analysis.dominantMood] || '心情'}`,
        content: s,
        priority: 'high'
      });
    });
    
    switch (analysis.trend) {
      case 'improving':
        suggestions.push({
          type: 'trend',
          title: '情绪上升期',
          content: '抓住情绪好的时候，挑战一些平时觉得难的事情',
          priority: 'medium'
        });
        break;
      case 'declining':
      case 'low':
        suggestions.push({
          type: 'trend',
          title: '情绪关怀',
          content: '今天多花点时间照顾自己，做一件让自己舒服的小事',
          priority: 'high'
        });
        break;
      case 'volatile':
        suggestions.push({
          type: 'trend',
          title: '情绪稳定',
          content: '建立规律的作息和饮食习惯，有助于稳定情绪',
          priority: 'medium'
        });
        break;
      default:
        suggestions.push({
          type: 'trend',
          title: '保持节奏',
          content: '继续保持健康的生活方式和平和的心态',
          priority: 'low'
        });
    }
    
    if (analysis.recordDays < 3) {
      suggestions.push({
        type: 'habit',
        title: '记录习惯',
        content: '坚持每天记录心情，能更好地了解自己的情绪模式',
        priority: 'medium'
      });
    }
    
    return suggestions.slice(0, 5);
  }

  generateCompanionAdvice(analysis) {
    const adviceSet = COMPANION_ADVICE[analysis.trend] || COMPANION_ADVICE.stable;
    const shuffled = [...adviceSet].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  generateRoomRecommendations(userId, analysis) {
    const rooms = roomRepository.findAll(userId);
    const unlockedRooms = rooms.filter(r => r.is_unlocked);
    const lockedRooms = rooms.filter(r => !r.is_unlocked);
    
    const recommendations = [];
    
    const moodRoomMap = {
      happy: { theme: '欢乐', description: '适合开心时阅读的轻松故事' },
      calm: { theme: '宁静', description: '适合平静时品读的治愈故事' },
      sad: { theme: '温暖', description: '治愈心灵的温暖故事' },
      anxious: { theme: '舒缓', description: '能让心情平静下来的故事' },
      angry: { theme: '平和', description: '帮助平复情绪的故事' }
    };
    
    if (unlockedRooms.length > 0) {
      const recommended = unlockedRooms.slice(0, Math.min(2, unlockedRooms.length));
      recommended.forEach(room => {
        recommendations.push({
          type: 'continue',
          roomId: room.id,
          name: room.name,
          description: `继续探索「${room.name}」的故事`,
          action: '继续阅读'
        });
      });
    }
    
    if (lockedRooms.length > 0 && analysis.trend !== 'low') {
      const nextRoom = lockedRooms[0];
      recommendations.push({
        type: 'unlock',
        roomId: nextRoom.id,
        name: nextRoom.name,
        description: nextRoom.unlock_condition || '解锁新房间，探索更多故事',
        action: '查看解锁条件'
      });
    }
    
    if (analysis.dominantMood) {
      const theme = moodRoomMap[analysis.dominantMood];
      if (theme) {
        recommendations.push({
          type: 'mood_theme',
          theme: theme.theme,
          description: theme.description,
          action: '去探索'
        });
      }
    }
    
    return recommendations.slice(0, 3);
  }

  generateTaskRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.recordDays < 5) {
      recommendations.push({
        type: 'daily',
        title: '坚持记录心情',
        description: '每天记录3个时段的心情，完成可获得星币奖励',
        targetDays: 7,
        currentDays: analysis.recordDays,
        reward: 25
      });
    }
    
    if (analysis.avgScore < 3) {
      recommendations.push({
        type: 'selfcare',
        title: '自我关怀任务',
        description: '今天做一件让自己开心的小事，并记录下来',
        reward: 15
      });
    }
    
    if (analysis.trend === 'improving' || analysis.trend === 'high') {
      recommendations.push({
        type: 'challenge',
        title: '乘胜追击',
        description: '趁着状态好，多读一个故事章节',
        reward: 20
      });
    }
    
    if (analysis.fluctuation > 1) {
      recommendations.push({
        type: 'stability',
        title: '情绪觉察',
        description: '下次情绪波动时，试着描述自己的感受',
        reward: 10
      });
    }
    
    return recommendations.slice(0, 3);
  }

  generateHighlights(userId, analysis, startDate, endDate) {
    const highlights = [];
    
    if (analysis.recordDays > 0) {
      highlights.push({
        type: 'record',
        icon: '📝',
        content: `本周期记录了 ${analysis.recordDays} 天心情，共 ${analysis.totalRecords} 条记录`
      });
    }
    
    if (analysis.trend === 'improving') {
      highlights.push({
        type: 'trend',
        icon: '📈',
        content: '情绪整体呈上升趋势，状态越来越好！'
      });
    } else if (analysis.trend === 'high') {
      highlights.push({
        type: 'trend',
        icon: '🌟',
        content: '情绪状态非常棒，继续保持！'
      });
    } else if (analysis.trend === 'stable') {
      highlights.push({
        type: 'trend',
        icon: '⚖️',
        content: '情绪状态稳定，内心平和'
      });
    }
    
    if (analysis.avgScore >= 4) {
      highlights.push({
        type: 'score',
        icon: '😊',
        content: `平均情绪分 ${analysis.avgScore}，整体心情不错`
      });
    }
    
    if (analysis.dominantMood) {
      highlights.push({
        type: 'dominant',
        icon: MOOD_EMOJIS[analysis.dominantMood] || '😐',
        content: `主导情绪是「${MOOD_LABELS[analysis.dominantMood] || '平静'}」`
      });
    }
    
    return highlights.slice(0, 4);
  }

  generateInsights(analysis) {
    const insights = [];
    
    if (analysis.fluctuation > 1.5) {
      insights.push({
        type: 'warning',
        title: '情绪波动较大',
        content: '近期情绪起伏比较明显，建议留意是什么事情在影响你的情绪，试着找到规律。',
        level: 'medium'
      });
    }
    
    if (analysis.avgScore < 2.5 && analysis.recordDays >= 3) {
      insights.push({
        type: 'care',
        title: '需要多关爱自己',
        content: '近期情绪评分偏低，可能需要多休息、多和朋友交流，必要时寻求专业帮助。',
        level: 'high'
      });
    }
    
    if (analysis.recordDays < 3) {
      insights.push({
        type: 'suggestion',
        title: '记录不够连续',
        content: '本周期记录天数较少，建议坚持每天记录，才能更准确地分析情绪模式。',
        level: 'low'
      });
    }
    
    if (analysis.trend === 'improving' && analysis.recordDays >= 5) {
      insights.push({
        type: 'positive',
        title: '进步明显',
        content: '你的情绪状态在持续变好，这说明你正在有效地调整自己，继续加油！',
        level: 'low'
      });
    }
    
    return insights;
  }

  generateMonthlyArchive(userId, year, month) {
    const periodLabel = `${year}年${month}月`;
    
    const moodCurve = this.getMonthlyMoodData(userId, year, month);
    const roomData = this.getMonthlyRoomData(userId, year, month);
    const taskData = this.getMonthlyTaskData(userId, year, month);
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const title = this.generateArchiveTitle(moodCurve, roomData, taskData);
    
    const archive = prescriptionRepository.createStageArchive({
      userId,
      archiveType: 'monthly',
      periodLabel,
      startDate,
      endDate,
      moodSummary: moodCurve,
      roomJourney: roomData,
      taskAccomplishments: taskData,
      growthInsights: this.generateGrowthInsights(moodCurve, roomData, taskData),
      title,
      totalMoodRecords: moodCurve.totalRecords || 0,
      totalChaptersRead: roomData.totalChapters || 0,
      totalTasksCompleted: taskData.totalCompleted || 0,
      avgMoodScore: moodCurve.avgScore || 0
    });
    
    return archive;
  }

  getMonthlyMoodData(userId, year, month) {
    const stats = moodRepository.getStats(userId, year, month);
    const aggregates = moodRepository.getMonthAggregates(userId, year, month);
    
    let avgScore = 0;
    if (aggregates.length > 0) {
      avgScore = aggregates.reduce((sum, a) => sum + a.averageScore, 0) / aggregates.length;
    }
    
    return {
      avgScore: Math.round(avgScore * 10) / 10,
      totalRecords: stats?.totalThisMonth || 0,
      recordDays: stats?.daysWithRecords || 0,
      moodDistribution: stats?.moodDistribution || {},
      streakDays: stats?.streakDays || 0,
      dominantMood: this.findDominantMood(stats?.moodDistribution || {})
    };
  }

  getMonthlyRoomData(userId, year, month) {
    const rooms = roomRepository.findAll(userId);
    const unlockedRooms = rooms.filter(r => r.is_unlocked);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let chaptersThisMonth = 0;
    unlockedRooms.forEach(room => {
      const history = roomRepository.getStoryHistory(userId, room.id);
      history.forEach(h => {
        const readDate = new Date(h.read_at);
        if (readDate >= startDate && readDate <= endDate) {
          chaptersThisMonth++;
        }
      });
    });
    
    return {
      unlockedRooms: unlockedRooms.length,
      totalRooms: rooms.length,
      totalChapters: chaptersThisMonth,
      rooms: unlockedRooms.map(r => ({
        id: r.id,
        name: r.name,
        progress: r.current_chapter || 0,
        totalChapters: r.total_chapters || 0
      }))
    };
  }

  getMonthlyTaskData(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const completed = taskRepository.getCompletedTasksInDateRange(userId, startDate, endDate);
    const rewards = taskRepository.getRewardsEarnedInDateRange(userId, startDate, endDate);
    
    return {
      totalCompleted: completed,
      totalRewards: rewards || 0,
      dailyCompleted: taskRepository.getCompletedTaskCountByType(userId, 'daily'),
      weeklyCompleted: taskRepository.getCompletedTaskCountByType(userId, 'weekly')
    };
  }

  generateGrowthInsights(moodData, roomData, taskData) {
    const insights = [];
    
    if (moodData.recordDays >= 20) {
      insights.push('这个月你非常坚持地记录心情，这份毅力令人钦佩！');
    }
    
    if (moodData.avgScore >= 4) {
      insights.push('整体情绪状态很好，保持这份积极乐观！');
    }
    
    if (roomData.totalChapters >= 5) {
      insights.push(`本月阅读了 ${roomData.totalChapters} 个故事章节，收获满满！`);
    }
    
    if (taskData.totalCompleted >= 20) {
      insights.push(`完成了 ${taskData.totalCompleted} 个任务，获得 ${taskData.totalRewards} 星币！`);
    }
    
    if (insights.length === 0) {
      insights.push('继续使用应用，记录更多美好瞬间，下个月会有更丰富的收获！');
    }
    
    return insights;
  }

  generateArchiveTitle(moodData, roomData, taskData) {
    const titles = [];
    
    if (moodData.avgScore >= 4) {
      titles.push('阳光明媚');
    } else if (moodData.avgScore >= 3) {
      titles.push('宁静岁月');
    } else if (moodData.avgScore >= 2) {
      titles.push('静待花开');
    } else {
      titles.push('温柔时光');
    }
    
    if (roomData.totalChapters >= 10) {
      titles.push('故事旅人');
    }
    
    if (taskData.totalCompleted >= 30) {
      titles.push('勤奋达人');
    }
    
    if (moodData.streakDays >= 7) {
      titles.push('坚持之星');
    }
    
    if (titles.length === 1) {
      titles.push('月度记录');
    }
    
    return titles.slice(0, 2).join(' · ');
  }

  findDominantMood(distribution) {
    let maxCount = 0;
    let dominant = 'calm';
    for (const [mood, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = mood;
      }
    }
    return dominant;
  }

  getLatestPrescription(userId, periodType = 'weekly') {
    let prescription = prescriptionRepository.findLatestPrescription(userId, periodType);
    if (!prescription) {
      if (periodType === 'weekly') {
        prescription = this.generateWeeklyPrescription(userId);
      } else if (periodType === 'daily') {
        prescription = this.generateDailyPrescription(userId);
      }
    }
    
    const now = new Date();
    this.generateMonthlyArchive(userId, now.getFullYear(), now.getMonth() + 1);
    
    return prescription;
  }

  getPrescriptionList(userId, periodType = 'weekly', limit = 12) {
    return prescriptionRepository.findPrescriptionsByPeriod(userId, periodType, limit);
  }

  viewPrescription(userId, id) {
    const prescription = prescriptionRepository.findPrescriptionById(id);
    if (!prescription || prescription.userId !== userId) {
      return null;
    }
    
    if (!prescription.isViewed) {
      prescriptionRepository.markAsViewed(id);
      
      const result = achievementService.updateTaskProgress(userId, 'prescription_view', 1);
      
      return {
        ...prescription,
        isViewed: true,
        taskUpdates: result.newlyCompleted
      };
    }
    
    return prescription;
  }

  getArchiveList(userId, archiveType = 'monthly', limit = 12) {
    return prescriptionRepository.findArchivesByType(userId, archiveType, limit);
  }

  getAllArchives(userId, limit = 12) {
    return prescriptionRepository.findAllArchives(userId, limit);
  }

  updateTaskProgress(userId) {
    const stats = prescriptionRepository.getPrescriptionStats(userId);
    if (stats && stats.viewedCount > 0) {
      achievementService.updateTaskProgress(userId, 'prescription_view', stats.viewedCount);
    }
  }

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getConfig() {
    return {
      moodScores: MOOD_SCORES,
      moodLabels: MOOD_LABELS,
      moodEmojis: MOOD_EMOJIS,
      validPeriodTypes: ['daily', 'weekly', 'monthly'],
      validArchiveTypes: ['monthly', 'quarterly', 'yearly']
    };
  }
}

module.exports = new EmotionPrescriptionService();
