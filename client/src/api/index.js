import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile')
}

export const moodApi = {
  getConfig: () => api.get('/moods/config'),
  createMood: (data) => api.post('/moods', data),
  getMoods: (year, month) => api.get('/moods', { params: { year, month } }),
  getMoodByDate: (date) => api.get(`/moods/${date}`),
  deleteMood: (date, timeSegment) => api.delete(`/moods/${date}`, { data: { timeSegment } }),
  getStreakStatus: () => api.get('/moods/streak/status')
}

export const retrospectiveApi = {
  getConfig: () => api.get('/retrospectives/config'),
  createRetrospective: (data) => api.post('/retrospectives', data),
  getRetrospectivesByDate: (date) => api.get(`/retrospectives/date/${date}`),
  getMonthRetrospectives: (year, month) => api.get('/retrospectives/month', { params: { year, month } }),
  deleteRetrospective: (id) => api.delete(`/retrospectives/${id}`)
}

export const roomApi = {
  getRooms: () => api.get('/rooms'),
  getRoomDetail: (id, branch = null) => api.get(`/rooms/${id}`, { params: branch ? { branch } : {} }),
  unlockRoom: (id) => api.post(`/rooms/${id}/unlock`),
  readChapter: (roomId, chapter, branch = null) => api.post(`/rooms/${roomId}/chapters/${chapter}/read`, { branch }),
  getBranches: (roomId) => api.get(`/rooms/${roomId}/branches`),
  getBranchDetail: (roomId, branch) => api.get(`/rooms/${roomId}/branches/${branch}`),
  chooseBranch: (roomId, branch) => api.post(`/rooms/${roomId}/branches/${branch}/choose`),
  getStoryHistory: (roomId) => api.get(`/rooms/${roomId}/history`),
  jumpToStory: (roomId, storyId) => api.post(`/rooms/${roomId}/jump/${storyId}`)
}

export const achievementApi = {
  getTasks: () => api.get('/tasks'),
  claimTask: (id) => api.post(`/tasks/${id}/claim`),
  updateTaskProgress: (taskType, amount) => api.post('/tasks/progress/update', { taskType, amount }),
  getTaskStats: () => api.get('/tasks/stats'),
  getAchievements: () => api.get('/achievements'),
  getComboAchievements: () => api.get('/achievements/combo'),
  getReminders: () => api.get('/reminders')
}

export const profileApi = {
  getGrowthProfile: () => api.get('/profile/growth')
}

export default api
