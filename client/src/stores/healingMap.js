import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { healingMapApi } from '@/api'
import { useCompanionStore } from './companion'

export const useHealingMapStore = defineStore('healingMap', () => {
  const overview = ref(null)
  const stages = ref([])
  const currentStage = ref(null)
  const journey = ref([])
  const milestones = ref([])
  const unlocks = ref(null)
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

  const stageIconMap = {
    sprout: '🌱',
    compass: '🧭',
    lightbulb: '💡',
    heart: '❤️',
    sparkles: '✨',
    crown: '👑'
  }

  async function fetchOverview() {
    isLoading.value = true
    try {
      const response = await healingMapApi.getOverview()
      if (response.code === 200) {
        const data = response.data
        overview.value = {
          ...data,
          daysOnJourney: data.moodRecords || 0,
          totalMoodRecords: data.moodRecords || 0,
          totalRoomsUnlocked: data.roomsUnlocked || 0,
          totalAchievements: data.achievementsUnlocked || 0,
          totalMilestones: data.unlockedMilestones || 0,
          currentStageName: data.currentStage?.name || ''
        }
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
        const stagesData = response.data || []
        stages.value = stagesData.map(s => formatStage(s))
        
        const active = stages.value.find(s => s.status === 'active')
        currentStage.value = active || stages.value[0] || null
        
        return { success: true, data: stages.value }
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
        const stageData = formatStageDetail(response.data)
        const stageIndex = stages.value.findIndex(s => s.id === stageId)
        if (stageIndex !== -1) {
          stages.value[stageIndex] = { ...stages.value[stageIndex], ...stageData }
        }
        return { success: true, data: stageData }
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
        journey.value = formatJourneyEvents(response.data || [])
        return { success: true, data: journey.value }
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
        const data = response.data || {}
        const allMilestones = []
        
        if (data.stages) {
          data.stages.forEach(stage => {
            stage.milestones.forEach(m => {
              allMilestones.push({
                id: m.id,
                name: m.name,
                description: m.description,
                icon: m.icon,
                unlocked: m.isUnlocked,
                unlockedAt: m.unlockedAt,
                stageKey: stage.stageKey,
                stageName: stage.name,
                currentProgress: m.currentProgress,
                target: m.requirementValue
              })
            })
          })
        }
        
        milestones.value = allMilestones
        return { success: true, data: milestones.value }
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
        unlocks.value = response.data
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
        try {
          companionStore.addExperienceFromAction('stage_complete', stageId)
        } catch (e) {
          console.error('伙伴经验更新失败:', e)
        }
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

  function formatStage(stage) {
    let status = 'locked'
    if (stage.isCompleted) {
      status = 'completed'
    } else if (stage.isUnlocked) {
      status = 'active'
    }

    const requirements = stage.requirements?.map(req => ({
      type: req.type,
      current: req.current,
      target: req.target,
      label: req.name,
      progress: req.progress
    })) || []

    const reward = stage.rewards ? {
      type: stage.rewards.type,
      name: stage.rewards.title || '未知奖励',
      icon: stage.rewards.type === 'companion' ? '🧚' : '🎖️'
    } : null

    return {
      id: stage.id,
      key: stage.stageKey,
      name: stage.name,
      description: stage.description,
      status,
      progress: stage.progress || 0,
      unlockedAt: stage.unlockedAt,
      completedAt: stage.completedAt,
      reward,
      rewardClaimed: stage.rewardClaimed,
      rewardClaimedAt: stage.rewardClaimedAt,
      requirements,
      milestones: stage.milestones || [],
      keyEvents: stage.keyEvents || [],
      linkedModules: formatLinkedModules(stage.linkedModules || [])
    }
  }

  function formatStageDetail(stage) {
    const base = formatStage(stage)
    return {
      ...base,
      milestones: stage.milestones?.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        icon: getMilestoneIcon(m.icon),
        unlocked: m.isUnlocked,
        unlockedAt: m.unlockedAt,
        current: m.currentProgress,
        target: m.requirementValue
      })) || [],
      keyEvents: stage.keyEvents || []
    }
  }

  function formatLinkedModules(modules) {
    const result = {}
    modules.forEach(m => {
      result[m.key] = {
        label: m.name,
        progress: 0,
        route: m.route
      }
    })
    return result
  }

  function formatJourneyEvents(events) {
    return events.map(e => ({
      id: e.id,
      date: e.date,
      type: e.type,
      title: e.title,
      description: e.description,
      icon: getEventIcon(e.type, e.relatedModule),
      linkedTo: e.relatedModule ? { 
        module: e.relatedModule, 
        path: getModulePath(e.relatedModule, e.relatedId) 
      } : null,
      stageKey: e.stageKey || null
    }))
  }

  function getEventIcon(type, relatedModule) {
    const iconMap = {
      stage_unlock: '🚀',
      stage_complete: '🎉',
      milestone: '🎯',
      mood_record: '📝',
      room_unlock: '🚪',
      achievement: '🏆',
      room: '📖'
    }
    return iconMap[type] || '✨'
  }

  function getMilestoneIcon(icon) {
    const iconMap = {
      'pen-tool': '✏️',
      'calendar-days': '📅',
      'palette': '🎨',
      'flame': '🔥',
      'door-open': '🚪',
      'book-open': '📖',
      'trophy': '🏆',
      'layers': '📚',
      'award': '🎖️',
      'medal': '🏅',
      'library': '📚',
      'home': '🏠',
      'castle': '🏰',
      'book-open-check': '✅',
      'crown': '👑',
      'trophy': '🏆'
    }
    return iconMap[icon] || '⭐'
  }

  function getModulePath(module, relatedId) {
    const paths = {
      calendar: '/calendar',
      rooms: '/rooms',
      room: '/rooms',
      achievements: '/achievements',
      achievement: '/achievements',
      profile: '/profile',
      milestone: null
    }
    return paths[module] || '/calendar'
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
    if (!unlocks.value || !unlocks.value.milestones) return []
    return unlocks.value.milestones.slice(0, 5)
  })

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
    getStageIcon
  }
})
