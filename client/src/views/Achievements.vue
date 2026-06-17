<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAchievementStore } from '@/stores/achievement'
import { useNotificationStore } from '@/stores/notification'
import { useMoodStore } from '@/stores/mood'
import { useRoomStore } from '@/stores/room'
import { useCrisisCenterStore } from '@/stores/crisisCenter'
import { useRouter } from 'vue-router'
import { 
  Trophy, Target, Gift, CheckCircle, Clock, Star, 
  Calendar, Flame, Lock, ChevronRight, Bell, Sparkles,
  Moon, Zap, Layers, BookOpen, Heart, Award, ExternalLink,
  Home, Smile, TrendingUp, TrendingDown, BarChart3, PieChart,
  Activity, DoorOpen, ChevronLeft, Flag, Minus, ArrowUpRight,
  ArrowDownRight, Eye
} from 'lucide-vue-next'

const achievementStore = useAchievementStore()
const notificationStore = useNotificationStore()
const moodStore = useMoodStore()
const roomStore = useRoomStore()
const crisisStore = useCrisisCenterStore()
const router = useRouter()

const activeTab = ref('tasks')
const activeTaskTab = ref('daily')
const activeAchievementTab = ref('all')
const isLoading = ref(false)
const claimingId = ref(null)
const showReminderPanel = ref(false)
const expandedComboId = ref(null)

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const showMonthPicker = ref(false)
const compareYear = ref(new Date().getFullYear())
const compareMonth = ref(new Date().getMonth() === 0 ? 12 : new Date().getMonth())
const showKeyNodes = ref(true)

const tasks = computed(() => achievementStore.tasks)
const achievements = computed(() => achievementStore.achievements)
const comboAchievements = computed(() => achievementStore.comboAchievements)
const unlockedCount = computed(() => achievementStore.unlockedCount)
const totalCount = computed(() => achievementStore.totalCount)
const reminders = computed(() => achievementStore.reminders)
const hasUnclaimedRewards = computed(() => achievementStore.hasUnclaimedRewards)

const normalAchievements = computed(() => 
  achievements.value.filter(a => !a.isCombo)
)

function getSubConditionIcon(key) {
  const iconMap = {
    'crossRoomRead': BookOpen,
    'specificMoodRecord': Heart,
    'consecutiveTaskClaims': Gift
  }
  return iconMap[key] || Layers
}

function getSubConditionProgressText(sub) {
  if (sub.key === 'crossRoomRead') {
    return `已阅读 ${sub.progress.chapters} / ${sub.target.chapters} 章节，跨 ${sub.progress.rooms} / ${sub.target.rooms} 个房间`
  }
  if (sub.key === 'specificMoodRecord') {
    return `已记录 ${sub.progress.totalRecords} / ${sub.target.totalRecords} 次，体验 ${sub.progress.uniqueTypes} / ${sub.target.uniqueTypes} 种情绪`
  }
  if (sub.key === 'consecutiveTaskClaims') {
    return `连续领取 ${sub.progress.streak} / ${sub.target.streak} 天`
  }
  return ''
}

function getSubConditionPercent(sub) {
  if (sub.key === 'crossRoomRead') {
    const roomPct = (sub.progress.rooms / sub.target.rooms) * 50
    const chapterPct = (sub.progress.chapters / sub.target.chapters) * 50
    return Math.min(100, roomPct + chapterPct)
  }
  if (sub.key === 'specificMoodRecord') {
    const totalPct = (sub.progress.totalRecords / sub.target.totalRecords) * 50
    const uniquePct = (sub.progress.uniqueTypes / sub.target.uniqueTypes) * 50
    return Math.min(100, totalPct + uniquePct)
  }
  if (sub.key === 'consecutiveTaskClaims') {
    return Math.min(100, (sub.progress.streak / sub.target.streak) * 100)
  }
  return 0
}

function toggleComboExpand(id) {
  expandedComboId.value = expandedComboId.value === id ? null : id
}

function navigateToTracker(key) {
  if (key === 'crossRoomRead') {
    router.push('/rooms')
  } else if (key === 'specificMoodRecord') {
    router.push('/mood')
  } else if (key === 'consecutiveTaskClaims') {
    activeTab.value = 'tasks'
  }
}

const dailyTasks = computed(() => achievementStore.dailyTasks)
const weeklyTasks = computed(() => achievementStore.weeklyTasks)
const onceTasks = computed(() => achievementStore.onceTasks)
const chainTasks = computed(() => achievementStore.chainTasks)

async function loadData() {
  isLoading.value = true
  await Promise.all([
    achievementStore.fetchTasks(),
    achievementStore.fetchAchievements(),
    achievementStore.fetchReminders(),
    loadStatsData()
  ])
  isLoading.value = false
}

async function claimReward(taskId) {
  claimingId.value = taskId

  const result = await achievementStore.claimTask(taskId)

  claimingId.value = null

  if (result.success) {
    notificationStore.success(
      `🎉 领取成功！获得 ${result.data.reward} 星币`,
      '奖励领取成功'
    )

    if (result.data.notificationEvents && result.data.notificationEvents.length > 0) {
      notificationStore.push(result.data.notificationEvents)
    }

    if (result.data.crisisAnalysis) {
      crisisStore.$patch({ analysis: result.data.crisisAnalysis })
    } else {
      crisisStore.fetchAnalysis()
    }

    await achievementStore.fetchTasks()
    await achievementStore.fetchAchievements()
  } else {
    notificationStore.error(result.message, '领取失败')
  }
}

const dailyRefreshTime = computed(() => {
  if (!tasks.value?.dailyRefreshTime) return ''
  const time = new Date(tasks.value.dailyRefreshTime)
  return `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
})

const weeklyRefreshTime = computed(() => {
  if (!tasks.value?.weeklyRefreshTime) return ''
  const time = new Date(tasks.value.weeklyRefreshTime)
  return `${time.getMonth() + 1}月${time.getDate()}日`
})

function getTaskIcon(iconName) {
  const iconMap = {
    'gift': Gift,
    'heart': Star,
    'pen-tool': Gift,
    'calendar-days': Calendar,
    'sparkles': Sparkles,
    'book-open': Trophy,
    'layers': Target,
    'tags': Gift,
    'target': Target,
    'calendar': Calendar,
    'palette': Sparkles,
    'flame': Flame,
    'trophy': Trophy,
    'crown': Star,
    'moon': Moon,
    'star': Star,
    'zap': Zap
  }
  return iconMap[iconName] || Gift
}

function getTaskIconClass(type) {
  const classMap = {
    'daily': 'task-icon-daily',
    'weekly': 'task-icon-weekly',
    'once': 'task-icon-once',
    'chain': 'task-icon-chain'
  }
  return classMap[type] || 'task-icon-daily'
}

const highPriorityReminderCount = computed(() => 
  reminders.value.filter(r => r.priority === 'high').length
)

function showTaskCompleteToast(task) {
  notificationStore.taskClaimable(task)
}

const availableMonths = computed(() => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`
    })
  }
  return months
})

const currentMonthLabel = computed(() => {
  return `${selectedYear.value}年${selectedMonth.value}月`
})

const compareMonthLabel = computed(() => {
  return `${compareYear.value}年${compareMonth.value}月`
})

const moodTypes = [
  { key: 'happy', label: '开心', emoji: '😊', color: '#22c55e' },
  { key: 'calm', label: '平静', emoji: '😌', color: '#3b82f6' },
  { key: 'sad', label: '难过', emoji: '😢', color: '#6366f1' },
  { key: 'anxious', label: '焦虑', emoji: '😰', color: '#f97316' },
  { key: 'angry', label: '生气', emoji: '😠', color: '#ef4444' }
]

function generateMoodDistribution(year, month) {
  const seed = year * 12 + month
  const pseudoRandom = (i) => {
    const x = Math.sin(seed * 9999 + i * 123) * 10000
    return x - Math.floor(x)
  }
  const total = Math.floor(pseudoRandom(0) * 25) + 8
  const dist = {}
  let remaining = total
  moodTypes.forEach((m, i) => {
    if (i === moodTypes.length - 1) {
      dist[m.key] = remaining
    } else {
      const val = Math.max(1, Math.floor(remaining * pseudoRandom(i + 1) * 0.5))
      dist[m.key] = val
      remaining -= val
    }
  })
  return { total, distribution: dist }
}

