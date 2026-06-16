<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { useNotificationStore } from '@/stores/notification'
import { Lock, Unlock, ChevronRight, DoorOpen, Calendar, BookOpen, Heart, CheckCircle, Target, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const roomStore = useRoomStore()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const unlockingRoomId = ref(null)

const rooms = computed(() => roomStore.rooms)
const unlockedCount = computed(() => roomStore.unlockedCount)
const totalCount = computed(() => roomStore.totalCount)

const roomGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
]

const conditionConfig = {
  days: { label: '记录天数', icon: Calendar, color: '#e8b4d9' },
  multiSegmentDays: { label: '多段记录', icon: Sparkles, color: '#a3c4f3' },
  moodTypeCount: { label: '情绪类型', icon: Heart, color: '#ec4899' },
  chapters: { label: '阅读章节', icon: BookOpen, color: '#34d399' },
  tasks: { label: '完成任务', icon: Target, color: '#fbbf24' }
}

async function loadRooms() {
  isLoading.value = true
  await roomStore.fetchRooms()
  isLoading.value = false
}

function getConditionIcon(key) {
  return conditionConfig[key]?.icon || Calendar
}

function getConditionLabel(key) {
  return conditionConfig[key]?.label || key
}

function getConditionColor(key) {
  return conditionConfig[key]?.color || '#e8b4d9'
}

function getAllConditionsMet(room) {
  if (!room.conditionProgress) return true
  return Object.values(room.conditionProgress).every(c => c.met)
}

function getUnmetConditions(room) {
  if (!room.conditionProgress) return []
  return Object.entries(room.conditionProgress)
    .filter(([_, c]) => !c.met)
    .map(([key, c]) => ({ key, ...c }))
}

function getUnlockTooltip(room) {
  const unmet = getUnmetConditions(room)
  if (unmet.length === 0) return '点击解锁'
  return unmet.map(c => `${getConditionLabel(c.key)}: ${c.current} / ${c.target}`).join('\n')
}

async function handleRoomClick(room) {
  if (room.isUnlocked) {
    router.push(`/rooms/${room.id}`)
    return
  }
  
  if (!getAllConditionsMet(room)) {
    showUnlockConditionsToast(room)
    return
  }
  
  await tryUnlockRoom(room)
}

function showUnlockConditionsToast(room) {
  const unmet = getUnmetConditions(room)
  const messages = unmet.map(c => `• ${getConditionLabel(c.key)}: ${c.current} / ${c.target}`)
  
  notificationStore.warning(
    `解锁「${room.name}」还需要：\n${messages.join('\n')}`,
    '解锁条件未满足'
  )
}

async function tryUnlockRoom(room) {
  unlockingRoomId.value = room.id
  
  const result = await roomStore.unlockRoom(room.id)
  
  unlockingRoomId.value = null
  
  if (result.success) {
    if (result.data?.notificationEvents && result.data.notificationEvents.length > 0) {
      notificationStore.push(result.data.notificationEvents)
    } else {
      notificationStore.roomUnlocked(room)
    }
    await loadRooms()
  } else {
    const message = result.details?.length 
      ? `解锁失败：\n${result.details.join('\n')}`
      : result.message || '解锁失败'
    notificationStore.error(message, '解锁失败')
  }
}

