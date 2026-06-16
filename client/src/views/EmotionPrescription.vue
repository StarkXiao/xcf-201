<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEmotionPrescriptionStore } from '@/stores/emotionPrescription'
import { useAchievementStore } from '@/stores/achievement'
import { useNotificationStore } from '@/stores/notification'
import { 
  HeartPulse, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Sparkles,
  Lightbulb,
  BookOpen,
  Target,
  Award,
  ChevronRight,
  RefreshCw,
  Archive,
  Clock,
  Star,
  AlertCircle,
  Info,
  CheckCircle2
} from 'lucide-vue-next'

const router = useRouter()
const prescriptionStore = useEmotionPrescriptionStore()
const achievementStore = useAchievementStore()
const notificationStore = useNotificationStore()

const activeTab = ref('prescription')
const periodType = ref('weekly')
const isLoading = ref(false)

const moodEmojis = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  anxious: '😰',
  angry: '😠'
}

const moodLabels = {
  happy: '开心',
  calm: '平静',
  sad: '忧伤',
  anxious: '焦虑',
  angry: '愤怒'
}

const moodColors = {
  happy: 'var(--mood-happy)',
  calm: 'var(--mood-calm)',
  sad: 'var(--mood-sad)',
  anxious: 'var(--mood-anxious)',
  angry: 'var(--mood-angry)'
}

const trendLabels = {
  improving: { label: '上升', icon: TrendingUp, color: 'var(--color-success)' },
  declining: { label: '下降', icon: TrendingDown, color: 'var(--color-danger)' },
  stable: { label: '稳定', icon: Minus, color: 'var(--color-accent)' },
  volatile: { label: '波动', icon: Activity, color: 'var(--color-warning)' },
  low: { label: '低迷', icon: TrendingDown, color: 'var(--mood-sad)' },
  high: { label: '愉悦', icon: TrendingUp, color: 'var(--mood-happy)' }
}

const prescription = computed(() => prescriptionStore.latestPrescription)
const archives = computed(() => prescriptionStore.archives)
const list = computed(() => prescriptionStore.prescriptionList)

const scorePercent = computed(() => {
  if (!prescription.value) return 0
  return Math.min(100, (prescription.value.avgMoodScore / 5) * 100)
})

const scoreColor = computed(() => {
  if (!prescription.value) return 'var(--color-text-muted)'
  const score = prescription.value.avgMoodScore
  if (score >= 4) return 'var(--mood-happy)'
  if (score >= 3) return 'var(--mood-calm)'
  if (score >= 2) return 'var(--mood-sad)'
  return 'var(--mood-anxious)'
})

