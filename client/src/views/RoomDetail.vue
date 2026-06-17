<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { useAchievementStore } from '@/stores/achievement'
import { useNotificationStore } from '@/stores/notification'
import { useCrisisCenterStore } from '@/stores/crisisCenter'
import { 
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Bookmark, 
  GitBranch, Clock, History, X, Lock, Check, Sparkles,
  PenLine, Heart, Smile, CloudRain, Zap, Coffee
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const roomStore = useRoomStore()
const achievementStore = useAchievementStore()
const notificationStore = useNotificationStore()
const crisisStore = useCrisisCenterStore()

const roomId = computed(() => parseInt(route.params.id))
const currentChapterIndex = ref(0)
const isLoading = ref(false)
const isReading = ref(false)
const displayedText = ref('')

const showBranchSelector = ref(false)
const showHistoryPanel = ref(false)
const showBranchChoice = ref(false)
const branchChoices = ref([])

const showNoteEditor = ref(false)
const noteContent = ref('')
const selectedMoodTags = ref([])
const isSavingNote = ref(false)
const currentNote = computed(() => roomStore.currentNote)

const moodTagOptions = [
  { key: '感动', label: '感动', icon: Heart, color: '#ff6b9d' },
  { key: '开心', label: '开心', icon: Smile, color: '#ffd93d' },
  { key: '治愈', label: '治愈', icon: Coffee, color: '#6bcf7f' },
  { key: '沉思', label: '沉思', icon: CloudRain, color: '#6b9dff' },
  { key: '震撼', label: '震撼', icon: Zap, color: '#c77dff' }
]

const currentRoom = computed(() => roomStore.currentRoom)
const chapters = computed(() => currentRoom.value?.chapters || [])
const currentChapter = computed(() => chapters.value[currentChapterIndex.value])
const totalChapters = computed(() => chapters.value.length)
const currentBranch = computed(() => roomStore.currentBranch)
const branches = computed(() => roomStore.branches)
const storyHistory = computed(() => roomStore.storyHistory)
const branchProgress = computed(() => currentRoom.value?.branchProgress || [])

const branchPoints = computed(() => currentRoom.value?.branchPoints || [])
const currentBranchPoint = computed(() => {
  if (!currentChapter.value) return null
  return branchPoints.value.find(bp => bp.chapterNumber === currentChapter.value.chapterNumber)
})

const currentBranchInfo = computed(() => {
  return branches.value.find(b => b.branch_key === currentBranch.value)
})

function formatConditionDesc(conditions) {
  if (!conditions) return '默认故事线'
  const descs = []
  if (conditions.moodTypes && conditions.moodTypes.length) {
    const moodLabels = { happy: '开心', calm: '平静', sad: '忧伤', anxious: '焦虑', angry: '愤怒' }
    const moodNames = conditions.moodTypes.map(m => moodLabels[m] || m).join('、')
    descs.push(`近期心情以「${moodNames}」为主`)
  }
  if (conditions.streakDays) {
    descs.push(`连续记录 ${conditions.streakDays} 天`)
  }
  if (conditions.moodTypeCount) {
    descs.push(`体验过 ${conditions.moodTypeCount} 种心情`)
  }
  if (conditions.completedTasks && conditions.completedTasks.length) {
    descs.push('完成特定任务')
  }
  return descs.join('；') || '特殊故事线'
}

async function loadRoom(branch = null) {
  isLoading.value = true
  const result = await roomStore.fetchRoomDetail(roomId.value, branch)
  if (result.success) {
    const savedProgress = currentRoom.value?.currentChapter || 0
    currentChapterIndex.value = Math.max(0, savedProgress > 0 ? savedProgress - 1 : 0)
    if (chapters.value[currentChapterIndex.value]) {
      if (chapters.value[currentChapterIndex.value].isRead) {
        displayedText.value = chapters.value[currentChapterIndex.value].content
        isReading.value = false
        loadCurrentNote()
      } else {
        startReading()
      }
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
      checkBranchPoint()
    }
  }
  
  typeWriter()
}

function skipAnimation() {
  if (currentChapter.value) {
    displayedText.value = currentChapter.value.content
    isReading.value = false
    markAsRead()
    checkBranchPoint()
  }
}

async function markAsRead() {
  const chapterNumber = currentChapterIndex.value + 1
  const result = await roomStore.readChapter(roomId.value, chapterNumber, currentBranch.value)

  if (result?.success) {
    if (result.notificationEvents && result.notificationEvents.length > 0) {
      notificationStore.push(result.notificationEvents)
    }

    if (result.crisisAnalysis) {
      crisisStore.$patch({ analysis: result.crisisAnalysis })
    } else {
      crisisStore.fetchAnalysis()
    }

    achievementStore.fetchTasks()
    achievementStore.fetchTaskStats()
    achievementStore.fetchReminders()
    loadCurrentNote()
  }
}

function checkBranchPoint() {
  if (currentChapter.value?.isBranchPoint && currentBranchPoint.value) {
    branchChoices.value = currentBranchPoint.value.branches
    showBranchChoice.value = true
  }
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
    notificationStore.success('🎉 恭喜你已读完这条故事线！', '故事线完成')
  }
}

