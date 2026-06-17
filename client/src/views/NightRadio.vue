<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNightRadioStore } from '@/stores/nightRadio'
import { useMoodStore } from '@/stores/mood'
import { useNotificationStore } from '@/stores/notification'
import { 
  Radio, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  Clock,
  Calendar,
  Star,
  Sparkles,
  Moon,
  Sun,
  Zap,
  BookOpen,
  Music,
  Wind,
  MessageCircleHeart,
  Target,
  ChevronRight,
  RefreshCw,
  ListMusic,
  Users
} from 'lucide-vue-next'

const router = useRouter()
const radioStore = useNightRadioStore()
const moodStore = useMoodStore()
const notificationStore = useNotificationStore()

const activeTab = ref('recommend')
const selectedCategory = ref(null)
const isLoading = ref(false)
const currentComfortText = ref(null)
const showPlayer = ref(false)

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

const categoryIcons = {
  sleep: Moon,
  ambient: Wind,
  story: BookOpen,
  meditation: Sparkles,
  music: Music,
  reading: BookOpen,
  breathing: Zap
}

const today = new Date().toISOString().split('T')[0]
const currentMood = computed(() => moodStore.getDominantMood(today) || 'calm')

const displayedPrograms = computed(() => {
  if (selectedCategory.value) {
    return radioStore.programs.filter(p => p.category === selectedCategory.value)
  }
  return radioStore.programs
})

const currentProgress = computed(() => {
  if (!radioStore.duration) return 0
  return (radioStore.currentTime / radioStore.duration) * 100
})

let playTimer = null

function startPlayTimer() {
  stopPlayTimer()
  playTimer = setInterval(() => {
    if (radioStore.isPlaying && radioStore.currentTime < radioStore.duration) {
      radioStore.seekTo(radioStore.currentTime + 1)
    } else if (radioStore.currentTime >= radioStore.duration) {
      radioStore.pauseProgram()
    }
  }, 1000)
}