async function loadData() {
  isLoading.value = true
  try {
    await prescriptionStore.fetchLatest(periodType.value)
    await prescriptionStore.fetchList(periodType.value, 6)
    await prescriptionStore.fetchArchives(null, 6)
    
    if (prescription.value && prescription.value.id && !prescription.value.isViewed) {
      const viewResult = await prescriptionStore.viewPrescription(prescription.value.id)
      if (viewResult.success && viewResult.data?.taskUpdates?.length > 0) {
        viewResult.data.taskUpdates.forEach(task => {
          notificationStore.success(`任务完成：${task.title} +${task.reward}星币`)
        })
        achievementStore.fetchTasks()
      }
    }
  } catch (error) {
    notificationStore.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh() {
  try {
    if (periodType.value === 'weekly') {
      await prescriptionStore.generateWeekly()
    } else {
      await prescriptionStore.generateDaily()
    }
    notificationStore.success('处方笺已更新')
    
    if (prescription.value && prescription.value.id) {
      const viewResult = await prescriptionStore.viewPrescription(prescription.value.id)
      if (viewResult.success && viewResult.data?.taskUpdates?.length > 0) {
        viewResult.data.taskUpdates.forEach(task => {
          notificationStore.success(`任务完成：${task.title} +${task.reward}星币`)
        })
        achievementStore.fetchTasks()
      }
    }
  } catch (error) {
    notificationStore.error('更新失败')
  }
}

function goToRoom(roomId) {
  if (roomId) {
    router.push(`/rooms/${roomId}`)
  } else {
    router.push('/rooms')
  }
}

function goToAchievements() {
  router.push('/achievements')
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'high': return 'priority-high'
    case 'medium': return 'priority-medium'
    default: return 'priority-low'
  }
}

function getInsightLevelClass(level) {
  switch (level) {
    case 'high': return 'insight-high'
    case 'medium': return 'insight-medium'
    default: return 'insight-low'
  }
}

function formatDateRange(start, end) {
  if (start === end) return start
  return `${start} ~ ${end}`
}

onMounted(() => {
  loadData()
})

watch(periodType, () => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>情绪处方笺</h1>
        <p class="page-subtitle">聆听内心的声音，为你定制专属的陪伴建议</p>
      </div>
      <button class="refresh-btn" @click="handleRefresh" :disabled="isLoading">
        <RefreshCw class="refresh-icon" :class="{ spinning: isLoading }" />
        <span>更新处方笺</span>
      </button>
    </div>

    <div class="tab-bar">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'prescription' }"
        @click="activeTab = 'prescription'"
      >
        <HeartPulse class="tab-icon" />
        <span>处方笺</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'archives' }"
        @click="activeTab = 'archives'"
      >
        <Archive class="tab-icon" />
        <span>阶段档案</span>
      </button>
    </div>

    <div v-if="isLoading && !prescription" class="loading-state glass-card">
      <div class="loading-spinner"></div>
      <p>正在为你生成专属处方笺...</p>
    </div>

    <div v-else-if="activeTab === 'prescription'" class="prescription-content">
      <div class="period-switcher">
        <button 
          class="period-btn" 
          :class="{ active: periodType === 'daily' }"
          @click="periodType = 'daily'"
        >
          <Clock class="period-icon" />
          <span>今日</span>
        </button>
        <button 
          class="period-btn" 
          :class="{ active: periodType === 'weekly' }"
          @click="periodType = 'weekly'"
        >
          <Calendar class="period-icon" />
          <span>本周</span>
        </button>
      </div>

      <div v-if="prescription" class="prescription-main">
        <div class="score-section glass-card">
          <div class="score-header">
            <div class="score-title">
              <HeartPulse class="score-icon" />
              <span>情绪健康指数</span>
            </div>
            <div class="score-period">
              {{ formatDateRange(prescription.startDate, prescription.endDate) }}
            </div>
          </div>
          <div class="score-body">
            <div class="score-ring" :style="{ '--score-color': scoreColor }">
              <svg viewBox="0 0 100 100" class="score-svg">
                <circle cx="50" cy="50" r="42" class="score-bg" />
                <circle 
                  cx="50" cy="50" r="42" 
                  class="score-progress"
                  :style="{ 
                    strokeDasharray: `${scorePercent * 2.64} 264`,
                    stroke: scoreColor
                  }"
                />
              </svg>
              <div class="score-value">
                <span class="score-number">{{ prescription.avgMoodScore?.toFixed(1) }}</span>
                <span class="score-max">/5.0</span>
              </div>
            </div>
            <div class="score-details">
              <div class="detail-item">
                <component 
                  :is="trendLabels[prescription.moodTrend]?.icon || Minus" 
                  class="detail-icon"
                  :style="{ color: trendLabels[prescription.moodTrend]?.color }"
                />
                <div class="detail-info">
                  <span class="detail-label">情绪趋势</span>
                  <span class="detail-value" :style="{ color: trendLabels[prescription.moodTrend]?.color }">
                    {{ trendLabels[prescription.moodTrend]?.label || '稳定' }}
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <span class="mood-emoji-big">{{ moodEmojis[prescription.dominantMood] }}</span>
                <div class="detail-info">
                  <span class="detail-label">主导情绪</span>
                  <span class="detail-value">{{ moodLabels[prescription.dominantMood] || '平静' }}</span>
                </div>
              </div>
              <div class="detail-item">
                <Activity class="detail-icon" style="color: var(--color-warning)" />
                <div class="detail-info">
                  <span class="detail-label">情绪波动</span>
                  <span class="detail-value">{{ prescription.moodFluctuation?.toFixed(2) || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="prescription.highlights?.length > 0" class="highlights-section glass-card">
          <h3 class="section-title">
            <Sparkles class="section-icon" style="color: var(--color-warning)" />
            本周期亮点
          </h3>
          <div class="highlights-grid">
            <div 
              v-for="(highlight, idx) in prescription.highlights" 
              :key="idx"
              class="highlight-item"
            >
              <span class="highlight-icon">{{ highlight.icon }}</span>
              <span class="highlight-content">{{ highlight.content }}</span>
            </div>
          </div>
        </div>

        <div v-if="prescription.companionAdvice?.length > 0" class="companion-section glass-card">
          <h3 class="section-title">
            <HeartPulse class="section-icon" style="color: var(--color-secondary)" />
            陪伴建议
          </h3>
          <div class="advice-list">
            <div 
              v-for="(advice, idx) in prescription.companionAdvice" 
              :key="idx"
              class="advice-card"
            >
              <div class="advice-header">
                <span class="advice-icon">{{ advice.icon }}</span>
                <span class="advice-title">{{ advice.title }}</span>
              </div>
              <p class="advice-content">{{ advice.content }}</p>
            </div>
          </div>
        </div>

        <div v-if="prescription.suggestions?.length > 0" class="suggestions-section glass-card">
          <h3 class="section-title">
            <Lightbulb class="section-icon" style="color: var(--color-warning)" />
            具体建议
          </h3>
          <div class="suggestion-list">
            <div 
              v-for="(suggestion, idx) in prescription.suggestions" 
              :key="idx"
              class="suggestion-item"
              :class="getPriorityClass(suggestion.priority)"
            >
              <div class="suggestion-priority-dot"></div>
              <div class="suggestion-content">
                <span class="suggestion-title">{{ suggestion.title }}</span>
                <p class="suggestion-desc">{{ suggestion.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="prescription.roomRecommendations?.length > 0" class="rooms-section glass-card">
          <h3 class="section-title">
            <BookOpen class="section-icon" style="color: var(--color-accent)" />
            剧情推荐
          </h3>
          <div class="room-list">
            <div 
              v-for="(room, idx) in prescription.roomRecommendations" 
              :key="idx"
              class="room-card"
              @click="goToRoom(room.roomId)"
            >
              <div class="room-icon-wrap">
                <component 
                  :is="room.type === 'unlock' ? Award : BookOpen" 
                  class="room-icon"
                  :class="{ unlock: room.type === 'unlock' }"
                />
              </div>
              <div class="room-info">
                <span class="room-name">{{ room.name || room.theme }}</span>
                <p class="room-desc">{{ room.description }}</p>
              </div>
              <ChevronRight class="room-arrow" />
            </div>
          </div>
        </div>

        <div v-if="prescription.taskRecommendations?.length > 0" class="tasks-section glass-card">
          <h3 class="section-title">
            <Target class="section-icon" style="color: var(--color-success)" />
            推荐任务
          </h3>
          <div class="task-list">
            <div 
              v-for="(task, idx) in prescription.taskRecommendations" 
              :key="idx"
              class="task-card"
              @click="goToAchievements"
            >
              <div class="task-icon-wrap">
                <Star class="task-icon" />
              </div>
              <div class="task-info">
                <span class="task-name">{{ task.title }}</span>
                <p class="task-desc">{{ task.description }}</p>
                <div v-if="task.targetDays" class="task-progress">
                  <div class="task-progress-bar">
                    <div 
                      class="task-progress-fill" 
                      :style="{ width: `${Math.min(100, ((task.currentDays || 0) / task.targetDays) * 100)}%` }"
                    ></div>
                  </div>
                  <span class="task-progress-text">{{ task.currentDays || 0 }}/{{ task.targetDays }}</span>
                </div>
              </div>
              <div class="task-reward">
                <Star class="reward-icon" />
                <span>+{{ task.reward }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="prescription.insights?.length > 0" class="insights-section glass-card">
          <h3 class="section-title">
            <Info class="section-icon" style="color: var(--color-accent)" />
            深度洞察
          </h3>
          <div class="insight-list">
            <div 
              v-for="(insight, idx) in prescription.insights" 
              :key="idx"
              class="insight-card"
              :class="getInsightLevelClass(insight.level)"
            >
              <component 
                :is="insight.type === 'warning' ? AlertCircle : insight.type === 'care' ? HeartPulse : insight.type === 'positive' ? CheckCircle2 : Info" 
                class="insight-icon"
              />
              <div class="insight-content">
                <span class="insight-title">{{ insight.title }}</span>
                <p class="insight-desc">{{ insight.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="list?.length > 1" class="history-section glass-card">
          <h3 class="section-title">
            <Calendar class="section-icon" />
            历史处方笺
          </h3>
          <div class="history-list">
            <div 
              v-for="item in list.slice(1)" 
              :key="item.id"
              class="history-item"
            >
              <div class="history-date">
                {{ formatDateRange(item.startDate, item.endDate) }}
              </div>
              <div class="history-mood">
                <span class="history-emoji">{{ moodEmojis[item.dominantMood] }}</span>
                <span>{{ moodLabels[item.dominantMood] }}</span>
              </div>
              <div class="history-score">
                <span>{{ item.avgMoodScore?.toFixed(1) }}</span>
                <component 
                  :is="trendLabels[item.moodTrend]?.icon || Minus" 
                  class="history-trend"
                  :style="{ color: trendLabels[item.moodTrend]?.color }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <HeartPulse class="empty-icon" />
        <h3>暂无处方笺</h3>
        <p>先去记录心情，然后点击上方按钮生成你的专属处方笺</p>
        <button class="primary-btn" @click="handleRefresh">
          <Sparkles class="btn-icon" />
          生成处方笺
        </button>
      </div>
    </div>

    <div v-else-if="activeTab === 'archives'" class="archives-content">
      <div v-if="archives?.length > 0" class="archives-list">
        <div 
          v-for="archive in archives" 
          :key="archive.id"
          class="archive-card glass-card"
        >
          <div class="archive-header">
            <div class="archive-title-wrap">
              <Award class="archive-icon" />
              <div>
                <h3 class="archive-title">{{ archive.title || archive.periodLabel }}</h3>
                <span class="archive-period">{{ archive.periodLabel }}</span>
              </div>
            </div>
            <div class="archive-score-badge">
              <HeartPulse class="badge-icon" />
              <span>{{ archive.avgMoodScore?.toFixed(1) }}</span>
            </div>
          </div>
          
          <div class="archive-stats">
            <div class="archive-stat">
              <span class="stat-num">{{ archive.totalMoodRecords }}</span>
              <span class="stat-label">心情记录</span>
            </div>
            <div class="archive-stat">
              <span class="stat-num">{{ archive.totalChaptersRead }}</span>
              <span class="stat-label">阅读章节</span>
            </div>
            <div class="archive-stat">
              <span class="stat-num">{{ archive.totalTasksCompleted }}</span>
              <span class="stat-label">完成任务</span>
            </div>
          </div>

          <div v-if="archive.growthInsights?.length > 0" class="archive-insights">
            <div 
              v-for="(insight, idx) in archive.growthInsights" 
              :key="idx"
              class="archive-insight-item"
            >
              <Sparkles class="insight-dot" />
              <span>{{ insight }}</span>
            </div>
          </div>

          <div class="archive-footer">
            <span class="archive-date-range">
              {{ archive.startDate }} ~ {{ archive.endDate }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <Archive class="empty-icon" />
        <h3>暂无阶段档案</h3>
        <p>坚持使用应用，月底会自动生成你的专属成长档案</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
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

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.refresh-icon {
  width: 18px;
  height: 18px;
  
  &.spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  width: fit-content;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-text);
  }
  
  &.active {
    background: rgba(232, 180, 217, 0.15);
    color: var(--color-secondary);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: var(--color-text);
}

.empty-state p {
  color: var(--color-text-muted);
  margin-bottom: 24px;
  max-width: 400px;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.3);
  }
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.period-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.period-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.active {
    background: rgba(232, 180, 217, 0.15);
    border-color: var(--color-secondary);
    color: var(--color-secondary);
  }
}

.period-icon {
  width: 16px;
  height: 16px;
}

.prescription-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  margin-bottom: 20px;
  color: var(--color-text);
}

.section-icon {
  width: 22px;
  height: 22px;
}

.score-section {
  padding: 28px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.score-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
  font-weight: 500;
}

.score-icon {
  width: 22px;
  height: 22px;
  color: var(--color-secondary);
}

.score-period {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.score-body {
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}

.score-ring {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.score-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 8;
}

.score-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.8s ease;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score-number {
  font-size: 2.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.score-max {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.score-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 200px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
}

.detail-icon {
  width: 24px;
  height: 24px;
}

.mood-emoji-big {
  font-size: 1.8rem;
}

.detail-info {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.detail-value {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
}

.highlights-section {
  padding: 24px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.highlight-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.highlight-content {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.companion-section,
.suggestions-section,
.rooms-section,
.tasks-section,
.insights-section,
.history-section {
  padding: 24px;
}

.advice-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.advice-card {
  padding: 18px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.08), rgba(123, 163, 201, 0.08));
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 180, 217, 0.2);
  }
}

.advice-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.advice-icon {
  font-size: 1.4rem;
}

.advice-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
}

.advice-content {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-text-muted);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.priority-high {
    border-left-color: var(--color-danger);
    background: rgba(239, 68, 68, 0.05);
  }
  
  &.priority-medium {
    border-left-color: var(--color-warning);
    background: rgba(251, 191, 36, 0.05);
  }
  
  &.priority-low {
    border-left-color: var(--color-accent);
  }
}

.suggestion-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  margin-top: 6px;
  flex-shrink: 0;
}

.priority-high .suggestion-priority-dot { color: var(--color-danger); }
.priority-medium .suggestion-priority-dot { color: var(--color-warning); }
.priority-low .suggestion-priority-dot { color: var(--color-accent); }

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-weight: 500;
  color: var(--color-text);
  display: block;
  margin-bottom: 4px;
}

.suggestion-desc {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.room-list,
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-card,
.task-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }
}