const moodDistributionCurrent = computed(() => 
  generateMoodDistribution(selectedYear.value, selectedMonth.value)
)

const moodDistributionCompare = computed(() => 
  generateMoodDistribution(compareYear.value, compareMonth.value)
)

const moodComparisonData = computed(() => {
  return moodTypes.map(m => ({
    ...m,
    current: moodDistributionCurrent.value.distribution[m.key] || 0,
    compare: moodDistributionCompare.value.distribution[m.key] || 0,
    currentPct: moodDistributionCurrent.value.total > 0 
      ? ((moodDistributionCurrent.value.distribution[m.key] || 0) / moodDistributionCurrent.value.total * 100).toFixed(1)
      : 0,
    comparePct: moodDistributionCompare.value.total > 0
      ? ((moodDistributionCompare.value.distribution[m.key] || 0) / moodDistributionCompare.value.total * 100).toFixed(1)
      : 0
  }))
})

const maxMoodCount = computed(() => {
  let max = 0
  moodComparisonData.value.forEach(m => {
    max = Math.max(max, m.current, m.compare)
  })
  return max || 1
})

const roomList = [
  { id: 1, name: '月光大厅', icon: '🌙', color: '#8b5cf6', totalChapters: 12, requiredDays: 3 },
  { id: 2, name: '记忆花园', icon: '🌸', color: '#ec4899', totalChapters: 15, requiredDays: 7 },
  { id: 3, name: '星语书房', icon: '📚', color: '#3b82f6', totalChapters: 18, requiredDays: 14 },
  { id: 4, name: '潮汐长廊', icon: '🌊', color: '#06b6d4', totalChapters: 20, requiredDays: 21 },
  { id: 5, name: '晨曦阁楼', icon: '☀️', color: '#f97316', totalChapters: 22, requiredDays: 30 },
  { id: 6, name: '永恒圣殿', icon: '✨', color: '#fbbf24', totalChapters: 25, requiredDays: 60 }
]

const roomProgressData = computed(() => {
  const seed = selectedYear.value * 12 + selectedMonth.value
  const pseudoRandom = (i) => {
    const x = Math.sin(seed * 8888 + i * 456) * 10000
    return x - Math.floor(x)
  }
  return roomList.map((room, i) => {
    const unlocked = i < 3 || pseudoRandom(i + 10) > 0.3
    const readChapters = unlocked 
      ? Math.floor(pseudoRandom(i + 20) * room.totalChapters) + 1
      : 0
    const progress = Math.round((readChapters / room.totalChapters) * 100)
    const avgDaysPerChapter = unlocked ? (pseudoRandom(i + 30) * 3 + 0.5).toFixed(1) : '—'
    const notesCount = unlocked ? Math.floor(pseudoRandom(i + 40) * 8) : 0
    return {
      ...room,
      unlocked,
      readChapters,
      progress,
      avgDaysPerChapter,
      notesCount,
      efficiency: unlocked ? Math.round((readChapters / room.requiredDays) * 100) : 0
    }
  })
})

const unlockedRoomCount = computed(() => 
  roomProgressData.value.filter(r => r.unlocked).length
)

const totalReadChapters = computed(() => 
  roomProgressData.value.reduce((sum, r) => sum + r.readChapters, 0)
)

const avgEfficiency = computed(() => {
  const unlocked = roomProgressData.value.filter(r => r.unlocked)
  if (unlocked.length === 0) return 0
  return Math.round(unlocked.reduce((sum, r) => sum + r.efficiency, 0) / unlocked.length)
})

const taskTypes = [
  { type: 'daily', label: '每日任务', icon: Calendar, color: '#22c55e' },
  { type: 'weekly', label: '每周任务', icon: Target, color: '#3b82f6' },
  { type: 'once', label: '长期任务', icon: Trophy, color: '#fbbf24' },
  { type: 'chain', label: '成长链任务', icon: Flame, color: '#f97316' }
]

const taskROIData = computed(() => {
  const seed = selectedYear.value * 12 + selectedMonth.value
  const pseudoRandom = (i) => {
    const x = Math.sin(seed * 7777 + i * 789) * 10000
    return x - Math.floor(x)
  }
  return taskTypes.map((t, i) => {
    const assigned = Math.floor(pseudoRandom(i + 50) * 15) + 5
    const completed = Math.max(1, Math.floor(assigned * (0.6 + pseudoRandom(i + 60) * 0.4)))
    const totalReward = completed * (Math.floor(pseudoRandom(i + 70) * 30) + 10)
    const avgTime = (pseudoRandom(i + 80) * 20 + 5).toFixed(1)
    const roi = totalReward > 0 ? Math.round((totalReward / completed) / avgTime * 100) : 0
    return {
      ...t,
      assigned,
      completed,
      completionRate: Math.round((completed / assigned) * 100),
      totalReward,
      avgTime,
      roi,
      efficiency: Math.round((completed / assigned) * 100 + roi / 2)
    }
  })
})

const totalTaskAssigned = computed(() => taskROIData.value.reduce((s, t) => s + t.assigned, 0))
const totalTaskCompleted = computed(() => taskROIData.value.reduce((s, t) => s + t.completed, 0))
const totalEarnedStars = computed(() => taskROIData.value.reduce((s, t) => s + t.totalReward, 0))
const overallROI = computed(() => {
  const total = taskROIData.value.reduce((s, t) => s + t.roi, 0)
  return Math.round(total / taskROIData.value.length)
})