function stopPlayTimer() {
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

function handlePlayPause() {
  if (!radioStore.currentProgram) {
    if (radioStore.recommendedPrograms.length > 0) {
      playProgram(radioStore.recommendedPrograms[0])
    }
    return
  }
  radioStore.togglePlay()
  if (radioStore.isPlaying) {
    startPlayTimer()
  } else {
    stopPlayTimer()
  }
}

function playProgram(program) {
  radioStore.playProgram(program)
  showPlayer.value = true
  startPlayTimer()
  notificationStore.success(`开始播放：${program.title}`)
}

function handleSeek(e) {
  const time = parseFloat(e.target.value)
  radioStore.seekTo(time)
}

function handleVolumeChange(e) {
  const vol = parseFloat(e.target.value)
  radioStore.setVolume(vol)
}

function toggleFavorite(program, event) {
  event.stopPropagation()
  radioStore.toggleFavorite(program.id)
  notificationStore.success(program.isFavorite ? '已取消收藏' : '已添加到收藏')
}

function refreshComfortText() {
  const text = radioStore.getRandomComfortText()
  if (text) {
    currentComfortText.value = text
  }
}

async function completeTask(task) {
  if (task.isCompleted) return
  const result = await radioStore.completeLinkedTask(task.id)
  if (result.success) {
    notificationStore.success(`任务完成！获得 ${task.reward} 星币`)
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatPlayCount(count) {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toString()
}

async function loadData() {
  isLoading.value = true
  try {
    await Promise.all([
      radioStore.fetchAllData(),
      radioStore.fetchComfortTexts(currentMood.value),
      radioStore.fetchLinkedTasks()
    ])
    refreshComfortText()
  } catch (error) {
    notificationStore.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

function selectCategory(category) {
  if (selectedCategory.value === category) {
    selectedCategory.value = null
  } else {
    selectedCategory.value = category
  }
}

watch(currentMood, (newMood) => {
  radioStore.fetchComfortTexts(newMood)
  radioStore.fetchRecommendedPrograms()
})

onMounted(() => {
  loadData()
  if (radioStore.isPlaying) {
    startPlayTimer()
  }
})

onUnmounted(() => {
  stopPlayTimer()
})
</script>

<template>
  <div class="night-radio-page">
    <div class="stars-bg">
      <div v-for="i in 50" :key="i" class="star" :style="{
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDelay: Math.random() * 3 + 's',
        animationDuration: (2 + Math.random() * 2) + 's'
      }"></div>
    </div>

    <div class="page-container">
      <div class="header-section">
        <div class="page-title">
          <h1>夜航电台</h1>
          <p class="page-subtitle">在星空下，让声音陪伴你度过每一个夜晚</p>
        </div>
        <div class="mood-indicator glass-card" v-if="currentMood">
          <span class="mood-emoji">{{ moodEmojis[currentMood] }}</span>
          <span class="mood-label">{{ moodLabels[currentMood] }}模式</span>
        </div>
      </div>

      <div v-if="isLoading && radioStore.programs.length === 0" class="loading-state glass-card">
        <div class="loading-spinner"></div>
        <p>正在调谐夜航电台...</p>
      </div>

      <div v-else class="radio-content">
        <div class="station-status glass-card">
          <div class="station-info">
            <div class="station-icon">
              <Radio class="radio-icon" />
              <span class="live-dot"></span>
            </div>
            <div class="station-text">
              <h3 class="station-name">夜航电台 · 正在播出</h3>
              <p class="now-playing" v-if="radioStore.stationStatus?.currentProgram">
                {{ radioStore.stationStatus.currentProgram.title }}
              </p>
            </div>
          </div>
          <div class="station-stats">
            <div class="stat-item">
              <Users class="stat-icon" />
              <span>{{ radioStore.stationStatus?.listeners || 0 }} 人在听</span>
            </div>
          </div>
        </div>

        <div class="tab-bar">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'recommend' }"
            @click="activeTab = 'recommend'"
          >
            <Sparkles class="tab-icon" />
            <span>为你推荐</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'categories' }"
            @click="activeTab = 'categories'"
          >
            <ListMusic class="tab-icon" />
            <span>分类浏览</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'schedule' }"
            @click="activeTab = 'schedule'"
          >
            <Calendar class="tab-icon" />
            <span>节目单</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'favorites' }"
            @click="activeTab = 'favorites'"
          >
            <Heart class="tab-icon" />
            <span>我的收藏</span>
          </button>
        </div>

        <div v-if="activeTab === 'recommend'" class="tab-content">
          <div v-if="currentComfortText" class="comfort-section glass-card">
            <div class="comfort-header">
              <MessageCircleHeart class="comfort-icon" />
              <h3 class="section-title">今夜的温柔</h3>
              <button class="refresh-btn" @click="refreshComfortText">
                <RefreshCw class="refresh-icon" />
              </button>
            </div>
            <div class="comfort-text">
              "{{ currentComfortText.text }}"
            </div>
          </div>

          <div class="section-header">
            <h3 class="section-title">
              <Star class="title-icon" style="color: var(--color-warning)" />
              为你精选
            </h3>
            <p class="section-desc">根据你今天的心情推荐</p>
          </div>
          
          <div class="recommend-grid">
            <div 
              v-for="program in radioStore.recommendedPrograms" 
              :key="program.id"
              class="program-card glass-card"
              @click="playProgram(program)"
            >
              <div class="program-cover">
                <span class="cover-emoji">{{ program.cover }}</span>
                <button class="play-overlay">
                  <Play class="play-icon" />
                </button>
              </div>
              <div class="program-info">
                <h4 class="program-title">{{ program.title }}</h4>
                <p class="program-host">{{ program.host }}</p>
                <div class="program-meta">
                  <span class="meta-item">
                    <Clock class="meta-icon" />
                    {{ formatDuration(program.duration) }}
                  </span>
                  <span class="meta-item">
                    <Users class="meta-icon" />
                    {{ formatPlayCount(program.playCount) }}
                  </span>
                </div>
              </div>
              <button 
                class="favorite-btn" 
                :class="{ favorited: program.isFavorite }"
                @click="toggleFavorite(program, $event)"
              >
                <Heart class="favorite-icon" :fill="program.isFavorite ? 'currentColor' : 'none'" />
              </button>
            </div>
          </div>

          <div class="section-header">
            <h3 class="section-title">
              <Target class="title-icon" style="color: var(--color-success)" />
              今夜任务
            </h3>
            <p class="section-desc">收听节目，完成任务获得奖励</p>
          </div>

          <div class="tasks-list">
            <div 
              v-for="task in radioStore.linkedTasks" 
              :key="task.id"
              class="task-card glass-card"
              :class="{ completed: task.isCompleted }"
            >
              <div class="task-icon-wrap">
                <Star class="task-icon" />
              </div>
              <div class="task-info">
                <h4 class="task-title">{{ task.title }}</h4>
                <p class="task-desc">{{ task.description }}</p>
                <div class="task-progress" v-if="task.target > 1">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: `${(task.progress / task.target) * 100}%` }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ task.progress }}/{{ task.target }}</span>
                </div>
              </div>
              <div class="task-action">
                <div class="reward-badge">
                  <Star class="reward-icon" />
                  <span>+{{ task.reward }}</span>
                </div>
                <button 
                  class="complete-btn"
                  :disabled="task.isCompleted"
                  @click="completeTask(task)"
                >
                  {{ task.isCompleted ? '已完成' : '去完成' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'categories'" class="tab-content">
          <div class="categories-grid">
            <div 
              v-for="cat in radioStore.categories" 
              :key="cat.key"
              class="category-card glass-card"
              :class="{ active: selectedCategory === cat.key }"
              @click="selectCategory(cat.key)"
            >
              <div class="category-icon-wrap">
                <component :is="categoryIcons[cat.key] || Music" class="category-icon" />
              </div>
              <span class="category-name">{{ cat.label }}</span>
            </div>
          </div>

          <div v-if="selectedCategory" class="programs-list">
            <div class="section-header">
              <h3 class="section-title">全部节目</h3>
              <button class="clear-btn" @click="selectedCategory = null">
                清除筛选
              </button>
            </div>
            <div class="program-list">
              <div 
                v-for="program in displayedPrograms" 
                :key="program.id"
                class="program-list-item glass-card"
                @click="playProgram(program)"
              >
                <div class="item-cover">
                  <span class="cover-emoji">{{ program.cover }}</span>
                </div>
                <div class="item-info">
                  <h4 class="item-title">{{ program.title }}</h4>
                  <p class="item-desc">{{ program.description }}</p>
                  <div class="item-meta">
                    <span>{{ program.host }}</span>
                    <span>·</span>
                    <span>{{ formatDuration(program.duration) }}</span>
                  </div>
                </div>
                <button class="play-btn-item">
                  <Play class="play-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'schedule'" class="tab-content">
          <div class="schedule-section glass-card">
            <div class="schedule-header">
              <h3 class="section-title">
                <Calendar class="title-icon" />
                今日节目单
              </h3>
            </div>
            <div class="schedule-list">
              <div 
                v-for="(item, index) in radioStore.todaySchedule" 
                :key="index"
                class="schedule-item"
                @click="item.program && playProgram(item.program)"
              >
                <div class="schedule-time">{{ item.time }}</div>
                <div class="schedule-divider"></div>
                <div class="schedule-program">
                  <span class="program-emoji" v-if="item.program">{{ item.program.cover }}</span>
                  <div class="program-detail">
                    <span class="program-name">{{ item.title }}</span>
                    <span class="program-type">{{ item.type }}</span>
                  </div>
                  <ChevronRight class="schedule-arrow" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'favorites'" class="tab-content">
          <div v-if="radioStore.favoritePrograms.length > 0" class="favorites-list">
            <div 
              v-for="program in radioStore.favoritePrograms" 
              :key="program.id"
              class="program-list-item glass-card"
              @click="playProgram(program)"
            >
              <div class="item-cover">
                <span class="cover-emoji">{{ program.cover }}</span>
              </div>
              <div class="item-info">
                <h4 class="item-title">{{ program.title }}</h4>
                <p class="item-desc">{{ program.description }}</p>
                <div class="item-meta">
                  <span>{{ program.host }}</span>
                  <span>·</span>
                  <span>{{ formatDuration(program.duration) }}</span>
                </div>
              </div>
              <button class="play-btn-item">
                <Play class="play-icon" />
              </button>
            </div>
          </div>
          <div v-else class="empty-state glass-card">
            <Heart class="empty-icon" />
            <h3>还没有收藏的节目</h3>
            <p>发现喜欢的节目，点击心形图标收藏它吧</p>
          </div>
        </div>
      </div>
    </div>

    <transition name="slide-up">
      <div v-if="showPlayer || radioStore.currentProgram" class="mini-player glass-card">
        <div class="player-left" @click="showPlayer = !showPlayer">
          <div class="player-cover">
            <span class="cover-emoji">{{ radioStore.currentProgram?.cover }}</span>
          </div>
          <div class="player-info">
            <h4 class="player-title">{{ radioStore.currentProgram?.title }}</h4>
            <span class="player-host">{{ radioStore.currentProgram?.host }}</span>
          </div>
        </div>
        
        <div class="player-controls">
          <button class="control-btn" @click="radioStore.seekTo(radioStore.currentTime - 15)">
            <SkipBack class="control-icon" />
          </button>
          <button class="play-btn-large" @click="handlePlayPause">
            <component :is="radioStore.isPlaying ? Pause : Play" class="play-icon-large" />
          </button>
          <button class="control-btn" @click="radioStore.seekTo(radioStore.currentTime + 15)">
            <SkipForward class="control-icon" />
          </button>
        </div>

        <div class="player-right">
          <div class="volume-control">
            <button class="volume-btn" @click="radioStore.toggleMute()">
              <component :is="radioStore.isMuted ? VolumeX : Volume2" class="volume-icon" />
            </button>
            <input 
              type="range" 
              class="volume-slider"
              min="0" 
              max="1" 
              step="0.01"
              :value="radioStore.isMuted ? 0 : radioStore.volume"
              @input="handleVolumeChange"
            />
          </div>
          <button 
            class="favorite-btn-player"
            :class="{ favorited: radioStore.currentProgram?.isFavorite }"
            @click="radioStore.currentProgram && toggleFavorite(radioStore.currentProgram, $event)"
          >
            <Heart 
              class="favorite-icon" 
              :fill="radioStore.currentProgram?.isFavorite ? 'currentColor' : 'none'" 
            />
          </button>
        </div>
      </div>
    </transition>

    <transition name="expand">
      <div v-if="showPlayer && radioStore.currentProgram" class="expanded-player-overlay" @click.self="showPlayer = false">
        <div class="expanded-player glass-card">
          <div class="expanded-cover">
            <span class="expanded-cover-emoji">{{ radioStore.currentProgram.cover }}</span>
            <div class="cover-glow"></div>
          </div>
          
          <div class="expanded-info">
            <h2 class="expanded-title">{{ radioStore.currentProgram.title }}</h2>
            <p class="expanded-host">主播：{{ radioStore.currentProgram.host }}</p>
            <p class="expanded-desc">{{ radioStore.currentProgram.description }}</p>
          </div>

          <div class="expanded-progress">
            <input 
              type="range" 
              class="progress-slider"
              min="0" 
              :max="radioStore.duration" 
              :value="radioStore.currentTime"
              @input="handleSeek"
            />
            <div class="time-display">
              <span>{{ formatDuration(radioStore.currentTime) }}</span>
              <span>{{ formatDuration(radioStore.duration) }}</span>
            </div>
          </div>

          <div class="expanded-controls">
            <button class="exp-control-btn" @click="radioStore.seekTo(radioStore.currentTime - 30)">
              <SkipBack class="exp-control-icon" />
              <span class="skip-label">-30s</span>
            </button>
            <button class="exp-play-btn" @click="handlePlayPause">
              <component :is="radioStore.isPlaying ? Pause : Play" class="exp-play-icon" />
            </button>
            <button class="exp-control-btn" @click="radioStore.seekTo(radioStore.currentTime + 30)">
              <SkipForward class="exp-control-icon" />
              <span class="skip-label">+30s</span>
            </button>
          </div>

          <div class="expanded-bottom">
            <div class="exp-volume">
              <button class="volume-btn" @click="radioStore.toggleMute()">
                <component :is="radioStore.isMuted ? VolumeX : Volume2" class="volume-icon" />
              </button>
              <input 
                type="range" 
                class="volume-slider-large"
                min="0" 
                max="1" 
                step="0.01"
                :value="radioStore.isMuted ? 0 : radioStore.volume"
                @input="handleVolumeChange"
              />
            </div>
            <button 
              class="exp-favorite-btn"
              :class="{ favorited: radioStore.currentProgram?.isFavorite }"
              @click="radioStore.currentProgram && toggleFavorite(radioStore.currentProgram, $event)"
            >
              <Heart 
                class="exp-favorite-icon" 
                :fill="radioStore.currentProgram?.isFavorite ? 'currentColor' : 'none'" 
              />
              <span>{{ radioStore.currentProgram?.isFavorite ? '已收藏' : '收藏' }}</span>
            </button>
          </div>

          <button class="close-btn" @click="showPlayer = false">
            <ChevronRight class="close-icon" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.night-radio-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%);
  overflow-x: hidden;
  padding-bottom: 120px;
}

