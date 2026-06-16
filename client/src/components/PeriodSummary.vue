<script setup>
import { computed } from 'vue'
import { Calendar, Award, TrendingUp, Star, Sparkles, Target, Heart, BookOpen, Zap, Lightbulb, RefreshCw } from 'lucide-vue-next'

const props = defineProps({
  periodSummary: {
    type: Object,
    required: true
  }
})

const currentMonth = computed(() => props.periodSummary?.currentMonth || {})
const lastMonth = computed(() => props.periodSummary?.lastMonth || {})
const currentQuarter = computed(() => props.periodSummary?.currentQuarter || {})
const overall = computed(() => props.periodSummary?.overall || {})
const insights = computed(() => props.periodSummary?.insights || [])
const userTitle = computed(() => props.periodSummary?.userTitle || {})

function getPeriodIcon(type) {
  const icons = {
    month: Calendar,
    quarter: Target,
    overall: Star
  }
  return icons[type] || Calendar
}

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

function getInsightIcon(type) {
  const icons = {
    positive: Sparkles,
    suggestion: Lightbulb,
    trend: TrendingUp
  }
  return icons[type] || Sparkles
}

function getInsightColor(type) {
  const colors = {
    positive: '#22c55e',
    suggestion: '#fbbf24',
    trend: '#3b82f6'
  }
  return colors[type] || '#8b5cf6'
}
</script>

