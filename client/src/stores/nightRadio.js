import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nightRadioApi } from '@/api'
import { useMoodStore } from './mood'
import { useAchievementStore } from './achievement'
import { useCompanionStore } from './companion'

const MOCK_PROGRAMS = [
  {
    id: 1,
    title: '星夜低语',
    description: '温柔的声音伴你入眠，让思绪随星光缓缓流淌',
    host: '晚安旅人',
    cover: '🌙',
    duration: 25 * 60,
    moodTags: ['calm', 'sad', 'anxious'],
    category: 'sleep',
    isFavorite: false,
    playCount: 1280
  },
  {
    id: 2,
    title: '深海回响',
    description: '模拟深海的白噪音，让心灵沉浸在宁静的蓝色世界',
    host: '海洋精灵',
    cover: '🌊',
    duration: 45 * 60,
    moodTags: ['anxious', 'angry', 'calm'],
    category: 'ambient',
    isFavorite: true,
    playCount: 890
  },
  {
    id: 3,
    title: '晨光故事集',
    description: '温暖的治愈小故事，为新的一天注入勇气',
    host: '故事收集者',
    cover: '📖',
    duration: 15 * 60,
    moodTags: ['sad', 'happy', 'calm'],
    category: 'story',
    isFavorite: false,
    playCount: 2100
  },
  {
    id: 4,
    title: '心火疗愈',
    description: '舒缓的冥想引导，带你找回内心的平静',
    host: '心灵导师',
    cover: '🔥',
    duration: 20 * 60,
    moodTags: ['anxious', 'angry', 'sad'],
    category: 'meditation',
    isFavorite: false,
    playCount: 1560
  },
  {
    id: 5,
    title: '星河漫步',
    description: '轻柔的纯音乐，让想象在宇宙中自由翱翔',
    host: '宇宙漫步者',
    cover: '✨',
    duration: 35 * 60,
    moodTags: ['happy', 'calm', 'sad'],
    category: 'music',
    isFavorite: true,
    playCount: 3200
  },
  {
    id: 6,
    title: '夜读时光',
    description: '经典文学片段朗读，用文字温暖你的夜晚',
    host: '朗读者·月',
    cover: '📚',
    duration: 30 * 60,
    moodTags: ['calm', 'happy', 'sad'],
    category: 'reading',
    isFavorite: false,
    playCount: 980
  },
  {
    id: 7,
    title: '呼吸练习',
    description: '478呼吸法引导，帮助你快速放松身心',
    host: '呼吸教练',
    cover: '💨',
    duration: 10 * 60,
    moodTags: ['anxious', 'angry', 'calm'],
    category: 'breathing',
    isFavorite: false,
    playCount: 4500
  },
  {
    id: 8,
    title: '梦境边境',
    description: '渐进式肌肉放松训练，带你进入深度睡眠',
    host: '梦境守护者',
    cover: '💤',
    duration: 18 * 60,
    moodTags: ['anxious', 'sad', 'calm'],
    category: 'sleep',
    isFavorite: false,
    playCount: 1890
  }
]

const MOCK_COMFORT_TEXTS = {
  happy: [
    { id: 1, text: '你的笑容是今天最美的风景，愿这份快乐延续到每一个明天。', type: 'encouragement' },
    { id: 2, text: '开心的时候就尽情笑吧，你值得所有的美好。', type: 'affirmation' },
    { id: 3, text: '这份愉悦的心情是你给自己最好的礼物。', type: 'encouragement' }
  ],
  calm: [
    { id: 4, text: '此刻的平静如同湖面的月光，温柔而珍贵。', type: 'poetic' },
    { id: 5, text: '在喧嚣中找到属于自己的宁静，你已经做得很好了。', type: 'affirmation' },
    { id: 6, text: '慢下来，感受呼吸，你是安全的。', type: 'grounding' }
  ],
  sad: [
    { id: 7, text: '允许自己悲伤，眼泪是心灵在自我疗愈。', type: 'validation' },
    { id: 8, text: '你不必总是坚强，脆弱也是一种勇气。', type: 'validation' },
    { id: 9, text: '黑夜终将过去，黎明会在你准备好的时候到来。', type: 'hope' },
    { id: 10, text: '我在这里陪着你，你不是一个人。', type: 'companionship' }
  ],
  anxious: [
    { id: 11, text: '深呼吸，感受脚下的大地，你是安全的。', type: 'grounding' },
    { id: 12, text: '那些让你焦虑的想法，就让它们像云一样飘过。', type: 'mindfulness' },
    { id: 13, text: '你比你想象的更勇敢，比你以为的更强大。', type: 'encouragement' },
    { id: 14, text: '此刻的紧张只是暂时的，它会慢慢消散。', type: 'reassurance' }
  ],
  angry: [
    { id: 15, text: '愤怒是一种信号，它在告诉你什么对你很重要。', type: 'validation' },
    { id: 16, text: '允许自己感受这份情绪，但不要让它掌控你。', type: 'guidance' },
    { id: 17, text: '深呼吸，从1数到10，给自己一点冷静的空间。', type: 'grounding' }
  ]
}

