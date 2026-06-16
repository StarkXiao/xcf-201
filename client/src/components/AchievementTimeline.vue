<script setup>
import { computed, ref } from 'vue'
import { Trophy, Zap, Clock, Calendar, Star, Award, TrendingUp, Sparkles, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  achievementRhythm: {
    type: Object,
    required: true
  }
})

const timeline = computed(() => props.achievementRhythm?.timeline || [])
const monthlyDistribution = computed(() => props.achievementRhythm?.monthlyDistribution || [])
const typeAnalysis = computed(() => props.achievementRhythm?.typeAnalysis || [])
const unlockPattern = computed(() => props.achievementRhythm?.unlockPattern || {})
const stats = computed(() => props.achievementRhythm?.stats || {})

const expandedMonth = ref(null)

function toggleMonth(monthKey) {
  expandedMonth.value = expandedMonth.value === monthKey ? null : monthKey
}

function formatDate(dateStr) {
  if (!dateStr) return '暂无'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

function getTypeColor(type) {
  const colors = {
    mood: '#ec4899',
    reading: '#8b5cf6',
    task: '#3b82f6',
    social: '#22c55e',
    special: '#f97316'
  }
  return colors[type] || '#6b7280'
}

function getTypeLabel(type) {
  const labels = {
    mood: '心情记录',
    reading: '阅读探索',
    task: '任务完成',
    social: '社交互动',
    special: '特殊成就'
  }
  return labels[type] || type
}

function getRarityColor(rarity) {
  const colors = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f97316'
  }
  return colors[rarity] || '#9ca3af'
}

