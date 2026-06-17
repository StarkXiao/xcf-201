import { defineStore } from 'pinia'
import { ref } from 'vue'
import { crisisCenterApi } from '@/api'

export const useCrisisCenterStore = defineStore('crisisCenter', () => {
  const analysis = ref(null)
  const loading = ref(false)

  async function fetchAnalysis() {
    loading.value = true
    try {
      const response = await crisisCenterApi.getAnalysis()
      if (response.code === 200) {
        analysis.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取危机预警分析失败' }
    } finally {
      loading.value = false
    }
  }

  return {
    analysis,
    loading,
    fetchAnalysis
  }
})
