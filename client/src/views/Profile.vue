<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useEmotionPrescriptionStore } from '@/stores/emotionPrescription'
import { useAchievementStore } from '@/stores/achievement'
import { 
  User, Calendar, Heart, DoorOpen, Trophy, LogOut, Moon, Sparkles, Target, Zap, Link, Star,
  User as UserIcon, TrendingUp, BarChart3, Award, FileText, PenLine, BookOpen, HeartPulse, ChevronRight,
  TrendingDown, Minus, Activity
} from 'lucide-vue-next'
import MoodCurveChart from '@/components/MoodCurveChart.vue'
import RoomPreference from '@/components/RoomPreference.vue'
import TaskCompletionStats from '@/components/TaskCompletionStats.vue'
import AchievementTimeline from '@/components/AchievementTimeline.vue'
import PeriodSummary from '@/components/PeriodSummary.vue'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const profileStore = useProfileStore()
const roomStore = useRoomStore()
const prescriptionStore = useEmotionPrescriptionStore()
const achievementStore = useAchievementStore()

const isLoading = ref(false)
const showLogoutConfirm = ref(false)
const notesPage = ref(1)
const notesPageSize = 10

const activeMainTab = ref('basic')
const activeGrowthTab = ref('summary')

const mainTabs = [
  { id: 'basic', label: '基本信息', icon: UserIcon },
  { id: 'growth', label: '成长档案', icon: TrendingUp }
]

const growthTabs = [
  { id: 'summary', label: '阶段总结', icon: FileText },
  { id: 'prescription', label: '情绪处方笺', icon: HeartPulse },
  { id: 'mood', label: '情绪曲线', icon: Heart },
  { id: 'rooms', label: '房间偏好', icon: DoorOpen },
  { id: 'tasks', label: '任务完成', icon: Target },
  { id: 'achievements', label: '成就节奏', icon: Award },
  { id: 'notes', label: '札记沉淀', icon: PenLine }
]

const user = computed(() => authStore.user)
const profile = computed(() => authStore.user)
const growthProfile = computed(() => profileStore.growthProfile)
const profileLoading = computed(() => profileStore.isLoading)
const latestPrescription = computed(() => prescriptionStore.latestPrescription)
const latestArchive = computed(() => {
  const archives = prescriptionStore.archives
  return archives && archives.length > 0 ? archives[0] : null
})
const prescriptionLoading = computed(() => prescriptionStore.loading)

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

const scorePercent = computed(() => {
  if (!latestPrescription.value) return 0
  return Math.min(100, (latestPrescription.value.avgMoodScore / 5) * 100)
})

const scoreColor = computed(() => {
  if (!latestPrescription.value) return 'var(--color-text-muted)'
  const score = latestPrescription.value.avgMoodScore
  if (score >= 4) return 'var(--mood-happy)'
  if (score >= 3) return 'var(--mood-calm)'
  if (score >= 2) return 'var(--mood-sad)'
  return 'var(--mood-anxious)'
})

