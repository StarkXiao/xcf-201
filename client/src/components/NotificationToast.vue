<script setup>
import { computed } from 'vue'
import {
  CheckCircle,
  AlertCircle,
  X,
  Heart,
  DoorOpen,
  Target,
  Gift,
  Trophy,
  Flame,
  Info,
  Sparkles
} from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'success'
  },
  message: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['close'])

const notifications = computed(() => notificationStore.sortedNotifications)

const iconMap = {
  heart: Heart,
  door: DoorOpen,
  target: Target,
  gift: Gift,
  trophy: Trophy,
  flame: Flame,
  alert: AlertCircle,
  info: Info,
  sparkles: Sparkles,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle
}

const getIcon = (notification) => {
  if (notification.icon && iconMap[notification.icon]) {
    return iconMap[notification.icon]
  }
  if (notification.category && iconMap[notification.category]) {
    return iconMap[notification.category]
  }
  return CheckCircle
}

const colors = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-accent)'
}

const getColor = (notification) => {
  return colors[notification.category] || colors.info
}

function handleClose(id) {
  notificationStore.removeNotification(id)
}

function handleLegacyClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="toast-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="toast"
          :class="{ 'toast-hidden': !notification.visible }"
          :style="{ '--toast-color': getColor(notification) }"
        >
          <div class="toast-icon-wrapper">
            <component :is="getIcon(notification)" class="toast-icon" />
          </div>
          <div class="toast-content">
            <span v-if="notification.title" class="toast-title">{{ notification.title }}</span>
            <span class="toast-message" v-html="notification.message.replace(/\n/g, '<br/>')"></span>
          </div>
          <button class="toast-close" @click="handleClose(notification.id)">
            <X class="close-icon" />
          </button>
        </div>
      </TransitionGroup>

      <Transition name="toast">
        <div
          v-if="show && notifications.length === 0"
          class="toast"
          :style="{ '--toast-color': colors[type] }"
        >
          <component :is="iconMap[type] || CheckCircle" class="toast-icon" />
          <div class="toast-content">
            <span v-if="title" class="toast-title">{{ title }}</span>
            <span class="toast-message" v-html="message.replace(/\n/g, '<br/>')"></span>
          </div>
          <button class="toast-close" @click="handleLegacyClose">
            <X class="close-icon" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.notification-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: flex-start;
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
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--toast-color);
    opacity: 0.8;
  }
}

.toast-icon-wrapper {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--toast-color) 15%, transparent);
  border-radius: var(--radius-full);
}

.toast-icon {
  width: 20px;
  height: 20px;
  color: var(--toast-color);
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toast-title {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
}

.toast-message {
  color: var(--color-text);
  font-weight: 400;
  line-height: 1.6;
  white-space: pre-line;
  font-size: 0.9rem;
}

.toast-close {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  margin-left: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.close-icon {
  width: 16px;
  height: 16px;
}

.toast-list-enter-active,
.toast-list-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-list-enter-from,
.toast-list-leave-to,
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-move {
  transition: transform var(--transition-normal);
}

.toast-hidden {
  opacity: 0;
  transform: translateX(100%);
  transition: all var(--transition-normal);
}

@media (max-width: 768px) {
  .notification-container {
    top: 16px;
    left: 16px;
    right: 16px;
    max-width: none;
  }

  .toast {
    min-width: auto;
    max-width: none;
  }
}
</style>
