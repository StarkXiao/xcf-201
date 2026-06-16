<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { 
  User, Calendar, Heart, DoorOpen, Trophy, LogOut, Moon, Sparkles, Target, Zap, Link, Star,
  User as UserIcon, TrendingUp, BarChart3, Award, FileText
} from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'
import MoodCurveChart from '@/components/MoodCurveChart.vue'
import RoomPreference from '@/components/RoomPreference.vue'
import TaskCompletionStats from '@/components/TaskCompletionStats.vue'
import AchievementTimeline from '@/components/AchievementTimeline.vue'
import PeriodSummary from '@/components/PeriodSummary.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const isLoading = ref(false)
const showLogoutConfirm = ref(false)
const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

const activeMainTab = ref('basic')
const activeGrowthTab = ref('summary')

const mainTabs = [
  { id: 'basic', label: '基本信息', icon: UserIcon },
  { id: 'growth', label: '成长档案', icon: TrendingUp }
]

const growthTabs = [
  { id: 'summary', label: '阶段总结', icon: FileText },
  { id: 'mood', label: '情绪曲线', icon: Heart },
  { id: 'rooms', label: '房间偏好', icon: DoorOpen },
  { id: 'tasks', label: '任务完成', icon: Target },
  { id: 'achievements', label: '成就节奏', icon: Award }
]

const user = computed(() => authStore.user)
const profile = computed(() => authStore.user)
const growthProfile = computed(() => profileStore.growthProfile)
const profileLoading = computed(() => profileStore.isLoading)

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

function switchMainTab(tabId) {
  activeMainTab.value = tabId
  if (tabId === 'growth' && !growthProfile.value) {
    loadGrowthProfile()
  }
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
  toastType.value = 'success'
  toastMessage.value = '👋 期待与你在梦境中再次相遇'
  showToast.value = true
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

      <div v-else-if="growthProfile">
        <div class="growth-tabs glass-card">
          <div class="growth-tabs-nav">
            <button 
              v-for="tab in growthTabs" 
              :key="tab.id"
              class="growth-tab-btn"
              :class="{ 'active': activeGrowthTab === tab.id }"
              @click="activeGrowthTab = tab.id"
            >
              <component :is="tab.icon" class="growth-tab-icon" />
              <span class="growth-tab-label">{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <div class="growth-content">
          <Transition name="fade" mode="out-in">
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
          </Transition>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <Sparkles class="empty-icon" />
        <p class="empty-title">暂无成长数据</p>
        <p class="empty-desc">继续使用应用，记录心情、阅读故事，即可生成专属成长档案</p>
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
}
</style>