.stars-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.page-container {
  position: relative;
  z-index: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
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

.mood-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mood-emoji {
  font-size: 1.2rem;
}

.mood-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: var(--color-text);
}

.empty-state p {
  color: var(--color-text-muted);
  margin-bottom: 24px;
  max-width: 400px;
}

.station-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.1), rgba(123, 163, 201, 0.1));
  border: 1px solid rgba(232, 180, 217, 0.2);
}

.station-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.station-icon {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232, 180, 217, 0.2);
  border-radius: 50%;
}

.radio-icon {
  width: 24px;
  height: 24px;
  color: var(--color-secondary);
}

.live-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  background: var(--color-error);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.station-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.now-playing {
  font-size: 0.9rem;
  color: var(--color-secondary);
}

.station-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.stat-icon {
  width: 16px;
  height: 16px;
}

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  width: fit-content;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-text);
  }
  
  &.active {
    background: rgba(232, 180, 217, 0.15);
    color: var(--color-secondary);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.radio-content {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.comfort-section {
  padding: 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.08), rgba(123, 163, 201, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.comfort-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.comfort-icon {
  width: 24px;
  height: 24px;
  color: var(--color-secondary);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.refresh-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text);
  }
}

.refresh-icon {
  width: 16px;
  height: 16px;
}

.comfort-text {
  font-size: 1.15rem;
  line-height: 1.8;
  color: var(--color-text);
  font-family: var(--font-display);
  font-style: italic;
  text-align: center;
  padding: 12px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  margin-top: 24px;
}

.title-icon {
  width: 22px;
  height: 22px;
  margin-right: 8px;
  vertical-align: middle;
}

.section-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
}

