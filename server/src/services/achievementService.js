const taskRepository = require('../repositories/taskRepository');
const achievementRepository = require('../repositories/achievementRepository');

class AchievementService {
  getTasks(userId) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const dailyTasks = taskRepository.getUserTasksByDate(userId, todayStr);
    const onceTasks = taskRepository.getUserOnceTasks(userId);
    
    const refreshTime = new Date(today);
    refreshTime.setHours(24, 0, 0, 0);
    
    const formattedDailyTasks = dailyTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      target: task.target,
      current: task.current_progress || 0,
      reward: task.reward,
      isCompleted: !!task.is_completed,
      isClaimed: !!task.is_claimed
    }));
    
    const formattedOnceTasks = onceTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      target: task.target,
      current: task.current_progress || 0,
      reward: task.reward,
      isCompleted: !!task.is_completed,
      isClaimed: !!task.is_claimed
    }));
    
    return {
      dailyTasks: formattedDailyTasks,
      onceTasks: formattedOnceTasks,
      refreshTime: refreshTime.toISOString()
    };
  }

  claimTaskReward(userId, taskId) {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const userTask = taskRepository.getUserTask(userId, taskId, todayStr);
    
    if (!userTask || !userTask.is_completed) {
      throw new Error('任务尚未完成');
    }
    
    if (userTask.is_claimed) {
      throw new Error('奖励已领取');
    }
    
    const success = taskRepository.claimReward(userId, taskId, todayStr);
    
    return {
      success,
      reward: task.reward
    };
  }

  getAchievements(userId) {
    const achievements = achievementRepository.getUserAchievements(userId);
    const unlockedCount = achievementRepository.getUnlockedCount(userId);
    const totalCount = achievementRepository.getTotalCount();
    
    const formattedAchievements = achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      condition: this.getConditionText(achievement.condition_type, achievement.condition_value),
      isUnlocked: !!achievement.is_unlocked,
      unlockedAt: achievement.unlocked_at,
      progress: achievement.progress,
      target: achievement.condition_value
    }));
    
    return {
      achievements: formattedAchievements,
      unlockedCount,
      totalCount
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
      'tag_weight_count': `累计设置 ${conditionValue} 个标签权重`
    };
    
    return conditionMap[conditionType] || `${conditionType} ${conditionValue}`;
  }
}

module.exports = new AchievementService();
