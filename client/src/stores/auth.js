import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(loginData) {
    try {
      const response = await authApi.login(loginData)
      if (response.code === 200) {
        token.value = response.data.token
        user.value = {
          userId: response.data.userId,
          username: response.data.username,
          email: response.data.email,
          avatar: response.data.avatar
        }
        localStorage.setItem('token', token.value)
        localStorage.setItem('user', JSON.stringify(user.value))
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '登录失败' }
    }
  }

  async function register(registerData) {
    try {
      const response = await authApi.register(registerData)
      if (response.code === 200) {
        token.value = response.data.token
        user.value = {
          userId: response.data.userId,
          username: response.data.username,
          email: response.data.email,
          avatar: response.data.avatar
        }
        localStorage.setItem('token', token.value)
        localStorage.setItem('user', JSON.stringify(user.value))
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '注册失败' }
    }
  }

  async function fetchProfile() {
    try {
      const response = await authApi.getProfile()
      if (response.code === 200) {
        user.value = response.data
        localStorage.setItem('user', JSON.stringify(user.value))
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '获取用户信息失败' }
    }
  }

  function restoreAuth() {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    fetchProfile,
    restoreAuth,
    logout
  }
})
