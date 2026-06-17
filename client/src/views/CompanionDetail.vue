<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCompanionStore } from '@/stores/companion'
import { useNotificationStore } from '@/stores/notification'
import { 
  ArrowLeft, Heart, Star, TrendingUp, Zap, Calendar,
  MessageCircle, Sparkles, ChevronRight, Clock, Award,
  Crown, Shield, Sword, Wand2, Moon, Target, BookOpen, User
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const companionStore = useCompanionStore()
const notificationStore = useNotificationStore()

const activeTab = ref('overview')
const isLoading = ref(false)

const tabs = [
  { id: 'overview', label: '总览', icon: Star },
  { id: 'growth', label: '成长日志', icon: TrendingUp },
  { id: 'events', label: '专属事件', icon: Sparkles },
  { id: 'conversations', label: '对话记录', icon: MessageCircle }
]

const companionDetail = computed(() => companionStore.currentCompanionDetail)
const activeCompanion = computed(() => companionStore.activeCompanion)
const loading = computed(() => companionStore.loading.detail)

const personalityIcons = {
  gentle: Heart,
  brave: Shield,
  wise: Sword,
  creative: Wand2,
  mysterious: Moon
}

const statLabels = {
  wisdom: { name: '智慧', icon: BookOpen, color: '#6366f1' },
  courage: { name: '勇气', icon: Shield, color: '#f97316' },
  kindness: { name: '善良', icon: Heart, color: '#ec4899' },
  creativity: { name: '创意', icon: Wand2, color: '#a855f7' },
  empathy: { name: '共情', icon: Moon, color: '#06b6d4' }
}

const actionTypeLabels = {
  unlock: { text: '解锁旅伴', icon: Crown, color: '#a855f7' },
  mood_record: { text: '心情记录', icon: Heart, color: '#ec4899' },
  chapter_read: { text: '阅读章节', icon: BookOpen, color: '#6366f1' },
  task_complete: { text: '完成任务', icon: Target, color: '#f97316' },
  achievement_unlock: { text: '解锁成就', icon: Award, color: '#eab308' },
  retrospective: { text: '写下回顾', icon: Clock, color: '#06b6d4' },
  chapter_note: { text: '章节札记', icon: BookOpen, color: '#22c55e' },
  conversation: { text: '对话互动', icon: MessageCircle, color: '#8b5cf6' },
  event: { text: '完成事件', icon: Sparkles, color: '#f43f5e' }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  })
}

