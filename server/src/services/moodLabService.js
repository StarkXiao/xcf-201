const moodLabRepository = require('../repositories/moodLabRepository');

class MoodLabService {
  getTrendAnalysis(userId) {
    const moodTrend = moodLabRepository.getMoodTrendStats(userId, 6);
    const tagStats = moodLabRepository.getTagStats(userId, 30);
    const recordFreq = moodLabRepository.getRecordFrequencyStats(userId, 90);
    const storyStats = moodLabRepository.getStoryStats(userId);
    const rewardStats = moodLabRepository.getRewardStats(userId, 30);

    return {
      moodTrend,
      tagTrend: {
        topTags: tagStats.tagList.slice(0, 10),
        totalTags: tagStats.totalTags,
        periodDays: tagStats.periodDays
      },
      recordTrend: {
        dailyData: recordFreq.dailyData,
        weekdayStats: recordFreq.weekdayStats,
        segmentCounts: recordFreq.segmentCounts,
        currentStreak: recordFreq.currentStreak,
        maxStreak: recordFreq.maxStreak,
        recordRate: recordFreq.recordRate,
        avgRecordsPerDay: recordFreq.avgRecordsPerDay,
        periodDays: recordFreq.periodDays
      },
      storyTrend: {
        unlockedRooms: storyStats.unlockedRooms,
        totalRooms: storyStats.totalRooms,
        totalChaptersRead: storyStats.totalChaptersRead,
        branchExplorationRate: storyStats.branchExplorationRate,
        readingStreak: storyStats.readingStreak,
        mainBranchChapters: storyStats.mainBranchChapters,
        sideBranchChapters: storyStats.sideBranchChapters,
        rooms: storyStats.rooms
      },
      rewardTrend: {
        totalCompleted: rewardStats.totalCompleted,
        totalClaimed: rewardStats.totalClaimed,
        totalReward: rewardStats.totalReward,
        claimStreak: rewardStats.claimStreak,
        claimRate: rewardStats.claimRate,
        avgClaimDelayDays: rewardStats.avgClaimDelayDays,
        dailyData: rewardStats.dailyData,
        typeStats: rewardStats.typeStats,
        periodDays: rewardStats.periodDays
      }
    };
  }

  getBehaviorClustering(userId) {
    const recordFreq = moodLabRepository.getRecordFrequencyStats(userId, 90);
    const moodTrend = moodLabRepository.getMoodTrendStats(userId, 6);
    const tagStats = moodLabRepository.getTagStats(userId, 30);
    const storyStats = moodLabRepository.getStoryStats(userId);
    const rewardStats = moodLabRepository.getRewardStats(userId, 30);

    const recordBehaviorCluster = this.clusterRecordBehavior(recordFreq);
    const moodPatternCluster = this.clusterMoodPattern(moodTrend);
    const storyExplorerCluster = this.clusterStoryExplorer(storyStats);
    const rewardBehaviorCluster = this.clusterRewardBehavior(rewardStats);

    const overallType = this.determineOverallType(
      recordBehaviorCluster,
      moodPatternCluster,
      storyExplorerCluster,
      rewardBehaviorCluster
    );

    return {
      recordBehavior: recordBehaviorCluster,
      moodPattern: moodPatternCluster,
      storyExplorer: storyExplorerCluster,
      rewardBehavior: rewardBehaviorCluster,
      overallType,
      tagRichness: {
        totalTags: tagStats.totalTags,
        avgWeight: tagStats.tagList.length > 0 
          ? Number((tagStats.tagList.reduce((sum, t) => sum + t.avgWeight, 0) / tagStats.tagList.length).toFixed(2))
          : 0,
        level: this.getTagRichnessLevel(tagStats.totalTags)
      }
    };
  }

