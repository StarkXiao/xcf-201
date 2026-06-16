<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { X, Sparkles, Sun, Sunrise, Moon, Star, Trash2, BookOpen, Lightbulb, Heart, Award, RefreshCw } from 'lucide-vue-next'
import { useMoodStore } from '@/stores/mood'
import { useRetrospectiveStore } from '@/stores/retrospective'
import { useAchievementStore } from '@/stores/achievement'

const moodStore = useMoodStore()
const retrospectiveStore = useRetrospectiveStore()
const achievementStore = useAchievementStore()

const props = defineProps({
  show: Boolean,
  date: String,
  existingMood: Object
})

const emit = defineEmits(['close', 'submit', 'delete', 'retrospectiveCreated'])

const activeTab = ref('mood')

const moodTypes = [
  { type: 'happy', emoji: '😊', label: '开心', color: 'var(--mood-happy)' },
  { type: 'calm', emoji: '😌', label: '平静', color: 'var(--mood-calm)' },
  { type: 'sad', emoji: '😢', label: '忧伤', color: 'var(--mood-sad)' },
  { type: 'anxious', emoji: '😰', label: '焦虑', color: 'var(--mood-anxious)' },
  { type: 'angry', emoji: '😠', label: '愤怒', color: 'var(--mood-angry)' }
]

const timeSegments = [
  { key: 'morning', label: '早晨', icon: Sunrise, timeRange: '05:00 - 12:00' },
  { key: 'afternoon', label: '下午', icon: Sun, timeRange: '12:00 - 18:00' },
  { key: 'evening', label: '晚间', icon: Moon, timeRange: '18:00 - 24:00' }
]

const retrospectTypes = [
  { key: 'feeling', label: '感受补写', icon: Heart, description: '补充当时的感受' },
  { key: 'insight', label: '新的感悟', icon: Lightbulb, description: '事后的新领悟' },
  { key: 'gratitude', label: '感恩反思', icon: Award, description: '感恩的人和事' },
  { key: 'lesson', label: '经验教训', icon: BookOpen, description: '学到的经验' },
  { key: 'other', label: '其他回顾', icon: Sparkles, description: '其他想说的话' }
]

const selectedSegment = ref('morning')
const selectedMood = ref('')
const content = ref('')
const tagsInput = ref('')
const tagWeights = ref({})
const isSubmitting = ref(false)
const existingSegments = ref([])
const showTagWeightPanel = ref(false)

const retrospectives = ref([])
const selectedRetrospectType = ref('feeling')
const retrospectContent = ref('')
const retrospectMoodShift = ref('')
const retrospectTags = ref('')
const isRetrospectiveSubmitting = ref(false)
const showRetrospectForm = ref(false)
const selectedRetrospectSegment = ref('')

onMounted(() => {
  if (!moodStore.config) {
    moodStore.fetchConfig()
  }
  if (!retrospectiveStore.config) {
    retrospectiveStore.fetchConfig()
  }
})

function detectCurrentSegment() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    selectedSegment.value = detectCurrentSegment()
    existingSegments.value = props.existingMood?.segments || []
    
    const currentSegmentData = existingSegments.value.find(s => s.time_segment === selectedSegment.value)
    if (currentSegmentData) {
      selectedMood.value = currentSegmentData.mood_type
      content.value = currentSegmentData.content || ''
      tagsInput.value = currentSegmentData.tags?.join(', ') || ''
      tagWeights.value = { ...currentSegmentData.tag_weights } || {}
    } else {
      selectedMood.value = ''
      content.value = ''
      tagsInput.value = ''
      tagWeights.value = {}
    }

    if (props.date) {
      const result = await retrospectiveStore.fetchRetrospectivesByDate(props.date)
      if (result.success) {
        retrospectives.value = result.data.retrospectives || []
      }
    }
  }
})