const achievementTrendData = computed(() => {
  const months = []
  const now = new Date(selectedYear.value, selectedMonth.value - 1, 1)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const seed = d.getFullYear() * 12 + d.getMonth()
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed * 6666 + offset * 321) * 10000
      return x - Math.floor(x)
    }
    const unlocked = Math.floor(pseudoRandom(1) * 8) + 1
    const total = 25
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getMonth() + 1}月`,
      unlocked,
      total,
      cumulative: 0,
      keyNodes: []
    })
  }
  let cum = 0
  months.forEach((m, i) => {
    cum += m.unlocked
    m.cumulative = cum
    if (i === 2) {
      m.keyNodes.push({ type: 'milestone', label: '10成就达成' })
    }
    if (i === 5) {
      m.keyNodes.push({ type: 'legendary', label: '传说成就解锁' })
    }
  })
  return months
})

const keyNodes = computed(() => {
  const nodes = []
  achievementTrendData.value.forEach((m, mi) => {
    m.keyNodes.forEach((n, ni) => {
      nodes.push({
        ...n,
        year: m.year,
        month: m.month,
        monthIndex: mi,
        id: `${mi}-${ni}`
      })
    })
  })
  nodes.push({ type: 'first', label: '首个成就解锁', monthIndex: 0, id: 'first' })
  return nodes
})

const maxAchievementCount = computed(() => {
  return Math.max(...achievementTrendData.value.map(m => m.unlocked), ...achievementTrendData.value.map(m => m.cumulative), 1)
})

const achievementCompletionRate = computed(() => {
  const total = achievementTrendData.value.reduce((s, m) => s + m.unlocked, 0)
  return Math.round((total / (achievementTrendData.value.length * 12)) * 100)
})

function selectMonth(year, month) {
  selectedYear.value = year
  selectedMonth.value = month
  showMonthPicker.value = false
}

function goPrevMonth() {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12
    selectedYear.value--
  } else {
    selectedMonth.value--
  }
}

function goNextMonth() {
  const now = new Date()
  if (selectedYear.value === now.getFullYear() && selectedMonth.value === now.getMonth() + 1) {
    return
  }
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1
    selectedYear.value++
  } else {
    selectedMonth.value++
  }
}

function getNodeIcon(type) {
  const map = {
    milestone: Flag,
    legendary: Trophy,
    first: Star
  }
  return map[type] || Flag
}

function getNodeColor(type) {
  const map = {
    milestone: '#8b5cf6',
    legendary: '#fbbf24',
    first: '#ec4899'
  }
  return map[type] || '#3b82f6'
}

async function loadStatsData() {
  await moodStore.fetchConfig()
  await roomStore.fetchRooms()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>任务成就</h1>
        <p class="page-subtitle">完成任务，收集成就，见证你的成长</p>
      </div>
      <button 
        class="reminder-btn" 
        :class="{ 'has-reminder': highPriorityReminderCount > 0 }"
        @click="showReminderPanel = !showReminderPanel"
      >
        <Bell class="reminder-icon" />
        <span v-if="highPriorityReminderCount > 0" class="reminder-badge">
          {{ highPriorityReminderCount }}
        </span>
      </button>
    </div>
    
    <div class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
      >
        <Target class="tab-icon" />
        <span>任务中心</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'achievements' }"
        @click="activeTab = 'achievements'"
      >
        <Trophy class="tab-icon" />
        <span>成就徽章</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'statistics' }"
        @click="activeTab = 'statistics'"
      >
        <BarChart3 class="tab-icon" />
        <span>统计视图</span>
      </button>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
    
    <div v-else>
      <div v-show="activeTab === 'tasks'" class="tasks-section">
        <div class="task-tabs">
          <button 
            class="task-tab-btn" 
            :class="{ active: activeTaskTab === 'daily' }"
            @click="activeTaskTab = 'daily'"
          >
            <Clock class="tab-icon" />
            <span>每日任务</span>
          </button>
          <button 
            class="task-tab-btn" 
            :class="{ active: activeTaskTab === 'weekly' }"
            @click="activeTaskTab = 'weekly'"
          >
            <Calendar class="tab-icon" />
            <span>周任务</span>
          </button>
          <button 
            class="task-tab-btn" 
            :class="{ active: activeTaskTab === 'chain' }"
            @click="activeTaskTab = 'chain'"
          >
            <Flame class="tab-icon" />
            <span>成长链</span>
          </button>
          <button 
            class="task-tab-btn" 
            :class="{ active: activeTaskTab === 'once' }"
            @click="activeTaskTab = 'once'"
          >
            <Trophy class="tab-icon" />
            <span>长期任务</span>
          </button>
        </div>

        <div v-show="activeTaskTab === 'daily'" class="task-content">
          <div class="section-header">
            <h2 class="section-title">
              <Clock class="title-icon" />
              每日任务
            </h2>
            <span class="refresh-text">每日 {{ dailyRefreshTime }} 刷新</span>
          </div>
          
          <div class="tasks-list">
            <div 
              v-for="task in dailyTasks" 
              :key="task.id"
              class="task-card glass-card"
              :class="{ 'completed': task.isCompleted }"
            >
              <div class="task-icon" :class="getTaskIconClass(task.type)">
                <component :is="getTaskIcon(task.icon)" class="icon" />
              </div>
              
              <div class="task-content">
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-desc">{{ task.description }}</p>
                
                <div class="task-progress">
                  <div class="progress-info">
                    <span>进度</span>
                    <span>{{ task.current }} / {{ task.target }}</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div 
                      class="progress-bar"
                      :style="{ width: `${(task.current / task.target) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
              
              <div class="task-reward">
                <span class="reward-amount">+{{ task.reward }}</span>
                <Star class="reward-icon" />
                
                <button 
                  v-if="task.isCompleted && !task.isClaimed"
                  class="claim-btn btn-primary pulse"
                  :disabled="claimingId === task.id"
                  @click="claimReward(task.id)"
                >
                  {{ claimingId === task.id ? '领取中...' : '领取' }}
                </button>
                <CheckCircle v-else-if="task.isClaimed" class="claimed-icon" />
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTaskTab === 'weekly'" class="task-content">
          <div class="section-header">
            <h2 class="section-title">
              <Calendar class="title-icon" />
              周任务
            </h2>
            <span class="refresh-text">每周一 {{ weeklyRefreshTime }} 刷新</span>
          </div>
          
          <div class="tasks-list">
            <div 
              v-for="task in weeklyTasks" 
              :key="task.id"
              class="task-card glass-card"
              :class="{ 'completed': task.isCompleted }"
            >
              <div class="task-icon" :class="getTaskIconClass(task.type)">
                <component :is="getTaskIcon(task.icon)" class="icon" />
              </div>
              
              <div class="task-content">
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-desc">{{ task.description }}</p>
                
                <div class="task-progress">
                  <div class="progress-info">
                    <span>进度</span>
                    <span>{{ task.current }} / {{ task.target }}</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div 
                      class="progress-bar weekly"
                      :style="{ width: `${(task.current / task.target) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
              
              <div class="task-reward">
                <span class="reward-amount">+{{ task.reward }}</span>
                <Star class="reward-icon" />
                
                <button 
                  v-if="task.isCompleted && !task.isClaimed"
                  class="claim-btn btn-primary pulse"
                  :disabled="claimingId === task.id"
                  @click="claimReward(task.id)"
                >
                  {{ claimingId === task.id ? '领取中...' : '领取' }}
                </button>
                <CheckCircle v-else-if="task.isClaimed" class="claimed-icon" />
              </div>
            </div>
          </div>
          
          <div v-if="weeklyTasks.length === 0" class="empty-tasks">
            <Calendar class="empty-icon" />
            <p>暂无周任务，敬请期待~</p>
          </div>
        </div>

        <div v-show="activeTaskTab === 'chain'" class="task-content">
          <div v-for="chainGroup in chainTasks" :key="chainGroup.chainId" class="chain-group">
            <div class="chain-header">
              <h3 class="chain-title">
                <Flame class="chain-icon" />
                {{ chainGroup.chainName }}
              </h3>
              <span class="chain-progress">
                {{ chainGroup.tasks.filter(t => t.isCompleted).length }} / {{ chainGroup.tasks.length }}
              </span>
            </div>
            
            <div class="chain-tasks">
              <div 
                v-for="(task, index) in chainGroup.tasks" 
                :key="task.id"
                class="chain-task-item"
                :class="{ 
                  'completed': task.isCompleted, 
                  'locked': !task.isUnlocked,
                  'current': task.isUnlocked && !task.isCompleted
                }"
              >
                <div class="chain-connector" v-if="index > 0"></div>
                
                <div class="chain-task-card glass-card">
                  <div class="chain-task-icon" :class="{ 'locked': !task.isUnlocked }">
                    <Lock v-if="!task.isUnlocked" class="icon lock" />
                    <component v-else :is="getTaskIcon(task.icon)" class="icon" />
                    <span class="chain-order">{{ task.chainOrder }}</span>
                  </div>
                  
                  <div class="chain-task-content">
                    <h4 class="chain-task-title">{{ task.title }}</h4>
                    <p class="chain-task-desc">{{ task.description }}</p>
                    
                    <div v-if="task.isUnlocked" class="chain-task-progress">
                      <div class="progress-info">
                        <span>进度</span>
                        <span>{{ task.current }} / {{ task.target }}</span>
                      </div>
                      <div class="progress-bar-bg">
                        <div 
                          class="progress-bar chain"
                          :style="{ width: `${(task.current / task.target) * 100}%` }"
                        ></div>
                      </div>
                    </div>
                    
                    <p v-else class="locked-text">
                      <Lock class="lock-icon" />
                      完成上一阶段解锁
                    </p>
                  </div>
                  
                  <div class="chain-task-reward">
                    <span class="reward-amount">+{{ task.reward }}</span>
                    <Star class="reward-icon" />
                    
                    <button 
                      v-if="task.isCompleted && !task.isClaimed && task.isUnlocked"
                      class="claim-btn btn-primary pulse"
                      :disabled="claimingId === task.id"
                      @click="claimReward(task.id)"
                    >
                      {{ claimingId === task.id ? '...' : '领取' }}
                    </button>
                    <CheckCircle v-else-if="task.isClaimed" class="claimed-icon" />
                    <ChevronRight v-else-if="task.isUnlocked && !task.isCompleted" class="arrow-icon" />
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="chainGroup.hasReset" class="reset-notice">
              <Clock class="reset-icon" />
              <span>连续记录中断，任务已重置，重新开始挑战吧！</span>
            </div>
          </div>
          
          <div v-if="chainTasks.length === 0" class="empty-tasks">
            <Flame class="empty-icon" />
            <p>暂无成长链任务，敬请期待~</p>
          </div>
        </div>

        <div v-show="activeTaskTab === 'once'" class="task-content">
          <div class="section-header">
            <h2 class="section-title">
              <Trophy class="title-icon" />
              长期任务
            </h2>
          </div>
          
          <div class="tasks-list">
            <div 
              v-for="task in onceTasks" 
              :key="task.id"
              class="task-card glass-card"
              :class="{ 'completed': task.isCompleted }"
            >
              <div class="task-icon" :class="getTaskIconClass(task.type)">
                <component :is="getTaskIcon(task.icon)" class="icon" />
              </div>
              
              <div class="task-content">
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-desc">{{ task.description }}</p>
                
                <div class="task-progress">
                  <div class="progress-info">
                    <span>进度</span>
                    <span>{{ task.current }} / {{ task.target }}</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div 
                      class="progress-bar once"
                      :style="{ width: `${(task.current / task.target) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
              
              <div class="task-reward">
                <span class="reward-amount">+{{ task.reward }}</span>
                <Star class="reward-icon" />
                
                <button 
                  v-if="task.isCompleted && !task.isClaimed"
                  class="claim-btn btn-primary pulse"
                  :disabled="claimingId === task.id"
                  @click="claimReward(task.id)"
                >
                  {{ claimingId === task.id ? '领取中...' : '领取' }}
                </button>
                <CheckCircle v-else-if="task.isClaimed" class="claimed-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-show="activeTab === 'achievements'" class="achievements-section">
        <div class="achievements-stats glass-card">
          <div class="stat-item">
            <Trophy class="stat-icon" />
            <div class="stat-info">
              <span class="stat-value">{{ unlockedCount }}</span>
              <span class="stat-label">已解锁</span>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <Target class="stat-icon" />
            <div class="stat-info">
              <span class="stat-value">{{ totalCount }}</span>
              <span class="stat-label">全部成就</span>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <Star class="stat-icon" />
            <div class="stat-info">
              <span class="stat-value">{{ totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0 }}%</span>
              <span class="stat-label">完成度</span>
            </div>
          </div>
        </div>

        <div class="achievement-tabs">
          <button 
            class="achievement-tab-btn" 
            :class="{ active: activeAchievementTab === 'all' }"
            @click="activeAchievementTab = 'all'"
          >
            <Award class="tab-icon" />
            <span>全部成就</span>
          </button>
          <button 
            class="achievement-tab-btn" 
            :class="{ active: activeAchievementTab === 'combo' }"
            @click="activeAchievementTab = 'combo'"
          >
            <Layers class="tab-icon" />
            <span>组合成就</span>
            <span v-if="comboAchievements.some(c => !c.isUnlocked)" class="tab-badge">
              {{ comboAchievements.filter(c => !c.isUnlocked).length }}
            </span>
          </button>
        </div>

        <div v-show="activeAchievementTab === 'combo'" class="combo-section">
          <div class="combo-intro glass-card">
            <div class="combo-intro-header">
              <Layers class="combo-intro-icon" />
              <div>
                <h3 class="combo-intro-title">什么是组合成就？</h3>
                <p class="combo-intro-desc">组合成就需要同时完成多个子条件才能解锁，挑战更高，成就感更强！</p>
              </div>
            </div>
          </div>

          <div class="combo-achievements-list">
            <div 
              v-for="combo in comboAchievements" 
              :key="combo.id"
              class="combo-achievement-card glass-card"
              :class="{ 'unlocked': combo.isUnlocked, 'expanded': expandedComboId === combo.id }"
            >
              <div class="combo-main" @click="toggleComboExpand(combo.id)">
                <div class="combo-icon-wrapper" :class="{ 'glow': combo.isUnlocked }">
                  <span class="combo-icon-emoji">{{ combo.icon }}</span>
                  <span v-if="combo.isUnlocked" class="combo-checkmark">
                    <CheckCircle class="check-icon" />
                  </span>
                </div>
                
                <div class="combo-info">
                  <div class="combo-header-row">
                    <h3 class="combo-name">{{ combo.name }}</h3>
                    <span class="combo-badge">
                      <Layers class="badge-icon" />
                      组合成就
                    </span>
                  </div>
                  <p class="combo-desc">{{ combo.description }}</p>
                  
                  <div class="combo-overall-progress">
                    <div class="progress-info">
                      <span>总进度</span>
                      <span>{{ combo.subConditions.filter(s => s.completed).length }} / {{ combo.subConditions.length }} 条件达成</span>
                    </div>
                    <div class="progress-bar-bg combo-progress-bg">
                      <div 
                        class="progress-bar combo-progress"
                        :style="{ width: `${(combo.subConditions.filter(s => s.completed).length / combo.subConditions.length) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
                
                <ChevronRight class="combo-expand-icon" :class="{ 'rotated': expandedComboId === combo.id }" />
              </div>
              
              <div v-show="expandedComboId === combo.id" class="combo-details">
                <div class="combo-sub-conditions">
                  <div 
                    v-for="sub in combo.subConditions" 
                    :key="sub.key"
                    class="sub-condition-item"
                    :class="{ 'completed': sub.completed }"
                  >
                    <div class="sub-condition-header">
                      <div class="sub-condition-icon" :class="{ 'completed': sub.completed }">
                        <component :is="getSubConditionIcon(sub.key)" class="icon" />
                      </div>
                      <div class="sub-condition-info">
                        <div class="sub-condition-title-row">
                          <h4 class="sub-condition-name">{{ sub.name }}</h4>
                          <CheckCircle v-if="sub.completed" class="sub-check-icon" />
                        </div>
                        <p class="sub-condition-desc">{{ sub.description }}</p>
                      </div>
                      <button 
                        class="tracker-btn"
                        @click.stop="navigateToTracker(sub.key)"
                      >
                        <ExternalLink class="tracker-icon" />
                        <span>去追踪</span>
                      </button>
                    </div>
                    
                    <div class="sub-condition-progress">
                      <div class="progress-info">
                        <span>进度</span>
                        <span>{{ getSubConditionProgressText(sub) }}</span>
                      </div>
                      <div class="progress-bar-bg">
                        <div 
                          class="progress-bar sub-progress"
                          :class="{ 'completed': sub.completed }"
                          :style="{ width: `${getSubConditionPercent(sub)}%` }"
                        ></div>
                      </div>
                    </div>
                    
                    <div class="sub-condition-tips">
                      <div v-if="sub.key === 'crossRoomRead'" class="tip-content">
                        <BookOpen class="tip-icon" />
                        <span>前往「房间」页面阅读不同房间的故事章节</span>
                      </div>
                      <div v-if="sub.key === 'specificMoodRecord'" class="tip-content">
                        <Heart class="tip-icon" />
                        <span>前往「心情」页面记录各种不同的心情体验</span>
                      </div>
                      <div v-if="sub.key === 'consecutiveTaskClaims'" class="tip-content">
                        <Gift class="tip-icon" />
                        <span>每天完成「任务」并领取奖励，保持连续不中断</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="combo-reward-info">
                  <Award class="reward-info-icon" />
                  <span>解锁后将获得特殊成就徽章，记录你的全能成长之旅！</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeAchievementTab === 'all'" class="achievements-grid">
          <div 
            v-for="achievement in achievements" 
            :key="achievement.id"
            class="achievement-card glass-card"
            :class="{ 'unlocked': achievement.isUnlocked, 'combo-card': achievement.isCombo }"
          >
            <div class="achievement-icon" :class="{ 'glow': achievement.isUnlocked }">
              <span class="icon-emoji">{{ achievement.icon }}</span>
              <span v-if="achievement.isCombo" class="combo-tag">
                <Layers class="combo-tag-icon" />
              </span>
            </div>
            
            <div class="achievement-info">
              <div class="achievement-name-row">
                <h3 class="achievement-name">{{ achievement.name }}</h3>
                <span v-if="achievement.isCombo" class="mini-combo-badge">组合</span>
              </div>
              <p class="achievement-desc">{{ achievement.description }}</p>
              <p class="achievement-condition">{{ achievement.condition }}</p>
              
              <div v-if="achievement.isCombo && !achievement.isUnlocked" class="combo-mini-progress">
                <div class="mini-progress-dots">
                  <span 
                    v-for="(sub, idx) in achievement.subConditions" 
                    :key="idx"
                    class="mini-dot"
                    :class="{ 'done': sub.completed }"
                  ></span>
                </div>
                <span class="mini-progress-text">
                  {{ achievement.subConditions.filter(s => s.completed).length }}/{{ achievement.subConditions.length }} 子条件
                </span>
              </div>
              
              <div v-if="!achievement.isUnlocked && !achievement.isCombo" class="achievement-progress">
                <div class="progress-info">
                  <span>进度</span>
                  <span>{{ achievement.progress }} / {{ achievement.target }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div 
                    class="progress-bar"
                    :style="{ width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%` }"
                  ></div>
                </div>
              </div>
              
              <p v-if="achievement.isUnlocked && achievement.unlockedAt" class="unlock-date">
                解锁于 {{ new Date(achievement.unlockedAt).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'statistics'" class="statistics-section">
        <div class="stats-toolbar glass-card">
          <div class="month-selector">
            <button class="month-nav-btn" @click="goPrevMonth">
              <ChevronLeft class="nav-icon" />
            </button>
            <div class="month-picker-wrapper">
              <button class="month-display-btn" @click="showMonthPicker = !showMonthPicker">
                <Calendar class="month-icon" />
                <span>{{ currentMonthLabel }}</span>
                <ChevronRight class="dropdown-icon" :class="{ rotated: showMonthPicker }" />
              </button>
              <div v-show="showMonthPicker" class="month-dropdown glass-card">
                <div 
                  v-for="m in availableMonths" 
                  :key="`${m.year}-${m.month}`"
                  class="month-option"
                  :class="{ active: m.year === selectedYear && m.month === selectedMonth }"
                  @click="selectMonth(m.year, m.month)"
                >
                  {{ m.label }}
                </div>
              </div>
            </div>
            <button class="month-nav-btn" @click="goNextMonth">
              <ChevronRight class="nav-icon" />
            </button>
          </div>
          <div class="toolbar-actions">
            <button 
              class="toggle-btn"
              :class="{ active: showKeyNodes }"
              @click="showKeyNodes = !showKeyNodes"
            >
              <Flag class="toggle-icon" />
              <span>关键节点</span>
            </button>
          </div>
        </div>

        <div class="stats-summary-row">
          <div class="summary-card glass-card">
            <div class="summary-icon-wrapper mood">
              <Heart class="summary-icon" />
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ moodDistributionCurrent.total }}</span>
              <span class="summary-label">情绪记录</span>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon-wrapper room">
              <DoorOpen class="summary-icon" />
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ unlockedRoomCount }}/{{ roomList.length }}</span>
              <span class="summary-label">解锁房间</span>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon-wrapper task">
              <Target class="summary-icon" />
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ totalTaskCompleted }}/{{ totalTaskAssigned }}</span>
              <span class="summary-label">完成任务</span>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon-wrapper achievement">
              <Trophy class="summary-icon" />
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ achievementTrendData[5]?.cumulative || 0 }}</span>
              <span class="summary-label">累计成就</span>
            </div>
          </div>
        </div>

        <div class="stats-module glass-card">
          <div class="module-header">
            <div class="module-title-row">
              <div class="module-icon-wrapper mood">
                <PieChart class="module-icon" />
              </div>
              <div>
                <h3 class="module-title">情绪分布对比</h3>
                <p class="module-subtitle">{{ currentMonthLabel }} vs {{ compareMonthLabel }}</p>
              </div>
            </div>
            <div class="module-legend-mini">
              <div class="legend-item-mini">
                <span class="legend-dot current"></span>
                <span>本月</span>
              </div>
              <div class="legend-item-mini">
                <span class="legend-dot compare"></span>
                <span>对比</span>
              </div>
            </div>
          </div>

          <div class="mood-comparison-list">
            <div 
              v-for="mood in moodComparisonData" 
              :key="mood.key"
              class="mood-compare-item"
            >
              <div class="mood-item-header">
                <span class="mood-emoji">{{ mood.emoji }}</span>
                <span class="mood-name">{{ mood.label }}</span>
                <span class="mood-diff" :class="{
                  positive: mood.current > mood.compare,
                  negative: mood.current < mood.compare
                }">
                  <ArrowUpRight v-if="mood.current > mood.compare" class="diff-icon" />
                  <ArrowDownRight v-else-if="mood.current < mood.compare" class="diff-icon" />
                  <Minus v-else class="diff-icon" />
                  {{ mood.current > mood.compare ? '+' : '' }}{{ mood.current - mood.compare }}
                </span>
              </div>
              <div class="mood-bars-row">
                <div class="mood-bar-col">
                  <div class="bar-track">
                    <div 
                      class="bar-fill current"
                      :style="{ 
                        width: `${(mood.current / maxMoodCount) * 100}%`,
                        backgroundColor: mood.color
                      }"
                    ></div>
                  </div>
                  <span class="bar-count">{{ mood.current }}次 · {{ mood.currentPct }}%</span>
                </div>
                <div class="mood-bar-col compare">
                  <div class="bar-track">
                    <div 
                      class="bar-fill compare"
                      :style="{ 
                        width: `${(mood.compare / maxMoodCount) * 100}%`,
                        backgroundColor: mood.color,
                        opacity: 0.4
                      }"
                    ></div>
                  </div>
                  <span class="bar-count">{{ mood.compare }}次 · {{ mood.comparePct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-module glass-card">
          <div class="module-header">
            <div class="module-title-row">
              <div class="module-icon-wrapper room">
                <DoorOpen class="module-icon" />
              </div>
              <div>
                <h3 class="module-title">房间推进效率</h3>
                <p class="module-subtitle">共阅读 {{ totalReadChapters }} 章节 · 平均效率 {{ avgEfficiency }}%</p>
              </div>
            </div>
          </div>

          <div class="room-progress-grid">
            <div 
              v-for="room in roomProgressData" 
              :key="room.id"
              class="room-progress-card"
              :class="{ unlocked: room.unlocked }"
            >
              <div class="room-card-header">
                <div class="room-icon-box" :style="{ backgroundColor: room.color + '20' }">
                  <span class="room-icon">{{ room.icon }}</span>
                </div>
                <div class="room-info">
                  <h4 class="room-name">{{ room.name }}</h4>
                  <p class="room-chapter-info">
                    {{ room.unlocked ? `已读 ${room.readChapters}/${room.totalChapters} 章` : '未解锁' }}
                  </p>
                </div>
                <Lock v-if="!room.unlocked" class="room-lock-icon" />
                <div v-else class="efficiency-tag" :style="{ backgroundColor: room.color + '20', color: room.color }">
                  {{ room.efficiency }}%
                </div>
              </div>
              <div v-if="room.unlocked" class="room-progress-bar-wrapper">
                <div class="room-progress-bar-bg">
                  <div 
                    class="room-progress-bar"
                    :style="{ 
                      width: `${room.progress}%`,
                      backgroundColor: room.color
                    }"
                  ></div>
                </div>
                <span class="room-progress-text">{{ room.progress }}%</span>
              </div>
              <div v-if="room.unlocked" class="room-efficiency-stats">
                <div class="efficiency-stat-item">
                  <Clock class="stat-mini-icon" />
                  <span>{{ room.avgDaysPerChapter }}天/章</span>
                </div>
                <div class="efficiency-stat-item">
                  <BookOpen class="stat-mini-icon" />
                  <span>{{ room.notesCount }}条札记</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-module glass-card">
          <div class="module-header">
            <div class="module-title-row">
              <div class="module-icon-wrapper task">
                <TrendingUp class="module-icon" />
              </div>
              <div>
                <h3 class="module-title">任务投入产出</h3>
                <p class="module-subtitle">累计获得 {{ totalEarnedStars }} 星币 · 综合ROI {{ overallROI }}</p>
              </div>
            </div>
          </div>

          <div class="task-roi-header">
            <div class="roi-header-stat">
              <span class="roi-header-value">{{ totalTaskCompleted }}</span>
              <span class="roi-header-label">已完成</span>
            </div>
            <div class="roi-header-stat">
              <span class="roi-header-value">{{ Math.round((totalTaskCompleted / totalTaskAssigned) * 100) }}%</span>
              <span class="roi-header-label">完成率</span>
            </div>
            <div class="roi-header-stat highlight">
              <span class="roi-header-value">{{ totalEarnedStars }}</span>
              <span class="roi-header-label">星币收入</span>
            </div>
            <div class="roi-header-stat">
              <span class="roi-header-value">{{ overallROI }}</span>
              <span class="roi-header-label">投入产出比</span>
            </div>
          </div>

          <div class="task-roi-list">
            <div 
              v-for="task in taskROIData" 
              :key="task.type"
              class="task-roi-item"
            >
              <div class="task-roi-header-row">
                <div class="task-roi-icon" :style="{ backgroundColor: task.color + '20' }">
                  <component :is="task.icon" class="icon" :style="{ color: task.color }" />
                </div>
                <div class="task-roi-info">
                  <h4 class="task-roi-name">{{ task.label }}</h4>
                  <div class="task-roi-meta">
                    <span>{{ task.completed }}/{{ task.assigned }} 完成</span>
                    <span>·</span>
                    <span>平均 {{ task.avgTime }} 分钟/个</span>
                  </div>
                </div>
                <div class="task-roi-reward">
                  <Star class="star-icon" />
                  <span>+{{ task.totalReward }}</span>
                </div>
              </div>
              <div class="task-roi-bars">
                <div class="roi-bar-item">
                  <span class="roi-bar-label">完成率</span>
                  <div class="roi-bar-track">
                    <div 
                      class="roi-bar-fill"
                      :style="{ width: `${task.completionRate}%`, backgroundColor: task.color }"
                    ></div>
                  </div>
                  <span class="roi-bar-value">{{ task.completionRate }}%</span>
                </div>
                <div class="roi-bar-item">
                  <span class="roi-bar-label">ROI指数</span>
                  <div class="roi-bar-track">
                    <div 
                      class="roi-bar-fill roi"
                      :style="{ width: `${Math.min(task.roi, 100)}%` }"
                    ></div>
                  </div>
                  <span class="roi-bar-value">{{ task.roi }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-module glass-card">
          <div class="module-header">
            <div class="module-title-row">
              <div class="module-icon-wrapper achievement">
                <Activity class="module-icon" />
              </div>
              <div>
                <h3 class="module-title">成就完成趋势</h3>
                <p class="module-subtitle">近6个月解锁轨迹 · 完成率 {{ achievementCompletionRate }}%</p>
              </div>
            </div>
            <div class="module-legend-mini">
              <div class="legend-item-mini">
                <span class="legend-dot unlocked"></span>
                <span>当月解锁</span>
              </div>
              <div class="legend-item-mini">
                <span class="legend-dot cumulative"></span>
                <span>累计数量</span>
              </div>
            </div>
          </div>

          <div class="achievement-trend-chart">
            <div class="chart-grid-lines">
              <div v-for="i in 4" :key="i" class="grid-line-h">
                <span class="grid-label">{{ Math.round(maxAchievementCount * (4 - i + 1) / 4) }}</span>
              </div>
            </div>
            <div class="chart-bars-area">
              <div 
                v-for="(month, index) in achievementTrendData" 
                :key="`${month.year}-${month.month}`"
                class="chart-column"
              >
                <div class="bars-stack">
                  <div 
                    class="chart-bar cumulative"
                    :style="{ height: `${(month.cumulative / maxAchievementCount) * 100}%` }"
                  >
                    <span class="bar-tooltip">累计 {{ month.cumulative }}</span>
                  </div>
                  <div 
                    class="chart-bar unlocked"
                    :style="{ height: `${(month.unlocked / maxAchievementCount) * 100}%` }"
                  >
                    <span class="bar-tooltip">解锁 {{ month.unlocked }}</span>
                  </div>
                </div>
                <div 
                  v-if="showKeyNodes && keyNodes.filter(n => n.monthIndex === index).length > 0"
                  class="key-node-area"
                >
                  <div 
                    v-for="node in keyNodes.filter(n => n.monthIndex === index)" 
                    :key="node.id"
                    class="key-node-marker"
                    :style="{ borderColor: getNodeColor(node.type), color: getNodeColor(node.type) }"
                    :title="node.label"
                  >
                    <component :is="getNodeIcon(node.type)" class="node-icon" />
                    <span class="node-label">{{ node.label }}</span>
                  </div>
                </div>
                <span class="chart-x-label">{{ month.label }}</span>
              </div>
            </div>
          </div>

          <div v-if="showKeyNodes && keyNodes.length > 0" class="key-nodes-legend">
            <div 
              v-for="node in keyNodes" 
              :key="node.id"
              class="key-node-legend-item"
            >
              <div 
                class="legend-node-icon"
                :style="{ backgroundColor: getNodeColor(node.type) + '20', color: getNodeColor(node.type) }"
              >
                <component :is="getNodeIcon(node.type)" class="icon" />
              </div>
              <div class="legend-node-info">
                <span class="legend-node-label">{{ node.label }}</span>
                <span class="legend-node-time">{{ achievementTrendData[node.monthIndex]?.month }}月</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReminderPanel" class="reminder-panel" @click.self="showReminderPanel = false">
      <div class="reminder-content glass-card">
        <div class="reminder-header">
          <h3 class="reminder-title">
            <Bell class="title-icon" />
            任务提醒
          </h3>
          <button class="close-btn" @click="showReminderPanel = false">
            <span class="close-text">关闭</span>
          </button>
        </div>
        
        <div class="reminder-list">
          <div v-if="reminders.length === 0" class="empty-reminders">
            <CheckCircle class="empty-icon" />
            <p>太棒了！暂无待办提醒</p>
          </div>
          
          <div 
            v-for="(reminder, index) in reminders" 
            :key="index"
            class="reminder-item"
            :class="`priority-${reminder.priority}`"
          >
            <div class="reminder-icon-wrapper">
              <Bell class="reminder-icon" />
            </div>
            <div class="reminder-text">
              <h4 class="reminder-item-title">{{ reminder.title }}</h4>
              <p class="reminder-item-message">{{ reminder.message }}</p>
            </div>
          </div>
        </div>
      </div>
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

.reminder-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
  
  &.has-reminder {
    animation: pulse-reminder 2s infinite;
  }
}

@keyframes pulse-reminder {
  0%, 100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(236, 72, 153, 0); }
}

