<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanionStore } from '@/stores/companion'
import { useNotificationStore } from '@/stores/notification'
import { 
  Send, Sparkles, Heart, TrendingUp, Zap, 
  ChevronDown, MoreVertical, Trash2, Sparkles as SparklesIcon,
  Star, User, Bot, ArrowLeft, Moon
} from 'lucide-vue-next'

const router = useRouter()
const companionStore = useCompanionStore()
const notificationStore = useNotificationStore()

const messageInput = ref('')
const messagesContainer = ref(null)
const showMenu = ref(false)
const showEventModal = ref(false)
const currentEvent = ref(null)
const isLoading = ref(false)

const activeCompanion = computed(() => companionStore.activeCompanion)
const conversations = computed(() => companionStore.conversations)
const isTyping = computed(() => companionStore.isTyping)
const loadingMessages = computed(() => companionStore.loading.conversations)
const availableEvents = computed(() => companionStore.availableEvents)

const quickReplies = [
  { text: '今天的心情怎么样？', icon: Heart },
  { text: '给我讲个故事吧', icon: Moon },
  { text: '最近有什么成就吗？', icon: Star },
  { text: '陪我聊聊天', icon: SparklesIcon }
]

const moodEmojis = {
  happy: '😊',
  excited: '🤩',
  content: '😌',
  neutral: '🙂',
  sad: '😢',
  disappointed: '😔',
  friendly: '🥰',
  touched: '🥹',
  warm: '💕',
  cheerful: '✨',
  interested: '🤗',
  proud: '💪',
  attentive: '👂',
  calm: '🧘',
  comfort: '🫂',
  soothe: '😌'
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function sendMessage(content = null) {
  const text = (content || messageInput.value).trim()
  if (!text || !activeCompanion.value) return

  const companionId = activeCompanion.value.id
  messageInput.value = ''
  
  try {
    await companionStore.sendMessage(companionId, text)
    scrollToBottom()
  } catch (e) {
    notificationStore.error('发送失败，请重试')
  }
}

function sendQuickReply(text) {
  sendMessage(text)
}

async function clearConversation() {
  if (!activeCompanion.value) return
  if (!confirm('确定要清空对话记录吗？')) return
  
  try {
    await companionStore.clearConversations(activeCompanion.value.id)
    notificationStore.success('对话记录已清空')
    showMenu.value = false
  } catch (e) {
    notificationStore.error('清空调话失败')
  }
}

function openEvent(event) {
  currentEvent.value = event
  showEventModal.value = true
}

async function completeEvent(choiceId = null) {
  if (!activeCompanion.value || !currentEvent.value) return
  
  try {
    const res = await companionStore.completeEvent(
      activeCompanion.value.id,
      currentEvent.value.id,
      choiceId
    )
    if (res.code === 200) {
      notificationStore.success(`事件完成！获得 ${res.data.expGain} 经验，${res.data.intimacyGain} 亲密度`)
      showEventModal.value = false
      currentEvent.value = null
    }
  } catch (e) {
    notificationStore.error('完成事件失败')
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function goBack() {
  router.back()
}

async function fetchData() {
  if (!companionStore.hasActiveCompanion) {
    await companionStore.fetchActiveCompanion()
  }
  
  if (activeCompanion.value) {
    await companionStore.fetchEvents(activeCompanion.value.id, 'available')
  }
  
  scrollToBottom()
}

watch(conversations, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  fetchData()
  
  document.addEventListener('click', (e) => {
    if (showMenu.value && !e.target.closest('.menu-container')) {
      showMenu.value = false
    }
  })
})

onUnmounted(() => {
  showMenu.value = false
})
</script>

<template>
  <div class="chat-page">
    <header class="chat-header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      
      <div v-if="activeCompanion" class="companion-header">
        <div class="avatar-wrapper">
          <div class="avatar" :style="{ backgroundColor: activeCompanion.intimacyLevel?.color }">
            <span class="avatar-emoji">{{ activeCompanion.avatar }}</span>
          </div>
          <div class="level-badge">Lv.{{ activeCompanion.level }}</div>
        </div>
        <div class="companion-info">
          <h2 class="name">{{ activeCompanion.name }}</h2>
          <p class="status">
            <Heart class="heart-icon" :style="{ color: activeCompanion.intimacyLevel?.color }" />
            {{ activeCompanion.intimacyLevel?.name }} · {{ activeCompanion.intimacy }}/100
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <div class="menu-container">
          <button class="menu-btn" @click="showMenu = !showMenu">
            <MoreVertical class="icon" />
          </button>
          <div v-if="showMenu" class="menu-dropdown">
            <button class="menu-item" @click="clearConversation">
              <Trash2 class="item-icon" />
              清空对话
            </button>
          </div>
        </div>
      </div>
    </header>

    <div v-if="activeCompanion && availableEvents.length > 0" class="event-banner">
      <div class="event-content">
        <Sparkles class="event-icon" />
        <span class="event-text">有 {{ availableEvents.length }} 个专属事件可以触发</span>
      </div>
      <button class="event-btn" @click="openEvent(availableEvents[0])">
        查看
      </button>
    </div>

    <div v-if="activeCompanion && activeCompanion.levelProgress !== undefined" class="progress-bar-container">
      <div class="progress-info">
        <span>Lv.{{ activeCompanion.level }}</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: activeCompanion.levelProgress + '%' }"></div>
        </div>
        <span>Lv.{{ activeCompanion.level + 1 }}</span>
      </div>
    </div>

    <div ref="messagesContainer" class="messages-container">
      <div v-if="loadingMessages" class="loading-messages">
        <div class="loading-spinner"></div>
        <p>加载对话中...</p>
      </div>

      <div v-else class="messages-list">
        <div 
          v-for="msg in conversations" 
          :key="msg.id"
          :class="['message', { 'user-message': msg.sender === 'user', 'companion-message': msg.sender === 'companion' }]"
        >
          <div class="message-avatar">
            <User v-if="msg.sender === 'user'" class="avatar-icon" />
            <Bot v-else class="avatar-icon" />
          </div>
          <div class="message-content">
            <div v-if="msg.emotion && msg.sender === 'companion'" class="message-emotion">
              {{ moodEmojis[msg.emotion] || '😊' }} {{ msg.emotion }}
            </div>
            <div class="message-bubble">
              {{ msg.content }}
            </div>
            <div class="message-meta">
              <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
              <span v-if="msg.expChange || msg.intimacyChange" class="message-gain">
                <Zap v-if="msg.expChange" class="gain-icon" />
                <span v-if="msg.expChange">+{{ msg.expChange }}EXP</span>
                <Heart v-if="msg.intimacyChange" class="gain-icon heart" />
                <span v-if="msg.intimacyChange">+{{ msg.intimacyChange }}亲密度</span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="isTyping" class="message companion-message">
          <div class="message-avatar">
            <Bot class="avatar-icon" />
          </div>
          <div class="message-content">
            <div class="message-bubble typing">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-replies">
      <button 
        v-for="reply in quickReplies" 
        :key="reply.text"
        class="quick-reply-btn"
        @click="sendQuickReply(reply.text)"
      >
        <component :is="reply.icon" class="reply-icon" />
        {{ reply.text }}
      </button>
    </div>

    <div class="input-container">
      <input
        v-model="messageInput"
        type="text"
        class="message-input"
        placeholder="输入你想说的话..."
        @keyup.enter="sendMessage"
        :disabled="!activeCompanion || isTyping"
      />
      <button 
        class="send-btn"
        @click="sendMessage"
        :disabled="!messageInput.trim() || !activeCompanion || isTyping"
      >
        <Send class="send-icon" />
      </button>
    </div>

    <div v-if="!activeCompanion && !loadingMessages" class="no-companion">
      <Sparkles class="empty-icon" />
      <h3>还没有旅伴</h3>
      <p>先去解锁你的第一位旅伴吧~</p>
      <button class="go-btn" @click="router.push('/companions')">
        前往旅伴页面
      </button>
    </div>

    <Teleport to="body">
      <div v-if="showEventModal && currentEvent" class="modal-overlay" @click.self="showEventModal = false">
        <div class="modal-content event-modal">
          <div class="event-modal-header">
            <Sparkles class="header-icon" />
            <h2>{{ currentEvent.title }}</h2>
          </div>
          <div class="event-modal-body">
            <p class="event-description">{{ currentEvent.description }}</p>
            <div class="event-content">
              {{ currentEvent.content }}
            </div>
            <div v-if="currentEvent.choices && currentEvent.choices.length > 0" class="event-choices">
              <p class="choices-title">你的选择：</p>
              <button 
                v-for="choice in currentEvent.choices" 
                :key="choice.id"
                class="choice-btn"
                @click="completeEvent(choice.id)"
              >
                {{ choice.text }}
                <span v-if="choice.exp || choice.intimacy" class="choice-reward">
                  <Zap v-if="choice.exp" /> +{{ choice.exp }}EXP
                  <Heart v-if="choice.intimacy" /> +{{ choice.intimacy }}亲密度
                </span>
              </button>
            </div>
            <div v-else class="event-rewards">
              <p class="rewards-title">完成奖励：</p>
              <div class="rewards-list">
                <span v-if="currentEvent.rewards?.exp"><Zap class="reward-icon" /> +{{ currentEvent.rewards.exp }}经验</span>
                <span v-if="currentEvent.rewards?.intimacy"><Heart class="reward-icon heart" /> +{{ currentEvent.rewards.intimacy }}亲密度</span>
              </div>
              <button class="complete-btn" @click="completeEvent()">
                完成事件
              </button>
            </div>
          </div>
          <div class="event-modal-footer">
            <button class="close-btn" @click="showEventModal = false">稍后再说</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fef3ff 0%, #f0f9ff 100%);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.back-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.back-btn .icon {
  width: 24px;
  height: 24px;
}

