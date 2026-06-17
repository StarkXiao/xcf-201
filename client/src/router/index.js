import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/calendar',
    meta: { requiresAuth: true }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/Calendar.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms',
    name: 'Rooms',
    component: () => import('@/views/Rooms.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms/:id',
    name: 'RoomDetail',
    component: () => import('@/views/RoomDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: () => import('@/views/Achievements.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/prescription',
    name: 'EmotionPrescription',
    component: () => import('@/views/EmotionPrescription.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dream-collection',
    name: 'DreamCollection',
    component: () => import('@/views/DreamCollection.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/companions',
    name: 'Companions',
    component: () => import('@/views/Companions.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/companions/:id',
    name: 'CompanionDetail',
    component: () => import('@/views/CompanionDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/wish-commission',
    name: 'WishCommission',
    component: () => import('@/views/WishCommission.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/crisis-center',
    name: 'CrisisCenter',
    component: () => import('@/views/CrisisCenter.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next('/calendar')
  } else {
    next()
  }
})

export default router
