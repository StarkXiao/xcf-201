<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanionStore } from '@/stores/companion'
import { useNotificationStore } from '@/stores/notification'
import { 
  Sparkles, Lock, Star, Heart, TrendingUp, Zap, 
  ChevronRight, Crown, Shield, Sword, Wand2, Moon
} from 'lucide-vue-next'

const router = useRouter()
const companionStore = useCompanionStore()
const notificationStore = useNotificationStore()

const activeTab = ref('unlocked')
const isLoading = ref(false)
const showUnlockModal = ref(false)
const selectedTemplate = ref(null)
const customName = ref('')

const tabs = [
  { id: 'unlocked', label: '我的旅伴', icon: Star },
  { id: 'locked', label: '待解锁', icon: Lock }
]

const companions = computed(() => companionStore.companions)
const unlockedCompanions = computed(() => companions.value.filter(c => c.isUnlocked))
const lockedCompanions = computed(() => companions.value.filter(c => !c.isUnlocked))
const loading = computed(() => companionStore.loading.companions)

const displayCompanions = computed(() => {
  return activeTab.value === 'unlocked' ? unlockedCompanions.value : lockedCompanions.value
})

const personalityIcons = {
  gentle: Heart,
  brave: Shield,
  wise: Sword,
  creative: Wand2,
  mysterious: Moon
}

function getIntimacyColor(level) {
  const colors = {
    0: '#9ca3af',
    1: '#60a5fa',
    2: '#22c55e',
    3: '#eab308',
    4: '#f97316',
    5: '#ec4899'
  }
  return colors[level] || colors[0]
}

function formatUnlockCondition(condition) {
  if (!condition) return '未知条件'
  switch (condition.type) {
    case 'default': return '初始旅伴'
    case 'mood_record': return `记录心情 ${condition.value} 天`
    case 'chapters_read': return `阅读 ${condition.value} 个章节`
    case 'achievements': return `解锁 ${condition.value} 个成就`
    case 'multi_segment_days': return `多段记录 ${condition.value} 天`
    default: return '未解锁'
  }
}

async function fetchData() {
  isLoading.value = true
  try {
    await companionStore.fetchCompanions(true)
    await companionStore.fetchActiveCompanion()
    await companionStore.checkUnlockConditions()
  } catch (e) {
    notificationStore.error('加载失败，请重试')
  } finally {
    isLoading.value = false
  }
}

function viewCompanionDetail(companion) {
  if (companion.isUnlocked && companion.companion) {
    router.push(`/companions/${companion.companion.id}`)
  } else if (!companion.isUnlocked) {
    if (companion.unlockProgress?.progress >= 100) {
      showUnlockModal.value = true
      selectedTemplate.value = companion.template
      customName.value = ''
    }
  }
}

function activateCompanion(companion) {
  if (companion.companion?.isActive) return
  companionStore.activateCompanion(companion.companion.id).then(() => {
    notificationStore.success(`已切换到 ${companion.companion.name}`)
  })
}

async function unlockCompanion() {
  if (!selectedTemplate.value) return
  
  try {
    const res = await companionStore.unlockCompanion(
      selectedTemplate.value.id, 
      customName.value.trim() || null
    )
    if (res.code === 200) {
      notificationStore.success(`成功解锁旅伴 ${res.data.name}！`)
      showUnlockModal.value = false
      selectedTemplate.value = null
      customName.value = ''
      activeTab.value = 'unlocked'
    } else {
      notificationStore.error(res.message || '解锁失败')
    }
  } catch (e) {
    notificationStore.error('解锁失败，请重试')
  }
}

