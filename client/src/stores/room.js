import { defineStore } from 'pinia'
import { ref } from 'vue'
import { roomApi } from '@/api'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref([])
  const currentRoom = ref(null)
  const unlockedCount = ref(0)
  const totalCount = ref(0)

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

  async function fetchRoomDetail(roomId) {
    try {
      const response = await roomApi.getRoomDetail(roomId)
      if (response.code === 200) {
        currentRoom.value = response.data
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

  async function readChapter(roomId, chapterNumber) {
    try {
      const response = await roomApi.readChapter(roomId, chapterNumber)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '阅读章节失败' }
    }
  }

  return {
    rooms,
    currentRoom,
    unlockedCount,
    totalCount,
    fetchRooms,
    fetchRoomDetail,
    unlockRoom,
    readChapter
  }
})
