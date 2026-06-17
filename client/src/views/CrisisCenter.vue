<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCrisisCenterStore } from '@/stores/crisisCenter'
import { useNotificationStore } from '@/stores/notification'
import { 
  ShieldAlert, Activity, Flame, TrendingDown, TrendingUp, Minus, AlertTriangle,
  Heart, Calendar, Target, BookOpen, Phone, ExternalLink, ChevronRight,
  RefreshCw, Sparkles, Shield, ShieldCheck, ShieldX, Moon
} from 'lucide-vue-next'

const router = useRouter()
const crisisStore = useCrisisCenterStore()
const notificationStore = useNotificationStore()

const showSupportPanel = ref(false)

const analysis = computed(() => crisisStore.analysis)
const loading = computed(() => crisisStore.loading)

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

const levelConfig = {
  normal: { label: '状态良好', icon: ShieldCheck, color: 'var(--color-success)', bg: 'rgba(74, 222, 128, 0.15)', borderColor: 'rgba(74, 222, 128, 0.3)' },
  gentle: { label: '轻微关注', icon: Shield, color: 'var(--color-warning)', bg: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.3)' },
  firm: { label: '需要关注', icon: AlertTriangle, color: 'var(--mood-anxious)', bg: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' },
  crisis: { label: '紧急关注', icon: ShieldAlert, color: 'var(--color-error)', bg: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.3)' }
}

const signalTypeConfig = {
  negative_streak: { label: '负面连续', icon: TrendingDown, color: 'var(--mood-anxious)' },
  mood_gap: { label: '记录断档', icon: Calendar, color: 'var(--mood-sad)' },
  fluctuation: { label: '异常波动', icon: Activity, color: 'var(--color-warning)' },
  tag_fluctuation: { label: '标签波动', icon: Sparkles, color: 'var(--color-secondary)' },
  task_abandon: { label: '任务断签', icon: Target, color: 'var(--color-accent)' },
  story_stagnation: { label: '剧情停滞', icon: BookOpen, color: 'var(--color-secondary)' }
}

const trendConfig = {
  improving: { label: '上升', icon: TrendingUp, color: 'var(--color-success)' },
  declining: { label: '下降', icon: TrendingDown, color: 'var(--color-error)' },
  stable: { label: '稳定', icon: Minus, color: 'var(--color-accent)' },
  volatile: { label: '波动', icon: Activity, color: 'var(--color-warning)' }
}

const overallLevel = computed(() => analysis.value?.overallLevel || 'normal')
const signals = computed(() => analysis.value?.signals || [])
const timeline = computed(() => analysis.value?.timeline || [])
const moodSummary = computed(() => analysis.value?.moodSummary || {})
const streakInfo = computed(() => analysis.value?.streakInfo || {})
const recommendations = computed(() => analysis.value?.recommendations || [])
const supportResources = computed(() => analysis.value?.supportResources || [])
const roomProgress = computed(() => analysis.value?.roomProgress || [])

const currentLevelConfig = computed(() => levelConfig[overallLevel.value] || levelConfig.normal)
const currentTrendConfig = computed(() => trendConfig[moodSummary.value?.trend] || trendConfig.stable)

const activeSignalCount = computed(() => signals.value.length)

const scoreBarWidth = computed(() => {
  const score = moodSummary.value?.avgScore
  if (score == null) return 0
  return Math.min(100, (score / 5) * 100)
})

const scoreBarColor = computed(() => {
  const score = moodSummary.value?.avgScore
  if (score == null) return 'var(--color-text-muted)'
  if (score >= 4) return 'var(--mood-happy)'
  if (score >= 3) return 'var(--mood-calm)'
  if (score >= 2) return 'var(--mood-sad)'
  return 'var(--mood-anxious)'
})

function getSignalConfig(type) {
  return signalTypeConfig[type] || { label: type, icon: AlertTriangle, color: 'var(--color-warning)' }
}

function getLevelLabel(level) {
  return levelConfig[level]?.label || '未知'
}

function getLevelColor(level) {
  return levelConfig[level]?.color || 'var(--color-text-muted)'
}

async function refreshAnalysis() {
  const result = await crisisStore.fetchAnalysis()
  if (result.success) {
    notificationStore.success('预警分析已更新')
  }
}

function goToCalendar() {
  router.push('/calendar')
}

function goToRooms() {
  router.push('/rooms')
}

function goToChat() {
  router.push('/chat')
}

function goToPrescription() {
  router.push('/prescription')
}

function toggleSupportPanel() {
  showSupportPanel.value = !showSupportPanel.value
}

onMounted(() => {
  crisisStore.fetchAnalysis()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>情绪危机预警中心</h1>
        <p class="page-subtitle">综合分析近七日状态，守护你的情绪健康</p>
      </div>
      <button class="refresh-btn" @click="refreshAnalysis" :disabled="loading">
        <RefreshCw class="refresh-icon" :class="{ spinning: loading }" />
      </button>
    </div>

    <div v-if="loading && !analysis" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在分析情绪数据...</p>
    </div>

    <template v-else-if="analysis">
      <div class="level-banner glass-card" :style="{ 
        background: currentLevelConfig.bg, 
        borderColor: currentLevelConfig.borderColor 
      }">
        <div class="level-left">
          <div class="level-icon-wrapper" :style="{ background: currentLevelConfig.bg }">
            <component :is="currentLevelConfig.icon" class="level-icon" :style="{ color: currentLevelConfig.color }" />
          </div>
          <div class="level-info">
            <h2 class="level-title" :style="{ color: currentLevelConfig.color }">
              {{ currentLevelConfig.label }}
            </h2>
            <p class="level-desc">
              <template v-if="overallLevel === 'normal'">近七日状态良好，继续保持 ✨</template>
              <template v-else-if="overallLevel === 'gentle'">检测到{{ activeSignalCount }}个轻微信号，稍加留意</template>
              <template v-else-if="overallLevel === 'firm'">检测到{{ activeSignalCount }}个需关注信号，建议采取行动</template>
              <template v-else>检测到{{ activeSignalCount }}个紧急信号，请认真对待</template>
            </p>
          </div>
        </div>
        <div class="level-right">
          <div class="level-badge" :style="{ background: currentLevelConfig.color }">
            <span class="level-badge-text">{{ activeSignalCount }}</span>
          </div>
        </div>
      </div>

      <div class="overview-cards">
        <div class="overview-card glass-card">
          <div class="overview-icon-wrapper mood">
            <Heart class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ moodSummary.avgScore?.toFixed(1) || '-' }}</span>
            <span class="overview-label">七日均分</span>
          </div>
          <div class="overview-trend" v-if="moodSummary.trend">
            <component :is="currentTrendConfig.icon" class="trend-icon" :style="{ color: currentTrendConfig.color }" />
            <span class="trend-text" :style="{ color: currentTrendConfig.color }">{{ currentTrendConfig.label }}</span>
          </div>
        </div>

        <div class="overview-card glass-card">
          <div class="overview-icon-wrapper streak">
            <Flame class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ streakInfo.currentStreak || 0 }}</span>
            <span class="overview-label">连续记录</span>
          </div>
          <div class="overview-sub" v-if="streakInfo.isBroken">
            <span class="broken-tag">已中断</span>
          </div>
        </div>

        <div class="overview-card glass-card">
          <div class="overview-icon-wrapper rate">
            <Calendar class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ moodSummary.recordRate || 0 }}%</span>
            <span class="overview-label">记录率</span>
          </div>
        </div>

        <div class="overview-card glass-card">
          <div class="overview-icon-wrapper negative">
            <TrendingDown class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ moodSummary.negativeRate || 0 }}%</span>
            <span class="overview-label">负面占比</span>
          </div>
        </div>
      </div>

      <div v-if="moodSummary.avgScore != null" class="score-bar-section glass-card">
        <div class="score-bar-header">
          <span class="score-bar-title">七日情绪均分</span>
          <span class="score-bar-value" :style="{ color: scoreBarColor }">{{ moodSummary.avgScore.toFixed(1) }} / 5.0</span>
        </div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" :style="{ width: scoreBarWidth + '%', background: scoreBarColor }"></div>
        </div>
      </div>

      <div class="section-header">
        <h3 class="section-title">
          <Activity class="section-icon" />
          信号检测
        </h3>
      </div>

      <div v-if="signals.length === 0" class="no-signals glass-card">
        <ShieldCheck class="no-signals-icon" />
        <p class="no-signals-title">暂无预警信号</p>
        <p class="no-signals-desc">近七日状态良好，请继续保持</p>
      </div>

      <div v-else class="signals-list">
        <div 
          v-for="signal in signals" 
          :key="signal.type" 
          class="signal-card glass-card"
          :class="signal.level"
        >
          <div class="signal-header">
            <div class="signal-type-badge" :style="{ background: getSignalConfig(signal.type).color + '22', color: getSignalConfig(signal.type).color }">
              <component :is="getSignalConfig(signal.type).icon" class="signal-type-icon" />
              <span>{{ getSignalConfig(signal.type).label }}</span>
            </div>
            <span class="signal-level-tag" :style="{ background: levelConfig[signal.level]?.bg, color: getLevelColor(signal.level), borderColor: levelConfig[signal.level]?.borderColor }">
              {{ getLevelLabel(signal.level) }}
            </span>
          </div>
          <h4 class="signal-title">{{ signal.title }}</h4>
          <p class="signal-desc">{{ signal.description }}</p>
        </div>
      </div>

      <div class="section-header">
        <h3 class="section-title">
          <Calendar class="section-icon" />
          七日时间线
        </h3>
      </div>

      <div class="timeline-container glass-card">
        <div class="timeline-grid">
          <div 
            v-for="day in timeline" 
            :key="day.date" 
            class="timeline-day"
            :class="{ 
              today: day.isToday, 
              'no-record': !day.hasMoodRecord,
              'has-negative': day.hasNegativeMood
            }"
          >
            <div class="day-header">
              <span class="day-date">{{ day.date.slice(5) }}</span>
              <span class="day-week">周{{ day.dayOfWeek }}</span>
              <span v-if="day.isToday" class="today-tag">今天</span>
            </div>
            
            <div class="day-mood">
              <template v-if="day.hasMoodRecord">
                <span class="day-emoji">{{ moodEmojis[day.dominantMood] || '😐' }}</span>
                <span class="day-score" v-if="day.avgScore != null">{{ day.avgScore.toFixed(1) }}</span>
              </template>
              <template v-else>
                <span class="day-emoji empty">—</span>
                <span class="day-score empty">未记录</span>
              </template>
            </div>

            <div class="day-segments" v-if="day.hasMoodRecord">
              <div 
                v-for="seg in 3" 
                :key="seg" 
                class="segment-dot" 
                :class="{ filled: seg <= day.segmentCount }"
              ></div>
            </div>

            <div class="day-mood-types" v-if="day.moodTypes.length > 0">
              <span 
                v-for="type in day.moodTypes" 
                :key="type" 
                class="mood-type-dot" 
                :style="{ background: moodColors[type] }"
              ></span>
            </div>

            <div class="day-activities">
              <span v-if="day.completedTasks > 0" class="activity-badge tasks">
                <Target class="activity-icon" />
                {{ day.completedTasks }}
              </span>
              <span v-if="day.chaptersRead > 0" class="activity-badge story">
                <BookOpen class="activity-icon" />
                {{ day.chaptersRead }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-header" v-if="roomProgress.length > 0">
        <h3 class="section-title">
          <BookOpen class="section-icon" />
          剧情进度
        </h3>
      </div>

      <div v-if="roomProgress.length > 0" class="room-progress-list">
        <div 
          v-for="room in roomProgress" 
          :key="room.id" 
          class="room-progress-card glass-card"
          @click="goToRooms"
        >
          <div class="room-info">
            <span class="room-name">{{ room.name }}</span>
            <span class="room-chapter">第{{ room.currentChapter }}/{{ room.totalChapters }}章</span>
          </div>
          <div class="room-bar-bg">
            <div class="room-bar-fill" :style="{ width: room.progressPercent + '%' }"></div>
          </div>
          <span class="room-percent">{{ room.progressPercent }}%</span>
          <ChevronRight class="room-arrow" />
        </div>
      </div>

      <div class="section-header" v-if="recommendations.length > 0">
        <h3 class="section-title">
          <Sparkles class="section-icon" />
          建议与关怀
        </h3>
      </div>

      <div v-if="recommendations.length > 0" class="recommendations-list">
        <div 
          v-for="rec in recommendations" 
          :key="rec.type" 
          class="recommendation-card glass-card"
          :class="rec.priority"
        >
          <h4 class="rec-title">{{ rec.title }}</h4>
          <div class="rec-actions">
            <div v-for="(action, index) in rec.actions" :key="index" class="rec-action">
              <span class="rec-action-dot"></span>
              <span class="rec-action-text">{{ action }}</span>
            </div>
          </div>
          <div class="rec-quick-links">
            <button v-if="rec.type === 'mood_care' || rec.type === 'record_reminder'" class="rec-link-btn" @click="goToCalendar">
              记录心情 <ChevronRight class="link-icon" />
            </button>
            <button v-if="rec.type === 'mood_care'" class="rec-link-btn" @click="goToChat">
              陪伴对话 <ChevronRight class="link-icon" />
            </button>
            <button v-if="rec.type === 'mood_care'" class="rec-link-btn" @click="goToPrescription">
              情绪处方 <ChevronRight class="link-icon" />
            </button>
            <button v-if="rec.type === 'story_explore'" class="rec-link-btn" @click="goToRooms">
              探索故事 <ChevronRight class="link-icon" />
            </button>
          </div>
        </div>
      </div>

      <div class="support-entry glass-card" @click="toggleSupportPanel" :class="{ expanded: showSupportPanel }">
        <div class="support-entry-header">
          <div class="support-entry-left">
            <Phone class="support-entry-icon" />
            <div>
              <h4 class="support-entry-title">人工支持与心理援助热线</h4>
              <p class="support-entry-desc">你不是一个人，随时可以寻求帮助</p>
            </div>
          </div>
          <ChevronRight class="support-expand-icon" :class="{ rotated: showSupportPanel }" />
        </div>

        <Transition name="expand">
          <div v-if="showSupportPanel" class="support-list">
            <div 
              v-for="resource in supportResources" 
              :key="resource.phone" 
              class="support-item"
            >
              <div class="support-item-info">
                <span class="support-item-name">{{ resource.name }}</span>
                <span class="support-item-desc">{{ resource.description }}</span>
                <span class="support-item-time">{{ resource.available }}</span>
              </div>
              <a :href="'tel:' + resource.phone" class="support-call-btn">
                <Phone class="call-icon" />
                {{ resource.phone }}
              </a>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <div v-else class="empty-state glass-card">
      <Moon class="empty-icon" />
      <p class="empty-title">暂无分析数据</p>
      <p class="empty-desc">请先记录几天心情，系统将为你生成情绪预警分析</p>
      <button class="empty-action-btn" @click="goToCalendar">开始记录</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.refresh-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.refresh-icon {
  width: 20px;
  height: 20px;

  &.spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  color: var(--color-text-muted);
}

.level-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid;
  transition: all var(--transition-normal);
}

