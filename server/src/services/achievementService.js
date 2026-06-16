const taskRepository = require('../repositories/taskRepository');
const achievementRepository = require('../repositories/achievementRepository');
const userRepository = require('../repositories/userRepository');
const moodRepository = require('../repositories/moodRepository');
const notificationEvents = require('../utils/notificationEvents');

class AchievementService {
  getTasks(userId) {
    const today = new Date();
    
    this.checkAndResetTasks(userId, today);
    
    const dailyTasks = taskRepository.getUserDailyTasks(userId, today);
    const weeklyTasks = taskRepository.getUserWeeklyTasks(userId, today);
    const onceTasks = taskRepository.getUserOnceTasks(userId);
    const chainTasks = this.getChainTasksWithStatus(userId);
    
    const dailyRefreshTime = new Date(today);
    dailyRefreshTime.setHours(24, 0, 0, 0);
    
    const weeklyRefreshTime = this.getNextWeeklyRefreshTime(today);
    
    const formattedDailyTasks = dailyTasks.map(task => this.formatTask(task));
    const formattedWeeklyTasks = weeklyTasks.map(task => this.formatTask(task));
    const formattedOnceTasks = onceTasks.map(task => this.formatTask(task));
    
    const chainGroups = this.groupChainTasks(chainTasks);
    
    return {
      dailyTasks: formattedDailyTasks,
      weeklyTasks: formattedWeeklyTasks,
      onceTasks: formattedOnceTasks,
      chainTasks: chainGroups,
      dailyRefreshTime: dailyRefreshTime.toISOString(),
      weeklyRefreshTime: weeklyRefreshTime.toISOString()
    };
  }

  getChainTasksWithStatus(userId) {
    const allChainTasks = taskRepository.getUserChainTasks(userId);
    const chainGroups = {};
    
    allChainTasks.forEach(task => {
      if (!chainGroups[task.chain_id]) {
        chainGroups[task.chain_id] = [];
      }
      chainGroups[task.chain_id].push(task);
    });
    
    const result = [];
    
    for (const chainId in chainGroups) {
      const tasks = chainGroups[chainId].sort((a, b) => a.chain_order - b.chain_order);
      let prevCompleted = true;
      let hasReset = false;
      
      const processedTasks = tasks.map(task => {
        const isUnlocked = prevCompleted;
        
        if (task.reset_type === 'streak' && prevCompleted && task.is_completed) {
          const resetResult = taskRepository.checkAndResetStreakTask(userId, task.id);
          if (resetResult.reset) {
            hasReset = true;
            task.current_progress = 0;
            task.is_completed = 0;
            task.is_claimed = 0;
          }
        }
        
        if (task.is_completed) {
          prevCompleted = true;
        } else {
          prevCompleted = false;
        }
        
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          target: task.target,
          current: task.current_progress || 0,
          reward: task.reward,
          icon: task.icon || 'gift',
          chainId: task.chain_id,
          chainOrder: task.chain_order,
          resetType: task.reset_type,
          resetDays: task.reset_days,
          isCompleted: !!task.is_completed,
          isClaimed: !!task.is_claimed,
          isUnlocked
        };
      });
      
      result.push({
        chainId: parseInt(chainId),
        chainName: this.getChainName(chainId),
        tasks: processedTasks,
        hasReset
      });
    }
    