watch(selectedSegment, (newVal) => {
  const segmentData = existingSegments.value.find(s => s.time_segment === newVal)
  if (segmentData) {
    selectedMood.value = segmentData.mood_type
    content.value = segmentData.content || ''
    tagsInput.value = segmentData.tags?.join(', ') || ''
    tagWeights.value = { ...segmentData.tag_weights } || {}
  } else {
    selectedMood.value = ''
    content.value = ''
    tagsInput.value = ''
    tagWeights.value = {}
  }
})

const tagsList = computed(() => {
  return tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)
})

const canSubmit = computed(() => {
  return selectedMood.value && !isSubmitting.value
})

const selectedMoodInfo = computed(() => {
  return moodTypes.find(m => m.type === selectedMood.value)
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(props.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const currentSegmentInfo = computed(() => {
  return timeSegments.find(s => s.key === selectedSegment.value)
})

const isSegmentRecorded = computed(() => {
  return existingSegments.value.some(s => s.time_segment === selectedSegment.value)
})

const recordedSegmentsCount = computed(() => {
  return existingSegments.value.filter(s => ['morning', 'afternoon', 'evening'].includes(s.time_segment)).length
})

const totalTagWeight = computed(() => {
  return Object.values(tagWeights.value).reduce((a, b) => a + b, 0)
})

const retrospectTagsList = computed(() => {
  return retrospectTags.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)
})

const canSubmitRetrospective = computed(() => {
  return selectedRetrospectSegment.value && retrospectContent.value.trim() && !isRetrospectiveSubmitting.value
})

const selectedRetrospectTypeInfo = computed(() => {
  return retrospectTypes.find(t => t.key === selectedRetrospectType.value)
})

const recordedSegments = computed(() => {
  return timeSegments.filter(seg => 
    existingSegments.value.some(s => s.time_segment === seg.key)
  )
})

const selectedRetroSegmentMood = computed(() => {
  if (!selectedRetrospectSegment.value) return null
  return existingSegments.value.find(s => s.time_segment === selectedRetrospectSegment.value)
})

function setTagWeight(tag, weight) {
  tagWeights.value = {
    ...tagWeights.value,
    [tag]: weight
  }
}

function removeTagWeight(tag) {
  const newWeights = { ...tagWeights.value }
  delete newWeights[tag]
  tagWeights.value = newWeights
}

function handleSubmit() {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  const tags = tagsList.value
  
  const tagWeightsToSubmit = {}
  tags.forEach(tag => {
    if (tagWeights.value[tag]) {
      tagWeightsToSubmit[tag] = tagWeights.value[tag]
    }
  })
  
  emit('submit', {
    date: props.date,
    timeSegment: selectedSegment.value,
    moodType: selectedMood.value,
    content: content.value,
    tags,
    tagWeights: Object.keys(tagWeightsToSubmit).length > 0 ? tagWeightsToSubmit : undefined
  })
  
  isSubmitting.value = false
}

function handleDelete() {
  if (isSegmentRecorded.value) {
    emit('delete', {
      date: props.date,
      timeSegment: selectedSegment.value
    })
  }
}

function selectSegment(segment) {
  selectedSegment.value = segment.key
}

function switchTab(tab) {
  activeTab.value = tab
}

function selectRetrospectType(type) {
  selectedRetrospectType.value = type.key
}

async function handleSubmitRetrospective() {
  if (!canSubmitRetrospective.value) return
  
  isRetrospectiveSubmitting.value = true
  
  const result = await retrospectiveStore.createRetrospective({
    recordDate: props.date,
    timeSegment: selectedRetrospectSegment.value,
    retrospectType: selectedRetrospectType.value,
    content: retrospectContent.value,
    moodShift: retrospectMoodShift.value || null,
    tags: retrospectTagsList.value
  })
  
  isRetrospectiveSubmitting.value = false
  
  if (result.success) {
    retrospectives.value = result.data.dateRetrospectives || []
    
    retrospectContent.value = ''
    retrospectMoodShift.value = ''
    retrospectTags.value = ''
    showRetrospectForm.value = false
    selectedRetrospectSegment.value = ''
    
    achievementStore.fetchTasks()
    
    emit('retrospectiveCreated', result.data)
  }
}

async function handleDeleteRetrospective(id) {
  if (!confirm('确定要删除这条回顾吗？')) return
  
  const result = await retrospectiveStore.deleteRetrospective(id)
  if (result.success) {
    retrospectives.value = retrospectives.value.filter(r => r.id !== id)
  }
}

function formatRetrospectiveTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getRetrospectTypeLabel(type) {
  const found = retrospectTypes.find(t => t.key === type)
  return found ? found.label : type
}

function getRetrospectTypeIcon(type) {
  const found = retrospectTypes.find(t => t.key === type)
  return found ? found.icon : Sparkles
}

function getSegmentLabel(segmentKey) {
  const found = timeSegments.find(s => s.key === segmentKey)
  return found ? found.label : segmentKey
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content glass-card">
          <button class="close-btn" @click="emit('close')">
            <X class="close-icon" />
          </button>
          
          <div class="modal-header">
            <Sparkles class="header-icon" />
            <h2 class="modal-title">{{ activeTab === 'mood' ? '记录心情' : '回顾复写' }}</h2>
            <p class="modal-date">{{ formattedDate }}</p>
          </div>

          <div class="modal-tabs">
            <button 
              class="tab-btn"
              :class="{ active: activeTab === 'mood' }"
              @click="switchTab('mood')"
            >
              <Sparkles class="tab-icon" />
              <span>心情记录</span>
            </button>
            <button 
              class="tab-btn"
              :class="{ active: activeTab === 'retrospective' }"
              @click="switchTab('retrospective')"
            >
              <BookOpen class="tab-icon" />
              <span>回顾复写</span>
              <span v-if="retrospectives.length > 0" class="tab-badge">{{ retrospectives.length }}</span>
            </button>
          </div>

          <div v-show="activeTab === 'mood'">
            <div class="segment-selector">
            <p class="section-label">选择时段</p>
            <div class="segment-options">
              <button
                v-for="segment in timeSegments"
                :key="segment.key"
                class="segment-option"
                :class="{ 
                  selected: selectedSegment === segment.key,
                  recorded: existingSegments.some(s => s.time_segment === segment.key)
                }"
                @click="selectSegment(segment)"
              >
                <component :is="segment.icon" class="segment-icon" />
                <span class="segment-label">{{ segment.label }}</span>
                <span class="segment-time">{{ segment.timeRange }}</span>
                <span v-if="existingSegments.some(s => s.time_segment === segment.key)" class="segment-badge">✓</span>
              </button>
            </div>
            <p class="progress-hint">
              已记录 {{ recordedSegmentsCount }}/3 时段
              <span v-if="recordedSegmentsCount >= 3" class="complete-badge">🎉 完成三段记录</span>
            </p>
          </div>
          
          <div class="mood-selector">
            <p class="section-label">{{ currentSegmentInfo?.label }}的心情怎么样？</p>
            <div class="mood-options">
              <button
                v-for="mood in moodTypes"
                :key="mood.type"
                class="mood-option"
                :class="{ selected: selectedMood === mood.type }"
                :style="{ '--mood-color': mood.color }"
                @click="selectedMood = mood.type"
              >
                <span class="mood-emoji">{{ mood.emoji }}</span>
                <span class="mood-label">{{ mood.label }}</span>
              </button>
            </div>
          </div>
          
          <div v-if="selectedMood" class="content-section">
            <p class="section-label">想写点什么吗？（可选）</p>
            <textarea
              v-model="content"
              class="content-textarea input-field"
              placeholder="记录下这个时段的心情故事..."
              rows="3"
            />
          </div>
          
          <div v-if="selectedMood" class="tags-section">
            <p class="section-label">添加标签（用逗号分隔）</p>
            <input
              v-model="tagsInput"
              class="tags-input input-field"
              placeholder="例如：工作, 家人, 旅行"
            />
            
            <div v-if="tagsList.length > 0" class="tags-list">
              <div class="tags-header">
                <span class="tags-title">标签权重设置（1-5，越高越重要）</span>
                <button 
                  class="toggle-btn" 
                  @click="showTagWeightPanel = !showTagWeightPanel"
                >
                  <Star class="toggle-icon" />
                  {{ showTagWeightPanel ? '收起' : '设置权重' }}
                </button>
              </div>
              
              <div v-if="showTagWeightPanel" class="tag-weight-panel">
                <div 
                  v-for="tag in tagsList" 
                  :key="tag" 
                  class="tag-weight-item"
                >
                  <span class="tag-name">#{{ tag }}</span>
                  <div class="weight-buttons">
                    <button
                      v-for="w in 5"
                      :key="w"
                      class="weight-btn"
                      :class="{ active: tagWeights[tag] === w }"
                      @click="setTagWeight(tag, tagWeights[tag] === w ? null : w)"
                    >
                      {{ w }}
                    </button>
                  </div>
                  <button 
                    v-if="tagWeights[tag]"
                    class="clear-weight-btn"
                    @click="removeTagWeight(tag)"
                  >
                    <X class="clear-icon" />
                  </button>
                </div>
                <p v-if="totalTagWeight > 0" class="total-weight">
                  当前总权重: {{ totalTagWeight }} / 目标: 10
                </p>
              </div>
            </div>
          </div>
          </div>

          <div v-show="activeTab === 'retrospective'" class="retrospective-tab">
            <div class="retrospective-header">
              <p class="section-label">回顾一下这天的心情...</p>
              <button 
                v-if="!showRetrospectForm"
                class="btn-add-retrospective"
                @click="showRetrospectForm = true"
              >
                <RefreshCw class="btn-icon" />
                添加回顾
              </button>
            </div>

            <div v-if="showRetrospectForm" class="retrospect-form">
              <div class="retrospect-segment-selector">
                <p class="section-label">选择要回顾的时段</p>
                <div v-if="recordedSegments.length > 0" class="retrospect-segment-grid">
                  <button
                    v-for="segment in recordedSegments"
                    :key="segment.key"
                    class="retrospect-segment-btn"
                    :class="{ selected: selectedRetrospectSegment === segment.key }"
                    @click="selectedRetrospectSegment = segment.key"
                  >
                    <component :is="segment.icon" class="segment-icon" />
                    <span class="segment-label">{{ segment.label }}</span>
                    <span class="segment-time">{{ segment.timeRange }}</span>
                  </button>
                </div>
                <p v-else class="no-segments-hint">该天暂无心情记录，无法添加回顾</p>
              </div>

              <div v-if="selectedRetroSegmentMood" class="retrospect-mood-context">
                <p class="section-label">当时的心情记录</p>
                <div class="mood-context-card">
                  <span class="mood-context-emoji">{{ moodTypes.find(m => m.type === selectedRetroSegmentMood.mood_type)?.emoji }}</span>
                  <div class="mood-context-info">
                    <span class="mood-context-type">{{ moodTypes.find(m => m.type === selectedRetroSegmentMood.mood_type)?.label }}</span>
                    <p v-if="selectedRetroSegmentMood.content" class="mood-context-content">{{ selectedRetroSegmentMood.content }}</p>
                    <div v-if="selectedRetroSegmentMood.tags && selectedRetroSegmentMood.tags.length > 0" class="mood-context-tags">
                      <span class="mood-context-tag" v-for="tag in selectedRetroSegmentMood.tags" :key="tag">#{{ tag }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="retrospect-type-selector">
                <p class="section-label">选择回顾类型</p>
                <div class="retrospect-type-grid">
                  <button
                    v-for="type in retrospectTypes"
                    :key="type.key"
                    class="retrospect-type-btn"
                    :class="{ selected: selectedRetrospectType === type.key }"
                    @click="selectRetrospectType(type)"
                  >
                    <component :is="type.icon" class="retrospect-type-icon" />
                    <span class="retrospect-type-label">{{ type.label }}</span>
                  </button>
                </div>
                <p class="retrospect-type-desc">{{ selectedRetrospectTypeInfo?.description }}</p>
              </div>

              <div class="retrospect-content">
                <p class="section-label">回顾内容</p>
                <textarea
                  v-model="retrospectContent"
                  class="content-textarea input-field"
                  placeholder="写下你的回顾和感受..."
                  rows="4"
                />
              </div>

              <div class="retrospect-mood-shift">
                <p class="section-label">现在回头看，心情有变化吗？（可选）</p>
                <div class="mood-shift-options">
                  <button
                    v-for="mood in moodTypes"
                    :key="mood.type"
                    class="mood-shift-btn"
                    :class="{ selected: retrospectMoodShift === mood.type }"
                    :style="{ '--mood-color': mood.color }"
                    @click="retrospectMoodShift = retrospectMoodShift === mood.type ? '' : mood.type"
                  >
                    <span class="mood-emoji">{{ mood.emoji }}</span>
                  </button>
                </div>
              </div>

              <div class="retrospect-tags">
                <p class="section-label">标签（可选，用逗号分隔）</p>
                <input
                  v-model="retrospectTags"
                  class="tags-input input-field"
                  placeholder="例如：反思, 成长, 感恩"
                />
              </div>

              <div class="retrospect-form-actions">
                <button class="btn-secondary" @click="showRetrospectForm = false">
                  取消
                </button>
                <button 
                  class="btn-primary"
                  :disabled="!canSubmitRetrospective"
                  @click="handleSubmitRetrospective"
                >
                  {{ isRetrospectiveSubmitting ? '保存中...' : '保存回顾' }}
                </button>
              </div>
            </div>

            <div v-if="retrospectives.length > 0" class="retrospective-list">
              <p class="section-label">已有的回顾 ({{ retrospectives.length }})</p>
              <div 
                v-for="retro in retrospectives"
                :key="retro.id"
                class="retrospective-card"
              >
                <div class="retrospective-card-header">
                  <div class="retrospective-card-type">
                    <component :is="getRetrospectTypeIcon(retro.retrospect_type)" class="retro-type-icon" />
                    <span class="retro-type-label">{{ getRetrospectTypeLabel(retro.retrospect_type) }}</span>
                  </div>
                  <div class="retrospective-card-meta">
                    <span class="retro-segment-badge">{{ getSegmentLabel(retro.time_segment) }}</span>
                    <span class="retro-time">{{ formatRetrospectiveTime(retro.created_at) }}</span>
                    <button 
                      class="retro-delete-btn"
                      @click="handleDeleteRetrospective(retro.id)"
                      title="删除回顾"
                    >
                      <Trash2 class="retro-delete-icon" />
                    </button>
                  </div>
                </div>
                <p class="retrospective-card-content">{{ retro.content }}</p>
                <div v-if="retro.mood_shift" class="retrospective-card-mood">
                  <span class="mood-shift-label">现在的心情：</span>
                  <span class="mood-shift-emoji">{{ moodTypes.find(m => m.type === retro.mood_shift)?.emoji }}</span>
                  <span class="mood-shift-text">{{ moodTypes.find(m => m.type === retro.mood_shift)?.label }}</span>
                </div>
                <div v-if="retro.tags && retro.tags.length > 0" class="retrospective-card-tags">
                  <span class="retro-tag" v-for="tag in retro.tags" :key="tag">#{{ tag }}</span>
                </div>
              </div>
            </div>

            <div v-else-if="!showRetrospectForm" class="empty-retrospective">
              <BookOpen class="empty-icon" />
              <p class="empty-text">还没有回顾记录</p>
              <p class="empty-hint">回顾过去，记录成长和感悟</p>
            </div>
          </div>
          
          <div class="modal-footer">
            <button 
              v-if="isSegmentRecorded"
              class="btn-danger"
              @click="handleDelete"
              :disabled="isSubmitting"
            >
              <Trash2 class="btn-icon" />
              删除此段
            </button>
            <div class="footer-right">
              <button class="btn-secondary" @click="emit('close')">
                取消
              </button>
              <button 
                class="btn-primary" 
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                {{ isSubmitting ? '保存中...' : (isSegmentRecorded ? '更新心情' : '保存心情') }}
              </button>
            </div>
          </div>
          
          <div v-if="selectedMoodInfo && currentSegmentInfo" class="mood-preview">
            <component :is="currentSegmentInfo.icon" class="preview-segment-icon" />
            <span class="preview-emoji">{{ selectedMoodInfo.emoji }}</span>
            <span class="preview-text">{{ currentSegmentInfo.label }}是 {{ selectedMoodInfo.label }} 的</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  position: relative;
  animation: slideInUp 0.3s ease;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text);
  }
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.header-icon {
  width: 40px;
  height: 40px;
  color: var(--color-secondary);
  margin-bottom: 8px;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(10deg); }
}

