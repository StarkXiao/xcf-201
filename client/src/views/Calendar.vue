<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMoodStore } from '@/stores/mood'
import { useAchievementStore } from '@/stores/achievement'
import { ChevronLeft, ChevronRight, Plus, Flame, BarChart3, Layers, Target, Gift } from 'lucide-vue-next'
import MoodModal from '@/components/MoodModal.vue'
import NotificationToast from '@/components/NotificationToast.vue'

const moodStore = useMoodStore()
const achievementStore = useAchievementStore()

const currentDate = ref(new Date())
const showModal = ref(false)
const selectedDate = ref('')
const existingMood = ref(null)
const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')
const isLoading = ref(false)

const moodColors = {
  happy: 'var(--mood-happy)',
  calm: 'var(--mood-calm)',
  sad: 'var(--mood-sad)',
  anxious: 'var(--mood-anxious)',
  angry: 'var(--mood-angry)'
}

const moodEmojis = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  anxious: '😰',
  angry: '😠'
}

const segmentEmojis = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌙',
  day: '📅'
}

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth() + 1)

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value - 1
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  const startPadding = firstDay.getDay()
  
  for (let i = 0; i < startPadding; i++) {
    days.push({ day: '', isCurrentMonth: false })
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    
    const aggregate = moodStore.getAggregateByDate(dateStr)
    const dayRecords = moodStore.moods.filter(m => m.record_date === dateStr)
    const segments = dayRecords.filter(m => ['morning', 'afternoon', 'evening'].includes(m.time_segment))
    
    const recordedSegments = new Set(segments.map(s => s.time_segment))
    const segmentProgress = recordedSegments.size
    
    const dominantMood = aggregate?.dominantMood || (dayRecords.length > 0 ? dayRecords[0].mood_type : null)
    
    days.push({
      day: i,
      date: dateStr,
      isCurrentMonth: true,
      isToday: isToday(dateStr),
      dominantMood,
      segmentProgress,
      totalSegments: 3,
      aggregate,
      segments: dayRecords
    })
  }
  
  const remaining = 42 - days.length
  for (let i = 0; i < remaining; i++) {
    days.push({ day: '', isCurrentMonth: false })
  }
  
  return days
})

function isToday(dateStr) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dateStr === todayStr
}

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 2, 1)
  loadMoods()
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value, 1)
  loadMoods()
}

async function openModal(day) {
  if (!day.isCurrentMonth) return
  
  selectedDate.value = day.date
  existingMood.value = await moodStore.fetchMoodByDate(day.date)
  existingMood.value = existingMood.value.data
  showModal.value = true
}

async function handleSubmit(moodData) {
  isLoading.value = true
  
  const result = await moodStore.createMood(moodData)
  
  isLoading.value = false
  
  if (result.success) {
    toastType.value = 'success'
    
    const segments = result.data.dayAggregate?.segments || []
    const mainSegments = segments.filter(s => ['morning', 'afternoon', 'evening'].includes(s.time_segment))
    
    if (mainSegments.length >= 3) {
      toastMessage.value = '🎉 完成今日三段心情记录！'
    } else {
      toastMessage.value = `心情记录成功！已记录 ${mainSegments.length}/3 时段`
    }
    
    showToast.value = true
    
    if (result.data.newlyUnlockedRooms?.length > 0) {
      setTimeout(() => {
        toastType.value = 'success'
        toastMessage.value = `🎉 解锁了新房间：${result.data.newlyUnlockedRooms.map(r => r.name).join('、')}！`
        showToast.value = true
      }, 2000)
    }
    
    if (result.data.newlyUnlockedAchievements?.length > 0) {
      setTimeout(() => {
        toastType.value = 'success'
        toastMessage.value = `🏆 获得新成就：${result.data.newlyUnlockedAchievements.map(a => a.name).join('、')}！`
        showToast.value = true
      }, 4000)
    }
    
    if (result.data.newlyCompletedTasks?.length > 0) {
      setTimeout(() => {
        toastType.value = 'success'
        const taskNames = result.data.newlyCompletedTasks.map(t => t.title).join('、')
        toastMessage.value = `🎯 完成任务：${taskNames}！快去领取奖励吧~`
        showToast.value = true
      }, 6000)
    }
    
    achievementStore.fetchTasks()
    achievementStore.fetchTaskStats()
    achievementStore.fetchReminders()
    
    loadMoods()
    
    existingMood.value = await moodStore.fetchMoodByDate(moodData.date)
    existingMood.value = existingMood.value.data
  } else {
    toastType.value = 'error'
    toastMessage.value = result.message
    showToast.value = true
  }
}