.program-card {
  position: relative;
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-4px);
    border-color: rgba(232, 180, 217, 0.3);
  }
}

.program-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.15), rgba(123, 163, 201, 0.15));
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  overflow: hidden;
}

.cover-emoji {
  font-size: 3rem;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity var(--transition-fast);
  border: none;
  cursor: pointer;
}

.program-card:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  width: 40px;
  height: 40px;
  color: white;
}

.program-info {
  margin-bottom: 8px;
}

.program-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.program-host {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.program-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.meta-icon {
  width: 14px;
  height: 14px;
}

.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 50%;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-error);
  }
  
  &.favorited {
    color: var(--color-error);
    background: rgba(248, 113, 113, 0.2);
  }
}

.favorite-icon {
  width: 16px;
  height: 16px;
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
  padding: 16px 20px;
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: rgba(232, 180, 217, 0.2);
  }
  
  &.completed {
    opacity: 0.6;
  }
}

.task-icon-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 222, 128, 0.15);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.task-icon {
  width: 22px;
  height: 22px;
  color: var(--color-success);
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

.task-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
  text-align: right;
}

.task-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.reward-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(251, 191, 36, 0.15);
  border-radius: var(--radius-full);
  color: var(--color-warning);
  font-weight: 600;
  font-size: 0.85rem;
}

