<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { Lock, Unlock, ChevronRight, DoorOpen } from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'

const router = useRouter()
const roomStore = useRoomStore()

const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')
const isLoading = ref(false)

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

async function loadRooms() {
  isLoading.value = true
  await roomStore.fetchRooms()
  isLoading.value = false
}

function goToRoom(room) {
  if (!room.isUnlocked) {
    toastType.value = 'error'
    toastMessage.value = `还需要记录 ${room.requiredDays} 天心情才能解锁这个房间`
    showToast.value = true
    return
  }
  router.push(`/rooms/${room.id}`)
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
        :class="{ 'locked': !room.isUnlocked }"
        @click="goToRoom(room)"
      >
        <div class="room-cover" :style="{ background: roomGradients[index % roomGradients.length] }">
          <div class="cover-overlay">
            <component 
              :is="room.isUnlocked ? Unlock : Lock" 
              class="lock-icon"
              :class="{ 'unlocked': room.isUnlocked }"
            />
          </div>
          <div class="room-number">房间 {{ index + 1 }}</div>
        </div>
        
        <div class="room-content">
          <h3 class="room-title">{{ room.name }}</h3>
          <p class="room-description">{{ room.description }}</p>
          
          <div class="room-meta">
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
          
          <div class="room-footer">
            <span class="unlock-condition" :class="{ 'met': room.isUnlocked }">
              {{ room.unlockCondition }}
            </span>
            <ChevronRight class="arrow-icon" />
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
    opacity: 0.8;
    
    .room-cover {
      filter: grayscale(0.5);
    }
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
}

@keyframes unlockPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
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
  
  &.met {
    color: var(--color-success);
  }
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
