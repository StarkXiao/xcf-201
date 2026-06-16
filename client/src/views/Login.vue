<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { Moon, User, Lock, ArrowRight } from 'lucide-vue-next'
import NotificationToast from '@/components/NotificationToast.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)

const canSubmit = () => username.value.trim() && password.value.trim()

const handleLogin = async () => {
  if (!canSubmit() || isLoading.value) return
  
  isLoading.value = true
  
  const result = await authStore.login({
    username: username.value.trim(),
    password: password.value
  })
  
  isLoading.value = false
  
  if (result.success) {
    notificationStore.success('登录成功！欢迎回到梦境旅馆', '欢迎回来')
    
    const redirect = route.query.redirect || '/calendar'
    setTimeout(() => router.push(redirect), 500)
  } else {
    notificationStore.error(result.message, '登录失败')
  }
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="floating-elements">
      <div class="float-element star-1">⭐</div>
      <div class="float-element star-2">✨</div>
      <div class="float-element star-3">🌙</div>
      <div class="float-element star-4">⭐</div>
      <div class="float-element star-5">✨</div>
    </div>
    
    <div class="auth-container">
      <div class="auth-logo">
        <Moon class="logo-icon" />
        <h1 class="logo-title">梦境旅馆</h1>
        <p class="logo-subtitle">记录心情，解锁故事</p>
      </div>
      
      <div class="auth-form glass-card">
        <h2 class="form-title">登录</h2>
        
        <div class="form-group">
          <label class="form-label">
            <User class="input-icon" />
            <span>用户名</span>
          </label>
          <input
            v-model="username"
            type="text"
            class="input-field"
            placeholder="请输入用户名"
            @keypress="handleKeyPress"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <Lock class="input-icon" />
            <span>密码</span>
          </label>
          <input
            v-model="password"
            type="password"
            class="input-field"
            placeholder="请输入密码"
            @keypress="handleKeyPress"
          />
        </div>
        
        <button 
          class="btn-primary submit-btn" 
          :disabled="!canSubmit() || isLoading"
          @click="handleLogin"
        >
          {{ isLoading ? '登录中...' : '登录' }}
          <ArrowRight class="btn-icon" />
        </button>
        
        <div class="form-footer">
          <span class="footer-text">还没有账号？</span>
          <router-link to="/register" class="footer-link">立即注册</router-link>
        </div>
      </div>
    </div>
    
    <NotificationToast />
  </div>
</template>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.float-element {
  position: absolute;
  font-size: 2rem;
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;
  
  &.star-1 { top: 10%; left: 10%; animation-delay: 0s; }
  &.star-2 { top: 20%; right: 15%; animation-delay: 1s; }
  &.star-3 { top: 60%; left: 5%; animation-delay: 2s; }
  &.star-4 { bottom: 20%; right: 10%; animation-delay: 3s; }
  &.star-5 { bottom: 10%; left: 20%; animation-delay: 4s; }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

.auth-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
}

.auth-logo {
  text-align: center;
  margin-bottom: 32px;
  animation: fadeInDown 0.8s ease;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-icon {
  width: 64px;
  height: 64px;
  color: var(--color-secondary);
  margin-bottom: 16px;
  animation: pulse 3s ease-in-out infinite;
}

.logo-title {
  font-size: 2.5rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  color: var(--color-text-muted);
  font-size: 1rem;
}

.auth-form {
  padding: 32px;
  animation: fadeInUp 0.8s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-title {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 24px;
  color: var(--color-text);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.input-icon {
  width: 18px;
  height: 18px;
  color: var(--color-secondary);
}

.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.btn-icon {
  width: 18px;
  height: 18px;
  transition: transform var(--transition-fast);
  
  .submit-btn:hover & {
    transform: translateX(4px);
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-text {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.footer-link {
  color: var(--color-secondary);
  font-weight: 500;
  transition: color var(--transition-fast);
  
  &:hover {
    color: var(--color-gold);
  }
}

@media (max-width: 480px) {
  .auth-form {
    padding: 24px 20px;
  }
  
  .logo-title {
    font-size: 2rem;
  }
  
  .logo-icon {
    width: 48px;
    height: 48px;
  }
}
</style>