.reminder-icon {
  width: 20px;
  height: 20px;
}

.reminder-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-error);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-text);
  }
  
  &.active {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    color: var(--color-bg-dark);
    box-shadow: var(--shadow-glow);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  color: var(--color-text-muted);
}

.task-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
}

.task-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
  
  &.active {
    background: rgba(232, 180, 217, 0.2);
    border-color: var(--color-secondary);
    color: var(--color-secondary);
  }
  
  .tab-icon {
    width: 16px;
    height: 16px;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  color: var(--color-text);
}

.title-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.refresh-text {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateX(4px);
  }
  
  &.completed {
    border-color: rgba(74, 222, 128, 0.3);
  }
}

.task-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 24px;
    height: 24px;
  }
  
  &.task-icon-daily {
    background: rgba(232, 180, 217, 0.15);
    .icon { color: var(--color-secondary); }
  }
  
  &.task-icon-weekly {
    background: rgba(163, 196, 243, 0.15);
    .icon { color: var(--color-accent); }
  }
  
  &.task-icon-once {
    background: rgba(251, 191, 36, 0.15);
    .icon { color: var(--color-gold); }
  }
  
  &.task-icon-chain {
    background: rgba(236, 72, 153, 0.15);
    .icon { color: var(--color-primary); }
  }
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.task-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.task-progress {
  max-width: 300px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
  
  &.weekly {
    background: linear-gradient(90deg, var(--color-accent), #60a5fa);
  }
  
  &.once {
    background: linear-gradient(90deg, var(--color-gold), #f59e0b);
  }
  
  &.chain {
    background: linear-gradient(90deg, var(--color-primary), #f472b6);
  }
}

.task-reward {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.reward-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-gold);
  display: flex;
  align-items: center;
  gap: 4px;
}

.reward-icon {
  width: 16px;
  height: 16px;
  color: var(--color-gold);
}

.claim-btn {
  padding: 8px 20px;
  font-size: 0.85rem;
  
  &.pulse {
    animation: pulse-btn 2s infinite;
  }
}

@keyframes pulse-btn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 180, 217, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(232, 180, 217, 0); }
}

