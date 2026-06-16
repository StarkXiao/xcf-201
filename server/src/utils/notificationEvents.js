const EVENT_TYPES = {
  MOOD_RECORDED: 'mood_recorded',
  ROOM_UNLOCKED: 'room_unlocked',
  TASK_COMPLETED: 'task_completed',
  TASK_CLAIMABLE: 'task_claimable',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  STREAK_BROKEN: 'streak_broken',
  STREAK_CONTINUED: 'streak_continued',
  ERROR: 'error',
  INFO: 'info'
}

const EVENT_CATEGORIES = {
  [EVENT_TYPES.MOOD_RECORDED]: 'success',
  [EVENT_TYPES.ROOM_UNLOCKED]: 'success',
  [EVENT_TYPES.TASK_COMPLETED]: 'success',
  [EVENT_TYPES.TASK_CLAIMABLE]: 'info',
  [EVENT_TYPES.ACHIEVEMENT_UNLOCKED]: 'success',
  [EVENT_TYPES.STREAK_BROKEN]: 'warning',
  [EVENT_TYPES.STREAK_CONTINUED]: 'success',
  [EVENT_TYPES.ERROR]: 'error',
  [EVENT_TYPES.INFO]: 'info'
}

const EVENT_ICONS = {
  [EVENT_TYPES.MOOD_RECORDED]: 'heart',
  [EVENT_TYPES.ROOM_UNLOCKED]: 'door',
  [EVENT_TYPES.TASK_COMPLETED]: 'target',
  [EVENT_TYPES.TASK_CLAIMABLE]: 'gift',
  [EVENT_TYPES.ACHIEVEMENT_UNLOCKED]: 'trophy',
  [EVENT_TYPES.STREAK_BROKEN]: 'flame',
  [EVENT_TYPES.STREAK_CONTINUED]: 'flame',
  [EVENT_TYPES.ERROR]: 'alert',
  [EVENT_TYPES.INFO]: 'info'
}

function createEvent(type, data = {}, options = {}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    category: EVENT_CATEGORIES[type] || options.category || 'info',
    icon: EVENT_ICONS[type] || options.icon || 'info',
    title: options.title || '',
    message: options.message || '',
    data,
    timestamp: new Date().toISOString(),
    duration: options.duration || 4000,
    priority: options.priority || 'normal'
  }
}

function createMoodRecordedEvent(segmentCount, totalSegments) {
  const isComplete = segmentCount >= 3
  return createEvent(
    EVENT_TYPES.MOOD_RECORDED,
    { segmentCount, totalSegments, isComplete },
    {
      title: '心情记录成功',
      message: isComplete
        ? '🎉 完成今日三段心情记录！'
        : `已记录 ${segmentCount}/${totalSegments} 时段`,
      category: 'success',
      priority: 'normal'
    }
  )
}

function createRoomUnlockedEvent(room) {
  return createEvent(
    EVENT_TYPES.ROOM_UNLOCKED,
    { roomId: room.id, roomName: room.name },
    {
      title: '房间解锁',
      message: `🎉 「${room.name}」解锁成功！快去探索新的故事吧~`,
      category: 'success',
      priority: 'high'
    }
  )
}

function createTaskCompletedEvent(task) {
  return createEvent(
    EVENT_TYPES.TASK_COMPLETED,
    { taskId: task.taskId || task.id, taskTitle: task.title, reward: task.reward },
    {
      title: '任务完成',
      message: `🎯 完成任务：${task.title}！快去领取奖励吧~`,
      category: 'success',
      priority: 'normal'
    }
  )
}

function createTaskClaimableEvent(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [tasks]
  const count = taskList.length
  return createEvent(
    EVENT_TYPES.TASK_CLAIMABLE,
    { count, tasks: taskList },
    {
      title: count > 1 ? `${count} 个任务可领取` : '任务可领取',
      message: count > 1
        ? `✨ 有 ${count} 个任务奖励待领取！`
        : `✨ 「${taskList[0].title}」的奖励可以领取了！`,
      category: 'info',
      priority: 'normal'
    }
  )
}

function createAchievementUnlockedEvent(achievement) {
  return createEvent(
    EVENT_TYPES.ACHIEVEMENT_UNLOCKED,
    { achievementId: achievement.id, achievementName: achievement.name, icon: achievement.icon },
    {
      title: '成就达成',
      message: `🏆 获得新成就：${achievement.name}！`,
      category: 'success',
      priority: 'high',
      duration: 5000
    }
  )
}

function createStreakBrokenEvent(currentStreak, lastRecordDate) {
  return createEvent(
    EVENT_TYPES.STREAK_BROKEN,
    { currentStreak, lastRecordDate },
    {
      title: '连续记录中断',
      message: `🔥 连续记录已中断，昨天忘记记录了。重新开始吧！`,
      category: 'warning',
      priority: 'high',
      duration: 5000
    }
  )
}

function createStreakContinuedEvent(streakDays) {
  return createEvent(
    EVENT_TYPES.STREAK_CONTINUED,
    { streakDays },
    {
      title: '连续记录保持',
      message: `🔥 已连续记录 ${streakDays} 天，继续保持！`,
      category: 'success',
      priority: 'low'
    }
  )
}

function createBatchEventsFromMoodResult(result) {
  const events = []

  if (result.dayAggregate) {
    const segments = result.dayAggregate.segments || []
    const mainSegments = segments.filter(s => ['morning', 'afternoon', 'evening'].includes(s.time_segment))
    events.push(createMoodRecordedEvent(mainSegments.length, 3))
  }

  if (result.newlyUnlockedRooms && result.newlyUnlockedRooms.length > 0) {
    result.newlyUnlockedRooms.forEach(room => {
      events.push(createRoomUnlockedEvent(room))
    })
  }

  if (result.newlyUnlockedAchievements && result.newlyUnlockedAchievements.length > 0) {
    result.newlyUnlockedAchievements.forEach(achievement => {
      events.push(createAchievementUnlockedEvent(achievement))
    })
  }

  if (result.newlyCompletedTasks && result.newlyCompletedTasks.length > 0) {
    result.newlyCompletedTasks.forEach(task => {
      events.push(createTaskCompletedEvent(task))
    })
  }

  return events
}

module.exports = {
  EVENT_TYPES,
  EVENT_CATEGORIES,
  EVENT_ICONS,
  createEvent,
  createMoodRecordedEvent,
  createRoomUnlockedEvent,
  createTaskCompletedEvent,
  createTaskClaimableEvent,
  createAchievementUnlockedEvent,
  createStreakBrokenEvent,
  createStreakContinuedEvent,
  createBatchEventsFromMoodResult
}