function goToChat() {
  router.push('/chat')
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="companions-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-title">
          <Sparkles class="title-icon" />
          <h1>同行旅伴</h1>
        </div>
        <p class="header-subtitle">在心灵旅途中，总有一位伙伴与你同行</p>
      </div>
    </div>

    <div v-if="companionStore.activeCompanion" class="active-companion-card">
      <div class="active-badge">当前旅伴</div>
      <div class="companion-info">
        <div class="avatar-large">
          <div class="avatar-inner" :style="{ backgroundColor: companionStore.activeCompanion.intimacyLevel?.color }">
            <span class="avatar-emoji">{{ companionStore.activeCompanion.avatar }}</span>
          </div>
          <div class="level-badge">Lv.{{ companionStore.activeCompanion.level }}</div>
        </div>
        <div class="companion-details">
          <h3 class="companion-name">{{ companionStore.activeCompanion.name }}</h3>
          <p class="companion-template">{{ companionStore.activeCompanion.templateName }}</p>
          <div class="intimacy-info">
            <Heart class="intimacy-icon" :style="{ color: companionStore.activeCompanion.intimacyLevel?.color }" />
            <span class="intimacy-name">{{ companionStore.activeCompanion.intimacyLevel?.name }}</span>
            <span class="intimacy-value">{{ companionStore.activeCompanion.intimacy }}/100</span>
          </div>
        </div>
        <button class="chat-btn" @click="goToChat">
          <Zap class="btn-icon" />
          开始对话
        </button>
      </div>
      <div class="exp-bar-container">
        <div class="exp-label">
          <span>经验值</span>
          <span>{{ companionStore.activeCompanion.experience }} / {{ companionStore.activeCompanion.expForNextLevel }}</span>
        </div>
        <div class="exp-bar">
          <div class="exp-fill" :style="{ width: companionStore.activeCompanion.levelProgress + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && unlockedCompanions.length > 0" class="active-companion-card no-active">
      <p class="no-active-text">你还没有选择当前旅伴，点击下方旅伴卡开始吧~</p>
    </div>

    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="tab-icon" />
        {{ tab.label }}
        <span v-if="tab.id === 'locked' && lockedCompanions.length > 0" class="tab-badge">
          {{ lockedCompanions.length }}
        </span>
      </button>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="companion-grid">
      <div 
        v-for="item in displayCompanions" 
        :key="item.template.id"
        :class="['companion-card', { unlocked: item.isUnlocked, 'can-unlock': !item.isUnlocked && item.unlockProgress?.progress >= 100 }]"
        @click="viewCompanionDetail(item)"
      >
        <div class="card-header">
          <div class="avatar-container">
            <div class="avatar" :style="{ opacity: item.isUnlocked ? 1 : 0.5 }">
              <span class="avatar-emoji">{{ item.template.avatar }}</span>
            </div>
            <div v-if="item.companion?.isActive" class="active-indicator"></div>
            <Lock v-if="!item.isUnlocked" class="lock-icon" />
          </div>
          <div class="type-badge">
            <component :is="personalityIcons[item.template.personality?.type] || Heart" class="badge-icon" />
            {{ item.template.personality?.type === 'gentle' ? '温柔' : 
               item.template.personality?.type === 'brave' ? '勇敢' :
               item.template.personality?.type === 'wise' ? '智慧' :
               item.template.personality?.type === 'creative' ? '创意' :
               item.template.personality?.type === 'mysterious' ? '神秘' : '未知' }}
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">{{ item.isUnlocked && item.companion ? item.companion.name : item.template.name }}</h3>
          <p v-if="item.isUnlocked && item.companion" class="card-subtitle">{{ item.template.name }}</p>
          <p v-else class="card-subtitle">{{ formatUnlockCondition(item.unlockCondition) }}</p>

          <div v-if="item.isUnlocked && item.companion" class="stats-row">
            <div class="stat-item">
              <Star class="stat-icon" />
              <span class="stat-value">Lv.{{ item.companion.level }}</span>
            </div>
            <div class="stat-item">
              <Heart class="stat-icon" :style="{ color: getIntimacyColor(item.companion.intimacyLevel?.level) }" />
              <span class="stat-value">{{ item.companion.intimacyLevel?.name }}</span>
            </div>
          </div>

          <div v-else-if="!item.isUnlocked && item.unlockProgress" class="progress-section">
            <div class="progress-label">
              <span>解锁进度</span>
              <span>{{ item.unlockProgress.current }} / {{ item.unlockProgress.target }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: item.unlockProgress.progress + '%' }"></div>
            </div>
            <p v-if="item.unlockProgress.progress >= 100" class="unlock-hint">点击解锁你的新旅伴~</p>
          </div>

          <p v-if="item.template.backgroundStory && item.isUnlocked" class="story-preview">
            {{ item.template.backgroundStory.substring(0, 50) }}...
          </p>
        </div>

        <div class="card-footer">
          <button 
            v-if="item.isUnlocked && item.companion"
            :class="['action-btn', { active: item.companion.isActive }]"
            @click.stop="activateCompanion(item)"
            :disabled="item.companion.isActive"
          >
            <Crown v-if="item.companion.isActive" class="btn-icon" />
            {{ item.companion.isActive ? '当前旅伴' : '设为当前' }}
          </button>
          <button 
            v-else-if="!item.isUnlocked && item.unlockProgress?.progress >= 100"
            class="action-btn unlock-btn"
            @click.stop="viewCompanionDetail(item)"
          >
            <Sparkles class="btn-icon" />
            立即解锁
          </button>
          <ChevronRight v-else class="chevron-icon" />
        </div>
      </div>

      <div v-if="displayCompanions.length === 0" class="empty-state">
        <Sparkles class="empty-icon" />
        <p class="empty-text">{{ activeTab === 'unlocked' ? '还没有旅伴，快去解锁吧~' : '所有旅伴都已解锁！' }}</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showUnlockModal" class="modal-overlay" @click.self="showUnlockModal = false">
        <div class="modal-content unlock-modal">
          <div class="modal-header">
            <h2>解锁旅伴</h2>
          </div>
          <div v-if="selectedTemplate" class="modal-body">
            <div class="unlock-preview">
              <div class="avatar-preview">
                <span class="avatar-emoji">{{ selectedTemplate.avatar }}</span>
              </div>
              <h3 class="template-name">{{ selectedTemplate.name }}</h3>
              <p class="template-story">{{ selectedTemplate.backgroundStory }}</p>
            </div>
            <div class="form-group">
              <label>给TA起个名字吧（可选）</label>
              <input 
                v-model="customName"
                type="text" 
                class="form-input"
                :placeholder="`默认: ${selectedTemplate.name}`"
                maxlength="20"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showUnlockModal = false">取消</button>
            <button class="btn-primary" @click="unlockCompanion">确认解锁</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.companions-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, #fef3ff 0%, #f0f9ff 50%, #fef3ff 100%);
}

