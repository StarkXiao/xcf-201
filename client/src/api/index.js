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
  createMood: (data) => api.post('/moods', data),
  getMoods: (year, month) => api.get('/moods', { params: { year, month } }),
  getMoodByDate: (date) => api.get(`/moods/${date}`),
  deleteMood: (date) => api.delete(`/moods/${date}`)
}

export const roomApi = {
  getRooms: () => api.get('/rooms'),
  getRoomDetail: (id) => api.get(`/rooms/${id}`),
  unlockRoom: (id) => api.post(`/rooms/${id}/unlock`),
  readChapter: (roomId, chapter) => api.post(`/rooms/${roomId}/chapters/${chapter}/read`)
}

export const achievementApi = {
  getTasks: () => api.get('/tasks'),
  claimTask: (id) => api.post(`/tasks/${id}/claim`),
  getAchievements: () => api.get('/achievements')
}

export default api
