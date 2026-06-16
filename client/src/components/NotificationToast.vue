<script setup>
import { ref, watch } from 'vue'
import { CheckCircle, AlertCircle, X } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  type: {
    type: String,
    default: 'success'
  },
  message: String,
  duration: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['close'])

const isVisible = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal) {
    isVisible.value = true
    if (props.duration > 0) {
      setTimeout(() => {
        isVisible.value = false
        setTimeout(() => emit('close'), 300)
      }, props.duration)
    }
  }
})

const handleClose = () => {
  isVisible.value = false
  setTimeout(() => emit('close'), 300)
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: AlertCircle
}

const colors = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-accent)'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div 
        v-if="show && isVisible" 
        class="toast"
        :style="{ '--toast-color': colors[type] }"
      >
        <component :is="icons[type]" class="toast-icon" />
        <span class="toast-message">{{ message }}</span>
        <button class="toast-close" @click="handleClose">
          <X class="close-icon" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--toast-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 300px;
  max-width: 400px;
}

.toast-icon {
  width: 24px;
  height: 24px;
  color: var(--toast-color);
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  color: var(--color-text);
  font-weight: 500;
}

.toast-close {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.close-icon {
  width: 16px;
  height: 16px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .toast {
    top: 16px;
    left: 16px;
    right: 16px;
    min-width: auto;
    max-width: none;
  }
}
</style>