const joinDate = computed(() => {
  if (!profile.value?.createdAt) return ''
  return new Date(profile.value.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

async function loadProfile() {
  isLoading.value = true
  await authStore.fetchProfile()
  isLoading.value = false
}

async function loadGrowthProfile() {
  await profileStore.fetchGrowthProfile()
}

async function loadPrescriptionData() {
  try {
    await Promise.all([
      prescriptionStore.fetchLatest('weekly'),
      prescriptionStore.fetchArchives(null, 3)
    ])
    
    if (latestPrescription.value?.id && !latestPrescription.value.isViewed) {
      const viewResult = await prescriptionStore.viewPrescription(latestPrescription.value.id)
      if (viewResult.success && viewResult.data?.taskUpdates?.length > 0) {
        viewResult.data.taskUpdates.forEach(task => {
          notificationStore.success(`任务完成：${task.title} +${task.reward}星币`)
        })
        achievementStore.fetchTasks()
      }
    }
  } catch (error) {
    console.error('加载处方数据失败:', error)
  }
}

function switchMainTab(tabId) {
  activeMainTab.value = tabId
  if (tabId === 'growth' && !growthProfile.value) {
    loadGrowthProfile()
  }
}

function switchGrowthTab(tabId) {
  activeGrowthTab.value = tabId
  if (tabId === 'notes') {
    loadMyNotes()
  }
  if (tabId === 'prescription') {
    loadPrescriptionData()
  }
}

async function loadMyNotes() {
  await roomStore.fetchMyNotes(notesPage.value, notesPageSize.value)
}

function goToRoom(roomId) {
  router.push(`/rooms/${roomId}`)
}

function formatNoteDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function confirmLogout() {
  showLogoutConfirm.value = true
}

function cancelLogout() {
  showLogoutConfirm.value = false
}

async function handleLogout() {
  authStore.logout()
  profileStore.clearGrowthProfile()
  showLogoutConfirm.value = false
  notificationStore.success('👋 期待与你在梦境中再次相遇', '已退出登录')
  setTimeout(() => {
    router.push('/login')
  }, 1500)
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>个人中心</h1>
        <p class="page-subtitle">探索你的梦境旅程</p>
      </div>
    </div>

    <div class="tabs-container glass-card">
      <div class="tabs-nav">
        <button 
          v-for="tab in mainTabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ 'active': activeMainTab === tab.id }"
          @click="switchMainTab(tab.id)"
        >
          <component :is="tab.icon" class="tab-icon" />
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading && activeMainTab === 'basic'" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="activeMainTab === 'basic'">
      <div class="profile-header glass-card">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar-glow"></div>
            <div class="avatar">
              <Moon class="avatar-icon" />
            </div>
          </div>
          <div class="user-info">
            <h2 class="username">{{ profile?.username || '梦境旅人' }}</h2>
            <p class="user-email">{{ profile?.email }}</p>
            <p class="join-date">
              <Calendar class="date-icon" />
              加入于 {{ joinDate }}
            </p>
          </div>
        </div>

        <div class="dream-badge">
          <Sparkles class="badge-icon" />
          <span class="badge-text">梦境旅者</span>
        </div>
      </div>

      <div class="stats-section">
        <h3 class="section-title">我的旅程</h3>
        <div class="stats-grid">
          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper mood">
              <Heart class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.checkInDays || 0 }}</span>
              <span class="stat-label">心情记录天数</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper total">
              <Calendar class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.totalMoods || 0 }}</span>
              <span class="stat-label">心情记录总数</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper room">
              <DoorOpen class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.unlockedRooms || 0 }}</span>
              <span class="stat-label">已解锁房间</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper achievement">
              <Trophy class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.unlockedAchievements || 0 }}</span>
              <span class="stat-label">已获得成就</span>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3 class="section-title">任务统计</h3>
        <div class="stats-grid">
          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper daily-task">
              <Target class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.taskStats?.dailyCompleted || 0 }}</span>
              <span class="stat-label">每日任务完成</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper weekly-task">
              <Zap class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.taskStats?.weeklyCompleted || 0 }}</span>
              <span class="stat-label">周任务完成</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper chain-task">
              <Link class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.taskStats?.chainCompleted || 0 }}</span>
              <span class="stat-label">连锁任务完成</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrapper coin">
              <Star class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ profile?.taskStats?.totalClaimed || 0 }}</span>
              <span class="stat-label">累计星币</span>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <h3 class="section-title">账户操作</h3>
        <div class="actions-list">
          <button class="action-btn glass-card logout-btn" @click="confirmLogout">
            <div class="action-icon-wrapper">
              <LogOut class="action-icon" />
            </div>
            <div class="action-content">
              <span class="action-title">退出登录</span>
              <span class="action-desc">安全退出当前账户</span>
            </div>
          </button>
        </div>
      </div>

      <div class="about-section glass-card">
        <div class="about-header">
          <Moon class="about-icon" />
          <h3>关于梦境旅馆</h3>
        </div>
        <p class="about-text">
          梦境旅馆是一个温暖的情感陪伴空间。在这里，你可以记录每日心情，
          随着记录天数的增加，逐步解锁六个神秘房间的奇幻故事。
          每一个房间都承载着独特的情感与记忆，等待你去探索。
        </p>
        <p class="about-version">Version 1.0.0</p>
      </div>
    </div>

    <div v-else-if="activeMainTab === 'growth'">
      <div v-if="profileLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在生成成长档案...</p>
      </div>

      <div v-else>
        <div class="growth-tabs glass-card">
          <div class="growth-tabs-nav">
            <button 
              v-for="tab in growthTabs" 
              :key="tab.id"
              class="growth-tab-btn"
              :class="{ 'active': activeGrowthTab === tab.id }"
              @click="switchGrowthTab(tab.id)"
            >
              <component :is="tab.icon" class="growth-tab-icon" />
              <span class="growth-tab-label">{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <div class="growth-content">
          <Transition name="fade" mode="out-in">
            <div v-if="activeGrowthTab === 'prescription'" class="prescription-section" :key="'prescription'">
              <div v-if="prescriptionLoading" class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">正在生成情绪处方笺...</p>
              </div>
              
              <div v-else-if="latestPrescription">
                <div class="prescription-summary glass-card">
                  <div class="summary-header">
                    <div class="summary-score">
                      <svg class="score-ring" width="120" height="120" viewBox="0 0 120 120">
                        <circle class="score-ring-bg" cx="60" cy="60" r="50" fill="none" stroke="var(--color-border)" stroke-width="10"/>
                        <circle 
                          class="score-ring-progress" 
                          cx="60" cy="60" r="50" 
                          fill="none" 
                          :stroke="scoreColor" 
                          stroke-width="10"
                          stroke-linecap="round"
                          :stroke-dasharray="314"
                          :stroke-dashoffset="314 - (314 * scorePercent / 100)"
                          transform="rotate(-90 60 60)"
                        />
                        <text class="score-text" x="60" y="58" text-anchor="middle" :fill="scoreColor">{{ latestPrescription.avgMoodScore?.toFixed(1) || '0.0' }}</text>
                        <text class="score-label" x="60" y="78" text-anchor="middle" fill="var(--color-text-muted)">情绪指数</text>
                      </svg>
                    </div>
                    
                    <div class="summary-info">
                      <div class="summary-period">
                        <Calendar class="icon" />
                        <span>{{ latestPrescription.startDate }} ~ {{ latestPrescription.endDate }}</span>
                      </div>
                      <div class="summary-stats">
                        <div class="summary-stat">
                          <div class="stat-icon">
                            <component :is="trendLabels[latestPrescription.moodTrend]?.icon || Minus" />
                          </div>
                          <div class="stat-content">
                            <span class="stat-value" :style="{ color: trendLabels[latestPrescription.moodTrend]?.color }">{{ trendLabels[latestPrescription.moodTrend]?.label || '稳定' }}</span>
                            <span class="stat-label">情绪趋势</span>
                          </div>
                        </div>
                        <div class="summary-stat">
                          <div class="stat-icon dominant">
                            <span class="mood-emoji">{{ moodEmojis[latestPrescription.dominantMood] || '😌' }}</span>
                          </div>
                          <div class="stat-content">
                            <span class="stat-value" :style="{ color: moodColors[latestPrescription.dominantMood] }">{{ moodLabels[latestPrescription.dominantMood] || '平静' }}</span>
                            <span class="stat-label">主导情绪</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div v-if="latestPrescription.highlights?.length > 0" class="highlights-section glass-card">
                  <h3 class="section-title">
                    <Sparkles class="icon" />
                    本周期亮点
                  </h3>
                  <div class="highlights-list">
                    <div v-for="(highlight, index) in latestPrescription.highlights.slice(0, 3)" :key="index" class="highlight-item">
                      <span class="highlight-icon">{{ highlight.icon || '✨' }}</span>
                      <span class="highlight-text">{{ highlight.content || highlight.text }}</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="latestPrescription.companionAdvice?.length > 0" class="companion-section glass-card">
                  <h3 class="section-title">
                    <HeartPulse class="icon" />
                    陪伴寄语
                  </h3>
                  <div class="companion-advice">
                    <p v-for="(advice, index) in latestPrescription.companionAdvice.slice(0, 2)" :key="index" class="advice-text">
                      <span v-if="advice.icon" class="advice-icon">{{ advice.icon }}</span>
                      {{ typeof advice === 'string' ? advice : (advice.content || advice.title) }}
                    </p>
                  </div>
                </div>
                
                <div v-if="latestArchive" class="archive-summary glass-card">
                  <h3 class="section-title">
                    <FileText class="icon" />
                    {{ latestArchive.periodLabel }}成长档案
                  </h3>
                  <div class="archive-stats">
                    <div class="archive-stat">
                      <div class="archive-stat-icon">
                        <Calendar class="icon" />
                      </div>
                      <div class="archive-stat-content">
                        <span class="stat-value">{{ latestArchive.totalMoodRecords || 0 }}</span>
                        <span class="stat-label">情绪记录</span>
                      </div>
                    </div>
                    <div class="archive-stat">
                      <div class="archive-stat-icon secondary">
                        <BookOpen class="icon" />
                      </div>
                      <div class="archive-stat-content">
                        <span class="stat-value">{{ latestArchive.totalChaptersRead || 0 }}</span>
                        <span class="stat-label">阅读章节</span>
                      </div>
                    </div>
                    <div class="archive-stat">
                      <div class="archive-stat-icon tertiary">
                        <Trophy class="icon" />
                      </div>
                      <div class="archive-stat-content">
                        <span class="stat-value">{{ latestArchive.totalTasksCompleted || 0 }}</span>
                        <span class="stat-label">完成任务</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="latestArchive.title" class="archive-title">
                    <Star class="icon" />
                    <span>{{ latestArchive.title }}</span>
                  </div>
                </div>
                
                <button class="view-full-btn glass-card" @click="router.push('/prescription')">
                  <span>查看完整处方笺</span>
                  <ChevronRight class="icon" />
                </button>
              </div>
              
              <div v-else class="empty-state glass-card">
                <HeartPulse class="empty-icon" />
                <p class="empty-title">暂无情绪处方笺</p>
                <p class="empty-desc">先去心情日历记录今天的心情吧~</p>
                <button class="empty-action-btn" @click="router.push('/calendar')">
                  记录心情
                </button>
              </div>
            </div>
            
            <template v-else-if="growthProfile">
              <PeriodSummary 
                v-if="activeGrowthTab === 'summary'" 
                :periodSummary="growthProfile.periodSummary" 
                :key="'summary'"
              />
              <MoodCurveChart 
                v-else-if="activeGrowthTab === 'mood'" 
                :moodCurve="growthProfile.moodCurve" 
                :key="'mood'"
              />
              <RoomPreference 
                v-else-if="activeGrowthTab === 'rooms'" 
                :roomPreference="growthProfile.roomPreference" 
                :key="'rooms'"
              />
              <TaskCompletionStats 
                v-else-if="activeGrowthTab === 'tasks'" 
                :taskCompletion="growthProfile.taskCompletion" 
                :key="'tasks'"
              />
              <AchievementTimeline 
                v-else-if="activeGrowthTab === 'achievements'" 
                :achievementRhythm="growthProfile.achievementRhythm" 
                :key="'achievements'"
              />
              <div v-else-if="activeGrowthTab === 'notes'" class="notes-section" :key="'notes'">
                <div class="notes-stats glass-card">
                  <div class="notes-stat-item">
                    <div class="notes-stat-icon">
                      <PenLine class="icon" />
                    </div>
                    <div class="notes-stat-content">
                      <span class="stat-value">{{ growthProfile.chapterNotes?.totalCount || 0 }}</span>
                      <span class="stat-label">札记总数</span>
                    </div>
                  </div>
                  <div class="notes-stat-item">
                    <div class="notes-stat-icon secondary">
                      <BookOpen class="icon" />
                    </div>
                    <div class="notes-stat-content">
                      <span class="stat-value">{{ growthProfile.chapterNotes?.daysWithNotes || 0 }}</span>
                      <span class="stat-label">写作天数</span>
                    </div>
                  </div>
                  <div class="notes-stat-item">
                    <div class="notes-stat-icon tertiary">
                      <FileText class="icon" />
                    </div>
                    <div class="notes-stat-content">
                      <span class="stat-value">{{ growthProfile.chapterNotes?.avgContentLength || 0 }}</span>
                      <span class="stat-label">平均字数</span>
                    </div>
                  </div>
                </div>
                
                <div class="notes-list-section">
                  <h3 class="section-title">我的札记</h3>
                  <div v-if="roomStore.myNotes.length === 0" class="empty-notes glass-card">
                    <PenLine class="empty-icon" />
                    <p class="empty-title">还没有札记</p>
                    <p class="empty-desc">读完故事章节后，写下你的感受吧~</p>
                  </div>
                  <div v-else class="notes-list">
                    <div 
                      v-for="note in roomStore.myNotes" 
                      :key="note.id"
                      class="note-card glass-card"
                      @click="goToRoom(note.roomId)"
                    >
                      <div class="note-card-header">
                        <div class="note-chapter-info">
                          <span class="note-room-name">{{ note.roomName }}</span>
                          <span class="note-chapter-num">第{{ note.chapterNumber }}章</span>
                        </div>
                        <span class="note-date">{{ formatNoteDate(note.createdAt) }}</span>
                      </div>
                      <h4 class="note-card-title">{{ note.storyTitle }}</h4>
                      <p class="note-card-preview">{{ note.content.slice(0, 100) }}{{ note.content.length > 100 ? '...' : '' }}</p>
                      <div v-if="note.moodTags?.length" class="note-card-tags">
                        <span 
                          v-for="tag in note.moodTags" 
                          :key="tag"
                          class="note-card-tag"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            
            <div v-else class="empty-state glass-card" :key="'empty'">
              <Sparkles class="empty-icon" />
              <p class="empty-title">暂无成长数据</p>
              <p class="empty-desc">继续使用应用，记录心情、阅读故事，即可生成专属成长档案</p>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div v-if="showLogoutConfirm" class="modal-overlay" @click.self="cancelLogout">
      <div class="modal-content glass-card">
        <div class="modal-icon">
          <Moon class="icon" />
        </div>
        <h3 class="modal-title">确定要离开吗？</h3>
        <p class="modal-desc">梦境旅馆的大门永远为你敞开，期待你的归来。</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="cancelLogout">再留一会</button>
          <button class="btn-primary" @click="handleLogout">确认离开</button>
        </div>
      </div>
    </div>
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

.tabs-container {
  padding: 8px;
  margin-bottom: 24px;
}

.tabs-nav {
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-secondary);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
    color: var(--color-text);
    box-shadow: 0 2px 10px rgba(139, 92, 246, 0.2);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-label {
  font-family: var(--font-display);
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

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32px;
  margin-bottom: 32px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-wrapper {
  position: relative;
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  border-radius: 50%;
  filter: blur(8px);
  opacity: 0.5;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

.avatar {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 44px;
  height: 44px;
  color: var(--color-bg-dark);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.user-email {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.join-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-top: 4px;
}

.date-icon {
  width: 14px;
  height: 14px;
}

.dream-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(163, 196, 243, 0.2));
  border-radius: var(--radius-full);
  border: 1px solid rgba(232, 180, 217, 0.3);
}

.badge-icon {
  width: 18px;
  height: 18px;
  color: var(--color-secondary);
}

.badge-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-secondary);
}

