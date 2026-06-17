import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { moodLabApi } from '@/api'

export const useMoodLabStore = defineStore('moodLab', () => {
  const overview = ref(null)
  const trends = ref(null)
  const clustering = ref(null)
  const quests = ref(null)
  const loading = ref(false)

  async function fetchOverview() {
    try {
      loading.value = true
      const response = await moodLabApi.getOverview()
      if (response.code === 200) {
        overview.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取概览失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchTrends() {
    try {
      loading.value = true
      const response = await moodLabApi.getTrends()
      if (response.code === 200) {
        trends.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取趋势分析失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchClustering() {
    try {
      loading.value = true
      const response = await moodLabApi.getClustering()
      if (response.code === 200) {
        clustering.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取行为分群失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchQuests() {
    try {
      loading.value = true
      const response = await moodLabApi.getQuests()
      if (response.code === 200) {
        quests.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取探索任务失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    try {
      loading.value = true
      const [overviewRes, trendsRes, clusteringRes, questsRes] = await Promise.all([
        moodLabApi.getOverview(),
        moodLabApi.getTrends(),
        moodLabApi.getClustering(),
        moodLabApi.getQuests()
      ])

      if (overviewRes.code === 200) overview.value = overviewRes.data
      if (trendsRes.code === 200) trends.value = trendsRes.data
      if (clusteringRes.code === 200) clustering.value = clusteringRes.data
      if (questsRes.code === 200) quests.value = questsRes.data

      return { success: true }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '加载数据失败' }
    } finally {
      loading.value = false
    }
  }

  const overallType = computed(() => overview.value?.overallType || null)
  const moodTrend = computed(() => trends.value?.moodTrend || null)
  const tagTrend = computed(() => trends.value?.tagTrend || null)
  const recordTrend = computed(() => trends.value?.recordTrend || null)
  const storyTrend = computed(() => trends.value?.storyTrend || null)
  const rewardTrend = computed(() => trends.value?.rewardTrend || null)

  const recordCluster = computed(() => clustering.value?.recordBehavior || null)
  const moodCluster = computed(() => clustering.value?.moodPattern || null)
  const storyCluster = computed(() => clustering.value?.storyExplorer || null)
  const rewardCluster = computed(() => clustering.value?.rewardBehavior || null)

  const questList = computed(() => quests.value?.quests || [])
  const recommendedQuests = computed(() => quests.value?.recommended || [])

  return {
    overview,
    trends,
    clustering,
    quests,
    loading,
    overallType,
    moodTrend,
    tagTrend,
    recordTrend,
    storyTrend,
    rewardTrend,
    recordCluster,
    moodCluster,
    storyCluster,
    rewardCluster,
    questList,
    recommendedQuests,
    fetchOverview,
    fetchTrends,
    fetchClustering,
    fetchQuests,
    fetchAll
  }
})