.level-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.level-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.level-icon {
  width: 32px;
  height: 32px;
}

.level-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
}

.level-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.level-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.level-badge-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-bg-dark);
  font-family: var(--font-display);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  text-align: center;
  position: relative;
}

.overview-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;

  &.mood {
    background: rgba(236, 72, 153, 0.15);
    .overview-icon { color: var(--color-secondary); }
  }

  &.streak {
    background: rgba(251, 191, 36, 0.15);
    .overview-icon { color: var(--color-warning); }
  }

  &.rate {
    background: rgba(123, 163, 201, 0.15);
    .overview-icon { color: var(--color-accent); }
  }

  &.negative {
    background: rgba(248, 113, 113, 0.15);
    .overview-icon { color: var(--color-error); }
  }
}

.overview-icon {
  width: 24px;
  height: 24px;
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-value {
  font-size: 1.6rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.overview-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.overview-trend {
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-icon {
  width: 14px;
  height: 14px;
}

.trend-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.overview-sub {
  position: absolute;
  top: 8px;
  right: 8px;
}

.broken-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(248, 113, 113, 0.15);
  color: var(--color-error);
}

.score-bar-section {
  padding: 20px;
  margin-bottom: 24px;
}

.score-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.score-bar-title {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.score-bar-value {
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-display);
}

.score-bar-bg {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.no-signals {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  margin-bottom: 24px;
}

.no-signals-icon {
  width: 48px;
  height: 48px;
  color: var(--color-success);
  margin-bottom: 12px;
  opacity: 0.6;
}

.no-signals-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  font-family: var(--font-display);
}

.no-signals-desc {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.signal-card {
  padding: 20px;
  transition: all var(--transition-fast);

  &.gentle {
    border-left: 3px solid var(--color-warning);
  }

  &.firm {
    border-left: 3px solid var(--mood-anxious);
  }

  &.crisis {
    border-left: 3px solid var(--color-error);
  }
}

.signal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.signal-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
}

.signal-type-icon {
  width: 14px;
  height: 14px;
}

.signal-level-tag {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid;
  font-weight: 500;
}

.signal-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px 0;
  font-family: var(--font-display);
}

.signal-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.timeline-container {
  padding: 24px;
  margin-bottom: 24px;
}

.timeline-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.timeline-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  transition: all var(--transition-fast);

  &.today {
    background: rgba(232, 180, 217, 0.1);
    border: 1px solid rgba(232, 180, 217, 0.2);
  }

  &.no-record {
    opacity: 0.6;
  }

  &.has-negative {
    background: rgba(248, 113, 113, 0.06);
  }
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.day-week {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.today-tag {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: rgba(232, 180, 217, 0.2);
  color: var(--color-secondary);
}

.day-mood {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-emoji {
  font-size: 1.5rem;

  &.empty {
    font-size: 1rem;
    color: var(--color-text-muted);
  }
}

.day-score {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);

  &.empty {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    font-weight: 400;
  }
}

.day-segments {
  display: flex;
  gap: 3px;
}

.segment-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);

  &.filled {
    background: var(--color-secondary);
    box-shadow: 0 0 4px rgba(232, 180, 217, 0.4);
  }
}

