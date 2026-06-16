<script setup>
import { RouterView } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import { useAuthStore } from './stores/auth'
import { onMounted } from 'vue'

const authStore = useAuthStore()

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    authStore.restoreAuth()
  }
})
</script>

<template>
  <div class="app-container">
    <div class="stars-bg"></div>
    <div class="aurora-bg"></div>
    <AppLayout>
      <RouterView />
    </AppLayout>
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.stars-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at bottom, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  z-index: -2;
  
  &::before {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    box-shadow:
      50px 100px 2px rgba(255,255,255,0.8),
      150px 200px 2px rgba(255,255,255,0.6),
      250px 50px 2px rgba(255,255,255,0.9),
      350px 150px 2px rgba(255,255,255,0.7),
      450px 250px 2px rgba(255,255,255,0.8),
      550px 80px 2px rgba(255,255,255,0.6),
      650px 180px 2px rgba(255,255,255,0.9),
      750px 300px 2px rgba(255,255,255,0.7),
      100px 400px 2px rgba(255,255,255,0.8),
      200px 500px 2px rgba(255,255,255,0.6),
      300px 350px 2px rgba(255,255,255,0.9),
      400px 450px 2px rgba(255,255,255,0.7),
      500px 550px 2px rgba(255,255,255,0.8),
      600px 400px 2px rgba(255,255,255,0.6),
      700px 500px 2px rgba(255,255,255,0.9),
      800px 200px 2px rgba(255,255,255,0.7),
      900px 350px 2px rgba(255,255,255,0.8),
      1000px 100px 2px rgba(255,255,255,0.6),
      1100px 450px 2px rgba(255,255,255,0.9),
      1200px 250px 2px rgba(255,255,255,0.7);
    animation: twinkle 4s ease-in-out infinite;
  }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.aurora-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(ellipse at 20% 80%, rgba(123, 163, 201, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(232, 180, 217, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(61, 44, 92, 0.2) 0%, transparent 70%);
  z-index: -1;
  animation: auroraShift 20s ease-in-out infinite;
}

@keyframes auroraShift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(20px, -20px); }
  50% { transform: translate(-10px, 10px); }
  75% { transform: translate(-20px, -10px); }
}
</style>