const MOCK_LINKED_TASKS = [
  {
    id: 1,
    programId: 4,
    title: '完成一次冥想练习',
    description: '跟随"心火疗愈"节目，完成一次完整的冥想',
    type: 'meditation',
    reward: 15,
    isCompleted: false,
    progress: 0,
    target: 1
  },
  {
    id: 2,
    programId: 7,
    title: '每日呼吸练习',
    description: '坚持每天做一次呼吸练习，连续7天',
    type: 'daily_breathing',
    reward: 30,
    isCompleted: false,
    progress: 3,
    target: 7
  },
  {
    id: 3,
    programId: 1,
    title: '睡前电台时光',
    description: '在入睡前收听夜航电台，建立睡前仪式感',
    type: 'bedtime_routine',
    reward: 20,
    isCompleted: false,
    progress: 5,
    target: 10
  },
  {
    id: 4,
    programId: 3,
    title: '故事收集者',
    description: '收听5个不同的故事节目',
    type: 'story_explorer',
    reward: 25,
    isCompleted: false,
    progress: 2,
    target: 5
  }
]

const MOCK_SCHEDULE = [
  { time: '21:00', programId: 3, title: '晨光故事集', type: 'story' },
  { time: '22:00', programId: 5, title: '星河漫步', type: 'music' },
  { time: '23:00', programId: 1, title: '星夜低语', type: 'sleep' },
  { time: '00:00', programId: 2, title: '深海回响', type: 'ambient' },
  { time: '01:00', programId: 8, title: '梦境边境', type: 'sleep' },
  { time: '06:00', programId: 7, title: '呼吸练习', type: 'breathing' },
  { time: '07:00', programId: 3, title: '晨光故事集', type: 'story' }
]

const CATEGORY_LABELS = {
  sleep: '助眠',
  ambient: '环境音',
  story: '故事',
  meditation: '冥想',
  music: '音乐',
  reading: '夜读',
  breathing: '呼吸'
}

