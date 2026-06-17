<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMemoryLetterStore } from '@/stores/memoryLetter'
import { useNotificationStore } from '@/stores/notification'
import {
  Mail, MailOpen, Clock, CheckCircle, Send, X, Plus,
  Calendar, Heart, BookOpen, Sparkles, ChevronRight,
  Trash2, Ban, Eye, Archive, PenTool, Star,
  Smile, Cloud, Sun, CloudRain, Wind, Lock
} from 'lucide-vue-next'

const memoryLetterStore = useMemoryLetterStore()
const notificationStore = useNotificationStore()

const activeTab = ref('pending')
const isLoading = ref(false)
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const selectedLetter = ref(null)

const formData = ref({
  title: '',
  letterContent: '',
  sourceDate: '',
  deliveryDate: '',
  includeMood: true,
  includeRoom: true,
  includeGrowth: true
})

const moodLabels = {
  happy: { label: '开心', color: '#FBBF24', bgColor: 'rgba(251, 191, 36, 0.15)' },
  calm: { label: '平静', color: '#60A5FA', bgColor: 'rgba(96, 165, 250, 0.15)' },
  sad: { label: '难过', color: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.15)' },
  anxious: { label: '焦虑', color: '#F472B6', bgColor: 'rgba(244, 114, 182, 0.15)' },
  angry: { label: '愤怒', color: '#F87171', bgColor: 'rgba(248, 113, 113, 0.15)' }
}

const segmentLabels = {
  morning: '早晨',
  afternoon: '下午',
  evening: '晚间',
  day: '全天'
}

const stats = computed(() => memoryLetterStore.stats)
const letters = computed(() => memoryLetterStore.letters)
const totalCount = computed(() => memoryLetterStore.totalCount)
const currentPage = computed(() => memoryLetterStore.currentPage)
const totalPages = computed(() => memoryLetterStore.totalPages)
const config = computed(() => memoryLetterStore.config)
const upcomingLetters = computed(() => memoryLetterStore.upcomingLetters)

const filteredLetters = computed(() => {
  if (activeTab.value === 'all') return letters.value
  return letters.value.filter(l => l.status === activeTab.value)
})