.modal-title {
  font-size: 1.5rem;
  margin-bottom: 4px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-date {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.section-label {
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--color-text-secondary);
}

.segment-selector {
  margin-bottom: 24px;
}

.segment-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.segment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  transition: all var(--transition-normal);
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-4px);
  }
  
  &.selected {
    background: rgba(232, 180, 217, 0.2);
    border-color: var(--color-secondary);
    box-shadow: 0 0 20px rgba(232, 180, 217, 0.3);
  }
  
  &.recorded:not(.selected) {
    background: rgba(123, 163, 201, 0.15);
    border-color: rgba(123, 163, 201, 0.5);
  }
}

.segment-icon {
  width: 28px;
  height: 28px;
  color: var(--color-secondary);
}

.segment-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}

.segment-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.segment-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.complete-badge {
  margin-left: 8px;
  color: var(--color-success);
  font-weight: 500;
}

.mood-selector {
  margin-bottom: 24px;
}

.mood-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.mood-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  transition: all var(--transition-normal);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-4px);
  }
  
  &.selected {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--mood-color);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1), 0 0 0 3px color-mix(in srgb, var(--mood-color) 30%, transparent);
  }
}

.mood-emoji {
  font-size: 2rem;
  transition: transform var(--transition-fast);
  
  .mood-option:hover &,
  .mood-option.selected & {
    transform: scale(1.2);
  }
}

