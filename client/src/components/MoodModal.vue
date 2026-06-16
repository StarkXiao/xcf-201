<script setup>
import { ref, computed, watch } from 'vue'
import { X, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  date: String,
  existingMood: Object
})

const emit = defineEmits(['close', 'submit'])

const moodTypes = [
  { type: 'happy', emoji: '😊', label: '开心', color: 'var(--mood-happy)' },
  { type: 'calm', emoji: '😌', label: '平静', color: 'var(--mood-calm)' },
  { type: 'sad', emoji: '😢', label: '忧伤', color: 'var(--mood-sad)' },
  { type: 'anxious', emoji: '😰', label: '焦虑', color: 'var(--mood-anxious)' },
  { type: 'angry', emoji: '😠', label: '愤怒', color: 'var(--mood-angry)' }
]

const selectedMood = ref('')
const content = ref('')
const tagsInput = ref('')
const isSubmitting = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal && props.existingMood) {
    selectedMood.value = props.existingMood.mood_type
    content.value = props.existingMood.content || ''
    tagsInput.value = props.existingMood.tags?.join(', ') || ''
  } else if (newVal) {
    selectedMood.value = ''
    content.value = ''
    tagsInput.value = ''
  }
})

const canSubmit = computed(() => {
  return selectedMood.value && !isSubmitting.value
})

const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  const tags = tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)
  
  emit('submit', {
    date: props.date,
    moodType: selectedMood.value,
    content: content.value,
    tags
  })
  
  isSubmitting.value = false
}

const selectedMoodInfo = computed(() => {
  return moodTypes.find(m => m.type === selectedMood.value)
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(props.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
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
            <h2 class="modal-title">记录心情</h2>
            <p class="modal-date">{{ formattedDate }}</p>
          </div>
          
          <div class="mood-selector">
            <p class="section-label">今天的心情怎么样？</p>
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
              placeholder="记录下今天的心情故事..."
              rows="4"
            />
          </div>
          
          <div v-if="selectedMood" class="tags-section">
            <p class="section-label">添加标签（用逗号分隔）</p>
            <input
              v-model="tagsInput"
              class="tags-input input-field"
              placeholder="例如：工作, 家人, 旅行"
            />
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="emit('close')">
              取消
            </button>
            <button 
              class="btn-primary" 
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              {{ isSubmitting ? '保存中...' : '保存心情' }}
            </button>
          </div>
          
          <div v-if="selectedMoodInfo" class="mood-preview">
            <span class="preview-emoji">{{ selectedMoodInfo.emoji }}</span>
            <span class="preview-text">今天是 {{ selectedMoodInfo.label }} 的一天</span>
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
  max-width: 500px;
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
  min-height: 100px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
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

@media (max-width: 768px) {
  .modal-content {
    padding: 24px 20px;
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
}
</style>
