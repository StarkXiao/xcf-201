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
  jumpToStory: (roomId, storyId) => api.post(`/rooms/${roomId}/jump/${storyId}`),
  createNote: (roomId, data) => api.post(`/rooms/${roomId}/notes`, data),
  getRoomNotes: (roomId) => api.get(`/rooms/${roomId}/notes`),
  getStoryNote: (roomId, storyId) => api.get(`/rooms/${roomId}/notes/${storyId}`),
  deleteNote: (noteId) => api.delete('/rooms/notes/' + noteId),
  getMyNotes: (page = 1, pageSize = 10) => api.get('/rooms/notes/my/list', { params: { page, pageSize } })
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

export const prescriptionApi = {
  getConfig: () => api.get('/prescriptions/config'),
  getLatest: (periodType = 'weekly') => api.get('/prescriptions/latest', { params: { periodType } }),
  getList: (periodType = 'weekly', limit = 12) => api.get('/prescriptions/list', { params: { periodType, limit } }),
  generateWeekly: () => api.post('/prescriptions/generate/weekly'),
  generateDaily: () => api.post('/prescriptions/generate/daily'),
  viewPrescription: (id) => api.post(`/prescriptions/${id}/view`),
  getArchives: (archiveType, limit = 12) => api.get('/prescriptions/archives', { params: { archiveType, limit } }),
  generateMonthlyArchive: (year, month) => api.post('/prescriptions/archives/generate/monthly', { year, month })
}

export const dreamCollectionApi = {
  getOverview: () => api.get('/dream-collection/overview'),
  getFragments: (params = {}) => api.get('/dream-collection/fragments', { params }),
  createFragment: (data) => api.post('/dream-collection/fragments', data),
  updateFragment: (id, data) => api.put(`/dream-collection/fragments/${id}`, data),
  deleteFragment: (id) => api.delete(`/dream-collection/fragments/${id}`),
  starFragment: (id, isStarred) => api.post(`/dream-collection/fragments/${id}/star`, { isStarred }),
  getFragmentStats: () => api.get('/dream-collection/fragments/stats'),
  getStoryCards: (params = {}) => api.get('/dream-collection/story-cards', { params }),
  unlockStoryCard: (data) => api.post('/dream-collection/story-cards/unlock', data),
  deleteStoryCard: (id) => api.delete(`/dream-collection/story-cards/${id}`),
  getHighlights: (params = {}) => api.get('/dream-collection/highlights', { params }),
  createHighlight: (data) => api.post('/dream-collection/highlights', data),
  updateHighlight: (id, data) => api.put(`/dream-collection/highlights/${id}`, data),
  deleteHighlight: (id) => api.delete(`/dream-collection/highlights/${id}`),
  favoriteHighlight: (id, isFavorite) => api.post(`/dream-collection/highlights/${id}/favorite`, { isFavorite }),
  getGoals: (params = {}) => api.get('/dream-collection/goals', { params }),
  createGoal: (data) => api.post('/dream-collection/goals', data),
  initGoals: () => api.post('/dream-collection/goals/init'),
  deleteGoal: (id) => api.delete(`/dream-collection/goals/${id}`)
}

export const companionApi = {
  getCompanions: () => api.get('/companions'),
  getActiveCompanion: () => api.get('/companions/active'),
  getCompanionDetail: (id) => api.get(`/companions/${id}`),
  activateCompanion: (id) => api.post(`/companions/${id}/activate`),
  unlockCompanion: (templateId, customName) => api.post(`/companions/unlock/${templateId}`, { customName }),
  checkUnlock: () => api.get('/companions/check/unlock'),
  getConversations: (companionId, limit = 50, offset = 0) => api.get(`/companions/${companionId}/conversations`, { params: { limit, offset } }),
  sendMessage: (companionId, content, context) => api.post(`/companions/${companionId}/conversations`, { content, context }),
  clearConversations: (companionId) => api.delete(`/companions/${companionId}/conversations`),
  sendGreeting: (companionId, type) => api.post(`/companions/${companionId}/greeting`, { type }),
  getEvents: (companionId, type = 'available') => api.get(`/companions/${companionId}/events`, { params: { type } }),
  triggerEvent: (companionId, eventId) => api.get(`/companions/${companionId}/events/${eventId}/trigger`),
  completeEvent: (companionId, eventId, choiceId) => api.post(`/companions/${companionId}/events/${eventId}/complete`, { choiceId })
}

export const crisisCenterApi = {
  getAnalysis: () => api.get('/crisis-center/analysis')
}