.mood-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  
  .mood-option.selected & {
    color: var(--color-text);
    font-weight: 500;
  }
}

.content-section,
.tags-section {
  margin-bottom: 20px;
}

.content-textarea {
  resize: vertical;
  min-height: 80px;
}

.tags-list {
  margin-top: 12px;
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tags-title {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: rgba(232, 180, 217, 0.15);
  color: var(--color-secondary);
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(232, 180, 217, 0.25);
  }
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

.tag-weight-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  padding: 16px;
}

.tag-weight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.tag-name {
  flex-shrink: 0;
  min-width: 80px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.weight-buttons {
  display: flex;
  gap: 4px;
  flex: 1;
}

.weight-btn {
  flex: 1;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  &.active {
    background: var(--color-secondary);
    color: var(--color-bg-dark);
    font-weight: 600;
  }
}

.clear-weight-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: rgba(255, 100, 100, 0.15);
  color: var(--color-error);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 100, 100, 0.3);
  }
}

.clear-icon {
  width: 14px;
  height: 14px;
}

.total-weight {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 100, 100, 0.15);
  color: var(--color-error);
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    background: rgba(255, 100, 100, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-secondary {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text);
  }
}

.btn-primary {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: var(--color-bg-dark);
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(232, 180, 217, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

.mood-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
}

.preview-segment-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.preview-emoji {
  font-size: 1.5rem;
}

.preview-text {
  color: var(--color-text-secondary);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
  
  .modal-content {
    transition: transform var(--transition-normal), opacity var(--transition-normal);
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  
  .modal-content {
    opacity: 0;
    transform: translateY(30px);
  }
}

.modal-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: var(--radius-md);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  
  &:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    background: var(--color-secondary);
    color: var(--color-bg-dark);
    font-weight: 500;
  }
}