.claimed-icon {
  width: 28px;
  height: 28px;
  color: var(--color-success);
}

.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  
  .empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    margin-bottom: 12px;
  }
  
  p {
    font-size: 0.9rem;
  }
}

.chain-group {
  margin-bottom: 28px;
}

.chain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chain-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  color: var(--color-text);
}

.chain-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.chain-progress {
  font-size: 0.9rem;
  color: var(--color-secondary);
  font-weight: 500;
}

.chain-tasks {
  position: relative;
}

.chain-task-item {
  position: relative;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.locked {
    opacity: 0.5;
  }
  
  &.current .chain-task-card {
    border-color: rgba(236, 72, 153, 0.4);
  }
}

.chain-connector {
  position: absolute;
  left: 32px;
  top: -6px;
  width: 2px;
  height: 18px;
  background: linear-gradient(to bottom, rgba(232, 180, 217, 0.3), rgba(232, 180, 217, 0.1));
  z-index: 1;
}

.chain-task-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  transition: all var(--transition-normal);
}

.chain-task-icon {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(236, 72, 153, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 20px;
    height: 20px;
    color: var(--color-primary);
  }
  
  .lock {
    color: var(--color-text-muted);
  }
  
  &.locked {
    background: rgba(255, 255, 255, 0.05);
  }
}