.day-mood-types {
  display: flex;
  gap: 3px;
  justify-content: center;
}

.mood-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.day-activities {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.activity-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  font-size: 0.6rem;
  font-weight: 500;

  &.tasks {
    background: rgba(74, 222, 128, 0.15);
    color: var(--color-success);
  }

  &.story {
    background: rgba(123, 163, 201, 0.15);
    color: var(--color-accent);
  }
}

.activity-icon {
  width: 10px;
  height: 10px;
}

.room-progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.room-progress-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    transform: translateX(4px);
    border-color: rgba(232, 180, 217, 0.3);
  }
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.room-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.room-chapter {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.room-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.room-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.room-percent {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-family: var(--font-display);
  min-width: 40px;
  text-align: right;
}

.room-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.recommendation-card {
  padding: 24px;
  border-left: 3px solid var(--color-accent);

  &.high {
    border-left-color: var(--color-error);
    background: rgba(248, 113, 113, 0.05);
  }

  &.normal {
    border-left-color: var(--color-warning);
  }

  &.low {
    border-left-color: var(--color-accent);
  }
}

.rec-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 14px 0;
  font-family: var(--font-display);
}

.rec-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.rec-action {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.rec-action-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-secondary);
  margin-top: 8px;
  flex-shrink: 0;
}