.room-icon-wrap,
.task-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(123, 163, 201, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.room-icon,
.task-icon {
  width: 22px;
  height: 22px;
  color: var(--color-accent);
  
  &.unlock {
    color: var(--color-warning);
  }
}

.task-icon-wrap {
  background: rgba(74, 222, 128, 0.15);
}

.task-icon {
  color: var(--color-success);
}

.room-info,
.task-info {
  flex: 1;
  min-width: 0;
}

.room-name,
.task-name {
  font-weight: 500;
  color: var(--color-text);
  display: block;
  margin-bottom: 4px;
}

.room-desc,
.task-desc {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.task-progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.task-progress-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.room-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.task-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.15);
  border-radius: var(--radius-full);
  color: var(--color-warning);
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.reward-icon {
  width: 14px;
  height: 14px;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--color-accent);
  
  &.insight-high {
    border-left-color: var(--color-danger);
    background: rgba(239, 68, 68, 0.06);
  }
  
  &.insight-medium {
    border-left-color: var(--color-warning);
    background: rgba(251, 191, 36, 0.06);
  }
  
  &.insight-low {
    border-left-color: var(--color-accent);
  }
}

.insight-icon {
  width: 22px;
  height: 22px;
  color: var(--color-accent);
  flex-shrink: 0;
  margin-top: 1px;
}

