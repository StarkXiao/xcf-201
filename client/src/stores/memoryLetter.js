import { defineStore } from 'pinia'
import { ref } from 'vue'
import { memoryLetterApi } from '@/api'
import { useNotificationStore } from './notification'
import { useCompanionStore } from './companion'

export const useMemoryLetterStore = defineStore('memoryLetter', () => {
  const letters = ref([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalPages = ref(0)
  const currentLetter = ref(null)
  const stats = ref(null)
  const config = ref(null)
  const upcomingLetters = ref([])
  const availableDates = ref([])
  const availableArchives = ref([])
  const selectedArchiveId = ref(null)
  const moodSnapshot = ref(null)
  const roomSnapshot = ref(null)
  const growthSnapshot = ref(null)

  const notificationStore = useNotificationStore()

  async function fetchConfig() {
    try {
      const response = await memoryLetterApi.getConfig()
      if (response.code === 200) {
        config.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取配置失败' }
    }
  }

  async function fetchStats() {
    try {
      const response = await memoryLetterApi.getStats()
      if (response.code === 200) {
        stats.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取统计失败' }
    }
  }

  async function fetchUpcoming(limit = 5) {
    try {
      const response = await memoryLetterApi.getUpcoming(limit)
      if (response.code === 200) {
        upcomingLetters.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取即将送达的信件失败' }
    }
  }

  async function fetchLetters(params = {}) {
    try {
      const response = await memoryLetterApi.getLetters(params)
      if (response.code === 200) {
        letters.value = response.data.letters
        totalCount.value = response.data.totalCount
        currentPage.value = response.data.page
        pageSize.value = response.data.pageSize
        totalPages.value = response.data.totalPages
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取信件列表失败' }
    }
  }

  async function fetchLetterDetail(id) {
    try {
      const response = await memoryLetterApi.getLetterDetail(id)
      if (response.code === 200) {
        currentLetter.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取信件详情失败' }
    }
  }

  async function createLetter(data) {
    try {
      const response = await memoryLetterApi.createLetter(data)
      if (response.code === 200) {
        if (response.data.notificationEvents) {
          notificationStore.push(response.data.notificationEvents)
        }
        if (response.data.letter) {
          currentLetter.value = response.data.letter
        }
        const companionStore = useCompanionStore()
        companionStore.addExperienceFromAction('memory_letter', response.data?.letter?.id)
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '创建信件失败' }
    }
  }

  async function checkDeliver() {
    try {
      const response = await memoryLetterApi.checkDeliver()
      if (response.code === 200) {
        if (response.data.notificationEvents && response.data.notificationEvents.length > 0) {
          notificationStore.push(response.data.notificationEvents)
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '检查信件投递失败' }
    }
  }

  async function markAsRead(id) {
    try {
      const response = await memoryLetterApi.markAsRead(id)
      if (response.code === 200) {
        if (response.data.notificationEvents) {
          notificationStore.push(response.data.notificationEvents)
        }
        if (response.data.letter) {
          currentLetter.value = response.data.letter
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '标记已读失败' }
    }
  }

  async function cancelLetter(id) {
    try {
      const response = await memoryLetterApi.cancelLetter(id)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '取消信件失败' }
    }
  }

  async function deleteLetter(id) {
    try {
      const response = await memoryLetterApi.deleteLetter(id)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '删除信件失败' }
    }
  }

  async function fetchMoodSnapshot(date) {
    try {
      const response = await memoryLetterApi.getMoodSnapshot(date)
      if (response.code === 200) {
        moodSnapshot.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取情绪快照失败' }
    }
  }

  async function fetchRoomSnapshot(date) {
    try {
      const response = await memoryLetterApi.getRoomSnapshot(date)
      if (response.code === 200) {
        roomSnapshot.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取房间快照失败' }
    }
  }

  async function fetchGrowthSnapshot(date) {
    try {
      const response = await memoryLetterApi.getGrowthSnapshot(date)
      if (response.code === 200) {
        growthSnapshot.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取成长快照失败' }
    }
  }

  async function fetchAvailableDates() {
    try {
      const response = await memoryLetterApi.getAvailableDates()
      if (response.code === 200) {
        availableDates.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取可用日期失败' }
    }
  }

  async function fetchAvailableArchives(date) {
    try {
      const response = await memoryLetterApi.getAvailableArchives(date)
      if (response.code === 200) {
        availableArchives.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取可用阶段总结失败' }
    }
  }

  function setSelectedArchive(id) {
    selectedArchiveId.value = id
  }

  function clearCurrentLetter() {
    currentLetter.value = null
    moodSnapshot.value = null
    roomSnapshot.value = null
    growthSnapshot.value = null
    availableArchives.value = []
    selectedArchiveId.value = null
  }

  return {
    letters,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    currentLetter,
    stats,
    config,
    upcomingLetters,
    availableDates,
    availableArchives,
    selectedArchiveId,
    moodSnapshot,
    roomSnapshot,
    growthSnapshot,
    fetchConfig,
    fetchStats,
    fetchUpcoming,
    fetchLetters,
    fetchLetterDetail,
    createLetter,
    checkDeliver,
    markAsRead,
    cancelLetter,
    deleteLetter,
    fetchMoodSnapshot,
    fetchRoomSnapshot,
    fetchGrowthSnapshot,
    fetchAvailableDates,
    fetchAvailableArchives,
    setSelectedArchive,
    clearCurrentLetter
  }
})
