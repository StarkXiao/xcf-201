import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const NOTIFICATION_TYPES = {
  MOOD_RECORDED: 'mood_recorded',
  ROOM_UNLOCKED: 'room_unlocked',
  TASK_COMPLETED: 'task_completed',
  TASK_CLAIMABLE: 'task_claimable',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  STREAK_BROKEN: 'streak_broken',
  STREAK_CONTINUED: 'streak_continued',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success'
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const maxNotifications = 5
  const defaultDuration = 4000

  const sortedNotifications = computed(() => {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    return [...notifications.value].sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  })

  function generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function addNotification(notification) {
    const id = notification.id || generateId()
    const notif = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      category: notification.category || 'info',
      icon: notification.icon || 'info',
      title: notification.title || '',
      message: notification.message || '',
      data: notification.data || {},
      timestamp: notification.timestamp || new Date().toISOString(),
      duration: notification.duration || defaultDuration,
      priority: notification.priority || 'normal',
      visible: true
    }

    if (notifications.value.length >= maxNotifications) {
      const lowestPriorityIndex = notifications.value.reduce((lowestIdx, n, idx, arr) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        return priorityOrder[n.priority] > priorityOrder[arr[lowestIdx].priority] ? idx : lowestIdx
      }, 0)
      removeNotification(notifications.value[lowestPriorityIndex].id)
    }

    notifications.value.push(notif)

    if (notif.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notif.duration)
    }

    return id
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value[index].visible = false
      setTimeout(() => {
        notifications.value = notifications.value.filter(n => n.id !== id)
      }, 300)
    }
  }

  function clearAll() {
    notifications.value.forEach(n => {
      n.visible = false
    })
    setTimeout(() => {
      notifications.value = []
    }, 300)
  }

  function push(events) {
    if (!events) return

    if (Array.isArray(events)) {
      events.forEach((event, index) => {
        setTimeout(() => {
          addNotification(event)
        }, index * 1500)
      })
    } else {
      addNotification(events)
    }
  }

  function success(message, title = '成功', options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.SUCCESS,
      category: 'success',
      title,
      message
    })
  }

  function error(message, title = '错误', options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.ERROR,
      category: 'error',
      title,
      message
    })
  }

  function warning(message, title = '提醒', options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.WARNING,
      category: 'warning',
      title,
      message
    })
  }

  function info(message, title = '提示', options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.INFO,
      category: 'info',
      title,
      message
    })
  }

  function moodRecorded(segmentCount, totalSegments, options = {}) {
    const isComplete = segmentCount >= totalSegments
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.MOOD_RECORDED,
      category: 'success',
      icon: 'heart',
      title: '心情记录成功',
      message: isComplete
        ? '🎉 完成今日三段心情记录！'
        : `已记录 ${segmentCount}/${totalSegments} 时段`
    })
  }

  function roomUnlocked(room, options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.ROOM_UNLOCKED,
      category: 'success',
      icon: 'door',
      title: '房间解锁',
      message: `🎉 「${room.name || room.roomName || '新房间'}」解锁成功！快去探索新的故事吧~`,
      priority: 'high'
    })
  }

  function taskCompleted(task, options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.TASK_COMPLETED,
      category: 'success',
      icon: 'target',
      title: '任务完成',
      message: `🎯 完成任务：${task.title || task.taskTitle || '未知任务'}！快去领取奖励吧~`
    })
  }

  function taskClaimable(tasks, options = {}) {
    const taskList = Array.isArray(tasks) ? tasks : [tasks]
    const count = taskList.length
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.TASK_CLAIMABLE,
      category: 'info',
      icon: 'gift',
      title: count > 1 ? `${count} 个任务可领取` : '任务可领取',
      message: count > 1
        ? `✨ 有 ${count} 个任务奖励待领取！`
        : `✨ 「${taskList[0].title || taskList[0].taskTitle || '任务'}」的奖励可以领取了！`
    })
  }

  function achievementUnlocked(achievement, options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
      category: 'success',
      icon: 'trophy',
      title: '成就达成',
      message: `🏆 获得新成就：${achievement.name || achievement.achievementName || '未知成就'}！`,
      priority: 'high',
      duration: 5000
    })
  }

  function streakBroken(currentStreak, options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.STREAK_BROKEN,
      category: 'warning',
      icon: 'flame',
      title: '连续记录中断',
      message: '🔥 连续记录已中断，昨天忘记记录了。重新开始吧！',
      priority: 'high',
      duration: 5000
    })
  }

  function streakContinued(streakDays, options = {}) {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.STREAK_CONTINUED,
      category: 'success',
      icon: 'flame',
      title: '连续记录保持',
      message: `🔥 已连续记录 ${streakDays} 天，继续保持！`
    })
  }

  return {
    notifications,
    sortedNotifications,
    maxNotifications,
    addNotification,
    removeNotification,
    clearAll,
    push,
    success,
    error,
    warning,
    info,
    moodRecorded,
    roomUnlocked,
    taskCompleted,
    taskClaimable,
    achievementUnlocked,
    streakBroken,
    streakContinued
  }
})
