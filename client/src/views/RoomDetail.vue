<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Bookmark } from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'

const route = useRoute()
const router = useRouter()
const roomStore = useRoomStore()

const roomId = computed(() => parseInt(route.params.id))
const currentChapterIndex = ref(0)
const isLoading = ref(false)
const isReading = ref(false)
const displayedText = ref('')
const showToast = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

const currentRoom = computed(() => roomStore.currentRoom)
const chapters = computed(() => currentRoom.value?.chapters || [])
const currentChapter = computed(() => chapters.value[currentChapterIndex.value])
const totalChapters = computed(() => chapters.value.length)

async function loadRoom() {
  isLoading.value = true
  const result = await roomStore.fetchRoomDetail(roomId.value)
  if (result.success) {
    const savedProgress = currentRoom.value?.currentChapter || 0
    currentChapterIndex.value = Math.max(0, savedProgress)
    if (chapters.value[currentChapterIndex.value]) {
      startReading()
    }
  }
  isLoading.value = false
}

function startReading() {
  if (!currentChapter.value) return
  
  isReading.value = true
  displayedText.value = ''
  
  const text = currentChapter.value.content
  let index = 0
  
  const typeWriter = () => {
    if (index < text.length) {
      displayedText.value += text.charAt(index)
      index++
      setTimeout(typeWriter, 30)
    } else {
      isReading.value = false
      markAsRead()
    }
  }
  
  typeWriter()
}

function skipAnimation() {
  if (currentChapter.value) {
    displayedText.value = currentChapter.value.content
    isReading.value = false
    markAsRead()
  }
}

async function markAsRead() {
  const chapterNumber = currentChapterIndex.value + 1
  await roomStore.readChapter(roomId.value, chapterNumber)
}

function prevChapter() {
  if (currentChapterIndex.value > 0) {
    currentChapterIndex.value--
    startReading()
  }
}

function nextChapter() {
  if (currentChapterIndex.value < totalChapters.value - 1) {
    currentChapterIndex.value++
    startReading()
  } else {
    toastType.value = 'success'
    toastMessage.value = '🎉 恭喜你已读完这个房间的所有故事！'
    showToast.value = true
  }
}

function goBack() {
  router.push('/rooms')
}

onMounted(() => {
  loadRoom()
})
</script>

<template>
  <div class="page-container">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载故事中...</p>
    </div>
    
    <div v-else-if="currentRoom" class="room-detail">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="back-icon" />
        <span>返回房间列表</span>
      </button>
      
      <div class="room-header">
        <h1 class="room-title">{{ currentRoom.name }}</h1>
        <p class="room-description">{{ currentRoom.description }}</p>
        
        <div class="reading-progress">
          <BookOpen class="progress-icon" />
          <span class="progress-text">
            第 {{ currentChapterIndex + 1 }} / {{ totalChapters }} 章
          </span>
          <div class="progress-bar-bg">
            <div 
              class="progress-bar"
              :style="{ width: `${((currentChapterIndex + 1) / totalChapters) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
      
      <div class="chapters-nav">
        <div 
          v-for="(chapter, index) in chapters"
          :key="chapter.id"
          class="chapter-dot"
          :class="{ 
            'active': index === currentChapterIndex,
            'read': index < currentChapterIndex || chapter.isUnlocked,
            'locked': !chapter.isUnlocked && index > currentChapterIndex
          }"
          @click="chapter.isUnlocked && (currentChapterIndex = index, startReading())"
        >
          <span class="dot-number">{{ index + 1 }}</span>
          <span class="dot-label">{{ chapter.title }}</span>
        </div>
      </div>
      
      <div v-if="currentChapter" class="story-container glass-card">
        <div class="story-header">
          <Bookmark class="story-icon" />
          <h2 class="story-title">{{ currentChapter.title }}</h2>
        </div>
        
        <div class="story-content">
          <p class="story-text">{{ displayedText }}</p>
          <span v-if="isReading" class="cursor">|</span>
        </div>
        
        <div v-if="isReading" class="skip-container">
          <button class="btn-secondary" @click="skipAnimation">
            跳过动画
          </button>
        </div>
        
        <div class="story-footer">
          <button 
            class="nav-btn prev"
            :disabled="currentChapterIndex === 0 || isReading"
            @click="prevChapter"
          >
            <ChevronLeft class="nav-icon" />
            <span>上一章</span>
          </button>
          
          <button 
            class="nav-btn next"
            :disabled="currentChapterIndex === totalChapters - 1 || isReading"
            @click="nextChapter"
          >
            <span>下一章</span>
            <ChevronRight class="nav-icon" />
          </button>
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

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
}

.back-icon {
  width: 18px;
  height: 18px;
}

.room-header {
  text-align: center;
  margin-bottom: 32px;
}

.room-title {
  font-size: 2.2rem;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.room-description {
  color: var(--color-text-muted);
  font-size: 1rem;
  margin-bottom: 24px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.reading-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  margin: 0 auto;
}

.progress-icon {
  width: 24px;
  height: 24px;
  color: var(--color-secondary);
}

.progress-text {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.progress-bar-bg {
  width: 100%;
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

.chapters-nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}

.chapter-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover:not(.locked) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.active .dot-number {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    color: var(--color-bg-dark);
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(232, 180, 217, 0.5);
  }
  
  &.read .dot-number {
    background: rgba(74, 222, 128, 0.2);
    border-color: var(--color-success);
  }
  
  &.locked {
    opacity: 0.5;
    cursor: not-allowed;
    
    .dot-number {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.dot-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all var(--transition-normal);
}

.dot-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  max-width: 80px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  .chapter-dot.active & {
    color: var(--color-secondary);
  }
}

.story-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}

.story-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.story-icon {
  width: 28px;
  height: 28px;
  color: var(--color-secondary);
}

.story-title {
  font-size: 1.5rem;
  color: var(--color-text);
}

.story-content {
  min-height: 200px;
  margin-bottom: 32px;
  line-height: 2;
  font-size: 1.05rem;
  color: var(--color-text);
}

.story-text {
  white-space: pre-wrap;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cursor {
  animation: blink 1s infinite;
  color: var(--color-secondary);
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.skip-container {
  text-align: center;
  margin-bottom: 24px;
}

.story-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
    transform: translateX(0);
  }
  
  &.prev:hover:not(:disabled) {
    transform: translateX(-4px);
  }
  
  &.next:hover:not(:disabled) {
    transform: translateX(4px);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.nav-icon {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .room-title {
    font-size: 1.6rem;
  }
  
  .story-container {
    padding: 24px 20px;
  }
  
  .story-title {
    font-size: 1.2rem;
  }
  
  .story-content {
    font-size: 1rem;
    line-height: 1.8;
  }
  
  .chapters-nav {
    gap: 8px;
  }
  
  .dot-label {
    display: none;
  }
  
  .story-footer {
    flex-direction: column;
  }
  
  .nav-btn {
    justify-content: center;
    width: 100%;
  }
}
</style>