.rec-action-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.rec-quick-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.rec-link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-secondary);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(232, 180, 217, 0.2);
    transform: translateY(-1px);
  }
}

.link-icon {
  width: 14px;
  height: 14px;
}

.support-entry {
  padding: 20px;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 3px solid rgba(248, 113, 113, 0.4);

  &:hover {
    border-color: rgba(248, 113, 113, 0.6);
  }

  &.expanded {
    border-color: var(--color-error);
  }
}

.support-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.support-entry-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.support-entry-icon {
  width: 32px;
  height: 32px;
  color: var(--color-error);
  flex-shrink: 0;
}

.support-entry-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
  font-family: var(--font-display);
}

.support-entry-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0;
}

.support-expand-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);

  &.rotated {
    transform: rotate(90deg);
  }
}

.support-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.support-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(248, 113, 113, 0.06);
  border-radius: var(--radius-md);
  gap: 16px;
}

.support-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.support-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.support-item-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.support-item-time {
  font-size: 0.75rem;
  color: var(--color-accent);
}

.support-call-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--color-error), #dc2626);
  color: white;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(248, 113, 113, 0.4);
    color: white;
  }
}

.call-icon {
  width: 14px;
  height: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-secondary);
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  max-width: 360px;
  margin: 0 0 20px 0;
}

.empty-action-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: var(--color-bg-dark);
  border: none;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: var(--shadow-glow);
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(232, 180, 217, 0.6);
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

@media (max-width: 768px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .timeline-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .level-banner {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .support-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .support-call-btn {
    width: 100%;
    justify-content: center;
  }

  .room-progress-card {
    flex-wrap: wrap;
  }

  .room-bar-bg {
    order: 5;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .timeline-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
