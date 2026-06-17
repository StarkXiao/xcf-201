<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHealingMapStore } from '@/stores/healingMap'
import { useNotificationStore } from '@/stores/notification'
import { Map, Trophy, Calendar, DoorOpen, User, ChevronRight, Sparkles, Target, Clock, Star, Award, Lock, Check, Gift, Rocket, TrendingUp, Zap } from 'lucide-vue-next'

const router = useRouter()
const healingMapStore = useHealingMapStore()
const notificationStore = useNotificationStore()

const activeTab = ref('overview')
const selectedStageId = ref(null)
const isLoading = ref(true)

const tabs = [
  { key: 'overview', name: '旅程概览', icon: Map },
  { key: 'stages', name: '疗愈阶段', icon: Target },
  { key: 'journey', name: '成长轨迹', icon: TrendingUp },
  { key: 'milestones', name: '里程碑', icon: Trophy },
  { key: 'unlocks', name: '已解锁', icon: Gift }
]

const overview = computed(() => healingMapStore.overview)
const stages = computed(() => healingMapStore.stages)
const currentStage = computed(() => healingMapStore.currentStage)
const journey = computed(() => healingMapStore.journey)
const milestones = computed(() => healingMapStore.milestones)
const unlocks = computed(() => healingMapStore.unlocks)

const selectedStage = computed(() => {
  if (selectedStageId.value) {
    return stages.value.find(s => s.id === selectedStageId.value)
  }
  return currentStage.value
})