function goBack() {
  router.push('/rooms')
}

async function switchBranch(branchKey) {
  if (branchKey === currentBranch.value) {
    showBranchSelector.value = false
    return
  }
  
  const branch = branches.value.find(b => b.branch_key === branchKey)
  if (!branch?.isAvailable && !branch?.isUnlocked) {
    notificationStore.warning('🔒 暂不满足这条故事线的解锁条件', '无法切换')
    return
  }
  
  showBranchSelector.value = false
  isLoading.value = true
  
  if (branch?.isUnlocked) {
    await roomStore.chooseBranch(roomId.value, branchKey)
    await loadRoom(branchKey)
  } else {
    const result = await roomStore.chooseBranch(roomId.value, branchKey)
    if (result.success) {
      await loadRoom(branchKey)
    } else {
      notificationStore.error(result.message, '切换失败')
    }
  }
  
  isLoading.value = false
}

async function selectBranchChoice(branchKey) {
  const choice = branchChoices.value.find(c => c.branch_key === branchKey)
  if (!choice?.isAvailable) {
    notificationStore.warning('🔒 暂不满足进入这条故事线的条件', '无法进入')
    return
  }
  
  showBranchChoice.value = false
  isLoading.value = true
  
  await roomStore.chooseBranch(roomId.value, branchKey)
  await loadRoom(branchKey)
  
  isLoading.value = false
}

async function jumpToHistory(storyId) {
  showHistoryPanel.value = false
  isLoading.value = true
  
  const result = await roomStore.jumpToStory(roomId.value, storyId)
  if (result.success) {
    await loadRoom(result.data.currentBranch)
    const idx = chapters.value.findIndex(c => c.id === storyId)
    if (idx >= 0) {
      currentChapterIndex.value = idx
      displayedText.value = result.data.story.content
      isReading.value = false
    }
  } else {
    notificationStore.error(result.message, '跳转失败')
  }
  
  isLoading.value = false
}

function goToChapter(index) {
  const chapter = chapters.value[index]
  if (!chapter?.isUnlocked) return
  
  currentChapterIndex.value = index
  startReading()
  loadCurrentNote()
}

async function loadCurrentNote() {
  if (!currentChapter.value?.id || !currentChapter.value?.isRead) {
    roomStore.currentNote = null
    return
  }
  
  try {
    await roomStore.fetchStoryNote(roomId.value, currentChapter.value.id)
    if (currentNote.value) {
      noteContent.value = currentNote.value.content || ''
      selectedMoodTags.value = currentNote.value.moodTags || []
    } else {
      noteContent.value = ''
      selectedMoodTags.value = []
    }
  } catch (e) {
    console.error('加载札记失败', e)
  }
}

function openNoteEditor() {
  if (currentNote.value) {
    noteContent.value = currentNote.value.content
    selectedMoodTags.value = [...(currentNote.value.moodTags || [])]
  } else {
    noteContent.value = ''
    selectedMoodTags.value = []
  }
  showNoteEditor.value = true
}

function closeNoteEditor() {
  showNoteEditor.value = false
}

function toggleMoodTag(tagKey) {
  const idx = selectedMoodTags.value.indexOf(tagKey)
  if (idx >= 0) {
    selectedMoodTags.value.splice(idx, 1)
  } else {
    if (selectedMoodTags.value.length < 3) {
      selectedMoodTags.value.push(tagKey)
    }
  }
}

