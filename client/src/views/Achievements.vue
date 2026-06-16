<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAchievementStore } from '@/stores/achievement'
import { 
  Trophy, Target, Gift, CheckCircle, Clock, Star, 
  Calendar, Flame, Lock, ChevronRight, Bell, Sparkles,
  Moon, Zap
} from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'

const achievementStore = useAchievementStore()

const activeTab = ref('tasks')
const activeTaskTab = ref('daily')
const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')
const isLoading = ref(false)
const claimingId = ref(null)
const showReminderPanel = ref(false)

const tasks = computed(() => achievementStore.tasks)
const achievements = computed(() => achievementStore.achievements)
const unlockedCount = computed(() => achievementStore.unlockedCount)
const totalCount = computed(() => achievementStore.totalCount)
const reminders = computed(() => achievementStore.reminders)
const hasUnclaimedRewards = computed(() => achievementStore.hasUnclaimedRewards)

const dailyTasks = computed(() => achievementStore.dailyTasks)
const weeklyTasks = computed(() => achievementStore.weeklyTasks)
const onceTasks = computed(() => achievementStore.onceTasks)
const chainTasks = computed(() => achievementStore.chainTasks)

async function loadData() {
  isLoading.value = true
  await Promise.all([
    achievementStore.fetchTasks(),
    achievementStore.fetchAchievements(),
    achievementStore.fetchReminders()
  ])
  isLoading.value = false
}

async function claimReward(taskId) {
  claimingId.value = taskId
  
  const result = await achievementStore.claimTask(taskId)
  
  claimingId.value = null
  
  if (result.success) {
    toastType.value = 'success'
    toastMessage.value = `🎉 领取成功！获得 ${result.data.reward} 星币`
    showToast.value = true
    await achievementStore.fetchTasks()
    await achievementStore.fetchAchievements()
  } else {
    toastType.value = 'error'
    toastMessage.value = result.message
    showToast.value = true
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
  toastType.value = 'success'
  toastMessage.value = `🎯 「${task.title}」任务完成！奖励 ${task.reward} 星币待领取`
  showToast.value = true
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
        
        <div class="achievements-grid">
          <div 
            v-for="achievement in achievements" 
            :key="achievement.id"
            class="achievement-card glass-card"
            :class="{ 'unlocked': achievement.isUnlocked }"
          >
            <div class="achievement-icon" :class="{ 'glow': achievement.isUnlocked }">
              <span class="icon-emoji">{{ achievement.icon }}</span>
            </div>
            
            <div class="achievement-info">
              <h3 class="achievement-name">{{ achievement.name }}</h3>
              <p class="achievement-desc">{{ achievement.description }}</p>
              <p class="achievement-condition">{{ achievement.condition }}</p>
              
              <div v-if="!achievement.isUnlocked" class="achievement-progress">
                <div class="progress-info">
                  <span>进度</span>
                  <span>{{ achievement.progress }} / {{ achievement.target }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div 
                    class="progress-bar"
                    :style="{ width: `${(achievement.progress / achievement.target) * 100}%` }"
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
  
  .reminder-panel {
    max-width: 100%;
  }
}
</style>