.page-header {
  text-align: center;
  padding: 40px 20px 30px;
  margin-bottom: 20px;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title-icon {
  width: 36px;
  height: 36px;
  color: var(--accent-primary);
}

.header-title h1 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  color: var(--text-secondary);
  font-size: 16px;
}

.active-companion-card {
  max-width: 600px;
  margin: 0 auto 30px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1));
  border: 2px solid var(--accent-primary);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.active-companion-card.no-active {
  text-align: center;
  padding: 30px;
}

.no-active-text {
  color: var(--text-secondary);
  font-size: 16px;
}

.active-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--accent-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.companion-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.avatar-large {
  position: relative;
  flex-shrink: 0;
}

.avatar-inner {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.avatar-emoji {
  font-size: 40px;
}

.level-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.companion-details {
  flex: 1;
  min-width: 0;
}

.companion-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.companion-template {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 8px;
}

.intimacy-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.intimacy-icon {
  width: 18px;
  height: 18px;
}

.intimacy-name {
  font-weight: 600;
}

.intimacy-value {
  color: var(--text-secondary);
}

.chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.exp-bar-container {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 12px 16px;
}

.exp-label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.exp-bar {
  height: 10px;
  background: #e5e7eb;
  border-radius: 5px;
  overflow: hidden;
}

.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 5px;
  transition: width 0.5s ease;
}

.tabs {
  max-width: 600px;
  margin: 0 auto 20px;
  display: flex;
  gap: 12px;
  background: white;
  padding: 8px;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
}

.tab-icon {
  width: 20px;
  height: 20px;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.tab-btn:not(.active) .tab-badge {
  background: var(--accent-light);
  color: var(--accent-primary);
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.companion-grid {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.companion-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.companion-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.companion-card.unlocked:hover {
  border-color: var(--accent-primary);
}

.companion-card.can-unlock {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(236, 72, 153, 0.05));
  border: 2px dashed var(--accent-primary);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--accent-primary); }
  50% { border-color: var(--accent-secondary); }
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.avatar-container {
  position: relative;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #fce7f3, #ddd6fe);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar .avatar-emoji {
  font-size: 30px;
}

.active-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: #22c55e;
  border: 2px solid white;
  border-radius: 50%;
}

.lock-icon {
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  background: #6b7280;
  color: white;
  padding: 4px;
  border-radius: 50%;
}

.type-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.card-body {
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-icon {
  width: 16px;
  height: 16px;
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-section {
  margin-bottom: 12px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.unlock-hint {
  text-align: center;
  color: var(--accent-primary);
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.story-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 20px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--accent-primary);
  color: white;
}

.action-btn.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  cursor: default;
}

.action-btn.unlock-btn {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
}

.action-btn.unlock-btn:hover {
  transform: scale(1.02);
}

.chevron-icon {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-body {
  padding: 24px;
}

.unlock-preview {
  text-align: center;
  margin-bottom: 24px;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #fce7f3, #ddd6fe);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.avatar-preview .avatar-emoji {
  font-size: 50px;
}

.template-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.template-story {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.form-group {
  margin-bottom: 8px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  background: #f3f4f6;
  color: var(--text-primary);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  flex: 1;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}
</style>
