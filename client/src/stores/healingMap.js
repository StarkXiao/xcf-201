import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { healingMapApi, moodApi, roomApi, achievementApi, profileApi } from '@/api'
import { useCompanionStore } from './companion'

export const useHealingMapStore = defineStore('healingMap', () => {
  const overview = ref(null)
  const stages = ref([])
  const currentStage = ref(null)
  const journey = ref([])
  const milestones = ref([])
  const unlocks = ref([])
  const isLoading = ref(false)

  const stageColors = {
    awakening: '#8b5cf6',
    exploration: '#3b82f6',
    understanding: '#22c55e',
    acceptance: '#f97316',
    integration: '#ec4899',
    transcendence: '#fbbf24'
  }

  const stageIcons = {
    awakening: '🌱',
    exploration: '🔍',
    understanding: '💡',
    acceptance: '🤍',
    integration: '🌈',
    transcendence: '✨'
  }

  async function fetchOverview() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getOverview()
      if (response.code === 200) {
        overview.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取疗愈地图概览失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchStages() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getStages()
      if (response.code === 200) {
        stages.value = response.data.stages || []
        currentStage.value = response.data.currentStage || null
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取疗愈阶段失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchStageDetail(stageId) {
    isLoading.value = true
    try {
      const response = await healingMapApi.getStageDetail(stageId)
      if (response.code === 200) {
        const stageIndex = stages.value.findIndex(s => s.id === stageId)
        if (stageIndex !== -1) {
          stages.value[stageIndex] = { ...stages.value[stageIndex], ...response.data }
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取阶段详情失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchJourney() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getJourney()
      if (response.code === 200) {
        journey.value = response.data.journey || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取旅程数据失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchMilestones() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getMilestones()
      if (response.code === 200) {
        milestones.value = response.data.milestones || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取里程碑失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchUnlocks() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getUnlocks()
      if (response.code === 200) {
        unlocks.value = response.data.unlocks || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取解锁节点失败' }
    } finally {
      isLoading.value = false
    }
  }

  async function claimStageReward(stageId) {
    try {
      const response = await healingMapApi.claimStageReward(stageId)
      if (response.code === 200) {
        const companionStore = useCompanionStore()
        companionStore.addExperienceFromAction('stage_complete', stageId)
        await fetchStages()
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '领取阶段奖励失败' }
    }
  }

  async function fetchAllData() {
    isLoading.value = true
    try {
      await Promise.all([
        fetchOverview(),
        fetchStages(),
        fetchJourney(),
        fetchMilestones(),
        fetchUnlocks()
      ])
      return { success: true }
    } catch (error) {
      return { success: false, message: '加载疗愈地图数据失败' }
    } finally {
      isLoading.value = false
    }
  }

  function getStageColor(stageKey) {
    return stageColors[stageKey] || '#6b7280'
  }

  function getStageIcon(stageKey) {
    return stageIcons[stageKey] || '🌟'
  }

  const totalProgress = computed(() => {
    if (!overview.value) return 0
    return overview.value.totalProgress || 0
  })

  const completedStages = computed(() => {
    return stages.value.filter(s => s.status === 'completed').length
  })

  const totalStages = computed(() => {
    return stages.value.length
  })

  const unlockedMilestones = computed(() => {
    return milestones.value.filter(m => m.unlocked).length
  })

  const totalMilestones = computed(() => {
    return milestones.value.length
  })

  const recentUnlocks = computed(() => {
    return unlocks.value.slice(0, 5)
  })

  function generateMockData() {
    stages.value = [
      {
        id: 'stage-1',
        key: 'awakening',
        name: '觉醒之始',
        description: '开始记录心情，觉察自己的情绪变化',
        status: 'completed',
        progress: 100,
        unlockedAt: '2026-06-01',
        completedAt: '2026-06-10',
        reward: { type: 'companion', name: '初心精灵', icon: '🧚' },
        requirements: [
          { type: 'mood_records', current: 7, target: 7, label: '心情记录' },
          { type: 'streak', current: 3, target: 3, label: '连续记录天数' }
        ],
        milestones: [
          { id: 'm1', name: '第一次心情记录', unlocked: true, unlockedAt: '2026-06-01', icon: '📝' },
          { id: 'm2', name: '连续记录3天', unlocked: true, unlockedAt: '2026-06-03', icon: '🔥' },
          { id: 'm3', name: '完成一周记录', unlocked: true, unlockedAt: '2026-06-07', icon: '📅' }
        ],
        keyEvents: [
          { date: '2026-06-01', type: 'unlock', title: '解锁觉醒阶段', description: '开始了自我探索之旅' },
          { date: '2026-06-05', type: 'mood', title: '情绪觉察', description: '首次识别出焦虑情绪并记录' },
          { date: '2026-06-10', type: 'complete', title: '阶段完成', description: '成功完成觉醒阶段的所有目标' }
        ],
        linkedModules: {
          calendar: { progress: 100, label: '心情日历' },
          achievements: { progress: 60, label: '任务成就' }
        }
      },
      {
        id: 'stage-2',
        key: 'exploration',
        name: '探索之旅',
        description: '探索情绪背后的故事，阅读疗愈房间',
        status: 'active',
        progress: 65,
        unlockedAt: '2026-06-10',
        completedAt: null,
        reward: { type: 'title', name: '探索者', icon: '🔍' },
        requirements: [
          { type: 'mood_records', current: 15, target: 21, label: '心情记录' },
          { type: 'rooms_unlocked', current: 2, target: 4, label: '解锁房间' },
          { type: 'chapters_read', current: 8, target: 15, label: '阅读章节' }
        ],
        milestones: [
          { id: 'm4', name: '第一个房间', unlocked: true, unlockedAt: '2026-06-11', icon: '🚪' },
          { id: 'm5', name: '情绪深度分析', unlocked: true, unlockedAt: '2026-06-13', icon: '📊' },
          { id: 'm6', name: '连续记录一周', unlocked: true, unlockedAt: '2026-06-17', icon: '✨' },
          { id: 'm7', name: '解锁4个房间', unlocked: false, unlockedAt: null, icon: '🏠' }
        ],
        keyEvents: [
          { date: '2026-06-10', type: 'unlock', title: '解锁探索阶段', description: '进入更深层的自我探索' },
          { date: '2026-06-12', type: 'room', title: '阅读《勇气之屋》', description: '在故事中找到了面对恐惧的力量' },
          { date: '2026-06-15', type: 'achievement', title: '解锁成就', description: '获得了"情绪探索者"成就' }
        ],
        linkedModules: {
          calendar: { progress: 71, label: '心情日历' },
          rooms: { progress: 50, label: '剧情房间' },
          achievements: { progress: 45, label: '任务成就' }
        }
      },
      {
        id: 'stage-3',
        key: 'understanding',
        name: '理解之光',
        description: '理解情绪模式，发现内在规律',
        status: 'locked',
        progress: 0,
        unlockedAt: null,
        completedAt: null,
        reward: { type: 'companion', name: '智慧导师', icon: '🦉' },
        requirements: [
          { type: 'mood_records', current: 0, target: 30, label: '心情记录' },
          { type: 'mood_lab_analysis', current: 0, target: 5, label: '情绪实验室分析' },
          { type: 'retrospectives', current: 0, target: 4, label: '月度回顾' }
        ],
        milestones: [
          { id: 'm8', name: '发现情绪模式', unlocked: false, unlockedAt: null, icon: '💡' },
          { id: 'm9', name: '完成首次月度回顾', unlocked: false, unlockedAt: null, icon: '📝' },
          { id: 'm10', name: '情绪趋势分析', unlocked: false, unlockedAt: null, icon: '📈' }
        ],
        keyEvents: [],
        linkedModules: {
          calendar: { progress: 0, label: '心情日历' },
          moodLab: { progress: 0, label: '情绪实验室' },
          achievements: { progress: 0, label: '任务成就' }
        }
      },
      {
        id: 'stage-4',
        key: 'acceptance',
        name: '接纳之心',
        description: '接纳所有情绪，与自己和解',
        status: 'locked',
        progress: 0,
        unlockedAt: null,
        completedAt: null,
        reward: { type: 'title', name: '平和之心', icon: '🕊️' },
        requirements: [
          { type: 'mood_records', current: 0, target: 50, label: '心情记录' },
          { type: 'positive_mood_ratio', current: 0, target: 60, label: '积极情绪比例%' },
          { type: 'wish_commissions', current: 0, target: 5, label: '完成心愿委托' }
        ],
        milestones: [
          { id: 'm11', name: '情绪接纳练习', unlocked: false, unlockedAt: null, icon: '🤍' },
          { id: 'm12', name: '完成第一个心愿委托', unlocked: false, unlockedAt: null, icon: '⭐' },
          { id: 'm13', name: '自我和解时刻', unlocked: false, unlockedAt: null, icon: '💖' }
        ],
        keyEvents: [],
        linkedModules: {
          calendar: { progress: 0, label: '心情日历' },
          wishCommission: { progress: 0, label: '心愿委托' },
          profile: { progress: 0, label: '个人成长' }
        }
      },
      {
        id: 'stage-5',
        key: 'integration',
        name: '融合之境',
        description: '整合所学，构建完整的自我',
        status: 'locked',
        progress: 0,
        unlockedAt: null,
        completedAt: null,
        reward: { type: 'companion', name: '完整自我', icon: '🌈' },
        requirements: [
          { type: 'all_rooms_unlocked', current: 0, target: 1, label: '解锁所有房间' },
          { type: 'achievements_unlocked', current: 0, target: 20, label: '成就解锁' },
          { type: 'memory_letters', current: 0, target: 3, label: '回忆信件' }
        ],
        milestones: [
          { id: 'm14', name: '收到第一封回忆信', unlocked: false, unlockedAt: null, icon: '💌' },
          { id: 'm15', name: '解锁所有房间', unlocked: false, unlockedAt: null, icon: '🏰' },
          { id: 'm16', name: '成长档案完整', unlocked: false, unlockedAt: null, icon: '📚' }
        ],
        keyEvents: [],
        linkedModules: {
          rooms: { progress: 0, label: '剧情房间' },
          memoryLetter: { progress: 0, label: '回忆邮局' },
          profile: { progress: 0, label: '个人成长' }
        }
      },
      {
        id: 'stage-6',
        key: 'transcendence',
        name: '超越之巅',
        description: '超越自我，成为更好的自己',
        status: 'locked',
        progress: 0,
        unlockedAt: null,
        completedAt: null,
        reward: { type: 'title', name: '疗愈大师', icon: '👑' },
        requirements: [
          { type: 'mood_records', current: 0, target: 100, label: '心情记录' },
          { type: 'all_achievements', current: 0, target: 1, label: '所有成就' },
          { type: 'companion_bond', current: 0, target: 100, label: '伙伴羁绊' }
        ],
        milestones: [
          { id: 'm17', name: '百日记录', unlocked: false, unlockedAt: null, icon: '🏆' },
          { id: 'm18', name: '全成就解锁', unlocked: false, unlockedAt: null, icon: '🎖️' },
          { id: 'm19', name: '终极羁绊', unlocked: false, unlockedAt: null, icon: '💕' },
          { id: 'm20', name: '疗愈之旅完成', unlocked: false, unlockedAt: null, icon: '🌟' }
        ],
        keyEvents: [],
        linkedModules: {
          calendar: { progress: 0, label: '心情日历' },
          achievements: { progress: 0, label: '任务成就' },
          companions: { progress: 0, label: '同行旅伴' }
        }
      }
    ]

    currentStage.value = stages.value.find(s => s.status === 'active') || stages.value[0]

    overview.value = {
      totalProgress: 27,
      currentStageName: currentStage.value?.name || '觉醒之始',
      daysOnJourney: 17,
      totalMoodRecords: 24,
      totalRoomsUnlocked: 4,
      totalAchievements: 12,
      totalMilestones: 6,
      journeyStartDate: '2026-06-01'
    }

    journey.value = [
      {
        id: 'j1',
        date: '2026-06-01',
        type: 'stage_unlock',
        title: '开启疗愈之旅',
        description: '你踏上了自我探索的旅程，第一个阶段"觉醒之始"已解锁',
        icon: '🚀',
        stageKey: 'awakening'
      },
      {
        id: 'j2',
        date: '2026-06-01',
        type: 'mood',
        title: '第一次心情记录',
        description: '你记录了今天的心情，这是了解自己的第一步',
        icon: '📝',
        linkedTo: { module: 'calendar', path: '/calendar' }
      },
      {
        id: 'j3',
        date: '2026-06-03',
        type: 'achievement',
        title: '解锁成就：初来乍到',
        description: '连续记录3天心情，获得成就"初来乍到"',
        icon: '🏆',
        linkedTo: { module: 'achievements', path: '/achievements' }
      },
      {
        id: 'j4',
        date: '2026-06-07',
        type: 'milestone',
        title: '里程碑：一周坚持',
        description: '连续记录心情7天，你已经养成了记录的好习惯',
        icon: '🎯',
        stageKey: 'awakening'
      },
      {
        id: 'j5',
        date: '2026-06-10',
        type: 'stage_complete',
        title: '完成觉醒之始',
        description: '恭喜你完成了第一阶段！解锁了"初心精灵"作为伙伴',
        icon: '🎉',
        stageKey: 'awakening',
        reward: { type: 'companion', name: '初心精灵', icon: '🧚' }
      },
      {
        id: 'j6',
        date: '2026-06-10',
        type: 'stage_unlock',
        title: '解锁探索之旅',
        description: '进入第二阶段，开始探索情绪背后的故事',
        icon: '🔍',
        stageKey: 'exploration'
      },
      {
        id: 'j7',
        date: '2026-06-11',
        type: 'room',
        title: '探索《勇气之屋》',
        description: '你进入了勇气之屋，开始阅读第一个故事',
        icon: '🚪',
        linkedTo: { module: 'rooms', path: '/rooms' }
      },
      {
        id: 'j8',
        date: '2026-06-13',
        type: 'mood',
        title: '深度情绪觉察',
        description: '你识别出了焦虑情绪的触发模式，这是重要的发现',
        icon: '💡',
        linkedTo: { module: 'moodLab', path: '/mood-lab' }
      },
      {
        id: 'j9',
        date: '2026-06-15',
        type: 'achievement',
        title: '解锁成就：情绪探索者',
        description: '记录了10种不同的情绪组合，获得成就"情绪探索者"',
        icon: '🎖️',
        linkedTo: { module: 'achievements', path: '/achievements' }
      },
      {
        id: 'j10',
        date: '2026-06-17',
        type: 'milestone',
        title: '里程碑：两周坚持',
        description: '在探索阶段连续记录两周，你正在稳步前进',
        icon: '⭐',
        stageKey: 'exploration'
      }
    ]

    milestones.value = [
      { id: 'm1', name: '第一次心情记录', description: '开始记录你的心情旅程', unlocked: true, unlockedAt: '2026-06-01', icon: '📝', stageKey: 'awakening' },
      { id: 'm2', name: '连续记录3天', description: '养成记录习惯的开始', unlocked: true, unlockedAt: '2026-06-03', icon: '🔥', stageKey: 'awakening' },
      { id: 'm3', name: '完成一周记录', description: '坚持记录整整一周', unlocked: true, unlockedAt: '2026-06-07', icon: '📅', stageKey: 'awakening' },
      { id: 'm4', name: '第一个房间', description: '探索第一个剧情房间', unlocked: true, unlockedAt: '2026-06-11', icon: '🚪', stageKey: 'exploration' },
      { id: 'm5', name: '情绪深度分析', description: '在情绪实验室完成第一次分析', unlocked: true, unlockedAt: '2026-06-13', icon: '📊', stageKey: 'exploration' },
      { id: 'm6', name: '连续记录一周', description: '在探索阶段连续记录7天', unlocked: true, unlockedAt: '2026-06-17', icon: '✨', stageKey: 'exploration' },
      { id: 'm7', name: '解锁4个房间', description: '探索4个不同的剧情房间', unlocked: false, unlockedAt: null, icon: '🏠', stageKey: 'exploration' },
      { id: 'm8', name: '发现情绪模式', description: '识别出你的情绪规律', unlocked: false, unlockedAt: null, icon: '💡', stageKey: 'understanding' },
      { id: 'm9', name: '完成首次月度回顾', description: '回顾一个月的成长历程', unlocked: false, unlockedAt: null, icon: '📝', stageKey: 'understanding' },
      { id: 'm10', name: '情绪趋势分析', description: '掌握自己的情绪变化趋势', unlocked: false, unlockedAt: null, icon: '📈', stageKey: 'understanding' }
    ]

    unlocks.value = [
      { id: 'u1', name: '初心精灵', type: 'companion', unlockedAt: '2026-06-10', icon: '🧚', description: '陪伴你开始疗愈之旅的小精灵' },
      { id: 'u2', name: '情绪处方笺', type: 'feature', unlockedAt: '2026-06-05', icon: '💊', description: '获取个性化的情绪调节建议' },
      { id: 'u3', name: '梦境收藏馆', type: 'feature', unlockedAt: '2026-06-08', icon: '🌙', description: '记录和收藏你的美好梦境' },
      { id: 'u4', name: '初来乍到', type: 'achievement', unlockedAt: '2026-06-03', icon: '🏆', description: '连续记录心情3天' },
      { id: 'u5', name: '情绪探索者', type: 'achievement', unlockedAt: '2026-06-15', icon: '🎖️', description: '记录10种不同的情绪组合' }
    ]
  }

  return {
    overview,
    stages,
    currentStage,
    journey,
    milestones,
    unlocks,
    isLoading,
    totalProgress,
    completedStages,
    totalStages,
    unlockedMilestones,
    totalMilestones,
    recentUnlocks,
    fetchOverview,
    fetchStages,
    fetchStageDetail,
    fetchJourney,
    fetchMilestones,
    fetchUnlocks,
    claimStageReward,
    fetchAllData,
    getStageColor,
    getStageIcon,
    generateMockData
  }
})