  clusterRecordBehavior(recordFreq) {
    const { recordRate, avgRecordsPerDay, currentStreak, maxStreak } = recordFreq;

    let type = 'casual_recorder';
    let name = '偶尔记录型';
    let description = '想起来才记录，记录频率较低';
    let score = 30;

    if (recordRate >= 80 && avgRecordsPerDay >= 2.5 && currentStreak >= 7) {
      type = 'daily_dedicated';
      name = '每日坚持型';
      description = '坚持每日记录，是情绪记录的忠实用户';
      score = 95;
    } else if (recordRate >= 60 && avgRecordsPerDay >= 2 && currentStreak >= 3) {
      type = 'consistent_recorder';
      name = '稳定记录型';
      description = '大部分时间都会记录，习惯正在养成中';
      score = 75;
    } else if (recordRate >= 40 && avgRecordsPerDay >= 1.5) {
      type = 'regular_visitor';
      name = '经常记录型';
      description = '经常记录心情，但还没形成稳定习惯';
      score = 55;
    } else if (recordRate >= 20) {
      type = 'occasional_recorder';
      name = '偶尔记录型';
      description = '想起来才记录，记录频率较低';
      score = 35;
    }

    const traits = [];
    if (maxStreak >= 14) traits.push('曾经创造过连续记录的佳绩');
    if (avgRecordsPerDay >= 3) traits.push('喜欢在一天中多次记录心情');
    if (recordRate < 30) traits.push('记录比较随性，没有固定规律');
    if (currentStreak >= 7) traits.push('目前正处于连续记录的好状态');

    return {
      type,
      name,
      description,
      score,
      level: this.getLevelFromScore(score),
      traits,
      metrics: {
        recordRate,
        avgRecordsPerDay,
        currentStreak,
        maxStreak
      }
    };
  }

  clusterMoodPattern(moodTrend) {
    const { overallStats, monthlyData } = moodTrend;
    const validMonths = monthlyData.filter(m => m.daysWithRecords > 0);

    let type = 'calm_stable';
    let name = '平静稳定型';
    let description = '情绪整体平稳，波动不大';
    let score = 70;

    if (overallStats.avgScore >= 4.0) {
      type = 'positive_sunshine';
      name = '积极阳光型';
      description = '大部分时间都保持积极愉快的心情';
      score = 90;
    } else if (overallStats.avgScore >= 3.0) {
      type = 'calm_stable';
      name = '平静稳定型';
      description = '情绪整体平稳，波动不大';
      score = 70;
    } else if (overallStats.avgScore >= 2.0) {
      type = 'mood_swing';
      name = '情绪波动型';
      description = '情绪起伏较大，有时高涨有时低落';
      score = 50;
    } else {
      type = 'low_mood';
      name = '心情低迷型';
      description = '近期情绪偏低，需要多关注自己的感受';
      score = 30;
    }

    let volatility = 0;
    if (validMonths.length >= 2) {
      const scores = validMonths.map(m => m.avgScore);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
      volatility = Number(Math.sqrt(variance).toFixed(2));
    }

    const traits = [];
    if (overallStats.mostCommonMood === 'happy') traits.push('开心的时候比较多');
    if (overallStats.mostCommonMood === 'calm') traits.push('大多数时候心情平静');
    if (volatility > 1) traits.push('情绪波动比较明显');
    if (volatility < 0.5) traits.push('情绪状态非常稳定');
    if (overallStats.trend === 'improving') traits.push('最近情绪有向好的趋势');
    if (overallStats.trend === 'declining') traits.push('最近情绪有所下滑，多关注自己');

    return {
      type,
      name,
      description,
      score,
      level: this.getLevelFromScore(score),
      traits,
      metrics: {
        avgScore: overallStats.avgScore,
        mostCommonMood: overallStats.mostCommonMood,
        trend: overallStats.trend,
        volatility
      }
    };
  }