onMounted(() => {
  loadRooms()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div class="page-title">
        <h1>剧情房间</h1>
        <p class="page-subtitle">探索梦境旅馆的每一个角落，发现属于你的故事</p>
      </div>
      <div class="progress-info">
        <DoorOpen class="progress-icon" />
        <span class="progress-text">已解锁 {{ unlockedCount }} / {{ totalCount }} 个房间</span>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
    
    <div v-else class="rooms-grid">
      <div
        v-for="(room, index) in rooms"
        :key="room.id"
        class="room-card glass-card"
        :class="{ 
          'locked': !room.isUnlocked,
          'ready-to-unlock': !room.isUnlocked && getAllConditionsMet(room),
          'unlocking': unlockingRoomId === room.id
        }"
        :title="!room.isUnlocked ? getUnlockTooltip(room) : ''"
        @click="handleRoomClick(room)"
      >
        <div class="room-cover" :style="{ background: roomGradients[index % roomGradients.length] }">
          <div class="cover-overlay">
            <component 
              :is="room.isUnlocked ? Unlock : Lock" 
              class="lock-icon"
              :class="{ 'unlocked': room.isUnlocked, 'ready': !room.isUnlocked && getAllConditionsMet(room) }"
            />
            <div v-if="unlockingRoomId === room.id" class="unlocking-spinner"></div>
          </div>
          <div class="room-number">房间 {{ index + 1 }}</div>
          <div v-if="!room.isUnlocked && room.conditionProgress" class="condition-badge">
            <span>{{ Object.values(room.conditionProgress).filter(c => c.met).length }} / {{ Object.keys(room.conditionProgress).length }}</span>
          </div>
        </div>
        
        <div class="room-content">
          <h3 class="room-title">{{ room.name }}</h3>
          <p class="room-description">{{ room.description }}</p>
          
          <div v-if="room.isUnlocked" class="room-meta">
            <div class="progress-bar-container">
              <div class="progress-label">
                <span>阅读进度</span>
                <span>{{ room.progress }} / {{ room.totalChapters }} 章</span>
              </div>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar"
                  :style="{ width: `${(room.progress / room.totalChapters) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <div v-if="!room.isUnlocked && room.conditionProgress" class="unlock-conditions">
            <div class="conditions-header">
              <span class="conditions-title">解锁条件</span>
              <span class="conditions-count">
                {{ Object.values(room.conditionProgress).filter(c => c.met).length }} / {{ Object.keys(room.conditionProgress).length }}
              </span>
            </div>
            <div class="conditions-list">
              <div 
                v-for="(condition, key) in room.conditionProgress" 
                :key="key"
                class="condition-item"
                :class="{ 'met': condition.met }"
              >
                <div class="condition-icon" :style="{ color: getConditionColor(key) }">
                  <component :is="getConditionIcon(key)" class="icon" />
                </div>
                <div class="condition-info">
                  <div class="condition-label">{{ getConditionLabel(key) }}</div>
                  <div class="condition-progress">
                    <div class="condition-progress-bar-bg">
                      <div 
                        class="condition-progress-bar"
                        :style="{ 
                          width: `${Math.min(100, (condition.current / condition.target) * 100)}%`,
                          backgroundColor: getConditionColor(key)
                        }"
                      ></div>
                    </div>
                    <span class="condition-progress-text">{{ condition.current }} / {{ condition.target }}</span>
                  </div>
                </div>
                <CheckCircle v-if="condition.met" class="condition-check" />
              </div>
            </div>
          </div>
          
          <div class="room-footer">
            <span 
              class="unlock-condition" 
              :class="{ 
                'met': room.isUnlocked,
                'ready': !room.isUnlocked && getAllConditionsMet(room)
              }"
            >
              <template v-if="room.isUnlocked">
                <Unlock class="footer-icon" />
                已解锁
              </template>
              <template v-else-if="getAllConditionsMet(room)">
                <Sparkles class="footer-icon" />
                点击解锁
              </template>
              <template v-else>
                <Lock class="footer-icon" />
                {{ room.unlockCondition }}
              </template>
            </span>
            <ChevronRight class="arrow-icon" />
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
  margin-bottom: 32px;
  flex-wrap: wrap;
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

.progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.progress-text {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
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

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.room-card {
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-lg);
  }
  
  &.locked {
    opacity: 0.9;
    
    .room-cover {
      filter: grayscale(0.3);
    }
  }
  
  &.ready-to-unlock {
    border-color: rgba(74, 222, 128, 0.4);
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
    
    .room-cover {
      filter: none;
    }
    
    &:hover {
      box-shadow: 0 0 30px rgba(74, 222, 128, 0.25);
    }
  }
  
  &.unlocking {
    pointer-events: none;
    opacity: 0.7;
  }
}

.room-cover {
  position: relative;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-icon {
  width: 48px;
  height: 48px;
  color: rgba(255, 255, 255, 0.9);
  
  &.unlocked {
    animation: unlockPulse 2s ease-in-out infinite;
  }
  
  &.ready {
    color: #4ade80;
    animation: readyPulse 1.5s ease-in-out infinite;
  }
}

@keyframes unlockPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes readyPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
}

.unlocking-spinner {
  position: absolute;
  width: 60px;
  height: 60px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.room-number {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-full);
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
}

.condition-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-full);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
}

.room-content {
  padding: 20px;
}

.room-title {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: var(--color-text);
}

.room-description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.room-meta {
  margin-bottom: 16px;
}

.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
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

.unlock-conditions {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.conditions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.conditions-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.conditions-count {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 3px 10px;
  background: rgba(232, 180, 217, 0.15);
  border-radius: var(--radius-full);
  color: var(--color-secondary);
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.02);
  transition: all var(--transition-fast);
  
  &.met {
    background: rgba(74, 222, 128, 0.05);
  }
}

.condition-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .icon {
    width: 16px;
    height: 16px;
  }
}

.condition-info {
  flex: 1;
  min-width: 0;
}

.condition-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.condition-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.condition-progress-bar-bg {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.condition-progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
  opacity: 0.8;
}

.condition-progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 50px;
  text-align: right;
  
  .condition-item.met & {
    color: var(--color-success);
  }
}

.condition-check {
  width: 18px;
  height: 18px;
  color: var(--color-success);
  flex-shrink: 0;
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.unlock-condition {
  font-size: 0.85rem;
  color: var(--color-warning);
  display: flex;
  align-items: center;
  gap: 6px;
  
  &.met {
    color: var(--color-success);
  }
  
  &.ready {
    color: var(--color-success);
    animation: readyBlink 1.5s ease-in-out infinite;
  }
  
  .footer-icon {
    width: 14px;
    height: 14px;
  }
}

@keyframes readyBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
  
  .room-card:hover & {
    transform: translateX(4px);
    color: var(--color-secondary);
  }
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .room-cover {
    height: 140px;
  }
}
</style>
