import { defineStore } from 'pinia'
import { companionApi } from '@/api'
import { useMoodStore } from './mood'
import { useRoomStore } from './room'
import { useAchievementStore } from './achievement'

export const useCompanionStore = defineStore('companion', {
  state: () => ({
    companions: [],
    activeCompanion: null,
    currentCompanionDetail: null,
    conversations: [],
    availableEvents: [],
    completedEvents: [],
    newlyUnlocked: [],
    loading: {
      companions: false,
      active: false,
      detail: false,
      conversations: false,
      messages: false,
      events: false
    },
    isTyping: false,
    pendingGreeting: false
  }),

  getters: {
    hasActiveCompanion: (state) => !!state.activeCompanion,
    unlockedCompanions: (state) => state.companions.filter(c => c.isUnlocked),
    lockedCompanions: (state) => state.companions.filter(c => !c.isUnlocked),
    activeConversation: (state) => state.conversations,
    hasNewEvents: (state) => state.availableEvents.length > 0,
    totalDaysTogether: (state) => {
      if (!state.activeCompanion?.unlockedAt) return 0
      const start = new Date(state.activeCompanion.unlockedAt)
      const now = new Date()
      return Math.floor((now - start) / (1000 * 60 * 60 * 24))
    }
  },

  actions: {
    async fetchCompanions(forceRefresh = false) {
      if (this.loading.companions && !forceRefresh) return
      
      this.loading.companions = true
      try {
        const res = await companionApi.getCompanions()
        if (res.code === 200) {
          this.companions = res.data || []
        }
      } catch (error) {
        console.error('获取旅伴列表失败:', error)
      } finally {
        this.loading.companions = false
      }
    },

    async fetchActiveCompanion(forceRefresh = false) {
      if (this.loading.active && !forceRefresh) return
      
      this.loading.active = true
      try {
        const res = await companionApi.getActiveCompanion()
        if (res.code === 200) {
          this.activeCompanion = res.data
          if (this.activeCompanion) {
            this.fetchConversations(this.activeCompanion.id)
            this.fetchEvents(this.activeCompanion.id)
            if (!this.pendingGreeting) {
              this.pendingGreeting = true
              setTimeout(() => {
                this.sendGreeting(this.activeCompanion.id, 'default')
              }, 1000)
            }
          }
        }
      } catch (error) {
        console.error('获取当前旅伴失败:', error)
      } finally {
        this.loading.active = false
      }
    },

    async fetchCompanionDetail(id) {
      this.loading.detail = true
      try {
        const res = await companionApi.getCompanionDetail(id)
        if (res.code === 200) {
          this.currentCompanionDetail = res.data
        }
        return res.data
      } catch (error) {
        console.error('获取旅伴详情失败:', error)
        return null
      } finally {
        this.loading.detail = false
      }
    },

    async activateCompanion(id) {
      try {
        const res = await companionApi.activateCompanion(id)
        if (res.code === 200) {
          this.activeCompanion = res.data
          this.fetchConversations(id)
          this.fetchEvents(id)
          this.sendGreeting(id, 'return')
        }
        return res
      } catch (error) {
        console.error('切换旅伴失败:', error)
        throw error
      }
    },

    async unlockCompanion(templateId, customName = null) {
      try {
        const res = await companionApi.unlockCompanion(templateId, customName)
        if (res.code === 200) {
          this.fetchCompanions(true)
          if (res.data) {
            this.activeCompanion = res.data
            this.fetchConversations(res.data.id)
            this.fetchEvents(res.data.id)
            this.sendGreeting(res.data.id, 'default')
          }
        }
        return res
      } catch (error) {
        console.error('解锁旅伴失败:', error)
        throw error
      }
    },

    async checkUnlockConditions() {
      try {
        const res = await companionApi.checkUnlock()
        if (res.code === 200) {
          this.newlyUnlocked = res.data || []
        }
        return this.newlyUnlocked
      } catch (error) {
        console.error('检查解锁条件失败:', error)
        return []
      }
    },

    async fetchConversations(companionId, limit = 50, offset = 0) {
      this.loading.conversations = true
      try {
        const res = await companionApi.getConversations(companionId, limit, offset)
        if (res.code === 200) {
          this.conversations = res.data || []
        }
        return this.conversations
      } catch (error) {
        console.error('获取对话历史失败:', error)
        return []
      } finally {
        this.loading.conversations = false
      }
    },

    async sendMessage(companionId, content, context = null) {
      if (!content.trim()) return
      
      this.loading.messages = true
      this.isTyping = true
      
      const userMsg = {
        id: Date.now(),
        type: 'text',
        sender: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString()
      }
      this.conversations.push(userMsg)
      
      try {
        const res = await companionApi.sendMessage(companionId, content.trim(), context)
        if (res.code === 200 && res.data) {
          this.conversations.push(res.data.companionMessage)
          
          if (res.data.companion) {
            this.activeCompanion = res.data.companion
          }
          
          if (res.data.leveledUp) {
            this.showLevelUpNotification(res.data.newLevel)
          }
          
          this.updateCompanionStats(companionId, res.data.expGain, res.data.intimacyGain)
        }
        return res
      } catch (error) {
        console.error('发送消息失败:', error)
        throw error
      } finally {
        this.loading.messages = false
        this.isTyping = false
      }
    },

    async sendGreeting(companionId, type = 'default') {
      try {
        const res = await companionApi.sendGreeting(companionId, type)
        if (res.code === 200 && res.data) {
          if (!this.conversations.find(m => m.id === res.data.id)) {
            this.conversations.push(res.data)
          }
        }
      } catch (error) {
        console.error('发送问候失败:', error)
      }
    },

    async clearConversations(companionId) {
      try {
        await companionApi.clearConversations(companionId)
        this.conversations = []
        this.sendGreeting(companionId, 'default')
      } catch (error) {
        console.error('清空对话失败:', error)
      }
    },

    async fetchEvents(companionId, type = 'available') {
      this.loading.events = true
      try {
        const res = await companionApi.getEvents(companionId, type)
        if (res.code === 200) {
          if (type === 'available') {
            this.availableEvents = res.data || []
          } else {
            this.completedEvents = res.data || []
          }
        }
        return res.data || []
      } catch (error) {
        console.error('获取事件失败:', error)
        return []
      } finally {
        this.loading.events = false
      }
    },

    async triggerEvent(companionId, eventId) {
      try {
        const res = await companionApi.triggerEvent(companionId, eventId)
        return res
      } catch (error) {
        console.error('触发事件失败:', error)
        throw error
      }
    },

    async completeEvent(companionId, eventId, choiceId = null) {
      try {
        const res = await companionApi.completeEvent(companionId, eventId, choiceId)
        if (res.code === 200 && res.data) {
          if (res.data.companion) {
            this.activeCompanion = res.data.companion
          }
          
          if (res.data.leveledUp) {
            this.showLevelUpNotification(res.data.newLevel)
          }
          
          this.fetchEvents(companionId, 'available')
          this.fetchEvents(companionId, 'completed')
        }
        return res
      } catch (error) {
        console.error('完成事件失败:', error)
        throw error
      }
    },

    addExperienceFromAction(actionType, sourceId = null) {
      if (!this.activeCompanion) return
      
      const gains = {
        mood_record: { exp: 10, intimacy: 3, text: '记录了心情' },
        chapter_read: { exp: 15, intimacy: 5, text: '阅读了故事章节' },
        task_complete: { exp: 8, intimacy: 2, text: '完成了任务' },
        achievement_unlock: { exp: 25, intimacy: 8, text: '解锁了成就' },
        retrospective: { exp: 12, intimacy: 4, text: '写下了回顾' },
        chapter_note: { exp: 18, intimacy: 6, text: '写下了章节札记' }
      }
      
      const gain = gains[actionType] || { exp: 5, intimacy: 1, text: '进行了互动' }
      
      this.updateCompanionStats(this.activeCompanion.id, gain.exp, gain.intimacy)
      
      this.checkActionTriggers(actionType)
    },

    updateCompanionStats(companionId, expGain, intimacyGain) {
      const companion = this.activeCompanion
      if (!companion || companion.id !== companionId) return
      
      let newExp = (companion.experience || 0) + expGain
      let newIntimacy = Math.max(0, Math.min(100, (companion.intimacy || 0) + intimacyGain))
      let newLevel = companion.level || 1
      
      const expToLevel = (level) => level * 100
      let leveledUp = false
      let oldLevel = newLevel
      
      while (newExp >= expToLevel(newLevel)) {
        newExp -= expToLevel(newLevel)
        newLevel++
        leveledUp = true
      }
      
      this.activeCompanion = {
        ...companion,
        experience: newExp,
        level: newLevel,
        intimacy: newIntimacy,
        levelProgress: Math.round((newExp / expToLevel(newLevel)) * 100),
        expForNextLevel: expToLevel(newLevel),
        intimacyLevel: this.getIntimacyLevel(newIntimacy)
      }
      
      if (leveledUp) {
        this.showLevelUpNotification(newLevel)
      }
    },

    checkActionTriggers(actionType) {
      const achievementStore = useAchievementStore()
      achievementStore.checkAchievements()
    },

    getIntimacyLevel(intimacy) {
      if (intimacy >= 100) return { level: 5, name: '灵魂伴侣', color: '#ec4899' }
      if (intimacy >= 70) return { level: 4, name: '知心好友', color: '#f97316' }
      if (intimacy >= 40) return { level: 3, name: '亲密伙伴', color: '#eab308' }
      if (intimacy >= 20) return { level: 2, name: '熟悉朋友', color: '#22c55e' }
      if (intimacy >= 5) return { level: 1, name: '初识同伴', color: '#60a5fa' }
      return { level: 0, name: '陌生人', color: '#9ca3af' }
    },

    showLevelUpNotification(newLevel) {
      console.log(`🎉 恭喜！你的旅伴升到了 ${newLevel} 级！`)
    },

    resetStore() {
      this.companions = []
      this.activeCompanion = null
      this.currentCompanionDetail = null
      this.conversations = []
      this.availableEvents = []
      this.completedEvents = []
      this.newlyUnlocked = []
      this.pendingGreeting = false
    }
  }
})