  clusterStoryExplorer(storyStats) {
    const { unlockedRooms, totalRooms, totalChaptersRead, branchExplorationRate, readingStreak } = storyStats;
    const unlockRate = totalRooms > 0 ? Number((unlockedRooms / totalRooms * 100).toFixed(1)) : 0;

    let type = 'casual_reader';
    let name = '浅尝辄止型';
    let description = '偶尔看看故事，更多在体验其他功能';
    let score = 30;

    if (unlockRate >= 80 && branchExplorationRate >= 40 && totalChaptersRead >= 20) {
      type = 'branch_explorer';
      name = '分支探索型';
      description = '喜欢探索不同的故事线，发现隐藏剧情';
      score = 95;
    } else if (unlockRate >= 60 && totalChaptersRead >= 15) {
      type = 'mainline_pursuer';
      name = '主线推进型';
      description = '专注于推进主线剧情，探索故事发展';
      score = 75;
    } else if (unlockRate >= 30 || totalChaptersRead >= 8) {
      type = 'story_enjoyer';
      name = '故事爱好者';
      description = '喜欢阅读故事，在剧情中寻找共鸣';
      score = 55;
    }

    const traits = [];
    if (branchExplorationRate >= 50) traits.push('特别喜欢探索支线剧情');
    if (readingStreak >= 7) traits.push('连续多天阅读故事，沉浸其中');
    if (unlockRate >= 100) traits.push('已经解锁了所有房间');
    if (totalChaptersRead >= 30) traits.push('阅读量相当可观');
    if (unlockRate < 20) traits.push('还没怎么开始探索剧情世界');

    return {
      type,
      name,
      description,
      score,
      level: this.getLevelFromScore(score),
      traits,
      metrics: {
        unlockedRooms,
        totalRooms,
        unlockRate,
        totalChaptersRead,
        branchExplorationRate,
        readingStreak
      }
    };
  }

  clusterRewardBehavior(rewardStats) {
    const { claimRate, claimStreak, totalReward, avgClaimDelayDays, totalCompleted } = rewardStats;

    let type = 'casual_collector';
    let name = '佛系随缘型';
    description = '想起来才领取奖励，比较随性';
    let score = 30;

    if (claimRate >= 90 && claimStreak >= 7 && avgClaimDelayDays < 0.5) {
      type = 'active_collector';
      name = '积极收集型';
      description = '每天都会及时领取奖励，行动力超强';
      score = 95;
    } else if (claimRate >= 70 && claimStreak >= 3) {
      type = 'task_driven';
      name = '任务驱动型';
      description = '喜欢完成任务，享受领取奖励的成就感';
      score = 75;
    } else if (claimRate >= 50 || totalCompleted >= 10) {
      type = 'reward_enthusiast';
      name = '奖励爱好者';
      description = '会关注任务奖励，但偶尔会忘记领取';
      score = 55;
    }

    const traits = [];
    if (claimStreak >= 10) traits.push('连续领取奖励的记录很惊人');
    if (avgClaimDelayDays < 0.3) traits.push('任务一完成就马上领取奖励');
    if (totalReward >= 100) traits.push('已经积累了不少星币');
    if (claimRate < 40) traits.push('很多奖励都忘了领取，有点可惜');
    if (totalCompleted >= 20) traits.push('完成的任务数量相当多');

    return {
      type,
      name,
      description,
      score,
      level: this.getLevelFromScore(score),
      traits,
      metrics: {
        claimRate,
        claimStreak,
        totalReward,
        avgClaimDelayDays,
        totalCompleted
      }
    };
  }