.tab-icon {
  width: 16px;
  height: 16px;
}

.tab-badge {
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
  
  .tab-btn.active & {
    background: var(--color-bg-dark);
    color: var(--color-secondary);
  }
}

.retrospective-tab {
  margin-bottom: 16px;
}

.retrospective-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-add-retrospective {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(232, 180, 217, 0.15);
  color: var(--color-secondary);
  border: 1px solid rgba(232, 180, 217, 0.3);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(232, 180, 217, 0.25);
    transform: translateY(-1px);
  }
}

.retrospect-segment-selector {
  margin-bottom: 20px;
}

.no-segments-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.retrospect-segment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.retrospect-segment-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.selected {
    background: rgba(139, 92, 246, 0.15);
    border-color: #8b5cf6;
  }

  .segment-icon {
    width: 22px;
    height: 22px;
    color: var(--color-text-secondary);
  }

  .segment-label {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .segment-time {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  &.selected .segment-icon {
    color: #8b5cf6;
  }

  &.selected .segment-label {
    color: #8b5cf6;
  }
}

.retrospect-mood-context {
  margin-bottom: 20px;
}

.mood-context-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: var(--radius-md);
}

.mood-context-emoji {
  font-size: 2rem;
  flex-shrink: 0;
}

.mood-context-info {
  flex: 1;
  min-width: 0;
}

