import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { achievementApi } from '@/api'

export const useAchievementStore = defineStore('achievement', () => {
  const tasks = ref({
    dailyTasks: [],
    weeklyTasks: [],
    onceTasks: [],
    chainTasks: [],
    dailyRefreshTime: null,
    weeklyRefreshTime: null
  })
  const achievements = ref([])
  const comboAchievements = ref([])
  const unlockedCount = ref(0)
  const totalCount = ref(0)
  const taskStats = ref(null)
  const reminders = ref([])

  async function fetchTasks() {
    try {
      const response = await achievementApi.getTasks()
      if (response.code === 200) {
        tasks.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取任务列表失败' }
    }
  }

  async function claimTask(taskId) {
    try {
      const response = await achievementApi.claimTask(taskId)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '领取奖励失败' }
    }
  }

  async function updateTaskProgress(taskType, amount = 1) {
    try {
      const response = await achievementApi.updateTaskProgress(taskType, amount)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '更新任务进度失败' }
    }
  }

  async function fetchTaskStats() {
    try {
      const response = await achievementApi.getTaskStats()
      if (response.code === 200) {
        taskStats.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取任务统计失败' }
    }
  }

  async function fetchAchievements() {
    try {
      const response = await achievementApi.getAchievements()
      if (response.code === 200) {
        achievements.value = response.data.achievements
        unlockedCount.value = response.data.unlockedCount
        totalCount.value = response.data.totalCount
        if (response.data.comboAchievements) {
          comboAchievements.value = response.data.comboAchievements
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取成就列表失败' }
    }
  }

  async function fetchComboAchievements() {
    try {
      const response = await achievementApi.getComboAchievements()
      if (response.code === 200) {
        comboAchievements.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取组合成就失败' }
    }
  }

  async function fetchReminders() {
    try {
      const response = await achievementApi.getReminders()
      if (response.code === 200) {
        reminders.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取提醒失败' }
    }
  }

  const dailyTasks = computed(() => tasks.value?.dailyTasks || [])
  const weeklyTasks = computed(() => tasks.value?.weeklyTasks || [])
  const onceTasks = computed(() => tasks.value?.onceTasks || [])
  const chainTasks = computed(() => tasks.value?.chainTasks || [])

  const dailyRefreshTime = computed(() => tasks.value?.dailyRefreshTime)
  const weeklyRefreshTime = computed(() => tasks.value?.weeklyRefreshTime)

  const hasUnclaimedRewards = computed(() => {
    const allTasks = [
      ...(tasks.value?.dailyTasks || []),
      ...(tasks.value?.weeklyTasks || []),
      ...(tasks.value?.onceTasks || [])
    ]
    const chainTaskList = (tasks.value?.chainTasks || []).flatMap(g => g.tasks || [])
    return [...allTasks, ...chainTaskList].some(t => t.isCompleted && !t.isClaimed)
  })

  const highPriorityReminders = computed(() => 
    reminders.value.filter(r => r.priority === 'high')
  )

  return {
    tasks,
    achievements,
    comboAchievements,
    unlockedCount,
    totalCount,
    taskStats,
    reminders,
    dailyTasks,
    weeklyTasks,
    onceTasks,
    chainTasks,
    dailyRefreshTime,
    weeklyRefreshTime,
    hasUnclaimedRewards,
    highPriorityReminders,
    fetchTasks,
    claimTask,
    updateTaskProgress,
    fetchTaskStats,
    fetchAchievements,
    fetchComboAchievements,
    fetchReminders
  }
})
