<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Minus, Smile, Frown, Meh, Heart, Activity } from 'lucide-vue-next'

const props = defineProps({
  moodCurve: {
    type: Object,
    required: true
  }
})

const overallStats = computed(() => props.moodCurve?.overallStats || {})
const monthlyData = computed(() => props.moodCurve?.monthlyData || [])
const moodColors = computed(() => props.moodCurve?.moodColors || {})
const moodLabels = computed(() => props.moodCurve?.moodLabels || {})

const chartData = computed(() => {
  return monthlyData.value.map((month, index) => {
    const x = (index / (monthlyData.value.length - 1 || 1)) * 100
    const y = 100 - (month.avgScore / 5) * 100
    return {
      ...month,
      x,
      y,
      displayScore: month.avgScore || 0
    }
  })
})

const pathD = computed(() => {
  if (chartData.value.length < 2) return ''
  
  let d = `M ${chartData.value[0].x} ${chartData.value[0].y}`
  
  for (let i = 1; i < chartData.value.length; i++) {
    const prev = chartData.value[i - 1]
    const curr = chartData.value[i]
    const cpx1 = prev.x + (curr.x - prev.x) / 3
    const cpx2 = prev.x + (curr.x - prev.x) * 2 / 3
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
  }
  
  return d
})

const areaD = computed(() => {
  if (chartData.value.length < 2) return ''
  return `${pathD.value} L ${chartData.value[chartData.value.length - 1].x} 100 L ${chartData.value[0].x} 100 Z`
})

const trendIcon = computed(() => {
  if (overallStats.value.trend === 'improving') return TrendingUp
  if (overallStats.value.trend === 'declining') return TrendingDown
  return Minus
})

const trendColor = computed(() => {
  if (overallStats.value.trend === 'improving') return 'text-green-400'
  if (overallStats.value.trend === 'declining') return 'text-red-400'
  return 'text-blue-400'
})

function getMoodEmoji(mood) {
  const emojiMap = {
    happy: '😊',
    calm: '😌',
    sad: '😢',
    anxious: '😰',
    angry: '😠'
  }
  return emojiMap[mood] || '😐'
}

function formatReadingTime(minutes) {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}
</script>

