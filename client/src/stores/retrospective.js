import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { retrospectiveApi } from '@/api'
import { useCompanionStore } from './companion'

export const useRetrospectiveStore = defineStore('retrospective', () => {
  const retrospectives = ref([])
  const dateMap = ref({})
  const stats = ref(null)
  const config = ref(null)

  async function fetchConfig() {
    try {
      const response = await retrospectiveApi.getConfig()
      if (response.code === 200) {
        config.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取配置失败' }
    }
  }

  async function fetchMonthRetrospectives(year, month) {
    try {
      const response = await retrospectiveApi.getMonthRetrospectives(year, month)
      if (response.code === 200) {
        retrospectives.value = response.data.retrospectives
        dateMap.value = response.data.dateMap || {}
        stats.value = response.data.stats
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取回顾记录失败' }
    }
  }

  async function fetchRetrospectivesByDate(date) {
    try {
      const response = await retrospectiveApi.getRetrospectivesByDate(date)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取回顾记录失败' }
    }
  }

  async function createRetrospective(data) {
    try {
      const response = await retrospectiveApi.createRetrospective(data)
      if (response.code === 200) {
        const companionStore = useCompanionStore()
        companionStore.addExperienceFromAction('retrospective', response.data?.id)
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '创建回顾失败' }
    }
  }

  async function deleteRetrospective(id) {
    try {
      const response = await retrospectiveApi.deleteRetrospective(id)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除回顾失败' }
    }
  }

  function getCountByDate(date) {
    return dateMap.value[date]?.length || 0
  }

  function getRetrospectivesByDateSync(date) {
    return dateMap.value[date] || []
  }

  return {
    retrospectives,
    dateMap,
    stats,
    config,
    fetchConfig,
    fetchMonthRetrospectives,
    fetchRetrospectivesByDate,
    createRetrospective,
    deleteRetrospective,
    getCountByDate,
    getRetrospectivesByDateSync
  }
})
