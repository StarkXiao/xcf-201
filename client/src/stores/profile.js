import { defineStore } from 'pinia'
import { ref } from 'vue'
import { profileApi } from '@/api'

export const useProfileStore = defineStore('profile', () => {
  const growthProfile = ref(null)
  const isLoading = ref(false)

  async function fetchGrowthProfile() {
    isLoading.value = true
    try {
      const response = await profileApi.getGrowthProfile()
      if (response.code === 200) {
        growthProfile.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取成长档案失败' 
      }
    } finally {
      isLoading.value = false
    }
  }

  function clearGrowthProfile() {
    growthProfile.value = null
  }

  return {
    growthProfile,
    isLoading,
    fetchGrowthProfile,
    clearGrowthProfile
  }
})
