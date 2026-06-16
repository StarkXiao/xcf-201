<script setup>
import { computed } from 'vue'
import { CheckCircle2, Clock, Flame, Target, TrendingUp, Calendar, Award } from 'lucide-vue-next'

const props = defineProps({
  taskCompletion: {
    type: Object,
    required: true
  }
})

const overallStats = computed(() => props.taskCompletion?.overallStats || {})
const typeDistribution = computed(() => props.taskCompletion?.typeDistribution || [])
const monthlyTrend = computed(() => props.taskCompletion?.monthlyTrend || [])
const streak = computed(() => props.taskCompletion?.streak || {})

const maxMonthlyCount = computed(() => {
  if (monthlyTrend.value.length === 0) return 1
  return Math.max(...monthlyTrend.value.map(m => m.total), ...monthlyTrend.value.map(m => m.completed), 1)
})

const maxTypeCount = computed(() => {
  if (typeDistribution.value.length === 0) return 1
  return Math.max(...typeDistribution.value.map(t => t.count), 1)
})

function formatDate(dateStr) {
  if (!dateStr) return '暂无'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getTypeColor(type) {
  const colors = {
    daily: '#22c55e',
    weekly: '#3b82f6',
    monthly: '#a855f7',
    special: '#f97316'
  }
  return colors[type] || '#6b7280'
}

function getTypeLabel(type) {
  const labels = {
    daily: '每日任务',
    weekly: '每周任务',
    monthly: '每月任务',
    special: '特殊任务'
  }
  return labels[type] || type
}

function getTypeIcon(type) {
  const icons = {
    daily: Calendar,
    weekly: Calendar,
    monthly: Calendar,
    special: Award
  }
  return icons[type] || Target
}
</script>

<template>
  <div class="task-completion-section">
    <div class="section-header glass-card">
      <div class="section-title-row">
        <Target class="section-icon task" />
        <h3 class="section-title">任务完成率统计</h3>
      </div>
      
      <div class="stats-overview">
        <div class="overview-item">
          <div class="overview-icon-wrapper completed">
            <CheckCircle2 class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.completedCount || 0 }}</span>
            <span class="overview-label">已完成</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper rate">
            <TrendingUp class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.completionRate || 0 }}%</span>
            <span class="overview-label">完成率</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper streak">
            <Flame class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ streak.currentStreak || 0 }}天</span>
            <span class="overview-label">连续完成</span>
          </div>
        </div>
        
        <div class="overview-item">
          <div class="overview-icon-wrapper rewards">
            <Award class="overview-icon" />
          </div>
          <div class="overview-info">
            <span class="overview-value">{{ overallStats.totalRewards || 0 }}</span>
            <span class="overview-label">获得奖励</span>
          </div>
        </div>
      </div>
    </div>

    <div class="streak-card glass-card" v-if="streak.currentStreak > 0">
      <div class="streak-header">
        <div class="streak-icon-wrapper">
          <Flame class="streak-icon" />
        </div>
        <div class="streak-info">
          <h4 class="streak-title">连续完成记录</h4>
          <p class="streak-subtitle">继续保持，你做得很棒！</p>
        </div>
      </div>
      <div class="streak-stats">
        <div class="streak-stat">
          <span class="streak-stat-value flame">{{ streak.currentStreak || 0 }}</span>
          <span class="streak-stat-label">当前连续</span>
        </div>
        <div class="streak-stat">
          <span class="streak-stat-value">{{ streak.longestStreak || 0 }}</span>
          <span class="streak-stat-label">最长连续</span>
        </div>
        <div class="streak-stat">
          <span class="streak-stat-value">{{ streak.totalClaimed || 0 }}</span>
          <span class="streak-stat-label">累计领取</span>
        </div>
      </div>
      <div v-if="streak.lastClaimDate" class="last-claim">
        <Clock class="clock-icon" />
        <span>最近完成：{{ formatDate(streak.lastClaimDate) }}</span>
      </div>
    </div>

    <div class="monthly-trend glass-card" v-if="monthlyTrend.length > 0">
      <h4 class="chart-title">月度完成趋势</h4>
      <div class="trend-chart">
        <div 
          v-for="month in monthlyTrend" 
          :key="month.month"
          class="month-trend-item"
        >
          <div class="month-label">{{ month.label }}</div>
          <div class="bars-container">
            <div class="bar-group">
              <div 
                class="bar total"
                :style="{ height: `${(month.total / maxMonthlyCount) * 100}%` }"
                :title="`总任务: ${month.total}`"
              ></div>
              <div 
                class="bar completed"
                :style="{ height: `${(month.completed / maxMonthlyCount) * 100}%` }"
                :title="`已完成: ${month.completed}`"
              ></div>
            </div>
          </div>
          <div class="month-rate">{{ month.completionRate || 0 }}%</div>
        </div>
      </div>
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-dot total"></span>
          <span class="legend-text">总任务</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot completed"></span>
          <span class="legend-text">已完成</span>
        </div>
      </div>
    </div>

    <div class="type-distribution glass-card">
      <h4 class="chart-title">任务类型分布</h4>
      <div class="type-list">
        <div 
          v-for="type in typeDistribution" 
          :key="type.type"
          class="type-item"
        >
          <div class="type-header">
            <div class="type-icon-wrapper" :style="{ backgroundColor: getTypeColor(type.type) + '20' }">
              <component :is="getTypeIcon(type.type)" class="type-icon" :style="{ color: getTypeColor(type.type) }" />
            </div>
            <div class="type-info">
              <span class="type-name">{{ getTypeLabel(type.type) }}</span>
              <span class="type-count">{{ type.count }}个 · {{ type.completionRate || 0 }}%完成</span>
            </div>
          </div>
          <div class="type-progress">
            <div class="type-progress-bg">
              <div 
                class="type-progress-bar"
                :style="{ 
                  width: `${(type.count / maxTypeCount) * 100}%`,
                  backgroundColor: getTypeColor(type.type)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.task-completion-section {
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
  
  &.task {
    color: var(--color-secondary);
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
  
  &.completed {
    background: rgba(34, 197, 94, 0.15);
    .overview-icon { color: #22c55e; }
  }
  
  &.rate {
    background: rgba(59, 130, 246, 0.15);
    .overview-icon { color: #3b82f6; }
  }
  
  &.streak {
    background: rgba(249, 115, 22, 0.15);
    .overview-icon { color: #f97316; }
  }
  
  &.rewards {
    background: rgba(251, 191, 36, 0.15);
    .overview-icon { color: #fbbf24; }
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

.streak-card {
  padding: 24px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(251, 191, 36, 0.1));
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.streak-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.streak-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #f97316, #fbbf24);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.3);
}

.streak-icon {
  width: 32px;
  height: 32px;
  color: var(--color-bg-dark);
}

.streak-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.streak-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.streak-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.streak-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.streak-stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
  
  &.flame {
    color: #f97316;
    text-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
  }
}

.streak-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.last-claim {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.clock-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
}

.monthly-trend {
  padding: 24px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 20px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 180px;
  margin-bottom: 16px;
}

.month-trend-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.month-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.bars-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-group {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 100%;
  width: 100%;
  max-width: 40px;
}

.bar {
  flex: 1;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height 0.5s ease;
  
  &.total {
    background: rgba(156, 163, 175, 0.5);
  }
  
  &.completed {
    background: linear-gradient(to top, var(--color-secondary), var(--color-accent));
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  }
}

.month-rate {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-secondary);
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  
  &.total {
    background: rgba(156, 163, 175, 0.5);
  }
  
  &.completed {
    background: linear-gradient(to right, var(--color-secondary), var(--color-accent));
  }
}

.legend-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.type-distribution {
  padding: 24px;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-header {
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
  gap: 2px;
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

.type-progress-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.type-progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .streak-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