function getRarityLabel(rarity) {
  const labels = {
    common: '普通',
    uncommon: '优秀',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return labels[rarity] || rarity
}

function getPatternIcon(pattern) {
  const icons = {
    fast: Zap,
    steady: TrendingUp,
    burst: Sparkles
  }
  return icons[pattern] || Trophy
}

function getPatternLabel(pattern) {
  const labels = {
    fast: '快速解锁型',
    steady: '稳步推进型',
    burst: '爆发式解锁型'
  }
  return labels[pattern] || '混合型'
}

function getPatternDescription(pattern) {
  const descriptions = {
    fast: '你倾向于在获得成就后立即解锁下一个，行动迅速！',
    steady: '你保持着稳定的解锁节奏，循序渐进，值得称赞！',
    burst: '你喜欢在某个时间段集中解锁多个成就，效率惊人！'
  }
  return descriptions[pattern] || '你有自己独特的解锁节奏！'
}
</script>

<template>
  <div class="achievement-timeline-section">
    <div class="section-header glass-card">
      <div class="section-title-row">
        <Trophy class="section-icon achievement" />
        <h3 class="section-title">成就解锁节奏</h3>
      </div>
      
      <div class="stats-overview">
        <div class="overview-item">
          <div class="overview-icon-wrapper unlocked">
            <Trophy class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ stats.totalUnlocked || 0 }}</span>
            <span class="overview-label">已解锁</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper rate">
            <TrendingUp class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ stats.totalCount || 0 }}</span>
            <span class="overview-label">成就总数</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper days">
            <Clock class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ stats.avgDaysBetween || 0 }}</span>
            <span class="overview-label">平均间隔(天)</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper first">
            <Star class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ stats.firstUnlockDate || '—' }}</span>
            <span class="overview-label">首个成就</span>
          </div>
        </div>
      </div>
    </div>

    <div class="pattern-card glass-card">
      <div class="pattern-header">
        <div class="pattern-icon-wrapper">
          <component :is="getPatternIcon(unlockPattern.pattern)" class="pattern-icon" />
        </div>
        <div class="pattern-info">
          <h4 class="pattern-title">解锁模式：{{ getPatternLabel(unlockPattern.pattern) }}</h4>
          <p class="pattern-desc">{{ getPatternDescription(unlockPattern.pattern) }}</p>
        </div>
      </div>
      <div class="pattern-score">
        <div class="score-item">
          <span class="score-label">爆发力</span>
          <div class="score-bar-bg">
            <div class="score-bar burst" :style="{ width: `${unlockPattern.burstScore || 0}%` }"></div>
          </div>
          <span class="score-value">{{ unlockPattern.burstScore || 0 }}%</span>
        </div>
        <div class="score-item">
          <span class="score-label">稳定性</span>
          <div class="score-bar-bg">
            <div class="score-bar steady" :style="{ width: `${unlockPattern.steadyScore || 0}%` }"></div>
          </div>
          <span class="score-value">{{ unlockPattern.steadyScore || 0 }}%</span>
        </div>
        <div class="score-item">
          <span class="score-label">积极性</span>
          <div class="score-bar-bg">
            <div class="score-bar fast" :style="{ width: `${unlockPattern.motivationScore || 0}%` }"></div>
          </div>
          <span class="score-value">{{ unlockPattern.motivationScore || 0 }}%</span>
        </div>
      </div>
    </div>

    <div class="type-analysis glass-card">
      <h4 class="chart-title">成就类型分布</h4>
      <div class="type-list">
        <div 
          v-for="type in typeAnalysis" 
          :key="type.type"
          class="type-item"
        >
          <div class="type-icon-wrapper" :style="{ backgroundColor: getTypeColor(type.type) + '20' }">
            <Award class="type-icon" :style="{ color: getTypeColor(type.type) }" />
          </div>
          <div class="type-info">
            <div class="type-header">
              <span class="type-name">{{ getTypeLabel(type.type) }}</span>
              <span class="type-count">{{ type.count }}个 · {{ type.percentage || 0 }}%</span>
            </div>
            <div class="type-bar-bg">
              <div 
                class="type-bar"
                :style="{ 
                  width: `${type.percentage || 0}%`,
                  backgroundColor: getTypeColor(type.type)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-container glass-card">
      <h4 class="chart-title">解锁时间线</h4>
      
      <div v-if="timeline.length === 0" class="empty-state">
        <Trophy class="empty-icon" />
        <p class="empty-text">还没有解锁任何成就</p>
        <p class="empty-subtext">继续探索，解锁更多成就吧！</p>
      </div>
      
      <div v-else class="timeline">
        <div 
          v-for="monthGroup in timeline" 
          :key="monthGroup.month"
          class="month-group"
        >
          <div 
            class="month-header"
            @click="toggleMonth(monthGroup.month)"
          >
            <div class="month-info">
              <Calendar class="month-icon" />
              <span class="month-label">{{ monthGroup.month }}</span>
              <span class="month-count">{{ monthGroup.count }}个成就</span>
            </div>
            <ChevronRight 
              class="expand-icon" 
              :class="{ 'expanded': expandedMonth === monthGroup.month }"
            />
          </div>
          
          <div 
            class="achievements-list"
            :class="{ 'expanded': expandedMonth === monthGroup.month }"
          >
            <div 
              v-for="achievement in monthGroup.achievements" 
              :key="achievement.id"
              class="achievement-item"
            >
              <div class="timeline-dot" :style="{ backgroundColor: getRarityColor(achievement.rarity) }"></div>
              <div class="achievement-content">
                <div class="achievement-header">
                  <span class="achievement-name">{{ achievement.name }}</span>
                  <span 
                    class="achievement-rarity"
                    :style="{ 
                      color: getRarityColor(achievement.rarity),
                      backgroundColor: getRarityColor(achievement.rarity) + '20'
                    }"
                  >
                    {{ getRarityLabel(achievement.rarity) }}
                  </span>
                </div>
                <p class="achievement-desc">{{ achievement.description }}</p>
                <span class="achievement-date">{{ formatDate(achievement.unlockedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="monthly-distribution glass-card" v-if="monthlyDistribution.length > 0">
      <h4 class="chart-title">月度解锁分布</h4>
      <div class="distribution-chart">
        <div 
          v-for="month in monthlyDistribution" 
          :key="month.month"
          class="dist-month-item"
        >
          <span class="dist-month-label">{{ month.label }}</span>
          <div class="dist-bar-container">
            <div 
              class="dist-bar"
              :style="{ 
                width: `${month.percentage || 0}%`,
                backgroundColor: month.count > 0 ? getTypeColor(month.mostCommonType) : 'rgba(255,255,255,0.1)'
              }"
            ></div>
          </div>
          <span class="dist-count">{{ month.count }}个</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.achievement-timeline-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  padding: 24px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.section-icon {
  width: 24px;
  height: 24px;
  
  &.achievement {
    color: #fbbf24;
  }
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.overview-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.unlocked {
    background: rgba(251, 191, 36, 0.15);
    .overview-icon { color: #fbbf24; }
  }
  
  &.rate {
    background: rgba(139, 92, 246, 0.15);
    .overview-icon { color: #8b5cf6; }
  }
  
  &.days {
    background: rgba(59, 130, 246, 0.15);
    .overview-icon { color: #3b82f6; }
  }
  
  &.first {
    background: rgba(236, 72, 153, 0.15);
    .overview-icon { color: #ec4899; }
  }
  
  .overview-icon {
    width: 24px;
    height: 24px;
  }
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.overview-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.pattern-card {
  padding: 24px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.pattern-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.pattern-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

.pattern-icon {
  width: 32px;
  height: 32px;
  color: var(--color-bg-dark);
}

.pattern-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.pattern-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.pattern-score {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-label {
  width: 60px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.score-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.score-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
  
  &.burst {
    background: linear-gradient(to right, #f97316, #fbbf24);
  }
  
  &.steady {
    background: linear-gradient(to right, #3b82f6, #22c55e);
  }
  
  &.fast {
    background: linear-gradient(to right, #8b5cf6, #ec4899);
  }
}

.score-value {
  width: 50px;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.type-analysis {
  padding: 24px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-icon {
  width: 22px;
  height: 22px;
}

.type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-header {
  display: flex;
  justify-content: space-between;
}

.type-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}

.type-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.type-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.type-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.timeline-container {
  padding: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.empty-subtext {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.timeline {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
  }
}

.month-group {
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-left: 20px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.month-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.month-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}

.month-count {
  font-size: 0.8rem;
  color: var(--color-secondary);
  background: rgba(139, 92, 246, 0.15);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.expand-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
  
  &.expanded {
    transform: rotate(90deg);
  }
}

.achievements-list {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-normal);
  margin-left: 20px;
  
  &.expanded {
    max-height: 1000px;
  }
}

.achievement-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 16px 16px 0;
  position: relative;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
  box-shadow: 0 0 10px currentColor;
  position: relative;
  z-index: 1;
}

.achievement-content {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.achievement-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.achievement-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}

.achievement-rarity {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.achievement-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.achievement-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.monthly-distribution {
  padding: 24px;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dist-month-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dist-month-label {
  width: 80px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.dist-bar-container {
  flex: 1;
  height: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.dist-count {
  width: 50px;
  text-align: right;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .pattern-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
