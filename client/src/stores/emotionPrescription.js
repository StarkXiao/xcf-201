import { defineStore } from 'pinia'
import { ref } from 'vue'
import { prescriptionApi } from '@/api'

export const useEmotionPrescriptionStore = defineStore('emotionPrescription', () => {
  const config = ref(null)
  const latestPrescription = ref(null)
  const prescriptionList = ref([])
  const archives = ref([])
  const loading = ref(false)

  async function fetchConfig() {
    try {
      const response = await prescriptionApi.getConfig()
      if (response.code === 200) {
        config.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取配置失败' }
    }
  }

  async function fetchLatest(periodType = 'weekly') {
    loading.value = true
    try {
      const response = await prescriptionApi.getLatest(periodType)
      if (response.code === 200) {
        latestPrescription.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取最新处方笺失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchList(periodType = 'weekly', limit = 12) {
    loading.value = true
    try {
      const response = await prescriptionApi.getList(periodType, limit)
      if (response.code === 200) {
        prescriptionList.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取处方笺列表失败' }
    } finally {
      loading.value = false
    }
  }

  async function generateWeekly() {
    loading.value = true
    try {
      const response = await prescriptionApi.generateWeekly()
      if (response.code === 200) {
        latestPrescription.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '生成周处方笺失败' }
    } finally {
      loading.value = false
    }
  }

  async function generateDaily() {
    loading.value = true
    try {
      const response = await prescriptionApi.generateDaily()
      if (response.code === 200) {
        latestPrescription.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '生成日处方笺失败' }
    } finally {
      loading.value = false
    }
  }

  async function viewPrescription(id) {
    try {
      const response = await prescriptionApi.viewPrescription(id)
      if (response.code === 200) {
        if (latestPrescription.value && latestPrescription.value.id === id) {
          latestPrescription.value = { ...response.data }
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '查看处方笺失败' }
    }
  }

  async function fetchArchives(archiveType, limit = 12) {
    loading.value = true
    try {
      const response = await prescriptionApi.getArchives(archiveType, limit)
      if (response.code === 200) {
        archives.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取阶段档案失败' }
    } finally {
      loading.value = false
    }
  }

  async function generateMonthlyArchive(year, month) {
    loading.value = true
    try {
      const response = await prescriptionApi.generateMonthlyArchive(year, month)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '生成月度档案失败' }
    } finally {
      loading.value = false
    }
  }

  return {
    config,
    latestPrescription,
    prescriptionList,
    archives,
    loading,
    fetchConfig,
    fetchLatest,
    fetchList,
    generateWeekly,
    generateDaily,
    viewPrescription,
    fetchArchives,
    generateMonthlyArchive
  }
})
