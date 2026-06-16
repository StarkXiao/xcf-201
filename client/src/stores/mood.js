import { defineStore } from 'pinia'
import { ref } from 'vue'
import { moodApi } from '@/api'

export const useMoodStore = defineStore('mood', () => {
  const moods = ref([])
  const stats = ref(null)
  const currentMood = ref(null)

  async function fetchMoods(year, month) {
    try {
      const response = await moodApi.getMoods(year, month)
      if (response.code === 200) {
        moods.value = response.data.records
        stats.value = response.data.stats
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取心情记录失败' }
    }
  }

  async function fetchMoodByDate(date) {
    try {
      const response = await moodApi.getMoodByDate(date)
      if (response.code === 200) {
        currentMood.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取心情记录失败' }
    }
  }

  async function createMood(moodData) {
    try {
      const response = await moodApi.createMood(moodData)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '记录心情失败' }
    }
  }

  async function deleteMood(date) {
    try {
      const response = await moodApi.deleteMood(date)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除心情记录失败' }
    }
  }

  return {
    moods,
    stats,
    currentMood,
    fetchMoods,
    fetchMoodByDate,
    createMood,
    deleteMood
  }
})