.mood-context-type {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  display: block;
}

.mood-context-content {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mood-context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mood-context-tag {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

.retrospect-form {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.retrospect-type-selector {
  margin-bottom: 20px;
}

.retrospect-type-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.retrospect-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  transition: all var(--transition-fast);
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  &.selected {
    background: rgba(232, 180, 217, 0.2);
    border-color: var(--color-secondary);
  }
}

.retrospect-type-icon {
  width: 22px;
  height: 22px;
  color: var(--color-secondary);
}

.retrospect-type-label {
  font-size: 0.75rem;
  color: var(--color-text);
  text-align: center;
}

.retrospect-type-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: 8px;
}

.retrospect-content {
  margin-bottom: 20px;
}

.retrospect-mood-shift {
  margin-bottom: 20px;
}

.mood-shift-options {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.mood-shift-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.1);
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.selected {
    border-color: var(--mood-color);
    background: color-mix(in srgb, var(--mood-color) 20%, transparent);
    transform: scale(1.1);
  }
  
  .mood-emoji {
    font-size: 1.4rem;
  }
}

.retrospect-tags {
  margin-bottom: 20px;
}

.retrospect-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.retrospective-list {
  margin-top: 16px;
}

.retrospective-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.retrospective-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.retrospective-card-type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.retro-type-icon {
  width: 16px;
  height: 16px;
  color: var(--color-secondary);
}

.retro-type-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-secondary);
}

.retrospective-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.retro-segment-badge {
  font-size: 0.7rem;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.retro-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.retro-delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 100, 100, 0.15);
    color: var(--color-error);
  }
}

.retro-delete-icon {
  width: 14px;
  height: 14px;
}

.retrospective-card-content {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.retrospective-card-mood {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.mood-shift-label {
  color: var(--color-text-muted);
}

.mood-shift-emoji {
  font-size: 1rem;
}

.mood-shift-text {
  color: var(--color-text);
}

.retrospective-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.retro-tag {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: rgba(232, 180, 217, 0.15);
  color: var(--color-secondary);
}

.empty-retrospective {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 24px 20px;
  }
  
  .segment-options {
    gap: 8px;
  }
  
  .segment-option {
    padding: 12px 4px;
  }
  
  .mood-options {
    gap: 8px;
  }
  
  .mood-option {
    padding: 12px 4px;
  }
  
  .mood-emoji {
    font-size: 1.5rem;
  }
  
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
    
    .footer-right {
      justify-content: flex-end;
    }
  }
}
</style>