.stats-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid var(--color-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
  }
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.mood {
    background: rgba(236, 72, 153, 0.15);
    .stat-icon { color: var(--color-primary); }
  }

  &.total {
    background: rgba(232, 180, 217, 0.15);
    .stat-icon { color: var(--color-secondary); }
  }

  &.room {
    background: rgba(163, 196, 243, 0.15);
    .stat-icon { color: var(--color-accent); }
  }

  &.achievement {
    background: rgba(251, 191, 36, 0.15);
    .stat-icon { color: var(--color-gold); }
  }

  &.daily-task {
    background: rgba(34, 197, 94, 0.15);
    .stat-icon { color: #22c55e; }
  }

  &.weekly-task {
    background: rgba(168, 85, 247, 0.15);
    .stat-icon { color: #a855f7; }
  }

  &.chain-task {
    background: rgba(249, 115, 22, 0.15);
    .stat-icon { color: #f97316; }
  }

  &.coin {
    background: rgba(234, 179, 8, 0.15);
    .stat-icon { color: #eab308; }
  }
}

.stat-icon {
  width: 26px;
  height: 26px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.actions-section {
  margin-bottom: 32px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  text-align: left;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateX(4px);
    border-color: rgba(236, 72, 153, 0.3);
  }
}

.action-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(236, 72, 153, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon {
  width: 22px;
  height: 22px;
  color: var(--color-primary);
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.about-section {
  padding: 24px;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.about-icon {
  width: 22px;
  height: 22px;
  color: var(--color-secondary);
}

.about-header h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
}

.about-text {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 12px;
}

.about-version {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-align: right;
}

.growth-tabs {
  padding: 8px;
  margin-bottom: 20px;
}

.growth-tabs-nav {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.growth-tab-btn {
  flex: 1;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-secondary);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2));
    color: var(--color-text);
  }
}

.growth-tab-icon {
  width: 16px;
  height: 16px;
}

.growth-tab-label {
  font-family: var(--font-display);
}

.growth-content {
  min-height: 400px;
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
  margin: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.modal-content {
  max-width: 400px;
  width: 100%;
  padding: 32px;
  text-align: center;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(163, 196, 243, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    width: 32px;
    height: 32px;
    color: var(--color-secondary);
  }
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.modal-desc {
  color: var(--color-text-muted);
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  flex: 1;
  padding: 12px 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.notes-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.notes-stats {
  display: flex;
  gap: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.notes-stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.notes-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(236, 72, 153, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }
  
  &.secondary {
    background: rgba(232, 180, 217, 0.15);
    .icon { color: var(--color-secondary); }
  }
  
  &.tertiary {
    background: rgba(163, 196, 243, 0.15);
    .icon { color: var(--color-accent); }
  }
}

.notes-stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notes-stat-content .stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  line-height: 1;
}

.notes-stat-content .stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.notes-list-section {
  .section-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 16px;
    padding-left: 12px;
    border-left: 3px solid var(--color-secondary);
  }
}

.empty-notes {
  text-align: center;
  padding: 48px 24px;
}

.empty-notes .empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-secondary);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-notes .empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.empty-notes .empty-desc {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.note-card {
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 180, 217, 0.3);
  }
}

.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.note-chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-room-name {
  color: var(--color-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

.note-chapter-num {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.note-date {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.note-card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 10px 0;
}

.note-card-preview {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.note-card-tag {
  padding: 3px 10px;
  background: rgba(232, 180, 217, 0.15);
  color: var(--color-secondary);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}

.prescription-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prescription-summary {
  padding: 24px;
  
  .summary-header {
    display: flex;
    gap: 32px;
    align-items: center;
    
    @media (max-width: 640px) {
      flex-direction: column;
      gap: 20px;
    }
  }
  
  .summary-score {
    flex-shrink: 0;
    
    .score-ring {
      .score-text {
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .score-label {
        font-size: 0.75rem;
      }
    }
  }
  
  .summary-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .summary-period {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    
    .icon {
      width: 16px;
      height: 16px;
    }
  }
  
  .summary-stats {
    display: flex;
    gap: 32px;
    
    @media (max-width: 640px) {
      gap: 20px;
    }
  }
  
  .summary-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      background: rgba(34, 197, 94, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      
      .icon {
        width: 22px;
        height: 22px;
        color: var(--color-success);
      }
      
      &.dominant {
        background: rgba(255, 215, 0, 0.15);
        
        .mood-emoji {
          font-size: 22px;
        }
      }
    }
    
    .stat-content {
      display: flex;
      flex-direction: column;
      
      .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
      }
      
      .stat-label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
    }
  }
}

.highlights-section,
.companion-section,
.archive-summary {
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text);
  
  .icon {
    width: 18px;
    height: 18px;
    color: var(--color-secondary);
  }
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: var(--radius-md);
  
  .highlight-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  
  .highlight-text {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.5;
  }
}

.companion-advice {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.advice-text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-text);
  margin: 0;
  padding-left: 16px;
  border-left: 3px solid var(--color-secondary);
  font-style: italic;
  
  .advice-icon {
    margin-right: 6px;
    font-style: normal;
  }
}

.archive-summary {
  .archive-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;
    
    @media (max-width: 640px) {
      gap: 10px;
    }
  }
  
  .archive-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.03);
    border-radius: var(--radius-md);
    
    @media (max-width: 640px) {
      padding: 12px 8px;
    }
  }
  
  .archive-stat-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    
    .icon {
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }
    
    &.secondary {
      background: rgba(139, 92, 246, 0.1);
      
      .icon {
        color: var(--color-secondary);
      }
    }
    
    &.tertiary {
      background: rgba(245, 158, 11, 0.1);
      
      .icon {
        color: var(--color-warning);
      }
    }
  }
  
  .archive-stat-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  }
  
  .archive-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1));
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    text-align: center;
    
    .icon {
      width: 16px;
      height: 16px;
      color: var(--color-secondary);
      flex-shrink: 0;
    }
  }
}

