import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dreamCollectionApi } from '@/api'

export const useDreamCollectionStore = defineStore('dreamCollection', () => {
  const overview = ref(null)
  const fragments = ref([])
  const fragmentsTotal = ref(0)
  const fragmentStats = ref([])
  const storyCards = ref([])
  const storyCardRoomStats = ref([])
  const storyCardTotalCount = ref(0)
  const highlights = ref([])
  const highlightsTotal = ref(0)
  const goals = ref([])
  const isLoading = ref(false)

  const fragmentCount = computed(() => overview.value?.fragmentCount || 0)
  const storyCardCount = computed(() => overview.value?.storyCardCount || 0)
  const highlightCount = computed(() => overview.value?.highlightCount || 0)
  const goalCount = computed(() => overview.value?.goalCount || 0)
  const completedGoalCount = computed(() => overview.value?.completedGoalCount || 0)
  const starredFragmentCount = computed(() => overview.value?.starredFragmentCount || 0)
  const favoriteHighlightCount = computed(() => overview.value?.favoriteHighlightCount || 0)

  const activeGoals = computed(() => goals.value.filter(g => !g.is_completed))
  const completedGoals = computed(() => goals.value.filter(g => g.is_completed))

  async function fetchOverview() {
    try {
      const response = await dreamCollectionApi.getOverview()
      if (response.code === 200) {
        overview.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取概览失败' }
    }
  }

  async function fetchFragments(params = {}) {
    try {
      const response = await dreamCollectionApi.getFragments(params)
      if (response.code === 200) {
        fragments.value = response.data.fragments
        fragmentsTotal.value = response.data.total
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取情绪片段失败' }
    }
  }

  async function createFragment(data) {
    try {
      const response = await dreamCollectionApi.createFragment(data)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '创建情绪片段失败' }
    }
  }

  async function updateFragment(id, data) {
    try {
      const response = await dreamCollectionApi.updateFragment(id, data)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '更新情绪片段失败' }
    }
  }

  async function deleteFragment(id) {
    try {
      const response = await dreamCollectionApi.deleteFragment(id)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除情绪片段失败' }
    }
  }

  async function starFragment(id, isStarred) {
    try {
      const response = await dreamCollectionApi.starFragment(id, isStarred)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '操作失败' }
    }
  }

  async function fetchFragmentStats() {
    try {
      const response = await dreamCollectionApi.getFragmentStats()
      if (response.code === 200) {
        fragmentStats.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取统计失败' }
    }
  }

  async function fetchStoryCards(params = {}) {
    try {
      const response = await dreamCollectionApi.getStoryCards(params)
      if (response.code === 200) {
        storyCards.value = response.data.cards
        storyCardRoomStats.value = response.data.roomStats
        storyCardTotalCount.value = response.data.totalCount
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取故事卡失败' }
    }
  }

  async function unlockStoryCard(data) {
    try {
      const response = await dreamCollectionApi.unlockStoryCard(data)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '解锁故事卡失败' }
    }
  }

  async function deleteStoryCard(id) {
    try {
      const response = await dreamCollectionApi.deleteStoryCard(id)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除故事卡失败' }
    }
  }

  async function fetchHighlights(params = {}) {
    try {
      const response = await dreamCollectionApi.getHighlights(params)
      if (response.code === 200) {
        highlights.value = response.data.highlights
        highlightsTotal.value = response.data.total
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取高光收藏失败' }
    }
  }

  async function createHighlight(data) {
    try {
      const response = await dreamCollectionApi.createHighlight(data)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '收藏高光失败' }
    }
  }

  async function updateHighlight(id, data) {
    try {
      const response = await dreamCollectionApi.updateHighlight(id, data)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '更新高光失败' }
    }
  }

  async function deleteHighlight(id) {
    try {
      const response = await dreamCollectionApi.deleteHighlight(id)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除高光失败' }
    }
  }

  async function favoriteHighlight(id, isFavorite) {
    try {
      const response = await dreamCollectionApi.favoriteHighlight(id, isFavorite)
      if (response.code === 200) {
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '操作失败' }
    }
  }

  async function fetchGoals(params = {}) {
    try {
      const response = await dreamCollectionApi.getGoals(params)
      if (response.code === 200) {
        goals.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取收藏目标失败' }
    }
  }

  async function createGoal(data) {
    try {
      const response = await dreamCollectionApi.createGoal(data)
      if (response.code === 200) {
        await fetchGoals()
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '创建目标失败' }
    }
  }

  async function initDefaultGoals() {
    try {
      const response = await dreamCollectionApi.initGoals()
      if (response.code === 200) {
        await fetchGoals()
        await fetchOverview()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '初始化目标失败' }
    }
  }

  async function deleteGoal(id) {
    try {
      const response = await dreamCollectionApi.deleteGoal(id)
      if (response.code === 200) {
        await fetchGoals()
        await fetchOverview()
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除目标失败' }
    }
  }

  return {
    overview,
    fragments,
    fragmentsTotal,
    fragmentStats,
    storyCards,
    storyCardRoomStats,
    storyCardTotalCount,
    highlights,
    highlightsTotal,
    goals,
    isLoading,
    fragmentCount,
    storyCardCount,
    highlightCount,
    goalCount,
    completedGoalCount,
    starredFragmentCount,
    favoriteHighlightCount,
    activeGoals,
    completedGoals,
    fetchOverview,
    fetchFragments,
    createFragment,
    updateFragment,
    deleteFragment,
    starFragment,
    fetchFragmentStats,
    fetchStoryCards,
    unlockStoryCard,
    deleteStoryCard,
    fetchHighlights,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    favoriteHighlight,
    fetchGoals,
    createGoal,
    initDefaultGoals,
    deleteGoal
  }
})