function getDaysTogether(dateStr) {
  if (!dateStr) return 0
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

async function fetchData() {
  const id = parseInt(route.params.id)
  if (!id) {
    router.push('/companions')
    return
  }
  
  isLoading.value = true
  try {
    await companionStore.fetchCompanionDetail(id)
    await companionStore.fetchEvents(id, 'available')
    await companionStore.fetchEvents(id, 'completed')
  } catch (e) {
    notificationStore.error('加载失败，请重试')
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.back()
}

function goToChat() {
  router.push('/chat')
}

function activateCompanion() {
  if (!companionDetail.value) return
  companionStore.activateCompanion(companionDetail.value.id).then(() => {
    notificationStore.success(`已切换到 ${companionDetail.value.name}`)
  })
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="companion-detail-page">
    <header class="detail-header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">旅伴详情</h1>
      <div style="width: 40px"></div>
    </header>

    <div v-if="loading || isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="companionDetail" class="detail-content">
      <div class="companion-hero">
        <div class="hero-background" :style="{ background: `linear-gradient(135deg, ${companionDetail.intimacyLevel?.color}33, ${companionDetail.intimacyLevel?.color}11)` }"></div>
        <div class="hero-content">
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <div class="avatar-large" :style="{ backgroundColor: companionDetail.intimacyLevel?.color }">
                <span class="avatar-emoji">{{ companionDetail.avatar }}</span>
              </div>
              <div class="level-badge">
                <Star class="badge-icon" />
                Lv.{{ companionDetail.level }}
              </div>
            </div>
            <div class="companion-names">
              <h2 class="display-name">{{ companionDetail.name }}</h2>
              <p class="template-name">{{ companionDetail.templateName }}</p>
            </div>
          </div>

          <div class="hero-stats">
            <div class="stat-card">
              <div class="stat-icon-wrapper" :style="{ backgroundColor: companionDetail.intimacyLevel?.color + '22' }">
                <Heart class="stat-icon" :style="{ color: companionDetail.intimacyLevel?.color }" />
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ companionDetail.intimacy }}/100</span>
                <span class="stat-label">{{ companionDetail.intimacyLevel?.name }}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper" style="background: rgba(234, 179, 8, 0.2)">
                <Calendar class="stat-icon" style="color: #eab308" />
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ getDaysTogether(companionDetail.unlockedAt) }}天</span>
                <span class="stat-label">相伴时光</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper" style="background: rgba(59, 130, 246, 0.2)">
                <MessageCircle class="stat-icon" style="color: #3b82f6" />
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ companionDetail.stats?.totalConversations || 0 }}次</span>
                <span class="stat-label">对话互动</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper" style="background: rgba(168, 85, 247, 0.2)">
                <Sparkles class="stat-icon" style="color: #a855f7" />
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ companionDetail.stats?.totalEvents || 0 }}个</span>
                <span class="stat-label">专属事件</span>
              </div>
            </div>
          </div>

          <div class="exp-section">
            <div class="exp-header">
              <span class="exp-label">
                <Zap class="exp-icon" />
                经验值
              </span>
              <span class="exp-value">{{ companionDetail.experience }} / {{ companionDetail.expForNextLevel }}</span>
            </div>
            <div class="exp-bar">
              <div class="exp-fill" :style="{ width: companionDetail.levelProgress + '%' }"></div>
            </div>
            <p class="exp-hint">距离升级还需要 {{ companionDetail.expForNextLevel - companionDetail.experience }} 经验</p>
          </div>

          <div class="action-buttons">
            <button 
              v-if="!companionDetail.isActive"
              class="btn-primary"
              @click="activateCompanion"
            >
              <Crown class="btn-icon" />
              设为当前旅伴
            </button>
            <button 
              v-else
              class="btn-primary"
              @click="goToChat"
            >
              <MessageCircle class="btn-icon" />
              开始对话
            </button>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="tab-icon" />
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'overview'" class="overview-tab">
          <section class="info-section">
            <h3 class="section-title">
              <BookOpen class="title-icon" />
              背景故事
            </h3>
            <p class="story-text">{{ companionDetail.backgroundStory }}</p>
          </section>

          <section v-if="companionDetail.personality" class="info-section">
            <h3 class="section-title">
              <Heart class="title-icon" />
              性格特点
            </h3>
            <div class="personality-tags">
              <span 
                v-for="trait in companionDetail.personality.traits || []" 
                :key="trait"
                class="personality-tag"
              >
                {{ trait }}
              </span>
            </div>
          </section>

          <section v-if="companionDetail.stats && Object.keys(companionDetail.stats).length > 0" class="info-section">
            <h3 class="section-title">
              <TrendingUp class="title-icon" />
              能力属性
            </h3>
            <div class="stats-grid">
              <div 
                v-for="(value, key) in companionDetail.stats" 
                :key="key"
                class="stat-item"
              >
                <div class="stat-header">
                  <component 
                    :is="statLabels[key]?.icon || Star" 
                    class="stat-type-icon"
                    :style="{ color: statLabels[key]?.color }"
                  />
                  <span class="stat-name">{{ statLabels[key]?.name || key }}</span>
                  <span class="stat-num">{{ value }}</span>
                </div>
                <div class="stat-bar">
                  <div 
                    class="stat-fill" 
                    :style="{ 
                      width: Math.min(100, value * 5) + '%',
                      backgroundColor: statLabels[key]?.color
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="companionDetail.traits" class="info-section">
            <h3 class="section-title">
              <Sparkles class="title-icon" />
              特殊特质
            </h3>
            <div class="traits-grid">
              <div 
                v-for="trait in companionDetail.traits" 
                :key="trait"
                class="trait-card"
              >
                {{ trait }}
              </div>
            </div>
          </section>
        </div>

        <div v-if="activeTab === 'growth'" class="growth-tab">
          <div v-if="companionDetail.growthLogs && companionDetail.growthLogs.length > 0" class="growth-timeline">
            <div 
              v-for="log in companionDetail.growthLogs" 
              :key="log.id"
              class="timeline-item"
            >
              <div class="timeline-dot" :style="{ backgroundColor: actionTypeLabels[log.action_type]?.color }">
                <component 
                  :is="actionTypeLabels[log.action_type]?.icon || Star" 
                  class="dot-icon"
                />
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-action">{{ actionTypeLabels[log.action_type]?.text || log.action_type }}</span>
                  <span class="timeline-time">{{ formatTime(log.createdAt) }}</span>
                </div>
                <p class="timeline-detail">{{ log.actionDetail }}</p>
                <div class="timeline-gains">
                  <span v-if="log.expChange" class="gain exp">
                    <Zap class="gain-icon" /> +{{ log.expChange }} EXP
                  </span>
                  <span v-if="log.intimacyChange" class="gain intimacy">
                    <Heart class="gain-icon" /> +{{ log.intimacyChange }} 亲密度
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <TrendingUp class="empty-icon" />
            <p class="empty-text">还没有成长记录，快去和旅伴互动吧~</p>
          </div>
        </div>

        <div v-if="activeTab === 'events'" class="events-tab">
          <div v-if="companionStore.availableEvents.length > 0" class="events-section">
            <h3 class="section-subtitle">可触发事件</h3>
            <div class="event-cards">
              <div 
                v-for="event in companionStore.availableEvents" 
                :key="event.id"
                class="event-card available"
                @click="goToChat"
              >
                <div class="event-header">
                  <Sparkles class="event-icon" />
                  <span class="event-type">{{ event.type === 'milestone' ? '里程碑' : event.type === 'story' ? '故事' : '互动' }}</span>
                </div>
                <h4 class="event-title">{{ event.title }}</h4>
                <p class="event-desc">{{ event.description }}</p>
                <div class="event-footer">
                  <span v-if="event.requiredLevel" class="event-req">
                    需要 Lv.{{ event.requiredLevel }}
                  </span>
                  <span v-if="event.requiredIntimacy" class="event-req">
                    亲密度 {{ event.requiredIntimacy }}
                  </span>
                  <ChevronRight class="chevron-icon" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="companionStore.completedEvents.length > 0" class="events-section">
            <h3 class="section-subtitle">已完成事件</h3>
            <div class="event-cards">
              <div 
                v-for="event in companionStore.completedEvents" 
                :key="event.id"
                class="event-card completed"
              >
                <div class="event-header">
                  <Award class="event-icon" />
                  <span class="event-type">已完成</span>
                </div>
                <h4 class="event-title">{{ event.title }}</h4>
                <p class="event-desc">{{ event.description }}</p>
                <div class="event-footer">
                  <span class="completed-time">{{ formatDate(event.completedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="companionStore.availableEvents.length === 0 && companionStore.completedEvents.length === 0" class="empty-state">
            <Sparkles class="empty-icon" />
            <p class="empty-text">还没有专属事件，继续和旅伴互动解锁更多~</p>
          </div>
        </div>

        <div v-if="activeTab === 'conversations'" class="conversations-tab">
          <div v-if="companionDetail.recentConversations && companionDetail.recentConversations.length > 0" class="conversation-list">
            <div 
              v-for="msg in companionDetail.recentConversations" 
              :key="msg.id"
              :class="['conversation-item', { user: msg.sender === 'user' }]"
            >
              <div class="msg-avatar">
                <Star v-if="msg.sender !== 'user'" class="avatar-icon" />
                <User v-else class="avatar-icon" />
              </div>
              <div class="msg-content">
                <p class="msg-text">{{ msg.content }}</p>
                <div class="msg-meta">
                  <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
                  <span v-if="msg.expChange || msg.intimacyChange" class="msg-gains">
                    <Zap v-if="msg.expChange" /> +{{ msg.expChange }}
                    <Heart v-if="msg.intimacyChange" /> +{{ msg.intimacyChange }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <MessageCircle class="empty-icon" />
            <p class="empty-text">还没有对话记录，快去和旅伴聊聊天吧~</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <Star class="empty-icon" />
      <h3>旅伴不存在</h3>
      <button class="go-back-btn" @click="router.push('/companions')">
        返回旅伴列表
      </button>
    </div>
  </div>
</template>

<style scoped>
.companion-detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fef3ff 0%, #f0f9ff 100%);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.back-btn .icon {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.loading-container {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.detail-content {
  max-width: 800px;
  margin: 0 auto;
}

.companion-hero {
  position: relative;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 30px 20px;
}

.avatar-section {
  text-align: center;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.avatar-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.avatar-emoji {
  font-size: 60px;
}

.level-badge {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
}

.badge-icon {
  width: 16px;
  height: 16px;
}

.companion-names {
  text-align: center;
}

.display-name {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.template-name {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}

.stat-icon {
  width: 22px;
  height: 22px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.exp-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.exp-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.exp-icon {
  width: 20px;
  height: 20px;
  color: #eab308;
}

.exp-value {
  color: var(--text-secondary);
  font-size: 14px;
}

.exp-bar {
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 6px;
  transition: width 0.5s ease;
}

.exp-hint {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
}

.action-buttons {
  display: flex;
  justify-content: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 40px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-content {
  padding: 0 20px 40px;
}

.info-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.title-icon {
  width: 22px;
  height: 22px;
  color: var(--accent-primary);
}

.story-text {
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}

.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.personality-tag {
  padding: 6px 14px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.stat-type-icon {
  width: 18px;
  height: 18px;
}

.stat-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.traits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.trait-card {
  padding: 14px;
  background: linear-gradient(135deg, var(--accent-light), rgba(139, 92, 246, 0.1));
  border: 1px solid var(--accent-primary);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-primary);
  text-align: center;
}

.growth-timeline {
  position: relative;
  padding-left: 30px;
}

.growth-timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-dot {
  position: absolute;
  left: -30px;
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 3px solid;
}

.dot-icon {
  width: 16px;
  height: 16px;
  color: white;
}

.timeline-content {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-action {
  font-weight: 600;
  color: var(--text-primary);
}

.timeline-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.timeline-detail {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 10px 0;
}

.timeline-gains {
  display: flex;
  gap: 12px;
}

.gain {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.gain.exp {
  color: #eab308;
}

.gain.intimacy {
  color: #ec4899;
}

.gain-icon {
  width: 14px;
  height: 14px;
}

.events-section {
  margin-bottom: 24px;
}

.section-subtitle {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.event-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.3s ease;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.event-card.available {
  border: 2px solid var(--accent-primary);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05));
}

.event-card.completed {
  opacity: 0.8;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.event-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-primary);
}

.event-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.event-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 10px 0;
  line-height: 1.5;
}

.event-footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.event-req {
  font-size: 12px;
  padding: 3px 8px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 8px;
  font-weight: 600;
}

.completed-time {
  font-size: 13px;
  color: var(--text-secondary);
}

.chevron-icon {
  margin-left: auto;
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversation-item {
  display: flex;
  gap: 12px;
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: var(--shadow-sm);
}

.conversation-item.user {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05));
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.conversation-item.user .msg-avatar {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
}

.avatar-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-primary);
}

.conversation-item.user .avatar-icon {
  color: white;
}

.msg-content {
  flex: 1;
  min-width: 0;
}

.msg-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.6;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.msg-gains {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-primary);
  font-weight: 600;
}

.msg-gains svg {
  width: 12px;
  height: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  width: 60px;
  height: 60px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
}

.not-found {
  text-align: center;
  padding: 80px 20px;
}

.not-found h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.go-back-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.go-back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

@media (max-width: 640px) {
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .traits-grid {
    grid-template-columns: 1fr;
  }
}
</style>