async function handleDelete(deleteData) {
  const result = await moodStore.deleteMood(deleteData.date, deleteData.timeSegment)
  
  if (result.success) {
    toastType.value = 'success'
    toastMessage.value = '已删除该时段的心情记录'
    showToast.value = true
    
    loadMoods()
    
    existingMood.value = await moodStore.fetchMoodByDate(deleteData.date)
    existingMood.value = existingMood.value.data
  }
}

async function loadMoods() {
  await moodStore.fetchMoods(currentYear.value, currentMonth.value)
}

const stats = computed(() => moodStore.stats)

onMounted(async () => {
  await moodStore.fetchConfig()
  await loadMoods()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>心情日历</h1>
        <p class="page-subtitle">记录每一天的心情，解锁属于你的故事</p>
      </div>
    </div>
    
    <div class="stats-cards">
      <div class="stat-card glass-card">
        <Flame class="stat-icon flame" />
        <div class="stat-info">
          <span class="stat-value">{{ stats?.streakDays || 0 }}</span>
          <span class="stat-label">连续记录</span>
        </div>
      </div>
      <div class="stat-card glass-card">
        <Layers class="stat-icon layers" />
        <div class="stat-info">
          <span class="stat-value">{{ stats?.multiSegmentStreak || 0 }}</span>
          <span class="stat-label">三段连续</span>
        </div>
      </div>
      <div class="stat-card glass-card">
        <BarChart3 class="stat-icon chart" />
        <div class="stat-info">
          <span class="stat-value">{{ stats?.totalThisMonth || 0 }}</span>
          <span class="stat-label">本月记录</span>
        </div>
      </div>
      <div class="stat-card glass-card">
        <Target class="stat-icon target" />
        <div class="stat-info">
          <span class="stat-value">{{ stats?.multiSegmentDays || 0 }}</span>
          <span class="stat-label">完整天数</span>
        </div>
      </div>
    </div>
    
    <div class="calendar-container glass-card">
      <div class="calendar-header">
        <button class="nav-btn" @click="prevMonth">
          <ChevronLeft class="nav-icon" />
        </button>
        <h2 class="month-title">{{ currentYear }}年 {{ monthNames[currentMonth - 1] }}</h2>
        <button class="nav-btn" @click="nextMonth">
          <ChevronRight class="nav-icon" />
        </button>
      </div>
      
      <div class="weekdays">
        <div 
          v-for="day in weekDays" 
          :key="day" 
          class="weekday"
          :class="{ 'weekend': day === '日' || day === '六' }"
        >
          {{ day }}
        </div>
      </div>
      
      <div class="days-grid">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="day-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'has-mood': day.dominantMood,
            'complete': day.segmentProgress >= 3
          }"
          @click="openModal(day)"
        >
          <span v-if="day.day" class="day-number">{{ day.day }}</span>
          
          <div v-if="day.dominantMood" class="mood-indicator" :style="{ backgroundColor: moodColors[day.dominantMood] }">
            <span class="mood-emoji">{{ moodEmojis[day.dominantMood] }}</span>
          </div>
          
          <div v-if="day.isCurrentMonth && day.segmentProgress > 0" class="segment-progress">
            <div 
              v-for="seg in 3" 
              :key="seg"
              class="segment-dot"
              :class="{ filled: seg <= day.segmentProgress }"
            ></div>
          </div>
          
          <button 
            v-if="day.isToday && !day.dominantMood" 
            class="add-mood-btn"
            @click.stop="openModal(day)"
          >
            <Plus class="add-icon" />
          </button>
          
          <div v-if="day.segmentProgress >= 3" class="complete-badge">
            ✨
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="stats?.moodDistribution" class="mood-distribution glass-card">
      <h3 class="section-title">本月心情分布</h3>
      <div class="distribution-bars">
        <div 
          v-for="(count, type) in stats.moodDistribution" 
          :key="type"
          class="distribution-item"
        >
          <div class="distribution-label">
            <span class="mood-emoji">{{ moodEmojis[type] }}</span>
            <span class="mood-count">{{ count }}</span>
          </div>
          <div class="distribution-bar-bg">
            <div 
              class="distribution-bar"
              :style="{ 
                width: `${(count / (stats.totalThisMonth || 1)) * 100}%`,
                backgroundColor: moodColors[type]
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="stats?.segmentDistribution" class="segment-stats glass-card">
      <h3 class="section-title">时段统计</h3>
      <div class="segment-grid">
        <div 
          v-for="(count, segment) in stats.segmentDistribution" 
          :key="segment"
          class="segment-item"
        >
          <span class="segment-emoji">{{ segmentEmojis[segment] }}</span>
          <span class="segment-label">
            {{ segment === 'morning' ? '早晨' : segment === 'afternoon' ? '下午' : segment === 'evening' ? '晚间' : '全天' }}
          </span>
          <span class="segment-count">{{ count }} 次</span>
        </div>
      </div>
    </div>
    
    <MoodModal
      :show="showModal"
      :date="selectedDate"
      :existing-mood="existingMood"
      @close="showModal = false"
      @submit="handleSubmit"
      @delete="handleDelete"
    />
    
    <NotificationToast
      :show="showToast"
      :type="toastType"
      :message="toastMessage"
      @close="showToast = false"
    />
  </div>
</template>

<style lang="scss" scoped>
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

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  padding: 12px;
  border-radius: var(--radius-lg);
  
  &.flame {
    background: rgba(251, 191, 36, 0.15);
    color: var(--color-warning);
  }
  
  &.chart {
    background: rgba(123, 163, 201, 0.15);
    color: var(--color-accent);
  }
  
  &.layers {
    background: rgba(232, 180, 217, 0.15);
    color: var(--color-secondary);
  }
  
  &.target {
    background: rgba(74, 222, 128, 0.15);
    color: var(--color-success);
  }
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.calendar-container {
  padding: 24px;
  margin-bottom: 24px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
}

.nav-icon {
  width: 20px;
  height: 20px;
}

.month-title {
  font-size: 1.3rem;
  color: var(--color-text);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  padding: 12px 0;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  
  &.weekend {
    color: var(--color-secondary);
  }
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
  
  &:not(.other-month):hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.other-month {
    opacity: 0.3;
    cursor: default;
  }
  
  &.today {
    background: rgba(232, 180, 217, 0.15);
    
    .day-number {
      color: var(--color-secondary);
      font-weight: 700;
    }
  }
  
  &.has-mood {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.complete {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
  }
}

.day-number {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.mood-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mood-emoji {
  font-size: 1rem;
}

.segment-progress {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}

.segment-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all var(--transition-normal);
  
  &.filled {
    background: var(--color-secondary);
    box-shadow: 0 0 6px rgba(232, 180, 217, 0.5);
  }
}

.add-mood-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-secondary);
  color: var(--color-bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s ease-in-out infinite;
  
  &:hover {
    transform: scale(1.1);
  }
}

.add-icon {
  width: 16px;
  height: 16px;
}

.complete-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.8rem;
}

.mood-distribution,
.segment-stats {
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 20px;
  color: var(--color-text);
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.distribution-label {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .mood-emoji {
    font-size: 1.2rem;
  }
  
  .mood-count {
    font-weight: 500;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }
}

.distribution-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.segment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.segment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.segment-emoji {
  font-size: 1.5rem;
}

.segment-label {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.segment-count {
  font-weight: 600;
  color: var(--color-secondary);
  font-family: var(--font-display);
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .calendar-container,
  .mood-distribution,
  .segment-stats {
    padding: 16px;
  }
  
  .month-title {
    font-size: 1.1rem;
  }
  
  .mood-indicator {
    width: 24px;
    height: 24px;
  }
  
  .mood-emoji {
    font-size: 0.85rem;
  }
  
  .segment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