<template>
  <div class="period-summary-section">
    <div class="title-card glass-card">
      <div class="title-icon-wrapper">
        <component :is="getInsightIcon('positive')" class="title-icon" />
      </div>
      <div class="title-content">
        <p class="title-label">你的专属称号</p>
        <h2 class="user-title">{{ userTitle.title || '心灵探索者' }}</h2>
        <p class="title-desc">{{ userTitle.description || '正在探索属于自己的心灵之旅' }}</p>
      </div>
    </div>

    <div class="period-tabs">
      <div class="period-card glass-card current">
        <div class="period-header">
          <div class="period-icon-wrapper month">
            <Calendar class="period-icon" />
          </div>
          <div class="period-info">
            <h4 class="period-label">本月总结</h4>
            <span class="period-date">{{ currentMonth.periodLabel || '—' }}</span>
          </div>
        </div>
        
        <div class="period-stats">
          <div class="period-stat">
            <div class="stat-icon-wrapper mood">
              <Heart class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ currentMonth.avgMoodScore || 0 }}</span>
              <span class="stat-label">平均情绪</span>
            </div>
          </div>
          <div class="period-stat">
            <div class="stat-icon-wrapper reading">
              <BookOpen class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ currentMonth.chaptersRead || 0 }}</span>
              <span class="stat-label">阅读章节</span>
            </div>
          </div>
          <div class="period-stat">
            <div class="stat-icon-wrapper task">
              <Target class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ currentMonth.tasksCompleted || 0 }}</span>
              <span class="stat-label">完成任务</span>
            </div>
          </div>
          <div class="period-stat">
            <div class="stat-icon-wrapper achievement">
              <Award class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ currentMonth.achievementsUnlocked || 0 }}</span>
              <span class="stat-label">解锁成就</span>
            </div>
          </div>
          <div class="period-stat">
            <div class="stat-icon-wrapper retro">
              <RefreshCw class="stat-icon" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ currentMonth.retrospectives || 0 }}</span>
              <span class="stat-label">回顾复写</span>
            </div>
          </div>
        </div>
        
        <div class="period-mood" v-if="currentMonth.mostCommonMood">
          <span class="mood-emoji">{{ getMoodEmoji(currentMonth.mostCommonMood) }}</span>
          <span class="mood-label">本月主导情绪</span>
        </div>
        
        <div class="period-highlights" v-if="currentMonth.highlights && currentMonth.highlights.length > 0">
          <p class="highlights-title">本月亮点</p>
          <ul class="highlights-list">
            <li v-for="(highlight, idx) in currentMonth.highlights" :key="idx">
              <Sparkles class="highlight-icon" />
              {{ highlight }}
            </li>
          </ul>
        </div>
      </div>

      <div class="period-card glass-card">
        <div class="period-header">
          <div class="period-icon-wrapper last">
            <Calendar class="period-icon" />
          </div>
          <div class="period-info">
            <h4 class="period-label">上月回顾</h4>
            <span class="period-date">{{ lastMonth.periodLabel || '—' }}</span>
          </div>
        </div>
        
        <div class="period-stats compact">
          <div class="stat-row">
            <span class="stat-row-label">平均情绪</span>
            <div class="stat-row-bar-bg">
              <div 
                class="stat-row-bar"
                :style="{ width: `${(lastMonth.avgMoodScore / 5) * 100}%` }"
              ></div>
            </div>
            <span class="stat-row-value">{{ lastMonth.avgMoodScore || 0 }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">任务完成</span>
            <span class="stat-row-value">{{ lastMonth.tasksCompleted || 0 }}个 · {{ lastMonth.completionRate || 0 }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">阅读章节</span>
            <span class="stat-row-value">{{ lastMonth.chaptersRead || 0 }}章</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">解锁成就</span>
            <span class="stat-row-value">{{ lastMonth.achievementsUnlocked || 0 }}个</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">回顾复写</span>
            <span class="stat-row-value">
              {{ lastMonth.retrospectives || 0 }}篇
              <span v-if="lastMonth.comparison?.retroChange > 0" class="change positive">+{{ lastMonth.comparison.retroChange }}</span>
              <span v-else-if="lastMonth.comparison?.retroChange < 0" class="change negative">{{ lastMonth.comparison.retroChange }}</span>
            </span>
          </div>
        </div>
        
        <div class="period-comparison" v-if="lastMonth.comparison">
          <div class="comparison-item" v-if="lastMonth.comparison.moodChange !== undefined">
            <TrendingUp 
              class="comparison-icon" 
              :class="{ 'positive': lastMonth.comparison.moodChange > 0, 'negative': lastMonth.comparison.moodChange < 0 }"
            />
            <span>情绪评分 {{ lastMonth.comparison.moodChange > 0 ? '+' : '' }}{{ lastMonth.comparison.moodChange }}</span>
          </div>
          <div class="comparison-item" v-if="lastMonth.comparison.taskChange !== undefined">
            <TrendingUp 
              class="comparison-icon"
              :class="{ 'positive': lastMonth.comparison.taskChange > 0, 'negative': lastMonth.comparison.taskChange < 0 }"
            />
            <span>任务完成 {{ lastMonth.comparison.taskChange > 0 ? '+' : '' }}{{ lastMonth.comparison.taskChange }}</span>
          </div>
        </div>
      </div>

      <div class="period-card glass-card">
        <div class="period-header">
          <div class="period-icon-wrapper quarter">
            <Target class="period-icon" />
          </div>
          <div class="period-info">
            <h4 class="period-label">本季度汇总</h4>
            <span class="period-date">{{ currentQuarter.periodLabel || '—' }}</span>
          </div>
        </div>
        
        <div class="period-stats compact">
          <div class="stat-row">
            <span class="stat-row-label">情绪记录</span>
            <span class="stat-row-value">{{ currentQuarter.moodRecords || 0 }}条</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">累计阅读</span>
            <span class="stat-row-value">{{ formatReadingTime(currentQuarter.readingTime || 0) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">任务领取</span>
            <span class="stat-row-value">{{ currentQuarter.tasksClaimed || 0 }}个</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">成就解锁</span>
            <span class="stat-row-value">{{ currentQuarter.achievementsUnlocked || 0 }}个</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">最长连续</span>
            <span class="stat-row-value">{{ currentQuarter.longestStreak || 0 }}天</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">回顾复写</span>
            <span class="stat-row-value">{{ currentQuarter.retrospectives || 0 }}篇</span>
          </div>
        </div>
        
        <div class="period-summary-text">
          <p>{{ currentQuarter.summary || '本季度你一直在持续进步，继续保持！' }}</p>
        </div>
      </div>

      <div class="period-card glass-card overall">
        <div class="period-header">
          <div class="period-icon-wrapper overall">
            <Star class="period-icon" />
          </div>
          <div class="period-info">
            <h4 class="period-label">累计总览</h4>
            <span class="period-date">{{ overall.periodLabel || '自使用以来' }}</span>
          </div>
        </div>
        
        <div class="overall-stats">
          <div class="overall-stat">
            <span class="overall-stat-value">{{ overall.totalMoodRecords || 0 }}</span>
            <span class="overall-stat-label">情绪记录</span>
          </div>
          <div class="overall-stat">
            <span class="overall-stat-value">{{ overall.totalChaptersRead || 0 }}</span>
            <span class="overall-stat-label">阅读章节</span>
          </div>
          <div class="overall-stat">
            <span class="overall-stat-value">{{ overall.totalTasksCompleted || 0 }}</span>
            <span class="overall-stat-label">完成任务</span>
          </div>
          <div class="overall-stat">
            <span class="overall-stat-value">{{ overall.totalAchievements || 0 }}</span>
            <span class="overall-stat-label">成就解锁</span>
          </div>
          <div class="overall-stat">
            <span class="overall-stat-value">{{ overall.totalRetrospectives || 0 }}</span>
            <span class="overall-stat-label">回顾复写</span>
          </div>
        </div>
        
        <div class="overall-summary">
          <p class="overall-summary-text">{{ overall.summary || '感谢你一直以来的坚持，每一次记录都是成长的脚印。' }}</p>
        </div>
      </div>
    </div>

    <div class="insights-section glass-card">
      <div class="insights-header">
        <Lightbulb class="insights-header-icon" />
        <h3 class="insights-title">个性化洞察</h3>
      </div>
      
      <div class="insights-list">
        <div 
          v-for="(insight, idx) in insights" 
          :key="idx"
          class="insight-card"
          :style="{ borderLeftColor: getInsightColor(insight.type) }"
        >
          <div 
            class="insight-icon-wrapper"
            :style="{ backgroundColor: getInsightColor(insight.type) + '20' }"
          >
            <component 
              :is="getInsightIcon(insight.type)" 
              class="insight-icon"
              :style="{ color: getInsightColor(insight.type) }"
            />
          </div>
          <div class="insight-content">
            <h4 class="insight-title">{{ insight.title }}</h4>
            <p class="insight-text">{{ insight.message }}</p>
            <div class="insight-tags" v-if="insight.tags && insight.tags.length > 0">
              <span v-for="tag in insight.tags" :key="tag" class="insight-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.period-summary-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title-card {
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.title-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #fbbf24, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 30px rgba(251, 191, 36, 0.4);
}

.title-icon {
  width: 40px;
  height: 40px;
  color: var(--color-bg-dark);
}

.title-content {
  flex: 1;
}

.title-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.user-title {
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, #fbbf24, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.title-desc {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.period-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.period-card {
  padding: 24px;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &.current {
    grid-column: span 2;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
    border: 1px solid rgba(34, 197, 94, 0.2);
  }
  
  &.overall {
    grid-column: span 2;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(249, 115, 22, 0.1));
    border: 1px solid rgba(251, 191, 36, 0.2);
  }
}

.period-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.period-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.month {
    background: rgba(34, 197, 94, 0.2);
    .period-icon { color: #22c55e; }
  }
  
  &.last {
    background: rgba(139, 92, 246, 0.2);
    .period-icon { color: #8b5cf6; }
  }
  
  &.quarter {
    background: rgba(59, 130, 246, 0.2);
    .period-icon { color: #3b82f6; }
  }
  
  &.overall {
    background: rgba(251, 191, 36, 0.2);
    .period-icon { color: #fbbf24; }
  }
  
  .period-icon {
    width: 24px;
    height: 24px;
  }
}

.period-info {
  flex: 1;
}

.period-label {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 2px 0;
}

.period-date {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.period-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  
  &.compact {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
}

.period-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.stat-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.mood {
    background: rgba(236, 72, 153, 0.2);
    .stat-icon { color: #ec4899; }
  }
  
  &.reading {
    background: rgba(139, 92, 246, 0.2);
    .stat-icon { color: #8b5cf6; }
  }
  
  &.task {
    background: rgba(59, 130, 246, 0.2);
    .stat-icon { color: #3b82f6; }
  }
  
  &.achievement {
    background: rgba(251, 191, 36, 0.2);
    .stat-icon { color: #fbbf24; }
  }
  
  &.retro {
    background: rgba(139, 92, 246, 0.2);
    .stat-icon { color: #8b5cf6; }
  }
  
  .stat-icon {
    width: 20px;
    height: 20px;
  }
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.period-mood {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.mood-emoji {
  font-size: 1.5rem;
}

.mood-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.period-highlights {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.highlights-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.highlights-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.highlights-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.highlight-icon {
  width: 14px;
  height: 14px;
  color: #fbbf24;
  flex-shrink: 0;
  margin-top: 2px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
}

.stat-row-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.stat-row-bar-bg {
  flex: 1;
  height: 6px;
  margin: 0 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stat-row-bar {
  height: 100%;
  background: linear-gradient(to right, #22c55e, #3b82f6);
  border-radius: var(--radius-full);
}

.stat-row-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

.period-comparison {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.comparison-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.comparison-icon {
  width: 16px;
  height: 16px;
  
  &.positive {
    color: #22c55e;
  }
  
  &.negative {
    color: #ef4444;
    transform: rotate(180deg);
  }
}

.period-summary-text {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  
  p {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.6;
  }
}

.overall-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.overall-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.overall-stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, #fbbf24, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.overall-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.overall-summary {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.overall-summary-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}

.insights-section {
  padding: 24px;
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.insights-header-icon {
  width: 24px;
  height: 24px;
  color: #fbbf24;
}

.insights-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-display);
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.insight-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  border-left: 4px solid #8b5cf6;
}

.insight-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-icon {
  width: 22px;
  height: 22px;
}

.insight-content {
  flex: 1;
}

.insight-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px 0;
}

.insight-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.insight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.insight-tag {
  font-size: 0.7rem;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .title-card {
    flex-direction: column;
    text-align: center;
  }
  
  .period-tabs {
    grid-template-columns: 1fr;
  }
  
  .period-card {
    &.current,
    &.overall {
      grid-column: span 1;
    }
  }
  
  .period-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .overall-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