<template>
  <div class="mood-curve-section">
    <div class="section-header glass-card">
      <div class="section-title-row">
        <Activity class="section-icon mood" />
        <h3 class="section-title">月度情绪曲线</h3>
      </div>
      
      <div class="stats-overview">
        <div class="overview-item">
          <div class="overview-icon-wrapper">
            <Heart class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.avgScore || 0 }}</span>
            <span class="overview-label">平均情绪分</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper trend" :class="trendColor">
            <component :is="trendIcon" class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value" :class="trendColor">
              {{ overallStats.trendValue > 0 ? '+' : '' }}{{ overallStats.trendValue || 0 }}
            </span>
            <span class="overview-label">情绪趋势</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper dominant">
            <span class="mood-emoji">{{ getMoodEmoji(overallStats.mostCommonMood) }}</span>
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.mostCommonMoodLabel || '平静' }}</span>
            <span class="overview-label">主导情绪</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper record">
            <Smile class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.totalDays || 0 }}</span>
            <span class="overview-label">记录天数</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-container glass-card">
      <h4 class="chart-title">近6个月情绪趋势</h4>
      
      <div class="chart-wrapper">
        <svg class="mood-chart" viewBox="0 0 100 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" :stop-color="moodColors.calm" stop-opacity="0.3" />
              <stop offset="100%" :stop-color="moodColors.calm" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" :stop-color="moodColors.happy" />
              <stop offset="50%" :stop-color="moodColors.calm" />
              <stop offset="100%" :stop-color="moodColors.happy" />
            </linearGradient>
          </defs>
          
          <g class="grid-lines">
            <line x1="0" y1="20" x2="100" y2="20" class="grid-line" />
            <line x1="0" y1="40" x2="100" y2="40" class="grid-line" />
            <line x1="0" y1="60" x2="100" y2="60" class="grid-line" />
            <line x1="0" y1="80" x2="100" y2="80" class="grid-line" />
          </g>
          
          <path :d="areaD" fill="url(#areaGradient)" class="area-fill" />
          
          <path 
            :d="pathD" 
            fill="none" 
            stroke="url(#lineGradient)" 
            stroke-width="2" 
            stroke-linecap="round"
            stroke-linejoin="round"
            class="curve-line"
          />
          
          <g class="data-points">
            <g 
              v-for="(point, index) in chartData" 
              :key="index"
              class="data-point-group"
            >
              <circle 
                :cx="point.x" 
                :cy="point.y" 
                r="3"
                :fill="point.dominantMoodColor || moodColors.calm"
                class="data-point"
              />
              <text 
                :x="point.x" 
                :y="point.y - 6" 
                text-anchor="middle"
                class="data-label"
              >
                {{ point.displayScore }}
              </text>
            </g>
          </g>
        </svg>
        
        <div class="x-axis-labels">
          <span v-for="month in monthlyData" :key="month.label" class="x-label">
            {{ month.month }}月
          </span>
        </div>
      </div>
      
      <div class="mood-legend">
        <div class="legend-item" v-for="(label, key) in moodLabels" :key="key">
          <span class="legend-dot" :style="{ backgroundColor: moodColors[key] }"></span>
          <span class="legend-text">{{ getMoodEmoji(key) }} {{ label }}</span>
        </div>
      </div>
    </div>

    <div class="monthly-details">
      <h4 class="details-title">月度详情</h4>
      <div class="monthly-cards">
        <div 
          v-for="month in monthlyData" 
          :key="month.label"
          class="month-card glass-card"
        >
          <div class="month-header">
            <span class="month-name">{{ month.label }}</span>
            <span class="month-mood" :style="{ color: month.dominantMoodColor }">
              {{ getMoodEmoji(month.dominantMood) }} {{ month.dominantMoodLabel }}
            </span>
          </div>
          
          <div class="month-score">
            <div class="score-bar-bg">
              <div 
                class="score-bar"
                :style="{ 
                  width: `${(month.avgScore / 5) * 100}%`,
                  backgroundColor: month.dominantMoodColor
                }"
              ></div>
            </div>
            <span class="score-value">{{ month.avgScore || 0 }}</span>
          </div>
          
          <div class="month-stats">
            <div class="stat-mini">
              <span class="stat-mini-value">{{ month.daysWithRecords }}</span>
              <span class="stat-mini-label">记录天数</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value">{{ month.recordRate || 0 }}%</span>
              <span class="stat-mini-label">记录率</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value">{{ month.totalRecords }}</span>
              <span class="stat-mini-label">总记录</span>
            </div>
          </div>
          
          <div class="mood-distribution" v-if="month.moodDistribution && Object.keys(month.moodDistribution).length > 0">
            <div 
              v-for="(count, mood) in month.moodDistribution" 
              :key="mood"
              class="dist-item"
            >
              <span class="dist-emoji">{{ getMoodEmoji(mood) }}</span>
              <div class="dist-bar-bg">
                <div 
                  class="dist-bar"
                  :style="{ 
                    width: `${(count / month.totalRecords) * 100}%`,
                    backgroundColor: moodColors[mood]
                  }"
                ></div>
              </div>
              <span class="dist-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mood-curve-section {
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
  
  &.mood {
    color: var(--color-primary);
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
  background: rgba(236, 72, 153, 0.15);
  
  &.trend {
    background: rgba(34, 197, 94, 0.15);
  }
  
  &.dominant {
    background: rgba(251, 191, 36, 0.15);
  }
  
  &.record {
    background: rgba(96, 165, 250, 0.15);
  }
  
  .overview-icon {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }
  
  .mood-emoji {
    font-size: 1.5rem;
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

.chart-container {
  padding: 24px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
}

.mood-chart {
  width: 100%;
  height: 220px;
}

.grid-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 0.5;
  stroke-dasharray: 2, 2;
}

.curve-line {
  filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.4));
}

.data-point {
  stroke: var(--color-bg-card);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6));
}

.data-label {
  fill: var(--color-text-secondary);
  font-size: 4px;
  font-weight: 500;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.x-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.mood-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.monthly-details {
  margin-top: 4px;
}

.details-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.monthly-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.month-card {
  padding: 20px;
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.month-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.month-mood {
  font-size: 0.85rem;
  font-weight: 500;
}

.month-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
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
}

.score-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  min-width: 30px;
  text-align: right;
}

.month-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-mini-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
}

.stat-mini-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.mood-distribution {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dist-emoji {
  font-size: 0.9rem;
  width: 20px;
  text-align: center;
}

.dist-bar-bg {
  flex: 1;
  height: 6px;
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
  font-size: 0.75rem;
  color: var(--color-text-muted);
  min-width: 20px;
  text-align: right;
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .monthly-cards {
    grid-template-columns: 1fr;
  }
}
</style>
