<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAchievementStore } from '@/stores/achievement'
import { Trophy, Target, Gift, CheckCircle, Clock, Star } from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'

const achievementStore = useAchievementStore()

const activeTab = ref('tasks')
const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')
const isLoading = ref(false)
const claimingId = ref(null)

const tasks = computed(() => achievementStore.tasks)
const achievements = computed(() => achievementStore.achievements)
const unlockedCount = computed(() => achievementStore.unlockedCount)
const totalCount = computed(() => achievementStore.totalCount)

const dailyTasks = computed(() => tasks.value?.dailyTasks || [])
const onceTasks = computed(() => tasks.value?.onceTasks || [])

async function loadData() {
  isLoading.value = true
  await Promise.all([
    achievementStore.fetchTasks(),
    achievementStore.fetchAchievements()
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
  } else {
    toastType.value = 'error'
    toastMessage.value = result.message
    showToast.value = true
  }
}

const refreshTime = computed(() => {
  if (!tasks.value?.refreshTime) return ''
  const time = new Date(tasks.value.refreshTime)
  return `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
})

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
    </div>
    
    <div class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
      >
        <Target class="tab-icon" />
        <span>每日任务</span>
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
        <div class="section-header">
          <h2 class="section-title">
            <Clock class="title-icon" />
            每日任务
          </h2>
          <span class="refresh-text">每日 {{ refreshTime }} 刷新</span>
        </div>
        
        <div class="tasks-list">
          <div 
            v-for="task in dailyTasks" 
            :key="task.id"
            class="task-card glass-card"
            :class="{ 'completed': task.isCompleted }"
          >
            <div class="task-icon">
              <Gift class="icon" />
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
                class="claim-btn btn-primary"
                :disabled="claimingId === task.id"
                @click="claimReward(task.id)"
              >
                {{ claimingId === task.id ? '领取中...' : '领取' }}
              </button>
              <CheckCircle v-else-if="task.isClaimed" class="claimed-icon" />
            </div>
          </div>
        </div>
        
        <div class="section-header" style="margin-top: 32px;">
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
            <div class="task-icon">
              <Trophy class="icon" />
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
                class="claim-btn btn-primary"
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
              <span class="stat-value">{{ Math.round((unlockedCount / totalCount) * 100) }}%</span>
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
  font-size: 1.2rem;
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
  background: rgba(232, 180, 217, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 24px;
    height: 24px;
    color: var(--color-secondary);
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
}

.claimed-icon {
  width: 28px;
  height: 28px;
  color: var(--color-success);
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

@media (max-width: 768px) {
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
}
</style>