  determineOverallType(recordBehavior, moodPattern, storyExplorer, rewardBehavior) {
    const avgScore = (recordBehavior.score + moodPattern.score + storyExplorer.score + rewardBehavior.score) / 4;

    const typeScores = {
      '全情投入型': 0,
      '情绪探索家': 0,
      '故事沉浸者': 0,
      '任务达人': 0,
      '平衡发展者': 0,
      '入门探索者': 0
    };

    if (recordBehavior.score >= 80) typeScores['全情投入型'] += 2;
    if (moodPattern.score >= 70) typeScores['情绪探索家'] += 2;
    if (storyExplorer.score >= 70) typeScores['故事沉浸者'] += 2;
    if (rewardBehavior.score >= 80) typeScores['任务达人'] += 2;

    const highScores = [recordBehavior.score, moodPattern.score, storyExplorer.score, rewardBehavior.score].filter(s => s >= 70).length;
    if (highScores >= 3) {
      typeScores['全情投入型'] += 3;
    }

    const midScores = [recordBehavior.score, moodPattern.score, storyExplorer.score, rewardBehavior.score].filter(s => s >= 50 && s < 80).length;
    if (midScores >= 3) {
      typeScores['平衡发展者'] += 2;
    }

    if (avgScore < 50) {
      typeScores['入门探索者'] += 3;
    }

    let maxType = '平衡发展者';
    let maxScore = 0;
    for (const [type, score] of Object.entries(typeScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type;
      }
    }

    const typeDescriptions = {
      '全情投入型': '你全身心投入到情绪探索之旅中，记录、阅读、任务样样精通！',
      '情绪探索家': '你对自己的情绪有深入的觉察，喜欢通过记录了解自己。',
      '故事沉浸者': '你喜欢在故事世界中探索，通过剧情获得情感共鸣。',
      '任务达人': '你行动力超强，完成任务和领取奖励是你的快乐源泉。',
      '平衡发展者': '你在各方面都有涉猎，保持着平衡的探索节奏。',
      '入门探索者': '你刚开始探索情绪世界，还有很多有趣的内容等着你发现！'
    };

    const typeIcons = {
      '全情投入型': '🌟',
      '情绪探索家': '🧭',
      '故事沉浸者': '📖',
      '任务达人': '🏆',
      '平衡发展者': '⚖️',
      '入门探索者': '🌱'
    };

    return {
      type: maxType,
      name: maxType,
      description: typeDescriptions[maxType],
      icon: typeIcons[maxType],
      overallScore: Number(avgScore.toFixed(1)),
      dimensionScores: {
        record: recordBehavior.score,
        mood: moodPattern.score,
        story: storyExplorer.score,
        reward: rewardBehavior.score
      }
    };
  }