.chain-order {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-bg-card);
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chain-task-content {
  flex: 1;
  min-width: 0;
}

.chain-task-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.chain-task-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

.chain-task-progress {
  max-width: 250px;
}

.locked-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  
  .lock-icon {
    width: 14px;
    height: 14px;
  }
}

.chain-task-reward {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
}

.reset-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-gold);
  font-size: 0.85rem;
  
  .reset-icon {
    width: 18px;
    height: 18px;
  }
}

.achievements-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 24px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  color: var(--color-secondary);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.achievement-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  transition: all var(--transition-normal);
  opacity: 0.6;
  
  &.unlocked {
    opacity: 1;
    border-color: rgba(232, 180, 217, 0.3);
    
    .achievement-icon {
      background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    }
  }
  
  &:hover {
    transform: translateY(-4px);
  }
}

.achievement-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.glow {
    animation: glow 2s ease-in-out infinite;
  }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 10px rgba(232, 180, 217, 0.3); }
  50% { box-shadow: 0 0 25px rgba(232, 180, 217, 0.6); }
}

.icon-emoji {
  font-size: 1.8rem;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.achievement-condition {
  font-size: 0.8rem;
  color: var(--color-secondary);
  margin-bottom: 12px;
}

.achievement-progress {
  margin-bottom: 8px;
}

.unlock-date {
  font-size: 0.75rem;
  color: var(--color-success);
}

.achievement-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.achievement-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
  
  &.active {
    background: rgba(236, 72, 153, 0.2);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  
  .tab-icon {
    width: 16px;
    height: 16px;
  }
}

.tab-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--color-error);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.combo-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.combo-intro {
  padding: 20px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(99, 102, 241, 0.1));
  border: 1px solid rgba(236, 72, 153, 0.2);
}

