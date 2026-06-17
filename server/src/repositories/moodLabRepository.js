const db = require('../config/database');

module.exports.db = db;

class MoodLabRepository {
  getTagStats(userId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT tags, mood_type, record_date, tag_weights
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ? AND tags IS NOT NULL AND tags != ''
      ORDER BY record_date DESC
    `);
    const results = stmt.all(userId, startStr, endStr);

    const tagStats = {};
    const tagMoodMap = {};
    const tagDateMap = {};

    for (const row of results) {
      const tags = row.tags ? row.tags.split(',').filter(t => t) : [];
      const tagWeights = row.tag_weights ? JSON.parse(row.tag_weights) : {};

      for (const tag of tags) {
        if (!tagStats[tag]) {
          tagStats[tag] = { count: 0, totalWeight: 0, avgWeight: 0 };
          tagMoodMap[tag] = { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0 };
          tagDateMap[tag] = new Set();
        }
        tagStats[tag].count++;
        const weight = tagWeights[tag] || 1;
        tagStats[tag].totalWeight += weight;
        tagMoodMap[tag][row.mood_type] = (tagMoodMap[tag][row.mood_type] || 0) + 1;
        tagDateMap[tag].add(row.record_date);
      }
    }

    for (const tag in tagStats) {
      tagStats[tag].avgWeight = tagStats[tag].count > 0 
        ? Number((tagStats[tag].totalWeight / tagStats[tag].count).toFixed(2)) 
        : 0;
      tagStats[tag].uniqueDays = tagDateMap[tag].size;
      
      const moodCounts = tagMoodMap[tag];
      const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
      tagStats[tag].moodDistribution = {};
      for (const mood in moodCounts) {
        tagStats[tag].moodDistribution[mood] = total > 0 
          ? Number((moodCounts[mood] / total * 100).toFixed(1)) 
          : 0;
      }
    }

    return {
      tagStats,
      tagList: Object.entries(tagStats)
        .map(([tag, stats]) => ({ tag, ...stats }))
        .sort((a, b) => b.count - a.count),
      totalTags: Object.keys(tagStats).length,
      periodDays: days
    };
  }

  getTagTrend(userId, tag, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyData.push({ date: dateStr, count: 0, avgWeight: 0, moods: [] });
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT record_date, mood_type, tag_weights
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ? 
        AND tags IS NOT NULL AND tags LIKE ?
      ORDER BY record_date
    `);
    const results = stmt.all(userId, startStr, endStr, `%${tag}%`);

    const dateMap = new Map();
    for (const row of results) {
      if (!dateMap.has(row.record_date)) {
        dateMap.set(row.record_date, { count: 0, totalWeight: 0, moods: [] });
      }
      const dayData = dateMap.get(row.record_date);
      dayData.count++;
      const tagWeights = row.tag_weights ? JSON.parse(row.tag_weights) : {};
      dayData.totalWeight += tagWeights[tag] || 1;
      dayData.moods.push(row.mood_type);
    }

