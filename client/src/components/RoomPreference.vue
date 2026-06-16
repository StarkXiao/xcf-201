<script setup>
import { computed } from 'vue'
import { DoorOpen, BookOpen, Clock, Heart, ChevronRight, Lock, Unlock } from 'lucide-vue-next'

const props = defineProps({
  roomPreference: {
    type: Object,
    required: true
  }
})

const rooms = computed(() => props.roomPreference?.rooms || [])
const favoriteRoom = computed(() => props.roomPreference?.favoriteRoom || null)
const activityDistribution = computed(() => props.roomPreference?.activityDistribution || [])

const maxActivityCount = computed(() => {
  if (activityDistribution.value.length === 0) return 1
  return Math.max(...activityDistribution.value.map(a => a.count), 1)
})

function formatReadingTime(minutes) {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

function formatDate(dateStr) {
  if (!dateStr) return '暂无'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="room-preference-section">
    <div class="section-header glass-card">
      <div class="section-title-row">
        <DoorOpen class="section-icon room" />
        <h3 class="section-title">房间探索偏好</h3>
      </div>
      
      <div class="stats-overview">
        <div class="overview-item">
          <div class="overview-icon-wrapper unlocked">
            <Unlock class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ roomPreference.unlockedRooms }}/{{ roomPreference.totalRooms }}</span>
            <span class="overview-label">已解锁房间</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper chapters">
            <BookOpen class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ roomPreference.totalChaptersRead || 0 }}</span>
            <span class="overview-label">阅读章节</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper time">
            <Clock class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ formatReadingTime(roomPreference.totalReadingTime || 0) }}</span>
            <span class="overview-label">累计阅读</span>
          </div>
        </div>
        
        <div class="overview-item" v-if="favoriteRoom">
          <div class="overview-icon-wrapper favorite">
            <Heart class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ favoriteRoom.roomName }}</span>
            <span class="overview-label">最爱房间</span>
          </div>
        </div>
      </div>
    </div>

    <div class="activity-chart glass-card" v-if="activityDistribution.length > 0">
      <h4 class="chart-title">房间活跃度分布</h4>
      <div class="activity-bars">
        <div 
          v-for="activity in activityDistribution" 
          :key="activity.roomId"
          class="activity-bar-item"
        >
          <span class="room-name">{{ activity.roomName }}</span>
          <div class="bar-wrapper">
            <div 
              class="bar-fill"
              :style="{ width: `${(activity.count / maxActivityCount) * 100}%` }"
            ></div>
          </div>
          <span class="count">{{ activity.count }}次</span>
        </div>
      </div>
    </div>

    <div class="rooms-list">
      <h4 class="list-title">房间探索详情</h4>
      <div 
        v-for="room in rooms" 
        :key="room.id"
        class="room-card glass-card"
        :class="{ 'locked': !room.isUnlocked }"
      >
        <div class="room-header">
          <div class="room-icon-wrapper" :class="{ 'unlocked': room.isUnlocked }">
            <Lock v-if="!room.isUnlocked" class="room-icon lock-icon" />
            <DoorOpen v-else class="room-icon" />
          </div>
          <div class="room-info">
            <div class="room-name-row">
              <h4 class="room-name">{{ room.name }}</h4>
              <span v-if="room.isUnlocked" class="unlock-badge">已解锁</span>
              <span v-else class="lock-badge">未解锁</span>
            </div>
            <p class="room-desc">{{ room.description }}</p>
            <p v-if="room.unlockedAt" class="unlock-date">
              解锁于 {{ formatDate(room.unlockedAt) }}
            </p>
          </div>
          <ChevronRight class="arrow-icon" />
        </div>
        
        <div v-if="room.isUnlocked" class="room-progress">
          <div class="progress-header">
            <span class="progress-label">阅读进度</span>
            <span class="progress-value">{{ room.currentChapter }}/{{ room.totalChapters }}章</span>
          </div>
          <div class="progress-bar-bg">
            <div 
              class="progress-bar"
              :style="{ width: `${room.progress}%` }"
            ></div>
          </div>
        </div>
        
        <div v-if="room.isUnlocked && room.branchDetails && room.branchDetails.length > 1" class="room-branches">
          <div class="branches-header">
            <span class="branches-label">故事分支 ({{ room.branchCount }}个)</span>
          </div>
          <div class="branches-list">
            <div 
              v-for="branch in room.branchDetails" 
              :key="branch.branchKey"
              class="branch-item"
              :class="{ 'active': branch.isActive }"
            >
              <span class="branch-name">{{ branch.branchLabel }}</span>
              <span class="branch-progress">{{ branch.maxChapterReached }}章</span>
            </div>
          </div>
        </div>
        
        <div v-if="room.isUnlocked && room.recentActivity && room.recentActivity.length > 0" class="room-activity">
          <div class="activity-header">
            <Clock class="activity-icon" />
            <span class="activity-label">最近阅读</span>
          </div>
          <div class="activity-list">
            <div 
              v-for="(activity, idx) in room.recentActivity.slice(0, 3)" 
              :key="idx"
              class="activity-item"
            >
              <span class="activity-title">第{{ activity.chapter }}章 · {{ activity.title }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="!room.isUnlocked" class="room-locked-info">
          <p class="locked-text">
            <Lock class="lock-small-icon" />
            {{ room.unlockCondition || '继续记录心情来解锁这个房间' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room-preference-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  padding: 24px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.section-icon {
  width: 24px;
  height: 24px;
  
  &.room {
    color: var(--color-accent);
  }
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.overview-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(163, 196, 243, 0.15);
  
  &.unlocked {
    background: rgba(34, 197, 94, 0.15);
    .overview-icon { color: #22c55e; }
  }
  
  &.chapters {
    background: rgba(168, 85, 247, 0.15);
    .overview-icon { color: #a855f7; }
  }
  
  &.time {
    background: rgba(249, 115, 22, 0.15);
    .overview-icon { color: #f97316; }
  }
  
  &.favorite {
    background: rgba(236, 72, 153, 0.15);
    .overview-icon { color: var(--color-primary); }
  }
  
  .overview-icon {
    width: 24px;
    height: 24px;
    color: var(--color-accent);
  }
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.overview-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.activity-chart {
  padding: 24px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
}

.activity-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-name {
  width: 100px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.bar-wrapper {
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-secondary));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.count {
  width: 50px;
  text-align: right;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.rooms-list {
  margin-top: 4px;
}

.list-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.room-card {
  padding: 20px;
  margin-bottom: 16px;
  transition: all var(--transition-normal);
  
  &.locked {
    opacity: 0.7;
  }
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

.room-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.room-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  
  &.unlocked {
    background: linear-gradient(135deg, var(--color-accent), var(--color-secondary));
  }
  
  .room-icon {
    width: 26px;
    height: 26px;
    color: var(--color-text-muted);
    
    &.lock-icon {
      width: 22px;
      height: 22px;
    }
  }
  
  &.unlocked .room-icon {
    color: var(--color-bg-dark);
  }
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.room-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.unlock-badge {
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
}

.lock-badge {
  padding: 2px 8px;
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
}

.room-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.unlock-date {
  font-size: 0.75rem;
  color: var(--color-success);
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.room-progress {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.progress-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-secondary);
}

.progress-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-secondary));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.room-branches {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.branches-header {
  margin-bottom: 10px;
}

.branches-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.branches-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.branch-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.08);
  
  &.active {
    background: rgba(163, 196, 243, 0.15);
    border-color: var(--color-accent);
  }
}

.branch-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.branch-progress {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 500;
}

.room-activity {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.activity-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.activity-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
}

.activity-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-item {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.activity-title {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.room-locked-info {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.locked-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0;
}

.lock-small-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