export const memoryLetterApi = {
  getConfig: () => api.get('/memory-letters/config'),
  getStats: () => api.get('/memory-letters/stats'),
  getUpcoming: (limit) => api.get('/memory-letters/upcoming', { params: { limit } }),
  getLetters: (params = {}) => api.get('/memory-letters', { params }),
  getLetterDetail: (id) => api.get(`/memory-letters/${id}`),
  createLetter: (data) => api.post('/memory-letters', data),
  checkDeliver: () => api.post('/memory-letters/check-deliver'),
  markAsRead: (id) => api.post(`/memory-letters/${id}/read`),
  cancelLetter: (id) => api.post(`/memory-letters/${id}/cancel`),
  deleteLetter: (id) => api.delete(`/memory-letters/${id}`),
  getMoodSnapshot: (date) => api.get(`/memory-letters/snapshot/mood/${date}`),
  getRoomSnapshot: (date) => api.get(`/memory-letters/snapshot/room/${date}`),
  getGrowthSnapshot: (date) => api.get(`/memory-letters/snapshot/growth/${date}`),
  getAvailableDates: () => api.get('/memory-letters/source-dates/available'),
  getAvailableArchives: (date) => api.get(`/memory-letters/snapshot/growth/archives/${date}`)
}

export const notificationApi = {
  getUnread: (limit) => api.get('/notifications/unread', { params: { limit } }),
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  dismiss: (id) => api.post(`/notifications/${id}/dismiss`),
  clearOld: (days) => api.delete('/notifications/old', { params: { days } })
}

export const moodLabApi = {
  getOverview: () => api.get('/mood-lab/overview'),
  getTrends: () => api.get('/mood-lab/trends'),
  getMoodTrend: (months) => api.get('/mood-lab/trends/mood', { params: { months } }),
  getTagStats: (days) => api.get('/mood-lab/trends/tags', { params: { days } }),
  getTagTrend: (tag, days) => api.get(`/mood-lab/trends/tags/${tag}`, { params: { days } }),
  getRecordFrequency: (days) => api.get('/mood-lab/trends/record-frequency', { params: { days } }),
  getStoryStats: () => api.get('/mood-lab/trends/story'),
  getRewardStats: (days) => api.get('/mood-lab/trends/rewards', { params: { days } }),
  getClustering: () => api.get('/mood-lab/clustering'),
  getQuests: () => api.get('/mood-lab/quests')
}

export const wishCommissionApi = {
  getTemplates: function(params) {
    if (params === undefined) params = {}
    return api.get('/wish-commissions/templates', { params: params })
  },
  getTemplateTypes: function() {
    return api.get('/wish-commissions/templates/types')
  },
  getMyCommissions: function(params) {
    if (params === undefined) params = {}
    return api.get('/wish-commissions/my', { params: params })
  },
  getMyStats: function() {
    return api.get('/wish-commissions/my/stats')
  },
  getCommissionDetail: function(id) {
    return api.get('/wish-commissions/my/' + id)
  },
  acceptCommission: function(templateId) {
    return api.post('/wish-commissions/accept/' + templateId)
  },
  updateProgress: function() {
    return api.post('/wish-commissions/progress/update')
  },
  claimReward: function(id) {
    return api.post('/wish-commissions/' + id + '/claim')
  },
  getCoinInfo: function() {
    return api.get('/wish-commissions/coins/info')
  },
  getRetrospectives: function(params) {
    if (params === undefined) params = {}
    return api.get('/wish-commissions/retrospectives', { params: params })
  },
  getRetrospective: function(commissionId) {
    return api.get('/wish-commissions/' + commissionId + '/retrospective')
  },
  createRetrospective: function(commissionId, data) {
    return api.post('/wish-commissions/' + commissionId + '/retrospective', data)
  }
}

export const healingMapApi = {
  getOverview: () => api.get('/healing-map/overview'),
  getStages: () => api.get('/healing-map/stages'),
  getStageDetail: (stageId) => api.get(`/healing-map/stages/${stageId}`),
  getJourney: () => api.get('/healing-map/journey'),
  getMilestones: () => api.get('/healing-map/milestones'),
  getUnlocks: () => api.get('/healing-map/unlocks'),
  claimStageReward: (stageId) => api.post(`/healing-map/stages/${stageId}/claim`)
}

export const nightRadioApi = {
  getPrograms: (params = {}) => api.get('/night-radio/programs', { params }),
  getRecommendedPrograms: () => api.get('/night-radio/programs/recommended'),
  getProgramDetail: (id) => api.get(`/night-radio/programs/${id}`),
  getComfortTexts: (moodType = null) => api.get('/night-radio/comfort-texts', { params: { moodType } }),
  getLinkedTasks: (programId = null) => api.get('/night-radio/linked-tasks', { params: { programId } }),
  getPlayHistory: (params = {}) => api.get('/night-radio/history', { params }),
  addToHistory: (programId) => api.post('/night-radio/history', { programId }),
  getFavorites: () => api.get('/night-radio/favorites'),
  toggleFavorite: (programId) => api.post(`/night-radio/favorites/${programId}/toggle`),
  getStationStatus: () => api.get('/night-radio/station/status'),
  getTodaySchedule: () => api.get('/night-radio/schedule/today'),
  completeLinkedTask: (taskId) => api.post(`/night-radio/linked-tasks/${taskId}/complete`)
}

export default api
