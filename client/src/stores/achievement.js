import { defineStore } from 'pinia'
import { ref } from 'vue'
import { achievementApi } from '@/api'

export const useAchievementStore = defineStore('achievement', () => {
  const tasks = ref({ dailyTasks: [], onceTasks: [], refreshTime: null })
  const achievements = ref([])
  const unlockedCount = ref(0)
  const totalCount = ref(0)

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

  async function fetchAchievements() {
    try {
      const response = await achievementApi.getAchievements()
      if (response.code === 200) {
        achievements.value = response.data.achievements
        unlockedCount.value = response.data.unlockedCount
        totalCount.value = response.data.totalCount
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取成就列表失败' }
    }
  }

  return {
    tasks,
    achievements,
    unlockedCount,
    totalCount,
    fetchTasks,
    claimTask,
    fetchAchievements
  }
})
