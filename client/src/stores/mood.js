import { defineStore } from 'pinia'
import { ref } from 'vue'
import { moodApi } from '@/api'

export const useMoodStore = defineStore('mood', () => {
  const moods = ref([])
  const aggregates = ref([])
  const stats = ref(null)
  const currentMood = ref(null)
  const config = ref(null)

  async function fetchConfig() {
    try {
      const response = await moodApi.getConfig()
      if (response.code === 200) {
        config.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取配置失败' }
    }
  }

  async function fetchMoods(year, month) {
    try {
      const response = await moodApi.getMoods(year, month)
      if (response.code === 200) {
        moods.value = response.data.records
        aggregates.value = response.data.aggregates || []
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

  async function deleteMood(date, timeSegment = null) {
    try {
      const response = await moodApi.deleteMood(date, timeSegment)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除心情记录失败' }
    }
  }

  async function fetchStreakStatus() {
    try {
      const response = await moodApi.getStreakStatus()
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取连续记录状态失败' }
    }
  }

  function getAggregateByDate(date) {
    return aggregates.value.find(a => a.record_date === date)
  }

  function getDominantMood(date) {
    const agg = getAggregateByDate(date)
    if (agg) {
      return agg.dominantMood
    }
    const dayMoods = moods.value.filter(m => m.record_date === date)
    if (dayMoods.length > 0) {
      return dayMoods[0].mood_type
    }
    return null
  }

  function getSegmentCount(date) {
    const agg = getAggregateByDate(date)
    return agg ? agg.segmentCount : moods.value.filter(m => m.record_date === date).length
  }

  return {
    moods,
    aggregates,
    stats,
    currentMood,
    config,
    fetchConfig,
    fetchMoods,
    fetchMoodByDate,
    createMood,
    deleteMood,
    fetchStreakStatus,
    getAggregateByDate,
    getDominantMood,
    getSegmentCount
  }
})