.combo-intro-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.combo-intro-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  padding: 10px;
  flex-shrink: 0;
}

.combo-intro-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.combo-intro-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.combo-achievements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.combo-achievement-card {
  padding: 0;
  overflow: hidden;
  transition: all var(--transition-normal);
  border: 1px solid rgba(255, 255, 255, 0.08);
  
  &.unlocked {
    border-color: rgba(232, 180, 217, 0.3);
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.05), rgba(163, 196, 243, 0.05));
  }
  
  &.expanded {
    .combo-expand-icon {
      transform: rotate(90deg);
    }
  }
}

.combo-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: background var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.combo-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.glow {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    animation: glow 2s ease-in-out infinite;
  }
}

.combo-icon-emoji {
  font-size: 2rem;
}

.combo-checkmark {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .check-icon {
    width: 16px;
    height: 16px;
    color: white;
  }
}

.combo-info {
  flex: 1;
  min-width: 0;
}

.combo-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.combo-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.combo-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: rgba(236, 72, 153, 0.15);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
  
  .badge-icon {
    width: 12px;
    height: 12px;
  }
}

.combo-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.combo-overall-progress {
  max-width: 400px;
}

.combo-progress-bg {
  height: 8px;
}

.combo-progress {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent), var(--color-secondary));
}

.combo-expand-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  transition: transform var(--transition-normal);
  flex-shrink: 0;
}

.combo-details {
  padding: 0 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.combo-sub-conditions {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-condition-item {
  padding: 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-fast);
  
  &.completed {
    background: rgba(74, 222, 128, 0.05);
    border-color: rgba(74, 222, 128, 0.2);
  }
}

.sub-condition-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sub-condition-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 20px;
    height: 20px;
    color: var(--color-text-muted);
  }
  
  &.completed {
    background: rgba(74, 222, 128, 0.15);
    
    .icon {
      color: var(--color-success);
    }
  }
}

.sub-condition-info {
  flex: 1;
  min-width: 0;
}

.sub-condition-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.sub-condition-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.sub-check-icon {
  width: 18px;
  height: 18px;
  color: var(--color-success);
}

.sub-condition-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.tracker-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: rgba(232, 180, 217, 0.1);
  border: 1px solid rgba(232, 180, 217, 0.2);
  color: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  
  &:hover {
    background: rgba(232, 180, 217, 0.2);
    transform: translateX(2px);
  }
  
  .tracker-icon {
    width: 14px;
    height: 14px;
  }
}

.sub-condition-progress {
  margin-bottom: 10px;
}

.sub-progress {
  &.completed {
    background: linear-gradient(90deg, var(--color-success), #34d399);
  }
}

.sub-condition-tips {
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.tip-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  
  .tip-icon {
    width: 16px;
    height: 16px;
    color: var(--color-secondary);
    flex-shrink: 0;
  }
}

.combo-reward-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.2);
  
  .reward-info-icon {
    width: 20px;
    height: 20px;
    color: var(--color-gold);
    flex-shrink: 0;
  }
  
  span {
    font-size: 0.85rem;
    color: var(--color-gold);
  }
}

.achievement-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mini-combo-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(236, 72, 153, 0.15);
  color: var(--color-primary);
  font-size: 0.7rem;
  font-weight: 500;
}

.achievement-card.combo-card {
  border: 1px solid rgba(236, 72, 153, 0.15);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.03), rgba(99, 102, 241, 0.03));
  
  &.unlocked {
    border-color: rgba(232, 180, 217, 0.3);
  }
}

.achievement-icon {
  position: relative;
}

.combo-tag {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .combo-tag-icon {
    width: 14px;
    height: 14px;
    color: white;
  }
}

.combo-mini-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.mini-progress-dots {
  display: flex;
  gap: 4px;
}

.mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all var(--transition-fast);
  
  &.done {
    background: var(--color-success);
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
  }
}

.mini-progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.reminder-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 380px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.reminder-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.reminder-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  color: var(--color-text);
  margin: 0;
  
  .title-icon {
    width: 20px;
    height: 20px;
    color: var(--color-secondary);
  }
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.reminder-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.empty-reminders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  
  .empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    margin-bottom: 12px;
    color: var(--color-success);
  }
  
  p {
    font-size: 0.9rem;
  }
}

.reminder-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-secondary);
  
  &.priority-high {
    border-left-color: var(--color-error);
    background: rgba(236, 72, 153, 0.1);
  }
  
  &.priority-normal {
    border-left-color: var(--color-secondary);
  }
  
  &.priority-low {
    border-left-color: var(--color-accent);
  }
}