const tabOptions = [
  { value: 'pending', label: '待投递', icon: Clock },
  { value: 'delivered', label: '已送达', icon: MailOpen },
  { value: 'read', label: '已阅读', icon: CheckCircle },
  { value: 'all', label: '全部', icon: Archive }
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getDaysUntilDelivery(deliveryDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delivery = new Date(deliveryDate)
  delivery.setHours(0, 0, 0, 0)
  const diffTime = delivery.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function getStatusInfo(status) {
  const statusMap = {
    pending: { label: '待投递', color: '#60A5FA', icon: Clock },
    delivered: { label: '已送达', color: '#34D399', icon: MailOpen },
    read: { label: '已阅读', color: '#A78BFA', icon: CheckCircle },
    cancelled: { label: '已取消', color: '#9CA3AF', icon: Ban }
  }
  return statusMap[status] || statusMap.pending
}

function getMoodEmoji(moodType) {
  const emojiMap = {
    happy: '😊',
    calm: '😌',
    sad: '😢',
    anxious: '😰',
    angry: '😠'
  }
  return emojiMap[moodType] || '😐'
}

async function loadLetters() {
  isLoading.value = true
  try {
    const params = {
      page: 1,
      pageSize: 20
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    await memoryLetterStore.fetchLetters(params)
  } catch (error) {
    console.error('加载信件失败:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    await memoryLetterStore.fetchStats()
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

async function loadConfig() {
  try {
    await memoryLetterStore.fetchConfig()
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

async function loadUpcoming() {
  try {
    await memoryLetterStore.fetchUpcoming(5)
  } catch (error) {
    console.error('加载即将送达信件失败:', error)
  }
}

function openCreateModal() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  formData.value = {
    title: '',
    letterContent: '',
    sourceDate: todayStr,
    deliveryDate: '',
    includeMood: true,
    includeRoom: true,
    includeGrowth: true
  }
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function handleCreateLetter() {
  if (!formData.value.title.trim()) {
    notificationStore.error('请输入信件标题')
    return
  }
  if (!formData.value.letterContent.trim()) {
    notificationStore.error('请输入信件内容')
    return
  }
  if (!formData.value.sourceDate) {
    notificationStore.error('请选择来源日期')
    return
  }
  if (!formData.value.deliveryDate) {
    notificationStore.error('请选择投递日期')
    return
  }

  isLoading.value = true
  try {
    const result = await memoryLetterStore.createLetter({
      title: formData.value.title,
      letterContent: formData.value.letterContent,
      sourceDate: formData.value.sourceDate,
      deliveryDate: formData.value.deliveryDate,
      includeMood: formData.value.includeMood,
      includeRoom: formData.value.includeRoom,
      includeGrowth: formData.value.includeGrowth
    })

    if (result.success) {
      notificationStore.success('信件创建成功，已存入回忆邮局')
      closeCreateModal()
      loadLetters()
      loadStats()
      loadUpcoming()
    } else {
      notificationStore.error(result.message || '创建失败')
    }
  } catch (error) {
    notificationStore.error(error.message || '创建失败')
  } finally {
    isLoading.value = false
  }
}

async function openLetterDetail(letter) {
  isLoading.value = true
  try {
    const result = await memoryLetterStore.fetchLetterDetail(letter.id)
    if (result.success) {
      selectedLetter.value = result.data
      showDetailModal.value = true
      
      if (letter.status === 'delivered') {
        await memoryLetterStore.markAsRead(letter.id)
        loadLetters()
        loadStats()
      }
    }
  } catch (error) {
    console.error('加载信件详情失败:', error)
  } finally {
    isLoading.value = false
  }
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedLetter.value = null
}

async function handleCancelLetter(letter) {
  if (!confirm('确定要取消这封信件吗？取消后无法恢复。')) return
  
  try {
    const result = await memoryLetterStore.cancelLetter(letter.id)
    if (result.success) {
      notificationStore.success('信件已取消')
      loadLetters()
      loadStats()
      loadUpcoming()
    } else {
      notificationStore.error(result.message || '取消失败')
    }
  } catch (error) {
    notificationStore.error(error.message || '取消失败')
  }
}

async function handleDeleteLetter(letter) {
  if (!confirm('确定要删除这封信件吗？删除后无法恢复。')) return
  
  try {
    const result = await memoryLetterStore.deleteLetter(letter.id)
    if (result.success) {
      notificationStore.success('信件已删除')
      closeDetailModal()
      loadLetters()
      loadStats()
    } else {
      notificationStore.error(result.message || '删除失败')
    }
  } catch (error) {
    notificationStore.error(error.message || '删除失败')
  }
}

function setMinDeliveryDate() {
  if (!formData.value.sourceDate || !config.value) return
  
  const source = new Date(formData.value.sourceDate)
  const minDelivery = new Date(source)
  minDelivery.setDate(minDelivery.getDate() + config.value.minDeliveryDays)
  
  return minDelivery.toISOString().split('T')[0]
}

function setMaxDeliveryDate() {
  if (!formData.value.sourceDate || !config.value) return
  
  const source = new Date(formData.value.sourceDate)
  const maxDelivery = new Date(source)
  maxDelivery.setDate(maxDelivery.getDate() + config.value.maxDeliveryDays)
  
  return maxDelivery.toISOString().split('T')[0]
}

onMounted(() => {
  loadConfig()
  loadStats()
  loadLetters()
  loadUpcoming()
})
</script>

<template>
  <div class="memory-letter-page">
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">
          <Mail class="title-icon" />
          回忆邮局
        </h1>
        <p class="page-subtitle">将珍贵的记忆封存，寄给未来的自己</p>
      </div>
      <button class="create-btn" @click="openCreateModal">
        <Plus class="btn-icon" />
        写一封信
      </button>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon pending">
          <Clock />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats?.pending || 0 }}</span>
          <span class="stat-label">待投递</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon delivered">
          <MailOpen />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats?.delivered || 0 }}</span>
          <span class="stat-label">已送达</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon read">
          <CheckCircle />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats?.read || 0 }}</span>
          <span class="stat-label">已阅读</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">
          <Archive />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats?.total || 0 }}</span>
          <span class="stat-label">总信件</span>
        </div>
      </div>
    </div>

    <div v-if="upcomingLetters && upcomingLetters.length > 0" class="upcoming-section">
      <h3 class="section-title">
        <Clock class="section-icon" />
        即将送达
      </h3>
      <div class="upcoming-list">
        <div
          v-for="letter in upcomingLetters"
          :key="letter.id"
          class="upcoming-item"
          @click="openLetterDetail(letter)"
        >
          <div class="upcoming-icon">
            <Mail />
          </div>
          <div class="upcoming-info">
            <span class="upcoming-title">{{ letter.title }}</span>
            <span class="upcoming-date">
              {{ formatDate(letter.deliveryDate) }}送达
              <span v-if="getDaysUntilDelivery(letter.deliveryDate) > 0" class="days-count">
                (还有 {{ getDaysUntilDelivery(letter.deliveryDate) }} 天)
              </span>
              <span v-else class="days-count today">
                (今天送达)
              </span>
            </span>
          </div>
          <ChevronRight class="upcoming-arrow" />
        </div>
      </div>
    </div>

    <div class="letters-section">
      <div class="tabs">
        <button
          v-for="tab in tabOptions"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value; loadLetters()"
        >
          <component :is="tab.icon" class="tab-icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div class="letters-content">
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredLetters.length === 0" class="empty-state">
          <Mail class="empty-icon" />
          <p class="empty-text">
            暂无{{ tabOptions.find(t => t.value === activeTab)?.label || '' }}信件
          </p>
          <button v-if="activeTab === 'pending'" class="empty-btn" @click="openCreateModal">
            <Plus class="btn-icon" />
            写第一封信
          </button>
        </div>

        <div v-else class="letters-grid">
          <div
            v-for="letter in filteredLetters"
            :key="letter.id"
            class="letter-card"
            :class="[letter.status, { 'locked': letter.status === 'pending' }]"
            @click="openLetterDetail(letter)"
          >
            <div class="letter-header">
              <div class="letter-status">
                <component :is="getStatusInfo(letter.status).icon" class="status-icon" />
                <span :style="{ color: getStatusInfo(letter.status).color }">
                  {{ getStatusInfo(letter.status).label }}
                </span>
              </div>
              <div v-if="letter.status === 'pending'" class="delivery-info">
                <Clock class="delivery-icon" />
                <span>{{ formatDate(letter.deliveryDate) }}</span>
              </div>
            </div>

            <h3 class="letter-title">{{ letter.title }}</h3>

            <div class="letter-meta">
              <div class="meta-item">
                <Calendar class="meta-icon" />
                <span>来自 {{ formatDate(letter.sourceDate) }}</span>
              </div>
            </div>

            <div v-if="letter.status !== 'pending'" class="letter-preview">
              <p>{{ letter.letterContent?.substring(0, 80) }}...</p>
            </div>
            <div v-else class="letter-locked">
              <Lock class="lock-icon" />
              <span>信件已封存，等待投递日开启</span>
            </div>

            <div class="letter-actions" @click.stop>
              <button
                v-if="letter.status === 'pending'"
                class="action-btn cancel"
                @click="handleCancelLetter(letter)"
              >
                <Ban class="action-icon" />
                取消
              </button>
              <button
                v-if="letter.status !== 'pending'"
                class="action-btn delete"
                @click="handleDeleteLetter(letter)"
              >
                <Trash2 class="action-icon" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal create-modal">
          <div class="modal-header">
            <h2 class="modal-title">
              <PenTool class="title-icon" />
              写一封给未来的信
            </h2>
            <button class="close-btn" @click="closeCreateModal">
              <X />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">信件标题</label>
              <input
                v-model="formData.title"
                type="text"
                class="form-input"
                placeholder="给这封信起个名字..."
                maxlength="50"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  <Calendar class="label-icon" />
                  来源日期
                </label>
                <input
                  v-model="formData.sourceDate"
                  type="date"
                  class="form-input"
                  :max="new Date().toISOString().split('T')[0]"
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  <Send class="label-icon" />
                  投递日期
                </label>
                <input
                  v-model="formData.deliveryDate"
                  type="date"
                  class="form-input"
                  :min="setMinDeliveryDate()"
                  :max="setMaxDeliveryDate()"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">包含内容</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="formData.includeMood" />
                  <Heart class="checkbox-icon mood" />
                  <span>当日情绪记录</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="formData.includeRoom" />
                  <BookOpen class="checkbox-icon room" />
                  <span>房间章节阅读</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="formData.includeGrowth" />
                  <Sparkles class="checkbox-icon growth" />
                  <span>成长总结回顾</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">信件内容</label>
              <textarea
                v-model="formData.letterContent"
                class="form-textarea"
                placeholder="写下你想对未来的自己说的话..."
                rows="8"
              ></textarea>
            </div>

            <div v-if="config" class="form-hint">
              <Star class="hint-icon" />
              <span>投递日期需在来源日期后 {{ config.minDeliveryDays }} - {{ config.maxDeliveryDays }} 天之间</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeCreateModal">
              取消
            </button>
            <button class="btn btn-primary" @click="handleCreateLetter" :disabled="isLoading">
              <Send class="btn-icon" />
              {{ isLoading ? '发送中...' : '寄出信件' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDetailModal && selectedLetter" class="modal-overlay" @click.self="closeDetailModal">
        <div class="modal detail-modal" :class="[selectedLetter.status]">
          <div class="modal-header">
            <div class="letter-status-badge">
              <component :is="getStatusInfo(selectedLetter.status).icon" class="status-icon" />
              <span :style="{ color: getStatusInfo(selectedLetter.status).color }">
                {{ getStatusInfo(selectedLetter.status).label }}
              </span>
            </div>
            <button class="close-btn" @click="closeDetailModal">
              <X />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="selectedLetter.locked" class="locked-content">
              <div class="locked-icon-wrapper">
                <Lock class="locked-icon" />
              </div>
              <h2 class="locked-title">信件已封存</h2>
              <p class="locked-subtitle">
                「{{ selectedLetter.title }}」
              </p>
              <div class="locked-info">
                <div class="info-item">
                  <Calendar class="info-icon" />
                  <span>来自 {{ formatDate(selectedLetter.sourceDate) }}</span>
                </div>
                <div class="info-item">
                  <Send class="info-icon" />
                  <span>{{ formatDate(selectedLetter.deliveryDate) }} 开启</span>
                </div>
                <div v-if="getDaysUntilDelivery(selectedLetter.deliveryDate) > 0" class="countdown">
                  <Clock class="countdown-icon" />
                  <span>还有 {{ getDaysUntilDelivery(selectedLetter.deliveryDate) }} 天</span>
                </div>
              </div>
            </div>

            <div v-else class="letter-content">
              <h2 class="letter-detail-title">{{ selectedLetter.title }}</h2>
              
              <div class="letter-detail-meta">
                <div class="meta-item">
                  <Calendar class="meta-icon" />
                  <span>{{ formatDate(selectedLetter.sourceDate) }} 写</span>
                </div>
                <div class="meta-item">
                  <MailOpen class="meta-icon" />
                  <span>{{ formatDate(selectedLetter.deliveryDate) }} 送达</span>
                </div>
              </div>

              <div class="letter-body">
                <p class="letter-text">{{ selectedLetter.letterContent }}</p>
              </div>

              <div v-if="selectedLetter.moodSnapshot" class="snapshot-section">
                <h3 class="snapshot-title">
                  <Heart class="snapshot-icon" />
                  当日情绪
                </h3>
                <div class="mood-snapshot">
                  <div class="mood-overview">
                    <span class="mood-emoji">{{ getMoodEmoji(selectedLetter.moodSnapshot.dominantMood) }}</span>
                    <span class="mood-label">
                      {{ moodLabels[selectedLetter.moodSnapshot.dominantMood]?.label || selectedLetter.moodSnapshot.dominantMood }}
                    </span>
                  </div>
                  <div v-if="selectedLetter.moodSnapshot.segments" class="mood-segments">
                    <div
                      v-for="seg in selectedLetter.moodSnapshot.segments"
                      :key="seg.timeSegment"
                      class="mood-segment"
                    >
                      <span class="segment-name">{{ segmentLabels[seg.timeSegment] || seg.timeSegment }}</span>
                      <span class="segment-mood">
                        {{ getMoodEmoji(seg.moodType) }}
                        {{ moodLabels[seg.moodType]?.label || seg.moodType }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedLetter.roomSnapshot && selectedLetter.roomSnapshot.chaptersReadToday?.length > 0" class="snapshot-section">
                <h3 class="snapshot-title">
                  <BookOpen class="snapshot-icon" />
                  房间故事
                </h3>
                <div class="room-snapshot">
                  <div
                    v-for="room in selectedLetter.roomSnapshot.chaptersReadToday"
                    :key="room.roomId"
                    class="room-item"
                  >
                    <span class="room-name">{{ room.roomName }}</span>
                    <div class="chapter-list">
                      <span
                        v-for="chapter in room.chapters"
                        :key="chapter.storyId"
                        class="chapter-item"
                      >
                        第{{ chapter.chapterNumber }}章：{{ chapter.title }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedLetter.growthSnapshot && selectedLetter.growthSnapshot.retrospectives?.length > 0" class="snapshot-section">
                <h3 class="snapshot-title">
                  <Sparkles class="snapshot-icon" />
                  成长回顾
                </h3>
                <div class="growth-snapshot">
                  <div
                    v-for="retro in selectedLetter.growthSnapshot.retrospectives"
                    :key="retro.id"
                    class="retro-item"
                  >
                    <p class="retro-content">{{ retro.content }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer" v-if="!selectedLetter.locked">
            <button class="btn btn-danger" @click="handleDeleteLetter(selectedLetter)">
              <Trash2 class="btn-icon" />
              删除
            </button>
            <button class="btn btn-secondary" @click="closeDetailModal">
              关闭
            </button>
          </div>
          <div class="modal-footer" v-else>
            <button class="btn btn-secondary" @click="closeDetailModal">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.memory-letter-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.header-info {
  .page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .title-icon {
    width: 36px;
    height: 36px;
    color: var(--color-secondary);
  }

  .page-subtitle {
    color: var(--color-text-secondary);
    margin: 0;
    font-size: 1rem;
  }
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 0 4px 15px rgba(232, 180, 217, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(232, 180, 217, 0.4);
  }

  .btn-icon {
    width: 18px;
    height: 18px;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    color: white;
  }

  &.pending {
    background: linear-gradient(135deg, #60A5FA, #3B82F6);
  }

  &.delivered {
    background: linear-gradient(135deg, #34D399, #10B981);
  }

  &.read {
    background: linear-gradient(135deg, #A78BFA, #8B5CF6);
  }

  &.total {
    background: linear-gradient(135deg, #F472B6, #EC4899);
  }
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .stat-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.upcoming-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text);

  .section-icon {
    width: 22px;
    height: 22px;
    color: var(--color-secondary);
  }
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-secondary);
    background: rgba(232, 180, 217, 0.05);
  }
}

.upcoming-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(123, 163, 201, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
    color: var(--color-secondary);
  }
}

.upcoming-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .upcoming-title {
    font-weight: 600;
    color: var(--color-text);
  }

  .upcoming-date {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .days-count {
    color: var(--color-secondary);
    font-weight: 500;

    &.today {
      color: var(--color-success);
    }
  }
}

.upcoming-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-tertiary);
}

.letters-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  padding: 0 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);

  .tab-icon {
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: var(--color-text);
  }

  &.active {
    color: var(--color-secondary);
    border-bottom-color: var(--color-secondary);
  }
}

.letters-content {
  padding: 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--color-text-secondary);

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  text-align: center;

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--color-border);
    margin-bottom: 16px;
  }

  .empty-text {
    color: var(--color-text-secondary);
    margin: 0 0 20px 0;
    font-size: 1rem;
  }

  .empty-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
    color: white;
    border: none;
    font-weight: 500;
    cursor: pointer;

    .btn-icon {
      width: 16px;
      height: 16px;
    }
  }
}

