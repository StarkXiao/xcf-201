import { defineStore } from 'pinia'
import { ref } from 'vue'
import { roomApi } from '@/api'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref([])
  const currentRoom = ref(null)
  const unlockedCount = ref(0)
  const totalCount = ref(0)
  const currentBranch = ref('main')
  const branches = ref([])
  const storyHistory = ref([])

  async function fetchRooms() {
    try {
      const response = await roomApi.getRooms()
      if (response.code === 200) {
        rooms.value = response.data.rooms
        unlockedCount.value = response.data.unlockedCount
        totalCount.value = response.data.totalCount
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取房间列表失败' }
    }
  }

  async function fetchRoomDetail(roomId, branch = null) {
    try {
      const response = await roomApi.getRoomDetail(roomId, branch)
      if (response.code === 200) {
        currentRoom.value = response.data
        currentBranch.value = response.data.currentBranch || 'main'
        branches.value = response.data.availableBranches || []
        if (response.data.history) {
          storyHistory.value = response.data.history
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取房间详情失败' }
    }
  }

  async function unlockRoom(roomId) {
    try {
      const response = await roomApi.unlockRoom(roomId)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '解锁房间失败' }
    }
  }

  async function readChapter(roomId, chapterNumber, branch = null) {
    try {
      const response = await roomApi.readChapter(roomId, chapterNumber, branch)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '阅读章节失败' }
    }
  }

  async function fetchBranches(roomId) {
    try {
      const response = await roomApi.getBranches(roomId)
      if (response.code === 200) {
        branches.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取分支列表失败' }
    }
  }

  async function chooseBranch(roomId, branchKey) {
    try {
      const response = await roomApi.chooseBranch(roomId, branchKey)
      if (response.code === 200) {
        currentBranch.value = branchKey
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '切换分支失败' }
    }
  }

  async function fetchStoryHistory(roomId) {
    try {
      const response = await roomApi.getStoryHistory(roomId)
      if (response.code === 200) {
        storyHistory.value = response.data.history
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取阅读历史失败' }
    }
  }

  async function jumpToStory(roomId, storyId) {
    try {
      const response = await roomApi.jumpToStory(roomId, storyId)
      if (response.code === 200) {
        if (response.data.currentBranch) {
          currentBranch.value = response.data.currentBranch
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '跳转失败' }
    }
  }

  function setCurrentBranch(branch) {
    currentBranch.value = branch
  }

  return {
    rooms,
    currentRoom,
    unlockedCount,
    totalCount,
    currentBranch,
    branches,
    storyHistory,
    fetchRooms,
    fetchRoomDetail,
    unlockRoom,
    readChapter,
    fetchBranches,
    chooseBranch,
    fetchStoryHistory,
    jumpToStory,
    setCurrentBranch
  }
})