async function saveNote() {
  if (!noteContent.value.trim()) {
    notificationStore.warning('请输入札记内容', '内容不能为空')
    return
  }
  
  isSavingNote.value = true
  
  try {
    const result = await roomStore.createNote(roomId.value, {
      storyId: currentChapter.value.id,
      content: noteContent.value.trim(),
      moodTags: selectedMoodTags.value
    })
    
    if (result.success) {
      notificationStore.success('札记已保存', '保存成功')
      showNoteEditor.value = false
      achievementStore.fetchTasks()
      achievementStore.fetchTaskStats()
    } else {
      notificationStore.error(result.message || '保存失败', '保存失败')
    }
  } catch (e) {
    notificationStore.error('保存札记失败', '网络错误')
  } finally {
    isSavingNote.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
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
      <div class="top-bar">
        <button class="back-btn" @click="goBack">
          <ArrowLeft class="back-icon" />
          <span>返回房间列表</span>
        </button>
        
        <div class="top-actions">
          <button class="icon-btn" @click="showHistoryPanel = true" title="阅读历史">
            <History class="icon" />
            <span class="btn-text">历史</span>
          </button>
          <button class="icon-btn" @click="showBranchSelector = true" title="故事线">
            <GitBranch class="icon" />
            <span class="btn-text">故事线</span>
          </button>
        </div>
      </div>
      
      <div class="room-header">
        <h1 class="room-title">{{ currentRoom.name }}</h1>
        <p class="room-description">{{ currentRoom.description }}</p>
        
        <div class="branch-indicator">
          <GitBranch class="branch-icon" />
          <span class="branch-label">
            当前：{{ currentBranchInfo?.branch_label || '主线故事' }}
          </span>
          <span class="branch-desc">
            {{ formatConditionDesc(currentBranchInfo?.conditions) }}
          </span>
        </div>
        
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
            'read': chapter.isRead,
            'locked': !chapter.isUnlocked
          }"
          @click="chapter.isUnlocked && goToChapter(index)"
        >
          <span class="dot-number">{{ index + 1 }}</span>
          <span class="dot-label">{{ chapter.title }}</span>
        </div>
      </div>
      
      <div v-if="currentChapter" class="story-container glass-card">
        <div class="story-header">
          <Bookmark class="story-icon" />
          <h2 class="story-title">{{ currentChapter.title }}</h2>
          <span v-if="currentChapter.isEnding" class="ending-badge">
            <Sparkles class="ending-icon" />
            结局
          </span>
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
        
        <div v-if="!isReading && currentChapter?.isRead" class="note-section">
          <div v-if="currentNote" class="note-display">
            <div class="note-header">
              <div class="note-title">
                <PenLine class="note-icon" />
                <span>章节札记</span>
              </div>
              <button class="note-edit-btn" @click="openNoteEditor">
                编辑
              </button>
            </div>
            <div class="note-content">
              {{ currentNote.content }}
            </div>
            <div v-if="currentNote.moodTags?.length" class="note-tags">
              <span 
                v-for="tag in currentNote.moodTags" 
                :key="tag"
                class="note-tag"
              >
                {{ tag }}
              </span>
            </div>
            <div class="note-date">
              {{ formatDate(currentNote.updatedAt || currentNote.createdAt) }}
            </div>
          </div>
          
          <div v-else class="note-empty">
            <PenLine class="note-empty-icon" />
            <p class="note-empty-text">读完这一章，有什么想说的吗？</p>
            <button class="btn-primary note-write-btn" @click="openNoteEditor">
              写下札记
            </button>
          </div>
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

    <div v-if="showBranchSelector" class="modal-overlay" @click.self="showBranchSelector = false">
      <div class="modal branch-selector-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <GitBranch class="title-icon" />
            选择故事线
          </h3>
          <button class="close-btn" @click="showBranchSelector = false">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <div class="branch-list">
            <div 
              v-for="branch in branches" 
              :key="branch.branch_key"
              class="branch-card"
              :class="{ 
                'active': branch.branch_key === currentBranch,
                'available': branch.isAvailable || branch.isUnlocked,
                'locked': !branch.isAvailable && !branch.isUnlocked
              }"
              @click="switchBranch(branch.branch_key)"
            >
              <div class="branch-card-header">
                <span class="branch-name">{{ branch.branch_label || '主线故事' }}</span>
                <span v-if="branch.branch_key === currentBranch" class="current-tag">当前</span>
                <Lock v-if="!branch.isAvailable && !branch.isUnlocked" class="lock-icon" />
                <Check v-else-if="branch.isUnlocked" class="check-icon" />
              </div>
              <p class="branch-condition">{{ formatConditionDesc(branch.conditions) }}</p>
              <div class="branch-meta">
                <span class="meta-item">
                  <BookOpen class="meta-icon" />
                  {{ branch.maxChapterReached || 0 }} / {{ currentRoom?.totalChapters || 0 }} 章
                </span>
                <span v-if="branch.lastReadAt" class="meta-item">
                  <Clock class="meta-icon" />
                  {{ formatDate(branch.lastReadAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showBranchChoice" class="modal-overlay" @click.self="showBranchChoice = false">
      <div class="modal branch-choice-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <GitBranch class="title-icon" />
            故事分岔
          </h3>
          <button class="close-btn" @click="showBranchChoice = false">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <p class="choice-desc">你来到了故事的分岔路口，选择一条路继续你的旅程吧~</p>
          <div class="branch-choices">
            <div 
              v-for="choice in branchChoices" 
              :key="choice.branch_key"
              class="branch-choice-card"
              :class="{ 
                'available': choice.isAvailable || choice.hasRead,
                'locked': !choice.isAvailable && !choice.hasRead
              }"
              @click="selectBranchChoice(choice.branch_key)"
            >
              <div class="choice-title">
                <span class="choice-name">{{ choice.branch_label || choice.title }}</span>
                <Lock v-if="!choice.isAvailable && !choice.hasRead" class="lock-icon" />
                <Check v-else-if="choice.hasRead" class="check-icon read" />
              </div>
              <p class="choice-condition">{{ formatConditionDesc(choice.conditions) }}</p>
              <span v-if="choice.isAvailable || choice.hasRead" class="choice-action">
                {{ choice.hasRead ? '重新体验' : '进入故事线' }}
              </span>
              <span v-else class="choice-locked">未解锁</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showNoteEditor" class="modal-overlay" @click.self="closeNoteEditor">
      <div class="modal note-editor-modal">
        <div class="modal-header">
          <h3 class="modal-title">
            <PenLine class="title-icon" />
            章节札记
          </h3>
          <button class="close-btn" @click="closeNoteEditor">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <div class="note-chapter-info">
            <span class="chapter-label">第 {{ currentChapterIndex + 1 }} 章</span>
            <span class="chapter-name">{{ currentChapter?.title }}</span>
          </div>
          
          <div class="mood-tags-section">
            <p class="section-label">心情标签（最多选3个）</p>
            <div class="mood-tags">
              <button
                v-for="tag in moodTagOptions"
                :key="tag.key"
                class="mood-tag-btn"
                :class="{ active: selectedMoodTags.includes(tag.key) }"
                :style="{ '--tag-color': tag.color }"
                @click="toggleMoodTag(tag.key)"
              >
                <component :is="tag.icon" class="tag-icon" />
                <span>{{ tag.label }}</span>
              </button>
            </div>
          </div>
          
          <div class="note-input-section">
            <p class="section-label">写下你的感受</p>
            <textarea
              v-model="noteContent"
              class="note-textarea"
              placeholder="这一章给你带来了什么感受？有什么想法想记录下来..."
              rows="6"
            ></textarea>
            <div class="note-word-count">
              {{ noteContent.length }} 字
            </div>
          </div>
          
          <div class="note-editor-actions">
            <button class="btn-secondary" @click="closeNoteEditor">
              取消
            </button>
            <button 
              class="btn-primary" 
              :disabled="isSavingNote || !noteContent.trim()"
              @click="saveNote"
            >
              {{ isSavingNote ? '保存中...' : '保存札记' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showHistoryPanel" class="side-panel" @click.self="showHistoryPanel = false">
      <div class="panel-content">
        <div class="panel-header">
          <h3 class="panel-title">
            <History class="title-icon" />
            阅读历史
          </h3>
          <button class="close-btn" @click="showHistoryPanel = false">
            <X class="close-icon" />
          </button>
        </div>
        <div class="panel-body">
          <div v-if="storyHistory.length === 0" class="empty-history">
            <Clock class="empty-icon" />
            <p>暂无阅读记录</p>
          </div>
          <div v-else class="history-list">
            <div 
              v-for="item in storyHistory" 
              :key="item.id"
              class="history-item"
              @click="jumpToHistory(item.story_id)"
            >
              <div class="history-title">{{ item.title }}</div>
              <div class="history-meta">
                <span class="history-branch">{{ item.branch_label || item.branch_key }}</span>
                <span class="history-date">第{{ item.chapter_number }}章 · {{ formatDate(item.read_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

.top-actions {
  display: flex;
  gap: 12px;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
  
  .icon {
    width: 16px;
    height: 16px;
  }
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
  margin-bottom: 20px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.branch-indicator {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  background: rgba(232, 180, 217, 0.1);
  border: 1px solid rgba(232, 180, 217, 0.2);
  border-radius: var(--radius-full);
  margin-bottom: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.branch-icon {
  width: 18px;
  height: 18px;
  color: var(--color-secondary);
}

.branch-label {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.95rem;
}

.branch-desc {
  color: var(--color-text-muted);
  font-size: 0.85rem;
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
  position: relative;
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

.ending-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 180, 100, 0.2));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: var(--radius-full);
  color: #ffd700;
  font-size: 0.8rem;
  font-weight: 600;
}

.ending-icon {
  width: 14px;
  height: 14px;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
  color: var(--color-text);
  margin: 0;
}

.title-icon {
  width: 22px;
  height: 22px;
  color: var(--color-secondary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 20px 24px 24px;
  overflow-y: auto;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.branch-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &.available:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(232, 180, 217, 0.3);
  }
  
  &.active {
    background: rgba(232, 180, 217, 0.15);
    border-color: var(--color-secondary);
  }
  
  &.locked {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.branch-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.branch-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
  flex: 1;
}

.current-tag {
  padding: 2px 10px;
  background: var(--color-secondary);
  color: var(--color-bg-dark);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.lock-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.check-icon {
  width: 18px;
  height: 18px;
  color: var(--color-success);
  
  &.read {
    color: var(--color-secondary);
  }
}

.branch-condition {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 12px 0;
}

.branch-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.meta-icon {
  width: 14px;
  height: 14px;
}

.branch-choice-modal {
  max-width: 600px;
}

.choice-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  font-size: 1rem;
}

.branch-choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.branch-choice-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  
  &.available:hover {
    background: rgba(232, 180, 217, 0.15);
    border-color: var(--color-secondary);
    transform: translateY(-2px);
  }
  
  &.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.choice-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.choice-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1.05rem;
}

.choice-condition {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 12px 0;
  min-height: 40px;
}

.choice-action {
  color: var(--color-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

.choice-locked {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 360px;
  background: var(--color-bg-dark);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.panel-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  color: var(--color-text);
  margin: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-muted);
  
  p {
    margin-top: 12px;
    font-size: 0.9rem;
  }
}

.empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.history-title {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.history-branch {
  color: var(--color-secondary);
}

.btn-secondary {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-bg-dark);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(232, 180, 217, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.note-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.note-display {
  background: rgba(232, 180, 217, 0.08);
  border: 1px solid rgba(232, 180, 217, 0.2);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.note-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--color-secondary);
}

.note-icon {
  width: 18px;
  height: 18px;
}

.note-edit-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
}

.note-content {
  color: var(--color-text);
  line-height: 1.8;
  font-size: 0.95rem;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.note-tag {
  padding: 4px 12px;
  background: rgba(232, 180, 217, 0.2);
  color: var(--color-secondary);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
}

.note-date {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-align: right;
}

.note-empty {
  text-align: center;
  padding: 32px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
}

.note-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  opacity: 0.6;
}

.note-empty-text {
  color: var(--color-text-muted);
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.note-write-btn {
  padding: 8px 20px;
  font-size: 0.85rem;
}

.note-editor-modal {
  max-width: 560px;
}

.note-chapter-info {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chapter-label {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(232, 180, 217, 0.15);
  color: var(--color-secondary);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.chapter-name {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.section-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
  font-weight: 500;
}

.mood-tags-section {
  margin-bottom: 24px;
}

.mood-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mood-tag-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.active {
    background: color-mix(in srgb, var(--tag-color) 20%, transparent);
    border-color: var(--tag-color);
    color: var(--tag-color);
  }
}

.tag-icon {
  width: 16px;
  height: 16px;
}

.note-input-section {
  margin-bottom: 24px;
}

.note-textarea {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--color-secondary);
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: var(--color-text-muted);
  }
}

.note-word-count {
  text-align: right;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-top: 8px;
}

.note-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  
  .top-actions {
    .btn-text {
      display: none;
    }
  }
  
  .branch-choices {
    grid-template-columns: 1fr;
  }
  
  .side-panel {
    max-width: 100%;
  }
}
</style>