.letters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.letter-card {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-secondary);
  }

  &.pending.locked {
    opacity: 0.85;
  }
}

.letter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.letter-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;

  .status-icon {
    width: 14px;
    height: 14px;
  }
}

.delivery-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);

  .delivery-icon {
    width: 12px;
    height: 12px;
  }
}

.letter-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.letter-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;

  .meta-icon {
    width: 14px;
    height: 14px;
  }
}

.letter-preview {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;

  p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.letter-locked {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-style: italic;

  .lock-icon {
    width: 16px;
    height: 16px;
  }
}

.letter-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast);

  .action-icon {
    width: 14px;
    height: 14px;
  }

  &.cancel {
    color: var(--color-text-secondary);

    &:hover {
      color: var(--color-warning);
      border-color: var(--color-warning);
      background: rgba(251, 191, 36, 0.1);
    }
  }

  &.delete {
    color: var(--color-text-secondary);

    &:hover {
      color: var(--color-error);
      border-color: var(--color-error);
      background: rgba(248, 113, 113, 0.1);
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  border: 1px solid var(--color-border);

  &.detail-modal {
    max-width: 600px;
  }
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
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);

  .modal-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text);

    .title-icon {
      width: 22px;
      height: 22px;
      color: var(--color-secondary);
    }
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    border: none;
    background: var(--color-bg);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }
}