.insight-high .insight-icon { color: var(--color-danger); }
.insight-medium .insight-icon { color: var(--color-warning); }

.insight-content {
  flex: 1;
}

.insight-title {
  font-weight: 600;
  color: var(--color-text);
  display: block;
  margin-bottom: 4px;
}

.insight-desc {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.6;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.history-date {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.history-mood {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.history-emoji {
  font-size: 1.1rem;
}

.history-score {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.history-trend {
  width: 16px;
  height: 16px;
}

.archives-content {
  display: flex;
  flex-direction: column;
}

.archives-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.archive-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 180, 217, 0.2);
  }
}

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.archive-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.archive-icon {
  width: 36px;
  height: 36px;
  padding: 8px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(232, 180, 217, 0.2));
  color: var(--color-warning);
}

.archive-title {
  font-size: 1.1rem;
  color: var(--color-text);
  margin: 0 0 2px 0;
}

.archive-period {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.archive-score-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.15), rgba(123, 163, 201, 0.15));
  border-radius: var(--radius-full);
  font-weight: 600;
  color: var(--color-secondary);
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.archive-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.archive-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
}

.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.archive-insights {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.archive-insight-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(251, 191, 36, 0.06);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.insight-dot {
  width: 14px;
  height: 14px;
  color: var(--color-warning);
  flex-shrink: 0;
  margin-top: 2px;
}

.archive-footer {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.archive-date-range {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .refresh-btn {
    align-self: flex-start;
  }
  
  .score-body {
    flex-direction: column;
    gap: 24px;
  }
  
  .score-details {
    width: 100%;
  }
  
  .highlights-grid,
  .advice-list {
    grid-template-columns: 1fr;
  }
  
  .archives-list {
    grid-template-columns: 1fr;
  }
  
  .task-card {
    flex-wrap: wrap;
  }
  
  .task-reward {
    margin-left: auto;
  }
}
</style>