  getLevelFromScore(score) {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  getTagRichnessLevel(tagCount) {
    if (tagCount >= 20) return { level: '丰富', description: '你的情绪标签库非常丰富' };
    if (tagCount >= 10) return { level: '多样', description: '你已经积累了不少情绪标签' };
    if (tagCount >= 5) return { level: '基础', description: '你有一些常用的情绪标签' };
    return { level: '起步', description: '还在探索更多情绪标签中' };
  }

  getPersonalizedQuests(userId) {
    const clustering = this.getBehaviorClustering(userId);
    const { recordBehavior, moodPattern, storyExplorer, rewardBehavior, overallType } = clustering;

    const quests = [];

    if (recordBehavior.score < 60) {
      quests.push({
        id: 'record_streak_challenge',
        title: '7天连续记录挑战',
        description: '连续7天记录心情，养成情绪觉察的好习惯',
        type: 'record',
        difficulty: 'medium',
        target: 7,
        current: recordBehavior.metrics.currentStreak || 0,
        reward: 50,
        icon: '🔥',
        progressType: 'streak',
        tips: '每天固定一个时间记录，比如早上起床或晚上睡前',
        unlocked: true
      });
    }

    if (recordBehavior.score < 40) {
      quests.push({
        id: 'first_week_records',
        title: '第一周：记录3天心情',
        description: '完成3天心情记录，迈出情绪探索的第一步',
        type: 'record',
        difficulty: 'easy',
        target: 3,
        current: Math.min(recordBehavior.metrics.maxStreak || 0, 3),
        reward: 20,
        icon: '📝',
        progressType: 'count',
        tips: '哪怕只写一句话也是很棒的开始',
        unlocked: true
      });
    }

    if (recordBehavior.metrics.avgRecordsPerDay < 2) {
      quests.push({
        id: 'multi_segment_explorer',
        title: '三段式记录达人',
        description: '在一天中记录早晨、下午、晚间三个时段的心情',
        type: 'record',
        difficulty: 'hard',
        target: 5,
        current: 0,
        reward: 80,
        icon: '⏰',
        progressType: 'multi_segment_days',
        tips: '早中晚各记录一次，更全面地了解情绪变化',
        unlocked: recordBehavior.score >= 30
      });
    }

    if (moodPattern.type === 'low_mood' || moodPattern.type === 'mood_swing') {
      quests.push({
        id: 'mood_tracking_deep',
        title: '情绪深度觉察',
        description: '连续7天详细记录情绪，找出影响心情的因素',
        type: 'mood',
        difficulty: 'medium',
        target: 7,
        current: 0,
        reward: 60,
        icon: '🔍',
        progressType: 'deep_record_days',
        tips: '每次记录时多写几句感受，慢慢你会发现情绪的规律',
        unlocked: true
      });
    }

    if (moodPattern.score < 60) {
      quests.push({
        id: 'happy_moments_collector',
        title: '收集快乐时刻',
        description: '记录10个让你感到开心或平静的瞬间',
        type: 'mood',
        difficulty: 'easy',
        target: 10,
        current: 0,
        reward: 30,
        icon: '✨',
        progressType: 'happy_records',
        tips: '开心的时候别忘了记录下来，积攒快乐的能量',
        unlocked: true
      });
    }

    if (storyExplorer.score < 50) {
      quests.push({
        id: 'story_world_intro',
        title: '故事世界入门',
        description: '阅读5个故事章节，开启剧情探索之旅',
        type: 'story',
        difficulty: 'easy',
        target: 5,
        current: storyExplorer.metrics.totalChaptersRead || 0,
        reward: 25,
        icon: '📚',
        progressType: 'chapters_read',
        tips: '每个房间都有独特的故事，选一个感兴趣的开始吧',
        unlocked: true
      });
    }

    if (storyExplorer.score >= 50 && storyExplorer.metrics.branchExplorationRate < 30) {
      quests.push({
        id: 'branch_discovery',
        title: '分支探索者',
        description: '尝试阅读3个不同分支的故事剧情',
        type: 'story',
        difficulty: 'medium',
        target: 3,
        current: 0,
        reward: 55,
        icon: '🌿',
        progressType: 'branches_explored',
        tips: '同一个故事可能有不同的走向，试试做出不同的选择',
        unlocked: true
      });
    }

    if (storyExplorer.score >= 70) {
      quests.push({
        id: 'completionist',
        title: '全剧情探索',
        description: '解锁所有房间并阅读全部主线剧情',
        type: 'story',
        difficulty: 'hard',
        target: 100,
        current: storyExplorer.metrics.unlockRate || 0,
        reward: 120,
        icon: '👑',
        progressType: 'room_unlock_rate',
        tips: '坚持记录心情可以解锁更多房间哦',
        unlocked: true
      });
    }

    if (rewardBehavior.score < 50) {
      quests.push({
        id: 'reward_habit',
        title: '奖励收集习惯',
        description: '连续5天及时领取每日任务奖励',
        type: 'reward',
        difficulty: 'easy',
        target: 5,
        current: rewardBehavior.metrics.claimStreak || 0,
        reward: 30,
        icon: '🎁',
        progressType: 'claim_streak',
        tips: '完成任务后记得及时领取奖励，积少成多',
        unlocked: true
      });
    }

    if (rewardBehavior.score >= 60) {
      quests.push({
        id: 'coin_collector',
        title: '星币收藏家',
        description: '累计获得200星币',
        type: 'reward',
        difficulty: 'medium',
        target: 200,
        current: rewardBehavior.metrics.totalReward || 0,
        reward: 50,
        icon: '💰',
        progressType: 'total_coins',
        tips: '完成各种任务都能获得星币奖励',
        unlocked: true
      });
    }

    if (overallType.type === '入门探索者') {
      quests.push({
        id: 'all_round_beginner',
        title: '全面探索入门',
        description: '完成首次心情记录、首次故事阅读、首次任务领取',
        type: 'exploration',
        difficulty: 'easy',
        target: 3,
        current: 0,
        reward: 40,
        icon: '🌈',
        progressType: 'beginner_milestones',
        tips: '慢慢体验这个情绪世界，发现属于你的乐趣',
        unlocked: true
      });
    }

    if (recordBehavior.score >= 80 && moodPattern.score >= 70) {
      quests.push({
        id: 'self_awareness_master',
        title: '自我觉察大师',
        description: '对情绪的觉察达到大师级水平，继续保持！',
        type: 'achievement',
        difficulty: 'legendary',
        target: 100,
        current: Math.floor((recordBehavior.score + moodPattern.score) / 2),
        reward: 200,
        icon: '🏅',
        progressType: 'self_awareness',
        tips: '你已经是情绪觉察的高手了，继续探索更深层的自己吧',
        unlocked: true
      });
    }

    quests.push({
      id: 'tag_collector',
      title: '标签收藏家',
      description: '使用过15种不同的情绪标签',
      type: 'tag',
      difficulty: 'medium',
      target: 15,
      current: 0,
      reward: 45,
      icon: '🏷️',
      progressType: 'unique_tags',
      tips: '每次记录时尝试使用不同的标签，丰富你的情绪词汇',
      unlocked: true
    });

    quests.push({
      id: 'weekly_review',
      title: '每周回顾',
      description: '在周日花5分钟回顾这一周的情绪变化',
      type: 'reflection',
      difficulty: 'medium',
      target: 4,
      current: 0,
      reward: 35,
      icon: '📊',
      progressType: 'weekly_reviews',
      tips: '回顾能帮助你更好地了解自己的情绪模式',
      unlocked: true
    });

    const activeQuests = quests.filter(q => q.unlocked).slice(0, 6);
    const recommendedQuests = this.getRecommendedQuests(activeQuests, clustering);

    return {
      quests: activeQuests,
      recommended: recommendedQuests,
      totalAvailable: quests.length,
      completedCount: quests.filter(q => q.current >= q.target).length,
      overallType: overallType.type
    };
  }

  getRecommendedQuests(quests, clustering) {
    const { recordBehavior, moodPattern, storyExplorer, rewardBehavior } = clustering;
    
    const lowestScore = Math.min(
      recordBehavior.score,
      moodPattern.score,
      storyExplorer.score,
      rewardBehavior.score
    );

    const recommended = quests.filter(q => {
      if (lowestScore === recordBehavior.score && q.type === 'record') return true;
      if (lowestScore === moodPattern.score && q.type === 'mood') return true;
      if (lowestScore === storyExplorer.score && q.type === 'story') return true;
      if (lowestScore === rewardBehavior.score && q.type === 'reward') return true;
      return false;
    });

    return recommended.slice(0, 3);
  }

  getLabOverview(userId) {
    const trendAnalysis = this.getTrendAnalysis(userId);
    const clustering = this.getBehaviorClustering(userId);
    const quests = this.getPersonalizedQuests(userId);

    return {
      overallType: clustering.overallType,
      trendSummary: {
        moodTrend: trendAnalysis.moodTrend.overallStats,
        recordRate: trendAnalysis.recordTrend.recordRate,
        storyProgress: trendAnalysis.storyTrend.unlockedRooms + '/' + trendAnalysis.storyTrend.totalRooms,
        totalReward: trendAnalysis.rewardTrend.totalReward
      },
      clusters: {
        record: { type: clustering.recordBehavior.type, name: clustering.recordBehavior.name, level: clustering.recordBehavior.level },
        mood: { type: clustering.moodPattern.type, name: clustering.moodPattern.name, level: clustering.moodPattern.level },
        story: { type: clustering.storyExplorer.type, name: clustering.storyExplorer.name, level: clustering.storyExplorer.level },
        reward: { type: clustering.rewardBehavior.type, name: clustering.rewardBehavior.name, level: clustering.rewardBehavior.level }
      },
      quests: {
        total: quests.totalAvailable,
        completed: quests.completedCount,
        recommended: quests.recommended
      },
      tagRichness: clustering.tagRichness
    };
  }
}

module.exports = new MoodLabService();