.letter-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;

  .status-icon {
    width: 16px;
    height: 16px;
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 8px;

  .label-icon {
    width: 16px;
    height: 16px;
    color: var(--color-secondary);
  }
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  transition: all var(--transition-fast);
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px rgba(232, 180, 217, 0.15);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-secondary);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-secondary);
    cursor: pointer;
  }

  .checkbox-icon {
    width: 18px;
    height: 18px;

    &.mood { color: #F472B6; }
    &.room { color: #60A5FA; }
    &.growth { color: #34D399; }
  }

  span {
    font-size: 0.9rem;
    color: var(--color-text);
  }
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--color-warning);

  .hint-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(232, 180, 217, 0.3);
  }
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);

  &:hover {
    background: var(--color-border);
  }
}

.btn-danger {
  background: transparent;
  color: var(--color-error);
  border: 1px solid var(--color-error);

  &:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  margin-right: auto;
}

.locked-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}

.locked-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(167, 139, 250, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;

  .locked-icon {
    width: 40px;
    height: 40px;
    color: var(--color-secondary);
  }
}

.locked-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.locked-subtitle {
  font-size: 1.1rem;
  color: var(--color-secondary);
  margin: 0 0 24px 0;
}

.locked-info {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  color: var(--color-text-secondary);

  .info-icon {
    width: 18px;
    height: 18px;
    color: var(--color-secondary);
  }
}

.countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(232, 180, 217, 0.1), rgba(123, 163, 201, 0.1));
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-secondary);
  margin-top: 8px;

  .countdown-icon {
    width: 20px;
    height: 20px;
  }
}

.letter-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.letter-detail-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.letter-detail-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 0.875rem;
  color: var(--color-text-secondary);

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;

    .meta-icon {
      width: 16px;
      height: 16px;
      color: var(--color-secondary);
    }
  }
}

.letter-body {
  padding: 20px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-secondary);

  .letter-text {
    margin: 0;
    line-height: 1.8;
    color: var(--color-text);
    white-space: pre-wrap;
  }
}

.snapshot-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snapshot-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;

  .snapshot-icon {
    width: 18px;
    height: 18px;

    &.mood { color: #F472B6; }
    &.room { color: #60A5FA; }
    &.growth { color: #34D399; }
  }
}

.mood-snapshot {
  padding: 16px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
}

.mood-overview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);

  .mood-emoji {
    font-size: 2rem;
  }

  .mood-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }
}

.mood-segments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mood-segment {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  font-size: 0.875rem;

  .segment-name {
    color: var(--color-text-secondary);
  }

  .segment-mood {
    font-weight: 500;
    color: var(--color-text);
  }
}

.room-snapshot {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-item {
  padding: 14px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);

  .room-name {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 8px;
  }
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-item {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.growth-snapshot {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.retro-item {
  padding: 14px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  border-left: 2px solid #34D399;

  .retro-content {
    margin: 0;
    line-height: 1.6;
    color: var(--color-text);
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .memory-letter-page {
    padding: 20px 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .tabs {
    overflow-x: auto;
    padding: 0 4px;
  }

  .tab-btn {
    padding: 14px 16px;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .letters-content {
    padding: 16px;
  }

  .letters-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal {
    max-height: 95vh;
    margin: 10px;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 14px 20px;
  }
}
</style>