.view-full-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  .icon {
    width: 18px;
    height: 18px;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(232, 180, 217, 0.35);
  }
}

.prescription-entry {
  display: flex;
  align-items: center;
  gap: 20px;
}

.prescription-entry-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 32px;
    height: 32px;
    color: var(--color-secondary);
  }
}

.prescription-entry-content {
  flex: 1;
  
  h3 {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 6px 0;
  }
  
  p {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
  }
}

.entry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.3);
  }
}

.entry-icon {
  width: 16px;
  height: 16px;
}

.empty-action-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
}

@media (max-width: 768px) {
  .prescription-entry {
    flex-direction: column;
    text-align: center;
  }
  
  .prescription-entry-content {
    h3 {
      font-size: 1.05rem;
    }
  }
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    gap: 20px;
    align-items: center;
    text-align: center;
  }

  .avatar-section {
    flex-direction: column;
  }

  .join-date {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }
  
  .tabs-nav {
    flex-direction: column;
  }
  
  .growth-tabs-nav {
    flex-wrap: wrap;
  }
  
  .growth-tab-btn {
    flex: 1 1 calc(50% - 6px);
    min-width: auto;
  }
  
  .notes-stats {
    flex-direction: column;
    gap: 20px;
  }
  
  .notes-stat-item {
    width: 100%;
  }
}
</style>