function formatDate(dateStr) {
  if (!dateStr) return '未解锁'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getEventTypeColor(type) {
  const colors = {
    stage_unlock: '#8b5cf6',
    stage_complete: '#22c55e',
    mood: '#ec4899',
    achievement: '#fbbf24',
    milestone: '#3b82f6',
    room: '#f97316'
  }
  return colors[type] || '#6b7280'
}

function getEventTypeLabel(type) {
  const labels = {
    stage_unlock: '阶段解锁',
    stage_complete: '阶段完成',
    mood: '心情记录',
    achievement: '成就解锁',
    milestone: '里程碑',
    room: '房间探索'
  }
  return labels[type] || '事件'
}

function getModulePath(module) {
  const paths = {
    calendar: '/calendar',
    rooms: '/rooms',
    achievements: '/achievements',
    moodLab: '/mood-lab',
    wishCommission: '/wish-commission',
    memoryLetter: '/memory-letter',
    profile: '/profile',
    companions: '/companions'
  }
  return paths[module] || '/calendar'
}

function navigateToModule(module) {
  const path = getModulePath(module)
  router.push(path)
}

function selectStage(stageId) {
  if (stages.value.find(s => s.id === stageId)?.status !== 'locked') {
    selectedStageId.value = stageId
  }
}

async function claimReward(stageId) {
  const result = await healingMapStore.claimStageReward(stageId)
  if (result.success) {
    notificationStore.success('恭喜！已领取阶段奖励')
  } else {
    notificationStore.error(result.message || '领取奖励失败')
  }
}

function getModuleIcon(module) {
  const icons = {
    calendar: Calendar,
    rooms: DoorOpen,
    achievements: Trophy,
    moodLab: Zap,
    wishCommission: Star,
    memoryLetter: Gift,
    profile: User,
    companions: Sparkles
  }
  return icons[module] || Star
}

async function loadData() {
  isLoading.value = true
  try {
    await healingMapStore.fetchAllData()
  } catch (e) {
    console.error('加载疗愈地图数据失败:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>疗愈地图</h1>
        <p class="page-subtitle">记录你的成长旅程，见证每一步的蜕变</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载疗愈地图中...</p>
    </div>

    <div v-else>
      <div v-if="overview" class="progress-overview glass-card">
        <div class="progress-header">
          <div class="progress-info">
            <span class="progress-label">总旅程进度</span>
            <span class="progress-value">{{ overview.totalProgress }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div 
              class="progress-bar" 
              :style="{ width: `${overview.totalProgress}%` }"
            ></div>
          </div>
        </div>
        
        <div class="journey-stats">
          <div class="journey-stat-item">
            <div class="stat-icon-wrapper days">
              <Clock class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ overview.daysOnJourney }}</span>
              <span class="stat-label">旅程天数</span>
            </div>
          </div>
          
          <div class="journey-stat-item">
            <div class="stat-icon-wrapper mood">
              <Calendar class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ overview.totalMoodRecords }}</span>
              <span class="stat-label">心情记录</span>
            </div>
          </div>
          
          <div class="journey-stat-item">
            <div class="stat-icon-wrapper room">
              <DoorOpen class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ overview.totalRoomsUnlocked }}</span>
              <span class="stat-label">解锁房间</span>
            </div>
          </div>
          
          <div class="journey-stat-item">
            <div class="stat-icon-wrapper achievement">
              <Trophy class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ overview.totalAchievements }}</span>
              <span class="stat-label">获得成就</span>
            </div>
          </div>
          
          <div class="journey-stat-item">
            <div class="stat-icon-wrapper milestone">
              <Award class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ overview.totalMilestones }}</span>
              <span class="stat-label">里程碑</span>
            </div>
          </div>
        </div>
        
        <div class="current-stage-banner" v-if="currentStage">
          <div class="stage-icon-wrapper" :style="{ backgroundColor: healingMapStore.getStageColor(currentStage.key) + '20' }">
            <span class="stage-emoji">{{ healingMapStore.getStageIcon(currentStage.key) }}</span>
          </div>
          <div class="stage-info">
            <span class="stage-label">当前阶段</span>
            <span class="stage-name">{{ currentStage.name }}</span>
            <p class="stage-desc">{{ currentStage.description }}</p>
          </div>
          <div class="stage-progress">
            <span class="progress-percent">{{ currentStage.progress }}%</span>
            <div class="mini-progress-bar">
              <div 
                class="mini-progress-fill" 
                :style="{ 
                  width: `${currentStage.progress}%`,
                  backgroundColor: healingMapStore.getStageColor(currentStage.key)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs-nav glass-card">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="tab-icon" />
          <span class="tab-text">{{ tab.name }}</span>
        </button>
      </div>

      <div v-if="activeTab === 'overview'" class="overview-content">
        <div class="stages-map glass-card">
          <h3 class="section-title">疗愈旅程</h3>
          <div class="stages-timeline">
            <div 
              v-for="(stage, index) in stages" 
              :key="stage.id"
              class="stage-node"
              :class="{ 
                completed: stage.status === 'completed',
                active: stage.status === 'active',
                locked: stage.status === 'locked'
              }"
              @click="selectStage(stage.id)"
            >
              <div class="node-connector" v-if="index < stages.length - 1">
                <div 
                  class="connector-line"
                  :class="{ filled: stage.status === 'completed' }"
                ></div>
              </div>
              
              <div 
                class="node-circle"
                :style="{ 
                  borderColor: stage.status !== 'locked' ? healingMapStore.getStageColor(stage.key) : undefined,
                  backgroundColor: stage.status === 'completed' ? healingMapStore.getStageColor(stage.key) + '30' : undefined
                }"
              >
                <Lock v-if="stage.status === 'locked'" class="node-icon locked" />
                <Check v-else-if="stage.status === 'completed'" class="node-icon completed" />
                <span v-else class="node-emoji">{{ healingMapStore.getStageIcon(stage.key) }}</span>
              </div>
              
              <div class="node-info">
                <span class="node-name">{{ stage.name }}</span>
                <span class="node-progress" v-if="stage.status !== 'locked'">
                  {{ stage.progress }}%
                </span>
                <span class="node-locked" v-else>未解锁</span>
              </div>
            </div>
          </div>
        </div>

        <div class="recent-journey glass-card">
          <h3 class="section-title">最近旅程</h3>
          <div class="journey-list">
            <div 
              v-for="event in journey.slice().reverse().slice(0, 5)" 
              :key="event.id"
              class="journey-item"
              @click="event.linkedTo && navigateToModule(event.linkedTo.module)"
              :class="{ clickable: event.linkedTo }"
            >
              <div class="journey-icon-wrapper" :style="{ backgroundColor: getEventTypeColor(event.type) + '20' }">
                <span class="journey-emoji">{{ event.icon }}</span>
              </div>
              <div class="journey-content">
                <div class="journey-header">
                  <span class="journey-type" :style="{ color: getEventTypeColor(event.type) }">
                    {{ getEventTypeLabel(event.type) }}
                  </span>
                  <span class="journey-date">{{ formatDate(event.date) }}</span>
                </div>
                <h4 class="journey-title">{{ event.title }}</h4>
                <p class="journey-desc">{{ event.description }}</p>
                <div v-if="event.reward" class="journey-reward">
                  <Gift class="reward-icon" />
                  <span class="reward-text">获得奖励：{{ event.reward.icon }} {{ event.reward.name }}</span>
                </div>
              </div>
              <ChevronRight v-if="event.linkedTo" class="chevron-icon" />
            </div>
          </div>
        </div>

        <div class="milestones-preview glass-card">
          <div class="section-header">
            <h3 class="section-title">里程碑进度</h3>
            <span class="milestone-count">
              {{ healingMapStore.unlockedMilestones }} / {{ healingMapStore.totalMilestones }}
            </span>
          </div>
          <div class="milestones-grid">
            <div 
              v-for="milestone in milestones.slice(0, 8)" 
              :key="milestone.id"
              class="milestone-card"
              :class="{ unlocked: milestone.unlocked }"
            >
              <div 
                class="milestone-icon-wrapper"
                :style="{ 
                  backgroundColor: milestone.unlocked ? healingMapStore.getStageColor(milestone.stageKey) + '20' : 'rgba(255,255,255,0.05)'
                }"
              >
                <span class="milestone-emoji">{{ milestone.icon }}</span>
              </div>
              <div class="milestone-info">
                <span class="milestone-name">{{ milestone.name }}</span>
                <span class="milestone-status">
                  {{ milestone.unlocked ? formatDate(milestone.unlockedAt) : '未解锁' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'stages'" class="stages-content">
        <div class="stage-detail glass-card" v-if="selectedStage">
          <div class="stage-detail-header">
            <div 
              class="stage-detail-icon"
              :style="{ backgroundColor: healingMapStore.getStageColor(selectedStage.key) + '20' }"
            >
              <span class="stage-detail-emoji">{{ healingMapStore.getStageIcon(selectedStage.key) }}</span>
            </div>
            <div class="stage-detail-info">
              <div class="stage-status-badge" :class="selectedStage.status">
                {{ selectedStage.status === 'completed' ? '已完成' : selectedStage.status === 'active' ? '进行中' : '未解锁' }}
              </div>
              <h2 class="stage-detail-name">{{ selectedStage.name }}</h2>
              <p class="stage-detail-desc">{{ selectedStage.description }}</p>
              <div class="stage-dates">
                <span v-if="selectedStage.unlockedAt">
                  解锁于 {{ formatDate(selectedStage.unlockedAt) }}
                </span>
                <span v-if="selectedStage.completedAt">
                  · 完成于 {{ formatDate(selectedStage.completedAt) }}
                </span>
              </div>
            </div>
            <div class="stage-detail-progress">
              <span class="detail-progress-value">{{ selectedStage.progress }}%</span>
              <div class="detail-progress-bar-bg">
                <div 
                  class="detail-progress-bar"
                  :style="{ 
                    width: `${selectedStage.progress}%`,
                    backgroundColor: healingMapStore.getStageColor(selectedStage.key)
                  }"
                ></div>
              </div>
            </div>
          </div>

          <div class="stage-reward" v-if="selectedStage.reward">
            <div class="reward-header">
              <Gift class="reward-section-icon" />
              <span class="reward-section-title">阶段奖励</span>
            </div>
            <div class="reward-content">
              <div class="reward-preview">
                <span class="reward-preview-icon">{{ selectedStage.reward.icon }}</span>
                <div class="reward-preview-info">
                  <span class="reward-preview-name">{{ selectedStage.reward.name }}</span>
                  <span class="reward-preview-type">
                    {{ selectedStage.reward.type === 'companion' ? '伙伴' : '称号' }}
                  </span>
                </div>
              </div>
              <button 
                v-if="selectedStage.status === 'completed' && !selectedStage.rewardClaimed"
                class="claim-reward-btn"
                @click="claimReward(selectedStage.id)"
              >
                <Gift class="btn-icon" />
                领取奖励
              </button>
              <div v-else-if="selectedStage.rewardClaimed" class="reward-claimed">
                <Check class="claimed-icon" />
                已领取
              </div>
            </div>
          </div>

          <div class="stage-requirements">
            <div class="requirements-header">
              <Target class="requirements-icon" />
              <span class="requirements-title">阶段目标</span>
            </div>
            <div class="requirements-list">
              <div 
                v-for="(req, index) in selectedStage.requirements" 
                :key="index"
                class="requirement-item"
                :class="{ completed: req.current >= req.target }"
              >
                <div class="requirement-check">
                  <Check v-if="req.current >= req.target" class="check-icon completed" />
                  <div v-else class="check-circle"></div>
                </div>
                <div class="requirement-info">
                  <span class="requirement-label">{{ req.label }}</span>
                  <div class="requirement-progress-bar">
                    <div 
                      class="requirement-progress-fill"
                      :style="{ 
                        width: `${Math.min((req.current / req.target) * 100, 100)}%`,
                        backgroundColor: healingMapStore.getStageColor(selectedStage.key)
                      }"
                    ></div>
                  </div>
                </div>
                <span class="requirement-count">{{ req.current }} / {{ req.target }}</span>
              </div>
            </div>
          </div>

          <div class="stage-modules" v-if="selectedStage.linkedModules">
            <div class="modules-header">
              <Rocket class="modules-icon" />
              <span class="modules-title">关联模块</span>
            </div>
            <div class="modules-grid">
              <div 
                v-for="(module, key) in selectedStage.linkedModules" 
                :key="key"
                class="module-card"
                @click="navigateToModule(key)"
              >
                <component :is="getModuleIcon(key)" class="module-icon" />
                <div class="module-info">
                  <span class="module-name">{{ module.label }}</span>
                  <span class="module-progress">{{ module.progress }}%</span>
                </div>
                <ChevronRight class="module-chevron" />
              </div>
            </div>
          </div>

          <div class="stage-milestones" v-if="selectedStage.milestones && selectedStage.milestones.length > 0">
            <div class="milestones-section-header">
              <Award class="milestones-section-icon" />
              <span class="milestones-section-title">阶段里程碑</span>
            </div>
            <div class="stage-milestones-list">
              <div 
                v-for="milestone in selectedStage.milestones" 
                :key="milestone.id"
                class="stage-milestone-item"
                :class="{ unlocked: milestone.unlocked }"
              >
                <div 
                  class="milestone-icon"
                  :style="{ 
                    backgroundColor: milestone.unlocked ? healingMapStore.getStageColor(selectedStage.key) + '20' : 'rgba(255,255,255,0.05)'
                  }"
                >
                  <span>{{ milestone.icon }}</span>
                </div>
                <div class="milestone-content">
                  <span class="milestone-title">{{ milestone.name }}</span>
                  <span class="milestone-date">
                    {{ milestone.unlocked ? formatDate(milestone.unlockedAt) : '未解锁' }}
                  </span>
                </div>
                <Check v-if="milestone.unlocked" class="milestone-check" />
                <Lock v-else class="milestone-lock" />
              </div>
            </div>
          </div>

          <div class="stage-events" v-if="selectedStage.keyEvents && selectedStage.keyEvents.length > 0">
            <div class="events-header">
              <Sparkles class="events-icon" />
              <span class="events-title">关键事件</span>
            </div>
            <div class="events-timeline">
              <div 
                v-for="(event, index) in selectedStage.keyEvents" 
                :key="index"
                class="event-item"
              >
                <div class="event-dot" :style="{ backgroundColor: getEventTypeColor(event.type) }"></div>
                <div class="event-content">
                  <div class="event-date">{{ formatDate(event.date) }}</div>
                  <h4 class="event-title">{{ event.title }}</h4>
                  <p class="event-desc">{{ event.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'journey'" class="journey-content">
        <div class="full-journey glass-card">
          <h3 class="section-title">完整成长轨迹</h3>
          <div class="full-journey-timeline">
            <div 
              v-for="event in journey.slice().reverse()" 
              :key="event.id"
              class="full-journey-item"
              @click="event.linkedTo && navigateToModule(event.linkedTo.module)"
              :class="{ clickable: event.linkedTo }"
            >
              <div 
                class="full-journey-dot"
                :style="{ backgroundColor: getEventTypeColor(event.type) }"
              ></div>
              <div class="full-journey-card">
                <div class="full-journey-header">
                  <span 
                    class="full-journey-type" 
                    :style="{ backgroundColor: getEventTypeColor(event.type) + '20', color: getEventTypeColor(event.type) }"
                  >
                    {{ getEventTypeLabel(event.type) }}
                  </span>
                  <span class="full-journey-date">{{ formatDate(event.date) }}</span>
                </div>
                <div class="full-journey-body">
                  <span class="full-journey-icon">{{ event.icon }}</span>
                  <div class="full-journey-content">
                    <h4 class="full-journey-title">{{ event.title }}</h4>
                    <p class="full-journey-desc">{{ event.description }}</p>
                    <div v-if="event.reward" class="full-journey-reward">
                      <Gift class="reward-mini-icon" />
                      <span>{{ event.reward.icon }} {{ event.reward.name }}</span>
                    </div>
                    <div v-if="event.linkedTo" class="full-journey-link">
                      <ChevronRight class="link-icon" />
                      <span>前往{{ event.linkedTo.module === 'calendar' ? '心情日历' : event.linkedTo.module === 'rooms' ? '剧情房间' : event.linkedTo.module === 'achievements' ? '任务成就' : event.linkedTo.module === 'moodLab' ? '情绪实验室' : '相关页面' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'milestones'" class="milestones-content">
        <div class="milestones-full glass-card">
          <div class="milestones-full-header">
            <h3 class="section-title">所有里程碑</h3>
            <div class="milestones-stats">
              <span class="stat-pill">
                <Check class="pill-icon" />
                已解锁 {{ healingMapStore.unlockedMilestones }}
              </span>
              <span class="stat-pill total">
                <Target class="pill-icon" />
                总计 {{ healingMapStore.totalMilestones }}
              </span>
            </div>
          </div>
          
          <div class="milestones-by-stage">
            <div 
              v-for="stage in stages.filter(s => s.milestones && s.milestones.length > 0)" 
              :key="stage.id"
              class="stage-milestones-group"
            >
              <div class="group-header">
                <span 
                  class="group-color-dot"
                  :style="{ backgroundColor: healingMapStore.getStageColor(stage.key) }"
                ></span>
                <span class="group-stage-name">{{ stage.name }}</span>
                <span class="group-stage-icon">{{ healingMapStore.getStageIcon(stage.key) }}</span>
              </div>
              <div class="group-milestones">
                <div 
                  v-for="milestone in stage.milestones" 
                  :key="milestone.id"
                  class="milestone-full-card"
                  :class="{ unlocked: milestone.unlocked }"
                >
                  <div 
                    class="milestone-full-icon"
                    :style="{ 
                      backgroundColor: milestone.unlocked ? healingMapStore.getStageColor(stage.key) + '20' : 'rgba(255,255,255,0.05)',
                      borderColor: milestone.unlocked ? healingMapStore.getStageColor(stage.key) + '40' : 'rgba(255,255,255,0.1)'
                    }"
                  >
                    <span>{{ milestone.icon }}</span>
                  </div>
                  <div class="milestone-full-info">
                    <h4 class="milestone-full-name">{{ milestone.name }}</h4>
                    <p class="milestone-full-desc" v-if="milestone.description">{{ milestone.description }}</p>
                    <span class="milestone-full-date">
                      {{ milestone.unlocked ? '解锁于 ' + formatDate(milestone.unlockedAt) : '尚未解锁' }}
                    </span>
                  </div>
                  <div class="milestone-full-status">
                    <Check v-if="milestone.unlocked" class="status-icon unlocked" />
                    <Lock v-else class="status-icon locked" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'unlocks'" class="unlocks-content">
        <div class="unlocks-full glass-card">
          <h3 class="section-title">已解锁内容</h3>
          <div class="unlocks-grid">
            <div 
              v-for="unlock in unlocks" 
              :key="unlock.id"
              class="unlock-card"
            >
              <div class="unlock-icon-wrapper">
                <span class="unlock-icon">{{ unlock.icon }}</span>
              </div>
              <div class="unlock-info">
                <span class="unlock-type">{{ unlock.type === 'companion' ? '伙伴' : unlock.type === 'achievement' ? '成就' : '功能' }}</span>
                <h4 class="unlock-name">{{ unlock.name }}</h4>
                <p class="unlock-desc">{{ unlock.description }}</p>
                <span class="unlock-date">解锁于 {{ formatDate(unlock.unlockedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header-section {
  margin-bottom: 24px;
}

.page-title h1 {
  font-size: 2rem;
  margin-bottom: 4px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  
  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--color-secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-overview {
  padding: 24px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.progress-header {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.progress-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.progress-bar-bg {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.journey-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.journey-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.days { background: rgba(59, 130, 246, 0.15); .stat-icon { color: #3b82f6; } }
  &.mood { background: rgba(236, 72, 153, 0.15); .stat-icon { color: #ec4899; } }
  &.room { background: rgba(249, 115, 22, 0.15); .stat-icon { color: #f97316; } }
  &.achievement { background: rgba(251, 191, 36, 0.15); .stat-icon { color: #fbbf24; } }
  &.milestone { background: rgba(34, 197, 94, 0.15); .stat-icon { color: #22c55e; } }
}

.stat-icon {
  width: 20px;
  height: 20px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.current-stage-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stage-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stage-emoji {
  font-size: 2rem;
}

.stage-info {
  flex: 1;
}

.stage-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stage-name {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 4px 0;
  font-family: var(--font-display);
}

.stage-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.stage-progress {
  text-align: right;
}

.progress-percent {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-secondary);
  margin-bottom: 8px;
}

.mini-progress-bar {
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.tabs-nav {
  display: flex;
  gap: 8px;
  padding: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(123, 163, 201, 0.2));
    color: var(--color-secondary);
    box-shadow: inset 0 0 0 1px rgba(232, 180, 217, 0.3);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-text {
  font-weight: 500;
  font-size: 0.9rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
  font-family: var(--font-display);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stages-map {
  padding: 24px;
  margin-bottom: 20px;
}

.stages-timeline {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.stage-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  cursor: pointer;
  transition: transform var(--transition-fast);
  
  &:hover:not(.locked) {
    transform: translateY(-4px);
  }
  
  &.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.node-connector {
  position: absolute;
  top: 32px;
  left: 50%;
  width: 100%;
  height: 2px;
}

.connector-line {
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: background var(--transition-fast);
  
  &.filled {
    background: linear-gradient(to right, var(--color-secondary), var(--color-accent));
  }
}

.node-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
  transition: all var(--transition-fast);
  
  .stage-node.active & {
    animation: pulse-ring 2s ease-in-out infinite;
  }
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 180, 217, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(232, 180, 217, 0); }
}

.node-icon {
  width: 24px;
  height: 24px;
  
  &.locked { color: var(--color-text-muted); }
  &.completed { color: var(--color-success); }
}

.node-emoji {
  font-size: 1.5rem;
}

.node-info {
  text-align: center;
}

.node-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

.node-progress {
  font-size: 0.75rem;
  color: var(--color-secondary);
  font-weight: 600;
}

.node-locked {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.recent-journey {
  padding: 24px;
  margin-bottom: 20px;
}

.journey-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.journey-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &.clickable {
    cursor: pointer;
    
    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

.journey-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.journey-emoji {
  font-size: 1.5rem;
}

.journey-content {
  flex: 1;
  min-width: 0;
}

.journey-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.journey-type {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.1);
}

.journey-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.journey-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.journey-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.journey-reward {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-warning);
}

.reward-icon {
  width: 14px;
  height: 14px;
}

.chevron-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.milestones-preview {
  padding: 24px;
  margin-bottom: 20px;
}

.milestone-count {
  font-size: 0.9rem;
  color: var(--color-secondary);
  font-weight: 600;
}

.milestones-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.milestone-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  opacity: 0.5;
  transition: all var(--transition-fast);
  
  &.unlocked {
    opacity: 1;
  }
}

.milestone-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.milestone-emoji {
  font-size: 1.2rem;
}

.milestone-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.milestone-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.milestone-status {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.stages-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stage-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
}

.stage-select-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-secondary);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  &.active {
    border-color: var(--color-secondary);
    background: rgba(232, 180, 217, 0.1);
    color: var(--color-secondary);
  }
}

.select-btn-icon {
  font-size: 1.2rem;
}

.stage-detail {
  padding: 24px;
}

.stage-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
}

.stage-detail-icon {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stage-detail-emoji {
  font-size: 2.5rem;
}

.stage-detail-info {
  flex: 1;
}

.stage-status-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.completed {
    background: rgba(34, 197, 94, 0.2);
    color: var(--color-success);
  }
  
  &.active {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
  
  &.locked {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
  }
}

.stage-detail-name {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px 0;
  font-family: var(--font-display);
}

.stage-detail-desc {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.stage-dates {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.stage-detail-progress {
  text-align: right;
  flex-shrink: 0;
}

.detail-progress-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-secondary);
  margin-bottom: 12px;
}

.detail-progress-bar-bg {
  width: 150px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.detail-progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.stage-reward,
.stage-requirements,
.stage-modules,
.stage-milestones,
.stage-events {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.reward-header,
.requirements-header,
.modules-header,
.milestones-section-header,
.events-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.reward-section-icon,
.requirements-icon,
.modules-icon,
.milestones-section-icon,
.events-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.reward-section-title,
.requirements-title,
.modules-title,
.milestones-section-title,
.events-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.reward-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.reward-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reward-preview-icon {
  font-size: 2rem;
}

.reward-preview-info {
  display: flex;
  flex-direction: column;
}

.reward-preview-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.reward-preview-type {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.claim-reward-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: var(--color-bg-dark);
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(232, 180, 217, 0.4);
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.reward-claimed {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-success);
  font-weight: 500;
}

.claimed-icon {
  width: 18px;
  height: 18px;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  
  &.completed {
    background: rgba(34, 197, 94, 0.05);
  }
}

.requirement-check {
  flex-shrink: 0;
}

.check-icon {
  width: 24px;
  height: 24px;
  
  &.completed {
    color: var(--color-success);
  }
}

.check-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.requirement-info {
  flex: 1;
  min-width: 0;
}

.requirement-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 6px;
}

.requirement-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.requirement-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.requirement-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  
  .requirement-item.completed & {
    color: var(--color-success);
  }
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(4px);
  }
}

.module-icon {
  width: 32px;
  height: 32px;
  color: var(--color-secondary);
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.module-progress {
  font-size: 0.8rem;
  color: var(--color-secondary);
  font-weight: 600;
}

.module-chevron {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.stage-milestones-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-milestone-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  opacity: 0.5;
  
  &.unlocked {
    opacity: 1;
    background: rgba(34, 197, 94, 0.03);
  }
}

.milestone-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.milestone-content {
  flex: 1;
  min-width: 0;
}

.milestone-title {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text);
}

.milestone-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.milestone-check {
  width: 20px;
  height: 20px;
  color: var(--color-success);
}

.milestone-lock {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
}

.events-timeline {
  position: relative;
  padding-left: 20px;
  
  &::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
  }
}

.event-item {
  position: relative;
  padding-bottom: 20px;
  
  &:last-child {
    padding-bottom: 0;
  }
}

.event-dot {
  position: absolute;
  left: -18px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.event-content {
  padding-left: 8px;
}

.event-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.event-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.event-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.full-journey {
  padding: 24px;
}

.full-journey-timeline {
  position: relative;
  padding-left: 30px;
  
  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, var(--color-secondary), var(--color-accent));
    opacity: 0.3;
  }
}

.full-journey-item {
  position: relative;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.clickable {
    cursor: pointer;
    
    .full-journey-card {
      transition: all var(--transition-fast);
    }
    
    &:hover .full-journey-card {
      transform: translateX(8px);
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

.full-journey-dot {
  position: absolute;
  left: -26px;
  top: 20px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 0 15px currentColor;
  z-index: 1;
}

.full-journey-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.full-journey-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.full-journey-type {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.full-journey-date {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.full-journey-body {
  display: flex;
  gap: 16px;
}

.full-journey-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.full-journey-content {
  flex: 1;
  min-width: 0;
}

.full-journey-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px 0;
}

.full-journey-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 10px 0;
}

.full-journey-reward {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-warning);
  margin-bottom: 8px;
}

.reward-mini-icon {
  width: 14px;
  height: 14px;
}

.full-journey-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--color-secondary);
}

.link-icon {
  width: 14px;
  height: 14px;
}

.milestones-full {
  padding: 24px;
}

.milestones-full-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.milestones-stats {
  display: flex;
  gap: 12px;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
  font-size: 0.85rem;
  font-weight: 500;
  
  &.total {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }
}

.pill-icon {
  width: 14px;
  height: 14px;
}

.milestones-by-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stage-milestones-group {
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-lg);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.group-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.group-stage-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.group-stage-icon {
  font-size: 1.2rem;
}

.group-milestones {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.milestone-full-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  opacity: 0.5;
  
  &.unlocked {
    opacity: 1;
  }
}

.milestone-full-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.milestone-full-info {
  flex: 1;
  min-width: 0;
}

.milestone-full-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.milestone-full-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 4px 0;
}

.milestone-full-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.milestone-full-status {
  flex-shrink: 0;
}

.status-icon {
  width: 24px;
  height: 24px;
  
  &.unlocked { color: var(--color-success); }
  &.locked { color: var(--color-text-muted); }
}

.unlocks-full {
  padding: 24px;
}

.unlocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.unlock-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-2px);
  }
}

.unlock-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.unlock-icon {
  font-size: 2rem;
}

.unlock-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.unlock-type {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.unlock-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.unlock-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  flex: 1;
}

.unlock-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .journey-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .current-stage-banner {
    flex-direction: column;
    text-align: center;
  }
  
  .stage-progress {
    text-align: center;
  }
  
  .mini-progress-bar {
    width: 100%;
  }
  
  .stages-timeline {
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .stage-node {
    flex: 0 0 calc(33.333% - 12px);
  }
  
  .node-connector {
    display: none;
  }
  
  .milestones-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stage-detail-header {
    flex-direction: column;
    text-align: center;
  }
  
  .stage-detail-progress {
    text-align: center;
    width: 100%;
  }
  
  .detail-progress-bar-bg {
    width: 100%;
  }
  
  .reward-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .unlocks-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs-nav {
    padding: 4px;
  }
  
  .tab-btn {
    padding: 8px 12px;
  }
  
  .tab-text {
    display: none;
  }
}
</style>