export const useNightRadioStore = defineStore('nightRadio', () => {
  const programs = ref([])
  const recommendedPrograms = ref([])
  const currentProgram = ref(null)
  const comfortTexts = ref([])
  const linkedTasks = ref([])
  const playHistory = ref([])
  const favorites = ref([])
  const todaySchedule = ref([])
  const stationStatus = ref(null)

  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.7)
  const isMuted = ref(false)

  const isLoading = ref({
    programs: false,
    recommended: false,
    comfort: false,
    tasks: false,
    history: false,
    favorites: false
  })

  const categories = computed(() => {
    const cats = new Set(programs.value.map(p => p.category))
    return Array.from(cats).map(key => ({
      key,
      label: CATEGORY_LABELS[key] || key
    }))
  })

  const favoritePrograms = computed(() => {
    return programs.value.filter(p => p.isFavorite)
  })

  const currentProgramInfo = computed(() => {
    if (!currentProgram.value) return null
    const progress = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
    return {
      ...currentProgram.value,
      progress,
      currentTimeFormatted: formatTime(currentTime.value),
      durationFormatted: formatTime(duration.value)
    }
  })

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function getProgramsByMood(moodType) {
    return programs.value.filter(p => p.moodTags.includes(moodType))
  }

  function getProgramsByCategory(category) {
    return programs.value.filter(p => p.category === category)
  }

  async function fetchPrograms(params = {}) {
    isLoading.value.programs = true
    try {
      const response = await nightRadioApi.getPrograms(params)
      if (response.code === 200) {
        programs.value = response.data
      }
      return { success: true, data: programs.value }
    } catch (error) {
      programs.value = MOCK_PROGRAMS
      return { success: true, data: MOCK_PROGRAMS }
    } finally {
      isLoading.value.programs = false
    }
  }

  async function fetchRecommendedPrograms() {
    isLoading.value.recommended = true
    try {
      const response = await nightRadioApi.getRecommendedPrograms()
      if (response.code === 200) {
        recommendedPrograms.value = response.data
      }
      return { success: true, data: recommendedPrograms.value }
    } catch (error) {
      const moodStore = useMoodStore()
      const today = new Date().toISOString().split('T')[0]
      const currentMood = moodStore.getDominantMood(today) || 'calm'
      recommendedPrograms.value = MOCK_PROGRAMS
        .filter(p => p.moodTags.includes(currentMood))
        .slice(0, 4)
      if (recommendedPrograms.value.length === 0) {
        recommendedPrograms.value = MOCK_PROGRAMS.slice(0, 4)
      }
      return { success: true, data: recommendedPrograms.value }
    } finally {
      isLoading.value.recommended = false
    }
  }

  async function fetchProgramDetail(id) {
    try {
      const response = await nightRadioApi.getProgramDetail(id)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      const program = MOCK_PROGRAMS.find(p => p.id === id)
      if (program) {
        return { success: true, data: program }
      }
      return { success: false, message: '节目不存在' }
    }
  }

  async function fetchComfortTexts(moodType = null) {
    isLoading.value.comfort = true
    try {
      const response = await nightRadioApi.getComfortTexts(moodType)
      if (response.code === 200) {
        comfortTexts.value = response.data
      }
      return { success: true, data: comfortTexts.value }
    } catch (error) {
      const mood = moodType || 'calm'
      comfortTexts.value = MOCK_COMFORT_TEXTS[mood] || MOCK_COMFORT_TEXTS.calm
      return { success: true, data: comfortTexts.value }
    } finally {
      isLoading.value.comfort = false
    }
  }

  async function fetchLinkedTasks(programId = null) {
    isLoading.value.tasks = true
    try {
      const response = await nightRadioApi.getLinkedTasks(programId)
      if (response.code === 200) {
        linkedTasks.value = response.data
      }
      return { success: true, data: linkedTasks.value }
    } catch (error) {
      if (programId) {
        linkedTasks.value = MOCK_LINKED_TASKS.filter(t => t.programId === programId)
      } else {
        linkedTasks.value = MOCK_LINKED_TASKS
      }
      return { success: true, data: linkedTasks.value }
    } finally {
      isLoading.value.tasks = false
    }
  }

  async function fetchPlayHistory(params = {}) {
    isLoading.value.history = true
    try {
      const response = await nightRadioApi.getPlayHistory(params)
      if (response.code === 200) {
        playHistory.value = response.data
      }
      return { success: true, data: playHistory.value }
    } catch (error) {
      playHistory.value = MOCK_PROGRAMS.slice(0, 3).map(p => ({
        ...p,
        playedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }))
      return { success: true, data: playHistory.value }
    } finally {
      isLoading.value.history = false
    }
  }

  async function addToHistory(programId) {
    try {
      const response = await nightRadioApi.addToHistory(programId)
      if (response.code === 200) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: true }
    }
  }

  async function fetchFavorites() {
    isLoading.value.favorites = true
    try {
      const response = await nightRadioApi.getFavorites()
      if (response.code === 200) {
        favorites.value = response.data
      }
      return { success: true, data: favorites.value }
    } catch (error) {
      favorites.value = MOCK_PROGRAMS.filter(p => p.isFavorite)
      return { success: true, data: favorites.value }
    } finally {
      isLoading.value.favorites = false
    }
  }

  async function toggleFavorite(programId) {
    try {
      const response = await nightRadioApi.toggleFavorite(programId)
      if (response.code === 200) {
        const program = programs.value.find(p => p.id === programId)
        if (program) {
          program.isFavorite = !program.isFavorite
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      const program = programs.value.find(p => p.id === programId)
      if (program) {
        program.isFavorite = !program.isFavorite
      }
      return { success: true, isFavorite: program?.isFavorite }
    }
  }

  async function fetchStationStatus() {
    try {
      const response = await nightRadioApi.getStationStatus()
      if (response.code === 200) {
        stationStatus.value = response.data
      }
      return { success: true, data: stationStatus.value }
    } catch (error) {
      const now = new Date()
      const hour = now.getHours()
      let currentProgram = null
      
      for (const schedule of MOCK_SCHEDULE) {
        const [h, m] = schedule.time.split(':').map(Number)
        if (hour >= h || (hour === h && now.getMinutes() >= m)) {
          currentProgram = schedule
        }
      }
      
      if (!currentProgram) {
        currentProgram = MOCK_SCHEDULE[MOCK_SCHEDULE.length - 1]
      }
      
      stationStatus.value = {
        currentProgram: MOCK_PROGRAMS.find(p => p.id === currentProgram.programId) || MOCK_PROGRAMS[0],
        listeners: Math.floor(Math.random() * 500) + 100,
        isLive: true
      }
      return { success: true, data: stationStatus.value }
    }
  }

  async function fetchTodaySchedule() {
    try {
      const response = await nightRadioApi.getTodaySchedule()
      if (response.code === 200) {
        todaySchedule.value = response.data
      }
      return { success: true, data: todaySchedule.value }
    } catch (error) {
      todaySchedule.value = MOCK_SCHEDULE.map(s => ({
        ...s,
        program: MOCK_PROGRAMS.find(p => p.id === s.programId)
      }))
      return { success: true, data: todaySchedule.value }
    }
  }

  async function completeLinkedTask(taskId) {
    try {
      const response = await nightRadioApi.completeLinkedTask(taskId)
      if (response.code === 200) {
        const task = linkedTasks.value.find(t => t.id === taskId)
        if (task) {
          task.isCompleted = true
        }
        
        const achievementStore = useAchievementStore()
        achievementStore.fetchTasks()
        
        const companionStore = useCompanionStore()
        companionStore.addExperienceFromAction('task_complete', taskId)
        
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      const task = linkedTasks.value.find(t => t.id === taskId)
      if (task) {
        task.isCompleted = true
        task.progress = task.target
      }
      return { success: true }
    }
  }

  function playProgram(program) {
    currentProgram.value = program
    duration.value = program.duration || 0
    currentTime.value = 0
    isPlaying.value = true
    addToHistory(program.id)
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function pauseProgram() {
    isPlaying.value = false
  }

  function resumeProgram() {
    if (currentProgram.value) {
      isPlaying.value = true
    }
  }

  function seekTo(time) {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
  }

  function setVolume(vol) {
    volume.value = Math.max(0, Math.min(1, vol))
    if (volume.value > 0) {
      isMuted.value = false
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function getRandomComfortText() {
    if (comfortTexts.value.length === 0) {
      return null
    }
    const index = Math.floor(Math.random() * comfortTexts.value.length)
    return comfortTexts.value[index]
  }

  async function fetchAllData() {
    isLoading.value.programs = true
    try {
      await Promise.all([
        fetchPrograms(),
        fetchRecommendedPrograms(),
        fetchTodaySchedule(),
        fetchStationStatus(),
        fetchFavorites()
      ])
      return { success: true }
    } catch (error) {
      return { success: false, message: '加载夜航电台数据失败' }
    } finally {
      isLoading.value.programs = false
    }
  }

  return {
    programs,
    recommendedPrograms,
    currentProgram,
    comfortTexts,
    linkedTasks,
    playHistory,
    favorites,
    todaySchedule,
    stationStatus,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    categories,
    favoritePrograms,
    currentProgramInfo,
    fetchPrograms,
    fetchRecommendedPrograms,
    fetchProgramDetail,
    fetchComfortTexts,
    fetchLinkedTasks,
    fetchPlayHistory,
    addToHistory,
    fetchFavorites,
    toggleFavorite,
    fetchStationStatus,
    fetchTodaySchedule,
    completeLinkedTask,
    playProgram,
    togglePlay,
    pauseProgram,
    resumeProgram,
    seekTo,
    setVolume,
    toggleMute,
    getProgramsByMood,
    getProgramsByCategory,
    getRandomComfortText,
    fetchAllData,
    formatTime
  }
})
