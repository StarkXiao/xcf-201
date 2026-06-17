import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { wishCommissionApi } from '@/api'
import { useNotificationStore } from './notification'

export const useWishCommissionStore = defineStore('wishCommission', () => {
  const templates = ref([])
  const templateTypes = ref([])
  const myCommissions = ref([])
  const stats = ref(null)
  const coinInfo = ref(null)
  const retrospectives = ref([])
  const isLoading = ref(false)

  async function fetchTemplates(params = {}) {
    try {
      const response = await wishCommissionApi.getTemplates(params)
      if (response.code === 200) {
        templates.value = response.data.templates || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取委托模板失败' }
    }
  }

  async function fetchTemplateTypes() {
    try {
      const response = await wishCommissionApi.getTemplateTypes()
      if (response.code === 200) {
        templateTypes.value = response.data || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取委托类型失败' }
    }
  }

  async function fetchMyCommissions(params = {}) {
    try {
      const response = await wishCommissionApi.getMyCommissions(params)
      if (response.code === 200) {
        myCommissions.value = response.data || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取我的委托失败' }
    }
  }

  async function fetchStats() {
    try {
      const response = await wishCommissionApi.getMyStats()
      if (response.code === 200) {
        stats.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取统计数据失败' }
    }
  }

  async function fetchCoinInfo() {
    try {
      const response = await wishCommissionApi.getCoinInfo()
      if (response.code === 200) {
        coinInfo.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取星币信息失败' }
    }
  }

  async function acceptCommission(templateId) {
    try {
      const response = await wishCommissionApi.acceptCommission(templateId)
      if (response.code === 200) {
        const notificationStore = useNotificationStore()
        notificationStore.success('委托接取成功！', '新委托')
        await fetchTemplates()
        await fetchMyCommissions()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '接取委托失败' }
    }
  }

  async function updateProgress() {
    try {
      const response = await wishCommissionApi.updateProgress()
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '更新进度失败' }
    }
  }

  async function claimReward(commissionId) {
    try {
      const response = await wishCommissionApi.claimReward(commissionId)
      if (response.code === 200) {
        const notificationStore = useNotificationStore()
        notificationStore.success(
          `🎉 获得 ${response.data.rewardCoins} 星币！`,
          '奖励领取成功'
        )
        await fetchMyCommissions()
        await fetchStats()
        await fetchCoinInfo()
        await fetchTemplates()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '领取奖励失败' }
    }
  }

  async function fetchRetrospectives(params = {}) {
    try {
      const response = await wishCommissionApi.getRetrospectives(params)
      if (response.code === 200) {
        retrospectives.value = response.data || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取复盘列表失败' }
    }
  }

  async function createRetrospective(commissionId, data) {
    try {
      const response = await wishCommissionApi.createRetrospective(commissionId, data)
      if (response.code === 200) {
        const notificationStore = useNotificationStore()
        notificationStore.success('复盘提交成功！', '成长记录')
        await fetchRetrospectives()
        await fetchMyCommissions()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '提交复盘失败' }
    }
  }

  async function getRetrospective(commissionId) {
    try {
      const response = await wishCommissionApi.getRetrospective(commissionId)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取复盘详情失败' }
    }
  }

  const acceptedCommissions = computed(() => 
    myCommissions.value.filter(c => c.status === 'accepted')
  )

  const completedCommissions = computed(() => 
    myCommissions.value.filter(c => c.status === 'completed')
  )

  const claimedCommissions = computed(() => 
    myCommissions.value.filter(c => c.status === 'claimed')
  )

  const hasUnclaimedRewards = computed(() => 
    myCommissions.value.some(c => c.status === 'completed')
  )

  const starCoins = computed(() => coinInfo.value?.balance || 0)
  const totalEarned = computed(() => coinInfo.value?.totalEarned || 0)

  return {
    templates,
    templateTypes,
    myCommissions,
    stats,
    coinInfo,
    retrospectives,
    isLoading,
    acceptedCommissions,
    completedCommissions,
    claimedCommissions,
    hasUnclaimedRewards,
    starCoins,
    totalEarned,
    fetchTemplates,
    fetchTemplateTypes,
    fetchMyCommissions,
    fetchStats,
    fetchCoinInfo,
    acceptCommission,
    updateProgress,
    claimReward,
    fetchRetrospectives,
    createRetrospective,
    getRetrospective
  }
})
