<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useMoodStore } from '@/stores/mood'
import { useAchievementStore } from '@/stores/achievement'
import { useCrisisCenterStore } from '@/stores/crisisCenter'
import { useMemoryLetterStore } from '@/stores/memoryLetter'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { Calendar, DoorOpen, Trophy, User, LogOut, Moon, HeartPulse, Archive, MessageCircle, Sparkles, Scroll, ShieldAlert, Mail } from 'lucide-vue-next'
import NotificationToast from './NotificationToast.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const moodStore = useMoodStore()
const achievementStore = useAchievementStore()
const crisisStore = useCrisisCenterStore()
const memoryLetterStore = useMemoryLetterStore()

const navItems = [
  { path: '/calendar', name: '心情日历', icon: Calendar },
  { path: '/prescription', name: '情绪处方笺', icon: HeartPulse },
  { path: '/crisis-center', name: '危机预警', icon: ShieldAlert },
  { path: '/rooms', name: '剧情房间', icon: DoorOpen },
  { path: '/companions', name: '同行旅伴', icon: Sparkles },
  { path: '/chat', name: '陪伴对话', icon: MessageCircle },
  { path: '/dream-collection', name: '梦境收藏馆', icon: Archive },
  { path: '/wish-commission', name: '心愿委托', icon: Scroll },
  { path: '/memory-letter', name: '回忆邮局', icon: Mail },
  { path: '/achievements', name: '任务成就', icon: Trophy },
  { path: '/profile', name: '个人中心', icon: User }
]

const isActive = (path) => route.path === path || route.path.startsWith(path + '/')

const mobileNavItems = [
  { path: '/calendar', name: '日历', icon: Calendar },
  { path: '/companions', name: '旅伴', icon: Sparkles },
  { path: '/wish-commission', name: '委托', icon: Scroll },
  { path: '/dream-collection', name: '收藏', icon: Archive },
  { path: '/profile', name: '我的', icon: User }
]

const handleLogout = () => {
  authStore.logout()
  notificationStore.clearAll()
  router.push('/login')
}

const showNav = computed(() => {
  return !['/login', '/register'].includes(route.path)
})

async function checkStreakAndReminders() {
  if (!authStore.isAuthenticated) return

  try {
    const streakResult = await moodStore.fetchStreakStatus()
    if (streakResult.success && streakResult.data) {
      if (streakResult.data.notificationEvents && streakResult.data.notificationEvents.length > 0) {
        notificationStore.push(streakResult.data.notificationEvents)
      }
    }
  } catch (e) {
    // ignore error
  }

  try {
    const remindersResult = await achievementStore.fetchReminders()
    if (remindersResult.success && remindersResult.data) {
      remindersResult.data.forEach(reminder => {
        if (reminder.event) {
          notificationStore.addNotification(reminder.event)
        }
      })
    }
  } catch (e) {
    // ignore error
  }

  try {
    const crisisResult = await crisisStore.fetchAnalysis()
    if (crisisResult.success && crisisResult.data) {
      const { overallLevel, signals } = crisisResult.data
      if (overallLevel === 'firm' || overallLevel === 'crisis') {
        notificationStore.addNotification({
          type: 'crisis_alert',
          category: 'warning',
          icon: 'shield-alert',
          title: '情绪危机预警',
          message: overallLevel === 'crisis'
            ? `检测到${signals.length}个紧急预警信号，请关注情绪状态`
            : `检测到${signals.length}个需关注信号，建议查看危机预警中心`,
          priority: overallLevel === 'crisis' ? 'high' : 'normal',
          duration: 6000,
          data: { level: overallLevel, signalCount: signals.length }
        })
      }
    }
  } catch (e) {
    // ignore error
  }

  try {
    const letterResult = await memoryLetterStore.checkDeliver()
    if (letterResult.success && letterResult.data) {
      if (letterResult.data.notificationEvents && letterResult.data.notificationEvents.length > 0) {
        notificationStore.push(letterResult.data.notificationEvents)
      }
    }
  } catch (e) {
    // ignore error
  }

  try {
    await notificationStore.fetchUnread()
  } catch (e) {
    // ignore error
  }
}

let pollTimer = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (authStore.isAuthenticated && document.visibilityState === 'visible') {
      notificationStore.fetchUnreadCount().catch(() => {})
    }
  }, 60 * 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleOnline() {
  if (authStore.isAuthenticated) {
    checkStreakAndReminders()
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated) {
    checkStreakAndReminders()
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    checkStreakAndReminders()
    startPolling()
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    setTimeout(checkStreakAndReminders, 500)
    startPolling()
  } else {
    stopPolling()
  }
})

watch(() => route.path, (newPath, oldPath) => {
  if (authStore.isAuthenticated && newPath !== oldPath && !['/login', '/register'].includes(newPath)) {
    setTimeout(() => {
      memoryLetterStore.checkDeliver().catch(() => {})
      notificationStore.fetchUnreadCount().catch(() => {})
    }, 300)
  }
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('online', handleOnline)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="layout">
    <header v-if="showNav" class="header">
      <div class="header-content">
        <div class="logo" @click="router.push('/calendar')">
          <Moon class="logo-icon" />
          <span class="logo-text">梦境旅馆</span>
        </div>
        <nav class="nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <component :is="item.icon" class="nav-icon" />
            <span class="nav-text">{{ item.name }}</span>
          </router-link>
        </nav>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <LogOut class="nav-icon" />
        </button>
      </div>
    </header>
    <main class="main">
      <slot />
    </main>
    <nav v-if="showNav" class="mobile-nav">
      <router-link
        v-for="item in mobileNavItems"
        :key="item.path"
        :to="item.path"
        class="mobile-nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" class="mobile-nav-icon" />
        <span class="mobile-nav-text">{{ item.name }}</span>
      </router-link>
    </nav>
    <NotificationToast />
  </div>
</template>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(26, 26, 46, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform var(--transition-fast);
  
  &:hover {
    transform: scale(1.05);
  }
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: var(--color-secondary);
  animation: pulse 3s ease-in-out infinite;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(123, 163, 201, 0.2));
    color: var(--color-secondary);
    box-shadow: inset 0 0 0 1px rgba(232, 180, 217, 0.3);
  }
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.nav-text {
  font-weight: 500;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(248, 113, 113, 0.2);
    color: var(--color-error);
  }
}

.main {
  flex: 1;
  position: relative;
}

.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  z-index: 100;
  justify-content: space-around;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  
  &.active {
    color: var(--color-secondary);
  }
}

.mobile-nav-icon {
  width: 22px;
  height: 22px;
}

.mobile-nav-text {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .header-content {
    padding: 12px 16px;
  }
  
  .nav {
    display: none;
  }
  
  .logo-text {
    font-size: 1.2rem;
  }
  
  .main {
    padding-bottom: 80px;
  }
  
  .mobile-nav {
    display: flex;
  }
}
</style>