.reminder-icon-wrapper {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: rgba(232, 180, 217, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .reminder-icon {
    width: 18px;
    height: 18px;
    color: var(--color-secondary);
  }
}

.reminder-text {
  flex: 1;
  min-width: 0;
}

.reminder-item-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.reminder-item-message {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .tabs {
    width: 100%;
  }
  
  .tab-btn {
    flex: 1;
    justify-content: center;
    padding: 10px 16px;
  }
  
  .task-card {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .task-reward {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .achievements-stats {
    flex-direction: column;
    gap: 20px;
  }
  
  .stat-divider {
    width: 60%;
    height: 1px;
  }
  
  .achievements-grid {
    grid-template-columns: 1fr;
  }
  
  .chain-task-card {
    flex-wrap: wrap;
  }
  
  .chain-task-reward {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .achievement-tabs {
    overflow-x: auto;
    padding-bottom: 4px;
  }
  
  .achievement-tab-btn {
    white-space: nowrap;
  }
  
  .combo-main {
    flex-wrap: wrap;
  }
  
  .combo-icon-wrapper {
    width: 52px;
    height: 52px;
  }
  
  .combo-icon-emoji {
    font-size: 1.6rem;
  }
  
  .sub-condition-header {
    flex-wrap: wrap;
  }
  
  .tracker-btn {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
  }
  
  .reminder-panel {
    max-width: 100%;
  }

  .stats-toolbar {
    flex-direction: column;
    gap: 12px;
  }

  .month-selector {
    width: 100%;
    justify-content: center;
  }

  .stats-summary-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .mood-bars-row {
    flex-direction: column;
    gap: 8px;
  }

  .room-progress-grid {
    grid-template-columns: 1fr;
  }

  .task-roi-header {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .statistics-section {
    padding-top: 8px;
  }
}

.statistics-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  gap: 16px;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
  
  .nav-icon {
    width: 18px;
    height: 18px;
  }
}

.month-picker-wrapper {
  position: relative;
}

.month-display-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25));
  }
  
  .month-icon {
    width: 18px;
    height: 18px;
    color: var(--color-secondary);
  }
  
  .dropdown-icon {
    width: 16px;
    height: 16px;
    color: var(--color-text-muted);
    transition: transform var(--transition-fast);
    
    &.rotated {
      transform: rotate(90deg);
    }
  }
}

.month-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 100;
  padding: 8px;
  max-height: 280px;
  overflow-y: auto;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.month-option {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
    color: var(--color-secondary);
    font-weight: 500;
  }
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
  
  &.active {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: var(--color-gold);
  }
  
  .toggle-icon {
    width: 16px;
    height: 16px;
  }
}

.stats-summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
  }
}

.summary-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.mood {
    background: rgba(236, 72, 153, 0.15);
    .summary-icon { color: var(--color-primary); }
  }
  
  &.room {
    background: rgba(59, 130, 246, 0.15);
    .summary-icon { color: var(--color-accent); }
  }
  
  &.task {
    background: rgba(34, 197, 94, 0.15);
    .summary-icon { color: #22c55e; }
  }
  
  &.achievement {
    background: rgba(251, 191, 36, 0.15);
    .summary-icon { color: var(--color-gold); }
  }
  
  .summary-icon {
    width: 22px;
    height: 22px;
  }
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  line-height: 1;
}

.summary-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.stats-module {
  padding: 24px;
  transition: all var(--transition-normal);
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.module-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.module-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.mood {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(251, 191, 36, 0.2));
    .module-icon { color: var(--color-primary); }
  }
  
  &.room {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2));
    .module-icon { color: var(--color-accent); }
  }
  
  &.task {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
    .module-icon { color: #22c55e; }
  }
  
  &.achievement {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(249, 115, 22, 0.2));
    .module-icon { color: var(--color-gold); }
  }
  
  .module-icon {
    width: 24px;
    height: 24px;
  }
}

.module-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
  margin: 0 0 4px 0;
}

.module-subtitle {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin: 0;
}

.module-legend-mini {
  display: flex;
  gap: 16px;
}

.legend-item-mini {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  
  &.current {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  }
  
  &.compare {
    background: rgba(156, 163, 175, 0.5);
  }
  
  &.unlocked {
    background: linear-gradient(to top, var(--color-secondary), var(--color-accent));
  }
  
  &.cumulative {
    background: rgba(139, 92, 246, 0.3);
    border: 1px solid var(--color-secondary);
  }
}

.mood-comparison-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mood-compare-item {
  padding: 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.mood-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.mood-emoji {
  font-size: 1.5rem;
}

.mood-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.mood-diff {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
  
  &.positive {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
  }
  
  &.negative {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }
  
  &:not(.positive):not(.negative) {
    background: rgba(156, 163, 175, 0.12);
    color: #9ca3af;
  }
  
  .diff-icon {
    width: 14px;
    height: 14px;
  }
}

.mood-bars-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mood-bar-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  &.compare {
    opacity: 0.8;
  }
}

.bar-track {
  height: 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
  
  &.compare {
    opacity: 0.5;
  }
}

.bar-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.room-progress-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.room-progress-card {
  padding: 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.55;
  transition: all var(--transition-normal);
  
  &.unlocked {
    opacity: 1;
    
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
    }
  }
}

.room-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.room-icon-box {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.room-icon {
  font-size: 1.5rem;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 3px 0;
}

.room-chapter-info {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin: 0;
}

.room-lock-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
}

.efficiency-tag {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.room-progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.room-progress-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.room-progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}

.room-progress-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 40px;
  text-align: right;
  font-family: var(--font-display);
}

.room-efficiency-stats {
  display: flex;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.efficiency-stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  
  .stat-mini-icon {
    width: 14px;
    height: 14px;
    color: var(--color-text-muted);
  }
}

.task-roi-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.roi-header-stat {
  text-align: center;
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  
  &.highlight {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(249, 115, 22, 0.1));
    border: 1px solid rgba(251, 191, 36, 0.2);
    
    .roi-header-value {
      background: linear-gradient(135deg, #fbbf24, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

.roi-header-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  line-height: 1;
  margin-bottom: 4px;
}

.roi-header-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.task-roi-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-roi-item {
  padding: 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all var(--transition-normal);
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.task-roi-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.task-roi-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 20px;
    height: 20px;
  }
}

.task-roi-info {
  flex: 1;
  min-width: 0;
}

.task-roi-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 3px 0;
}

.task-roi-meta {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.task-roi-reward {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: rgba(251, 191, 36, 0.1);
  color: var(--color-gold);
  font-size: 0.9rem;
  font-weight: 600;
  flex-shrink: 0;
  
  .star-icon {
    width: 16px;
    height: 16px;
  }
}

.task-roi-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.roi-bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.roi-bar-label {
  width: 64px;
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.roi-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.roi-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
  
  &.roi {
    background: linear-gradient(90deg, #22c55e, #fbbf24);
  }
}

.roi-bar-value {
  width: 48px;
  flex-shrink: 0;
  text-align: right;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
}

.achievement-trend-chart {
  position: relative;
  height: 280px;
  margin-bottom: 20px;
  padding-left: 40px;
}

.chart-grid-lines {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 24px;
  width: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.grid-line-h {
  position: relative;
  height: 0;
  
  &::after {
    content: '';
    position: absolute;
    left: 40px;
    top: 0;
    right: 0;
    width: calc(100vw - 80px);
    max-width: calc(100% - 40px);
    border-top: 1px dashed rgba(255, 255, 255, 0.06);
  }
}

.grid-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: right;
  padding-right: 8px;
  display: block;
  transform: translateY(-50%);
}

.chart-bars-area {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: calc(100% - 24px);
  gap: 8px;
  padding: 0 8px;
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.bars-stack {
  flex: 1;
  width: 100%;
  max-width: 56px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  position: relative;
}

.chart-bar {
  width: 100%;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  position: relative;
  transition: height 0.6s ease;
  min-height: 4px;
  
  &.cumulative {
    background: rgba(139, 92, 246, 0.25);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-bottom: none;
  }
  
  &.unlocked {
    background: linear-gradient(to top, var(--color-secondary), var(--color-accent));
    box-shadow: 0 -2px 10px rgba(139, 92, 246, 0.3);
  }
  
  &:hover .bar-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-8px);
  }
}

.bar-tooltip {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
  pointer-events: none;
  z-index: 10;
}

.key-node-area {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 5;
}

.key-node-marker {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 1px solid;
  font-size: 0.7rem;
  font-weight: 500;
  animation: bounce 2s ease infinite;
  
  .node-icon {
    width: 12px;
    height: 12px;
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.chart-x-label {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.key-nodes-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.key-node-legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

.legend-node-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 16px;
    height: 16px;
  }
}

.legend-node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend-node-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

.legend-node-time {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}
</style>