.companion-header {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-emoji {
  font-size: 28px;
}

.level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.companion-info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px 0;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.heart-icon {
  width: 14px;
  height: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.menu-container {
  position: relative;
}

.menu-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.menu-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.menu-btn .icon {
  width: 24px;
  height: 24px;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  padding: 8px;
  min-width: 140px;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background: var(--bg-secondary);
}

.item-icon {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.event-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 20px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
  border: 1px solid var(--accent-primary);
  border-radius: 12px;
}

.event-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--accent-primary);
  font-weight: 600;
}

.event-icon {
  width: 18px;
  height: 18px;
}

.event-btn {
  padding: 6px 14px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.event-btn:hover {
  background: var(--accent-secondary);
}

.progress-bar-container {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.8);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-messages {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 12px;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
}

.avatar-icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.user-message .avatar-icon {
  color: white;
}

.companion-message .avatar-icon {
  color: var(--accent-primary);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.user-message .message-content {
  align-items: flex-end;
}

.message-emotion {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  padding: 0 8px;
}

.message-bubble {
  padding: 12px 18px;
  border-radius: 18px;
  line-height: 1.6;
  font-size: 15px;
  word-wrap: break-word;
}

.companion-message .message-bubble {
  background: white;
  color: var(--text-primary);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.user-message .message-bubble {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border-top-right-radius: 4px;
}

.message-bubble.typing {
  padding: 14px 20px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-6px); opacity: 1; }
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.message-gain {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gain-icon {
  width: 14px;
  height: 14px;
  color: var(--accent-primary);
}

.gain-icon.heart {
  color: #ec4899;
}

.quick-replies {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid #e5e7eb;
}

.quick-replies::-webkit-scrollbar {
  display: none;
}

.quick-reply-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.quick-reply-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-light);
}

.reply-icon {
  width: 16px;
  height: 16px;
}

.input-container {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.message-input {
  flex: 1;
  padding: 14px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 25px;
  font-size: 15px;
  transition: all 0.3s ease;
}

.message-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  width: 22px;
  height: 22px;
}

.no-companion {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  width: 60px;
  height: 60px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.no-companion h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.no-companion p {
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.go-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.go-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.event-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--accent-light), rgba(139, 92, 246, 0.1));
  border-bottom: 1px solid #e5e7eb;
}

.header-icon {
  width: 28px;
  height: 28px;
  color: var(--accent-primary);
}

.event-modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.event-modal-body {
  padding: 24px;
}

.event-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.event-content {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 12px;
  line-height: 1.8;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.choices-title, .rewards-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.event-choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 18px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.choice-btn:hover {
  border-color: var(--accent-primary);
  background: var(--accent-light);
}

.choice-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: 600;
}

.choice-reward svg {
  width: 14px;
  height: 14px;
}

.rewards-list {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 20px;
}

.reward-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-primary);
}

.reward-icon.heart {
  color: #ec4899;
}

.complete-btn {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.complete-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

.event-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}
</style>