.reward-icon {
  width: 14px;
  height: 14px;
}

.complete-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: var(--color-bg-dark);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 180, 217, 0.2);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.15), rgba(123, 163, 201, 0.15));
    border-color: var(--color-secondary);
  }
}

.category-icon-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232, 180, 217, 0.1);
  border-radius: var(--radius-md);
}

.category-icon {
  width: 24px;
  height: 24px;
  color: var(--color-secondary);
}

.category-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.clear-btn {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text);
  }
}

.programs-list {
  margin-top: 0;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.program-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
}

.item-cover {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.15), rgba(123, 163, 201, 0.15));
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.item-cover .cover-emoji {
  font-size: 1.8rem;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.play-btn-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  border: none;
  border-radius: 50%;
  color: var(--color-bg-dark);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.4);
  }
  
  .play-icon {
    width: 18px;
    height: 18px;
    margin-left: 2px;
  }
}

.schedule-section {
  padding: 24px;
}

.schedule-header {
  margin-bottom: 20px;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.schedule-item {
  display: flex;
  align-items: stretch;
  gap: 16px;
  cursor: pointer;
  padding: 12px 0;
  transition: all var(--transition-fast);
  
  &:hover {
    .schedule-program {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.schedule-time {
  width: 60px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.schedule-divider {
  position: relative;
  width: 2px;
  background: rgba(255, 255, 255, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    background: var(--color-secondary);
    border-radius: 50%;
  }
}

.schedule-program {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.program-emoji {
  font-size: 1.5rem;
}

.program-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.program-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}

.program-type {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.schedule-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
}

.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.player-cover {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(123, 163, 201, 0.2));
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.player-cover .cover-emoji {
  font-size: 1.5rem;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.player-host {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.control-icon {
  width: 20px;
  height: 20px;
}

.play-btn-large {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  border: none;
  border-radius: 50%;
  color: var(--color-bg-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(232, 180, 217, 0.4);
  }
}

.play-icon-large {
  width: 20px;
  height: 20px;
  margin-left: 2px;
}

.player-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-text);
  }
}

.volume-icon {
  width: 18px;
  height: 18px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--color-secondary);
    border-radius: 50%;
    cursor: pointer;
  }
}

.favorite-btn-player {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-error);
  }
  
  &.favorited {
    color: var(--color-error);
  }
}