    return result;
  }

  getChainName(chainId) {
    const chainNames = {
      1: '心情成长链'
    };
    return chainNames[chainId] || `任务链 ${chainId}`;
  }

  groupChainTasks(chainGroups) {
    return chainGroups;
  }

  formatTask(task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      target: task.target,
      current: task.current_progress || 0,
      reward: task.reward,
      icon: task.icon || 'gift',
      chainId: task.chain_id || null,
      chainOrder: task.chain_order || 0,
      resetType: task.reset_type || 'none',
      resetDays: task.reset_days || 0,
      isCompleted: !!task.is_completed,
      isClaimed: !!task.is_claimed
    };
  }

  getNextWeeklyRefreshTime(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 7;
    const nextMonday = new Date(d.setDate(diff));
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }

  checkAndResetTasks(userId, date = new Date()) {
    const chainTasks = taskRepository.getUserChainTasks(userId);
    const resets = [];
    
    chainTasks.forEach(task => {
      if (task.reset_type === 'streak') {
        const result = taskRepository.checkAndResetStreakTask(userId, task.id, date);
        if (result.reset) {
          resets.push({ taskId: task.id, ...result });
        }
      }
    });
    
    return resets;
  }

  claimTaskReward(userId, taskId) {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    
    const today = new Date();
    
    const success = taskRepository.claimReward(userId, taskId, today);
    
    if (!success) {
      const userTask = taskRepository.getUserTask(userId, taskId, today);
      if (!userTask) {
        throw new Error('任务尚未完成');
      }
      if (userTask.is_claimed) {
        throw new Error('奖励已领取');
      }
      throw new Error('奖励领取失败');
    }
    
    this.updateTaskAchievements(userId);
    
    return {
      success: true,
      reward: task.reward,
      taskId
    };
  }

  updateTaskProgress(userId, taskType, amount = 1) {
    const today = new Date();
    const updates = [];
    const newlyCompleted = [];
    
    const dailyTasks = taskRepository.getUserDailyTasks(userId, today);
    dailyTasks.forEach(task => {
      if (this.shouldUpdateTask(task, taskType)) {
        const result = taskRepository.incrementProgress(userId, task.id, amount, today);
        if (result) {
          updates.push({ taskId: task.id, type: 'daily', current: result.current_progress });
          if (result.is_completed) {
            newlyCompleted.push({
              taskId: task.id,
              title: task.title,
              reward: task.reward,
              type: 'daily'
            });
          }
        }
      }
    });
    
    const weeklyTasks = taskRepository.getUserWeeklyTasks(userId, today);
    weeklyTasks.forEach(task => {
      if (this.shouldUpdateTask(task, taskType)) {
        const result = taskRepository.incrementProgress(userId, task.id, amount, today);
        if (result) {
          updates.push({ taskId: task.id, type: 'weekly', current: result.current_progress });
          if (result.is_completed) {
            newlyCompleted.push({
              taskId: task.id,
              title: task.title,
              reward: task.reward,
              type: 'weekly'
            });
          }
        }
      }
    });
    
    const onceTasks = taskRepository.getUserOnceTasks(userId);
    onceTasks.forEach(task => {
      if (this.shouldUpdateTask(task, taskType) && !task.is_completed) {
        const result = taskRepository.incrementProgress(userId, task.id, amount, today);
        if (result) {
          updates.push({ taskId: task.id, type: 'once', current: result.current_progress });
          if (result.is_completed) {
            newlyCompleted.push({
              taskId: task.id,
              title: task.title,
              reward: task.reward,
              type: 'once'
            });
          }
        }
      }
    });
    
    if (taskType === 'mood_record') {
      const chainUpdates = this.updateChainTaskProgress(userId);
      updates.push(...chainUpdates.updates);
      newlyCompleted.push(...chainUpdates.newlyCompleted);
    }
    
    if (newlyCompleted.length > 0) {
      this.updateTaskAchievements(userId);
    }
    
    return {
      updates,
      newlyCompleted
    };
  }

  shouldUpdateTask(task, actionType) {
    const taskActionMap = {
      1: 'mood_record',
      2: 'mood_content',
      3: 'mood_record',
      4: 'mood_variety',
      5: 'story_read',
      6: 'mood_multi_segment',
      7: 'mood_tag_weight',
      8: 'mood_multi_segment',
      20: 'retrospective_record',
      21: 'retrospective_deep',
      22: 'retrospective_total',
      23: 'retrospective_total',
      24: 'retrospective_total',
      25: 'retrospective_total',
      26: 'chapter_note',
      27: 'chapter_note_deep',
      28: 'chapter_note_total',
      29: 'chapter_note_total',
      30: 'chapter_note_total'
    };
    
    const taskAction = taskActionMap[task.id] || 'mood_record';
    return taskAction === actionType;
  }

  updateChainTaskProgress(userId) {
    const updates = [];
    const newlyCompleted = [];
    
    const chainGroups = this.getChainTasksWithStatus(userId);
    
    chainGroups.forEach(group => {
      group.tasks.forEach(task => {
        if (task.isUnlocked && !task.isCompleted) {
          const streak = this.getCheckInStreak(userId);
          const result = taskRepository.updateProgress(userId, task.id, streak);
          
          if (result) {
            updates.push({ taskId: task.id, type: 'chain', current: result.current_progress });
            if (result.is_completed) {
              newlyCompleted.push({
                taskId: task.id,
                title: task.title,
                reward: task.reward,
                type: 'chain'
              });
            }
          }
        }
      });
    });
    
    return { updates, newlyCompleted };
  }

  getCheckInStreak(userId) {
    const moodRepository = require('../repositories/moodRepository');
    const dates = moodRepository.getUniqueDates(userId);
    
    if (!dates || dates.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      const hasRecord = dates.some(record => {
        const d = new Date(record.record_date || record);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dStr === dateStr;
      });
      
      if (hasRecord) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        if (i === 0) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    
    return streak;
  }

  updateTaskAchievements(userId) {
    const totalClaimed = taskRepository.getClaimedRewardsTotal(userId);
    achievementRepository.checkAndUnlock(userId, 'star_coins_earned', totalClaimed);
    
    const completedDaily = taskRepository.getCompletedTaskCountByType(userId, 'daily');
    achievementRepository.checkAndUnlock(userId, 'daily_tasks_completed', completedDaily);
    
    const completedOnce = taskRepository.getCompletedTaskCountByType(userId, 'once');
    achievementRepository.checkAndUnlock(userId, 'once_tasks_completed', completedOnce);
    
    const allTasks = taskRepository.findAll();
    const totalTasks = allTasks.length;
    const completedCount = taskRepository.getCompletedTaskCountByType(userId, 'daily') + 
                          taskRepository.getCompletedTaskCountByType(userId, 'once') +
                          taskRepository.getCompletedTaskCountByType(userId, 'weekly') +
                          taskRepository.getCompletedTaskCountByType(userId, 'chain');
    
    achievementRepository.checkAndUnlock(userId, 'all_tasks_completed', completedCount >= totalTasks ? 1 : 0);
  }

  getTaskStats(userId) {
    const dailyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'daily');
    const weeklyCompleted = taskRepository.getCompletedTaskCountByType(userId, 'weekly');
    const onceCompleted = taskRepository.getCompletedTaskCountByType(userId, 'once');
    const chainCompleted = taskRepository.getCompletedTaskCountByType(userId, 'chain');
    const totalClaimed = taskRepository.getClaimedRewardsTotal(userId);
    
    return {
      dailyCompleted,
      weeklyCompleted,
      onceCompleted,
      chainCompleted,
      totalCompleted: dailyCompleted + weeklyCompleted + onceCompleted + chainCompleted,
      totalClaimed
    };
  }

  getAchievements(userId) {
    const achievements = achievementRepository.getUserAchievements(userId);
    const unlockedCount = achievementRepository.getUnlockedCount(userId);
    const totalCount = achievementRepository.getTotalCount();
    const comboAchievements = this.getComboAchievements(userId);
    
    const formattedAchievements = achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      condition: this.getConditionText(achievement.condition_type, achievement.condition_value),
      conditionType: achievement.condition_type,
      isUnlocked: !!achievement.is_unlocked,
      unlockedAt: achievement.unlocked_at,
      progress: achievement.progress,
      target: achievement.condition_value,
      isCombo: false
    }));
    
    const allAchievements = [...formattedAchievements, ...comboAchievements.map(a => ({
      ...a,
      id: a.id,
      condition: a.conditionText,
      isCombo: true
    }))];
    
    const totalUnlocked = unlockedCount + comboAchievements.filter(a => a.isUnlocked).length;
    const totalAll = totalCount + comboAchievements.length;
    
    return {
      achievements: allAchievements,
      unlockedCount: totalUnlocked,
      totalCount: totalAll,
      comboAchievements
    };
  }

  getConditionText(conditionType, conditionValue) {
    const conditionMap = {
      'total_moods': `累计记录 ${conditionValue} 次心情`,
      'check_in_streak': `连续记录 ${conditionValue} 天`,
      'rooms_unlocked': `解锁 ${conditionValue} 个房间`,
      'chapters_read': `阅读 ${conditionValue} 个故事章节`,
      'all_achievements': '完成所有成就',
      'morning_records': `完成 ${conditionValue} 次早晨时段心情记录`,
      'afternoon_records': `完成 ${conditionValue} 次下午时段心情记录`,
      'evening_records': `完成 ${conditionValue} 次晚间时段心情记录`,
      'multi_segment_streak': `连续 ${conditionValue} 天完成三段心情记录`,
      'tag_weight_count': `累计设置 ${conditionValue} 个标签权重`,
      'daily_tasks_completed': `完成 ${conditionValue} 个每日任务`,
      'weekly_tasks_completed': `完成 ${conditionValue} 个周任务`,
      'star_coins_earned': `累计获得 ${conditionValue} 星币`,
      'all_tasks_completed': '完成所有类型任务',
      'cross_room_read': `跨房间阅读 ${conditionValue} 个故事章节`,
      'specific_mood_records': `指定情绪记录 ${conditionValue} 次`,
      'consecutive_task_claims': `连续 ${conditionValue} 天领取任务奖励`,
      'combo_achievement': '完成所有组合条件',
      'retrospective_count': `累计完成 ${conditionValue} 次心情回顾`
    };
    
    return conditionMap[conditionType] || `${conditionType} ${conditionValue}`;
  }

  getComboAchievements(userId) {
    const progress = achievementRepository.getComboAchievementProgress(userId);
    
    const crossRoomCompleted = progress.crossRoomRead.roomsCount >= progress.crossRoomRead.roomsTarget &&
                               progress.crossRoomRead.chaptersCount >= progress.crossRoomRead.chaptersTarget;
    const moodCompleted = progress.specificMoodRecord.totalRecords >= progress.specificMoodRecord.totalTarget &&
                          progress.specificMoodRecord.uniqueMoodTypes >= progress.specificMoodRecord.uniqueTarget;
    const claimCompleted = progress.consecutiveTaskClaims.currentStreak >= progress.consecutiveTaskClaims.target;
    
    const allCompleted = crossRoomCompleted && moodCompleted && claimCompleted;
    
    if (allCompleted) {
      achievementRepository.checkAndUnlock(userId, 'combo_achievement', 1);
    }
    
    const comboAchievements = [
      {
        id: 'combo_master',
        name: '全能旅人',
        description: '跨房间阅读、记录多元情绪、连续领取任务，三位一体的成长见证',
        icon: '🎭',
        conditionType: 'combo_achievement',
        conditionText: '同时完成：跨房间阅读、指定情绪记录、连续任务领取',
        isUnlocked: allCompleted,
        progress: allCompleted ? 1 : 0,
        target: 1,
        subConditions: [
          {
            key: 'crossRoomRead',
            name: '跨房间阅读',
            description: '在多个不同房间中阅读故事章节',
            progress: {
              rooms: progress.crossRoomRead.roomsCount,
              chapters: progress.crossRoomRead.chaptersCount
            },
            target: {
              rooms: progress.crossRoomRead.roomsTarget,
              chapters: progress.crossRoomRead.chaptersTarget
            },
            completed: crossRoomCompleted
          },
          {
            key: 'specificMoodRecord',
            name: '指定情绪记录',
            description: '记录不同类型的心情，体验丰富情感',
            progress: {
              totalRecords: progress.specificMoodRecord.totalRecords,
              uniqueTypes: progress.specificMoodRecord.uniqueMoodTypes
            },
            target: {
              totalRecords: progress.specificMoodRecord.totalTarget,
              uniqueTypes: progress.specificMoodRecord.uniqueTarget
            },
            completed: moodCompleted
          },
          {
            key: 'consecutiveTaskClaims',
            name: '连续任务领取',
            description: '每天完成并领取任务奖励，保持行动力',
            progress: {
              streak: progress.consecutiveTaskClaims.currentStreak
            },
            target: {
              streak: progress.consecutiveTaskClaims.target
            },
            completed: claimCompleted
          }
        ]
      }
    ];
    
    return comboAchievements;
  }

  getReminders(userId) {
    const today = new Date();
    const reminders = [];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const todayMoods = moodRepository.findByDate(userId, todayStr);
    const yesterdayMoods = moodRepository.findByDate(userId, yesterdayStr);
    const currentStreak = moodRepository.getStreakDays(userId);
    
    if (todayMoods.length === 0 && yesterdayMoods.length === 0 && currentStreak > 0) {
      const lastRecordDate = moodRepository.getLastRecordDate(userId);
      reminders.push({
        type: 'streak_broken',
        title: '连续记录中断',
        message: '🔥 连续记录已中断，昨天忘记记录了。今天重新开始吧！',
        currentStreak,
        lastRecordDate,
        priority: 'high',
        event: notificationEvents.createStreakBrokenEvent(currentStreak, lastRecordDate)
      });
    } else if (todayMoods.length === 0 && currentStreak > 0) {
      reminders.push({
        type: 'streak_reminder',
        title: '保持连续记录',
        message: `🔥 已连续记录 ${currentStreak} 天，别忘了今天的心情记录哦！`,
        currentStreak,
        priority: 'normal'
      });
    }
    
    const dailyTasks = taskRepository.getUserDailyTasks(userId, today);
    const uncompletedDaily = dailyTasks.filter(t => !t.is_completed);
    const claimableDaily = dailyTasks.filter(t => t.is_completed && !t.is_claimed);
    
    if (claimableDaily.length > 0) {
      reminders.push({
        type: 'task_claimable',
        title: claimableDaily.length > 1 ? `${claimableDaily.length} 个任务可领取` : '任务可领取',
        message: claimableDaily.length > 1
          ? `✨ 有 ${claimableDaily.length} 个每日任务奖励待领取！`
          : `✨ 「${claimableDaily[0].title}」的奖励可以领取了！`,
        count: claimableDaily.length,
        tasks: claimableDaily,
        priority: 'normal',
        event: notificationEvents.createTaskClaimableEvent(claimableDaily)
      });
    }
    
    if (uncompletedDaily.length > 0) {
      reminders.push({
        type: 'daily_task',
        title: '每日任务提醒',
        message: `还有 ${uncompletedDaily.length} 个每日任务未完成，快去完成吧！`,
        count: uncompletedDaily.length,
        priority: 'normal'
      });
    }
    
    const weeklyTasks = taskRepository.getUserWeeklyTasks(userId, today);
    const uncompletedWeekly = weeklyTasks.filter(t => !t.is_completed);
    const claimableWeekly = weeklyTasks.filter(t => t.is_completed && !t.is_claimed);
    
    if (claimableWeekly.length > 0) {
      reminders.push({
        type: 'task_claimable',
        title: `${claimableWeekly.length} 个周任务可领取`,
        message: `✨ 有 ${claimableWeekly.length} 个周任务奖励待领取！`,
        count: claimableWeekly.length,
        tasks: claimableWeekly,
        priority: 'low'
      });
    }
    
    if (uncompletedWeekly.length > 0) {
      reminders.push({
        type: 'weekly_task',
        title: '周任务提醒',
        message: `还有 ${uncompletedWeekly.length} 个周任务未完成，本周结束前加油！`,
        count: uncompletedWeekly.length,
        priority: 'low'
      });
    }
    
    const chainGroups = this.getChainTasksWithStatus(userId);
    chainGroups.forEach(group => {
      const currentTask = group.tasks.find(t => t.isUnlocked && !t.isCompleted);
      if (currentTask && currentTask.resetType === 'streak') {
        reminders.push({
          type: 'chain_task',
          title: `${group.chainName}提醒`,
          message: `「${currentTask.title}」是连续任务，别忘了今天记录心情保持连续！`,
          taskId: currentTask.id,
          chainId: group.chainId,
          priority: 'high'
        });
      }
    });
    
    return reminders;
  }
}

module.exports = new AchievementService();