    return dailyData.map(d => {
      const data = dateMap.get(d.date) || { count: 0, totalWeight: 0, moods: [] };
      return {
        ...d,
        count: data.count,
        avgWeight: data.count > 0 ? Number((data.totalWeight / data.count).toFixed(2)) : 0,
        dominantMood: data.moods.length > 0 
          ? data.moods.sort((a, b) => 
              data.moods.filter(m => m === b).length - data.moods.filter(m => m === a).length
            )[0] 
          : null
      };
    });
  }

  getRecordFrequencyStats(userId, days = 90) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT record_date, time_segment, COUNT(*) as seg_count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      GROUP BY record_date, time_segment
      ORDER BY record_date
    `);
    const results = stmt.all(userId, startStr, endStr);

    const dailyRecords = {};
    const segmentCounts = { morning: 0, afternoon: 0, evening: 0, day: 0 };
    
    for (const row of results) {
      if (!dailyRecords[row.record_date]) {
        dailyRecords[row.record_date] = { date: row.record_date, segments: new Set(), totalSegments: 0 };
      }
      dailyRecords[row.record_date].segments.add(row.time_segment);
      dailyRecords[row.record_date].totalSegments += row.seg_count;
      segmentCounts[row.time_segment] = (segmentCounts[row.time_segment] || 0) + row.seg_count;
    }

    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const record = dailyRecords[dateStr];
      dailyData.push({
        date: dateStr,
        hasRecord: !!record,
        segmentCount: record ? record.segments.size : 0,
        totalEntries: record ? record.totalSegments : 0,
        dayOfWeek: d.getDay()
      });
    }

    const weekdays = [0, 1, 2, 3, 4, 5, 6];
    const weekdayStats = weekdays.map(day => {
      const dayRecords = dailyData.filter(d => d.dayOfWeek === day);
      const recordedDays = dayRecords.filter(d => d.hasRecord).length;
      const totalSegments = dayRecords.reduce((sum, d) => sum + d.segmentCount, 0);
      return {
        dayOfWeek: day,
        dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day],
        recordedDays,
        totalDays: dayRecords.length,
        recordRate: dayRecords.length > 0 ? Number((recordedDays / dayRecords.length * 100).toFixed(1)) : 0,
        avgSegments: dayRecords.length > 0 ? Number((totalSegments / dayRecords.length).toFixed(2)) : 0
      };
    });

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].hasRecord) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        if (i === dailyData.length - 1) {
          currentStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    if (tempStreak > 0 && dailyData[dailyData.length - 1].hasRecord) {
      currentStreak = tempStreak;
    }

    const totalRecordedDays = dailyData.filter(d => d.hasRecord).length;
    const totalRecords = dailyData.reduce((sum, d) => sum + d.totalEntries, 0);

    return {
      dailyData,
      weekdayStats,
      segmentCounts,
      currentStreak,
      maxStreak,
      totalRecordedDays,
      totalRecords,
      recordRate: days > 0 ? Number((totalRecordedDays / days * 100).toFixed(1)) : 0,
      avgRecordsPerDay: totalRecordedDays > 0 ? Number((totalRecords / totalRecordedDays).toFixed(2)) : 0,
      periodDays: days
    };
  }

  getStoryStats(userId) {
    const roomStmt = db.prepare(`
      SELECT r.id, r.name, r.total_chapters, 
             COALESCE(ur.is_unlocked, 0) as is_unlocked,
             COALESCE(urb.max_chapter_reached, 0) as max_chapter_reached,
             COALESCE(urb.last_read_at, '') as last_read_at
      FROM rooms r
      LEFT JOIN user_rooms ur ON r.id = ur.room_id AND ur.user_id = ?
      LEFT JOIN user_room_branches urb ON r.id = urb.room_id AND urb.user_id = ? AND urb.is_active = 1
      ORDER BY r.sort_order
    `);
    const rooms = roomStmt.all(userId, userId);

    const branchStmt = db.prepare(`
      SELECT room_id, branch_key, branch_label, max_chapter_reached, is_active
      FROM user_room_branches
      WHERE user_id = ?
      ORDER BY room_id, max_chapter_reached DESC
    `);
    const allBranches = branchStmt.all(userId);

    const branchByRoom = {};
    for (const b of allBranches) {
      if (!branchByRoom[b.room_id]) {
        branchByRoom[b.room_id] = [];
      }
      branchByRoom[b.room_id].push(b);
    }

    const historyStmt = db.prepare(`
      SELECT room_id, branch_key, COUNT(*) as chapters_read, MAX(read_at) as last_read
      FROM user_story_history
      WHERE user_id = ?
      GROUP BY room_id, branch_key
      ORDER BY last_read DESC
    `);
    const historyStats = historyStmt.all(userId);

    const totalChaptersRead = historyStats.reduce((sum, h) => sum + h.chapters_read, 0);
    const unlockedRooms = rooms.filter(r => r.is_unlocked).length;
    const totalRooms = rooms.length;
    const exploredBranches = allBranches.filter(b => b.max_chapter_reached > 0).length;
    const activeBranchCount = allBranches.filter(b => b.is_active).length;

    let readingStreak = 0;
    const readDates = [...new Set(historyStats.map(h => h.last_read ? h.last_read.split('T')[0] : '').filter(d => d))];
    readDates.sort().reverse();
    
    if (readDates.length > 0) {
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 30; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const dateStr = expectedDate.toISOString().split('T')[0];
        if (readDates.includes(dateStr)) {
          streak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }
      readingStreak = streak;
    }

    const mainBranchReads = historyStats.filter(h => h.branch_key === 'main');
    const otherBranchReads = historyStats.filter(h => h.branch_key !== 'main');
    const mainBranchTotal = mainBranchReads.reduce((sum, h) => sum + h.chapters_read, 0);
    const otherBranchTotal = otherBranchReads.reduce((sum, h) => sum + h.chapters_read, 0);
    const branchExplorationRate = (mainBranchTotal + otherBranchTotal) > 0 
      ? Number((otherBranchTotal / (mainBranchTotal + otherBranchTotal) * 100).toFixed(1)) 
      : 0;

    return {
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        isUnlocked: !!r.is_unlocked,
        totalChapters: r.total_chapters,
        maxChapterReached: r.max_chapter_reached || 0,
        progress: r.total_chapters > 0 ? Number((r.max_chapter_reached / r.total_chapters * 100).toFixed(1)) : 0,
        lastReadAt: r.last_read_at,
        branches: branchByRoom[r.id] || []
      })),
      totalRooms,
      unlockedRooms,
      totalChaptersRead,
      exploredBranches,
      activeBranchCount,
      readingStreak,
      branchExplorationRate,
      mainBranchChapters: mainBranchTotal,
      sideBranchChapters: otherBranchTotal,
      readingHistory: historyStats
    };
  }

  getRewardStats(userId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const taskStmt = db.prepare(`
      SELECT t.id, t.title, t.type, t.reward, t.icon,
             ut.is_completed, ut.is_claimed, ut.completed_at, ut.claimed_at
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = ? AND ut.completed_at BETWEEN ? AND ?
      ORDER BY ut.completed_at DESC
    `);
    const completedTasks = taskStmt.all(userId, startStr, endStr + ' 23:59:59');

    const dailyStats = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.push({
        date: dateStr,
        completed: 0,
        claimed: 0,
        rewardEarned: 0
      });
    }

    const dateMap = new Map();
    for (const task of completedTasks) {
      const completedDate = task.completed_at ? task.completed_at.split('T')[0] : '';
      const claimedDate = task.is_claimed && task.claimed_at ? task.claimed_at.split('T')[0] : '';
      
      if (!dateMap.has(completedDate)) {
        dateMap.set(completedDate, { completed: 0, claimed: 0, rewardEarned: 0 });
      }
      const dayData = dateMap.get(completedDate);
      dayData.completed++;
      
      if (task.is_claimed && claimedDate === completedDate) {
        dayData.claimed++;
        dayData.rewardEarned += task.reward || 0;
      }
    }

    const dailyResults = dailyStats.map(d => ({
      ...d,
      ...(dateMap.get(d.date) || { completed: 0, claimed: 0, rewardEarned: 0 })
    }));

    const totalCompleted = completedTasks.length;
    const totalClaimed = completedTasks.filter(t => t.is_claimed).length;
    const totalReward = completedTasks.filter(t => t.is_claimed).reduce((sum, t) => sum + (t.reward || 0), 0);

    let claimStreak = 0;
    const claimDates = [...new Set(completedTasks.filter(t => t.is_claimed).map(t => t.claimed_at ? t.claimed_at.split('T')[0] : '').filter(d => d))];
    claimDates.sort().reverse();

    if (claimDates.length > 0) {
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < days; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const dateStr = expectedDate.toISOString().split('T')[0];
        if (claimDates.includes(dateStr)) {
          streak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }
      claimStreak = streak;
    }

    const typeStats = {};
    for (const task of completedTasks) {
      if (!typeStats[task.type]) {
        typeStats[task.type] = { completed: 0, claimed: 0, totalReward: 0 };
      }
      typeStats[task.type].completed++;
      if (task.is_claimed) {
        typeStats[task.type].claimed++;
        typeStats[task.type].totalReward += task.reward || 0;
      }
    }

    const avgClaimDelayDays = this.calculateAvgClaimDelay(completedTasks);

    return {
      dailyData: dailyResults,
      totalCompleted,
      totalClaimed,
      totalReward,
      claimStreak,
      claimRate: totalCompleted > 0 ? Number((totalClaimed / totalCompleted * 100).toFixed(1)) : 0,
      avgClaimDelayDays,
      typeStats,
      periodDays: days
    };
  }

  calculateAvgClaimDelay(tasks) {
    const claimedTasks = tasks.filter(t => t.is_claimed && t.completed_at && t.claimed_at);
    if (claimedTasks.length === 0) return 0;

    let totalDelay = 0;
    for (const task of claimedTasks) {
      const completed = new Date(task.completed_at);
      const claimed = new Date(task.claimed_at);
      const delay = (claimed - completed) / (1000 * 60 * 60 * 24);
      totalDelay += Math.max(0, delay);
    }
    return Number((totalDelay / claimedTasks.length).toFixed(2));
  }

  getMoodTrendStats(userId, months = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const monthlyData = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      monthlyData.push({
        year,
        month,
        label: `${year}年${month}月`,
        avgScore: 0,
        totalRecords: 0,
        daysWithRecords: 0,
        moodDistribution: {},
        dominantMood: 'calm'
      });
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT record_date, mood_type, time_segment
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      ORDER BY record_date
    `);
    const records = stmt.all(userId, startStr, endStr);

    const moodScores = { happy: 5, calm: 4, sad: 2, anxious: 1, angry: 0 };
    const segmentWeights = { morning: 0.3, afternoon: 0.3, evening: 0.4, day: 1.0 };

    const monthlyMap = {};
    const dateSetMap = {};

    for (const record of records) {
      const date = new Date(record.record_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          totalWeight: 0,
          weightedScore: 0,
          totalRecords: 0,
          moodCounts: { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0 }
        };
        dateSetMap[key] = new Set();
      }

      const monthData = monthlyMap[key];
      const weight = segmentWeights[record.time_segment] || 0.33;
      const score = moodScores[record.mood_type] !== undefined ? moodScores[record.mood_type] : 3;
      
      monthData.weightedScore += score * weight;
      monthData.totalWeight += weight;
      monthData.totalRecords++;
      monthData.moodCounts[record.mood_type] = (monthData.moodCounts[record.mood_type] || 0) + 1;
      dateSetMap[key].add(record.record_date);
    }

    const results = monthlyData.map(m => {
      const key = `${m.year}-${m.month}`;
      const data = monthlyMap[key];
      
      if (data && data.totalWeight > 0) {
        const avgScore = Number((data.weightedScore / data.totalWeight).toFixed(2));
        const moodDist = {};
        const total = Object.values(data.moodCounts).reduce((a, b) => a + b, 0);
        for (const mood in data.moodCounts) {
          moodDist[mood] = total > 0 ? Number((data.moodCounts[mood] / total * 100).toFixed(1)) : 0;
        }
        
        let dominantMood = 'calm';
        let maxCount = 0;
        for (const mood in data.moodCounts) {
          if (data.moodCounts[mood] > maxCount) {
            maxCount = data.moodCounts[mood];
            dominantMood = mood;
          }
        }

        return {
          ...m,
          avgScore,
          totalRecords: data.totalRecords,
          daysWithRecords: dateSetMap[key].size,
          recordRate: 30 > 0 ? Number((dateSetMap[key].size / 30 * 100).toFixed(1)) : 0,
          moodDistribution: moodDist,
          dominantMood
        };
      }
      return {
        ...m,
        avgScore: 0,
        totalRecords: 0,
        daysWithRecords: 0,
        recordRate: 0,
        moodDistribution: { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0 },
        dominantMood: 'calm'
      };
    });

    const overallStats = this.calculateOverallTrend(results);

    return {
      monthlyData: results,
      overallStats,
      periodMonths: months
    };
  }

  calculateOverallTrend(monthlyData) {
    const validMonths = monthlyData.filter(m => m.daysWithRecords > 0);
    if (validMonths.length === 0) {
      return {
        avgScore: 0,
        trend: 'stable',
        trendValue: 0,
        mostCommonMood: 'calm',
        totalDays: 0,
        totalRecords: 0
      };
    }

    const totalRecords = validMonths.reduce((sum, m) => sum + m.totalRecords, 0);
    const totalDays = validMonths.reduce((sum, m) => sum + m.daysWithRecords, 0);
    const avgScore = Number((validMonths.reduce((sum, m) => sum + m.avgScore * m.daysWithRecords, 0) / totalDays).toFixed(2));

    let trend = 'stable';
    let trendValue = 0;
    if (validMonths.length >= 2) {
      const recent = validMonths[validMonths.length - 1].avgScore;
      const previous = validMonths[validMonths.length - 2].avgScore;
      trendValue = Number((recent - previous).toFixed(2));
      if (trendValue > 0.3) trend = 'improving';
      else if (trendValue < -0.3) trend = 'declining';
    }

    const moodCounts = {};
    for (const m of validMonths) {
      for (const mood in m.moodDistribution) {
        moodCounts[mood] = (moodCounts[mood] || 0) + m.moodDistribution[mood] * m.daysWithRecords;
      }
    }
    let mostCommonMood = 'calm';
    let maxCount = 0;
    for (const mood in moodCounts) {
      if (moodCounts[mood] > maxCount) {
        maxCount = moodCounts[mood];
        mostCommonMood = mood;
      }
    }

    return {
      avgScore,
      trend,
      trendValue,
      mostCommonMood,
      totalDays,
      totalRecords
    };
  }
}

module.exports = new MoodLabRepository();