.expanded-player-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  
  .expanded-player {
    transform: translateY(100%);
  }
}

.expanded-player {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  position: relative;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.expanded-cover {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.cover-glow {
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle, rgba(232, 180, 217, 0.3) 0%, transparent 70%);
  animation: glow 4s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.expanded-cover-emoji {
  font-size: 5rem;
  position: relative;
  z-index: 1;
}

.expanded-info {
  text-align: center;
}

.expanded-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.expanded-host {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.expanded-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 360px;
}

.expanded-progress {
  width: 100%;
  max-width: 360px;
}

.progress-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
  margin-bottom: 8px;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-secondary);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(232, 180, 217, 0.5);
  }
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.expanded-controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.exp-control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-text);
  }
}

.exp-control-icon {
  width: 28px;
  height: 28px;
}

.skip-label {
  font-size: 0.75rem;
}

.exp-play-btn {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  border: none;
  border-radius: 50%;
  color: var(--color-bg-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 24px rgba(232, 180, 217, 0.5);
  }
}

.exp-play-icon {
  width: 32px;
  height: 32px;
  margin-left: 4px;
}

.expanded-bottom {
  width: 100%;
  max-width: 360px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-volume {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.volume-slider-large {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--color-secondary);
    border-radius: 50%;
    cursor: pointer;
  }
}

.exp-favorite-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  &.favorited {
    color: var(--color-error);
    background: rgba(248, 113, 113, 0.1);
  }
}

.exp-favorite-icon {
  width: 18px;
  height: 18px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text);
  }
}

.close-icon {
  width: 20px;
  height: 20px;
  transform: rotate(-90deg);
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .header-section {
    flex-direction: column;
  }
  
  .station-status {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .tab-bar {
    overflow-x: auto;
    width: 100%;
    flex-wrap: nowrap;
  }
  
  .recommend-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .player-right {
    display: none;
  }
  
  .player-controls {
    gap: 8px;
  }
  
  .control-btn {
    width: 32px;
    height: 32px;
  }
  
  .play-btn-large {
    width: 40px;
    height: 40px;
  }
  
  .expanded-player {
    max-height: 100vh;
    border-radius: 0;
  }
}
</style>
