<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMoodLabStore } from '@/stores/moodLab'
import { 
  TrendingUp, PieChart, Target, Sparkles, BarChart3, 
  Calendar, Tag, BookOpen, Gift, ChevronRight,
  Activity, Users, Compass, Award, Flame, Star,
  ArrowUpRight, ArrowDownRight, Minus, Clock,
  Zap, Heart, Shield, Crown, DoorOpen
} from 'lucide-vue-next'

const moodLabStore = useMoodLabStore()

const activeTab = ref('overview')
const isLoading = ref(false)

const tabs = [
  { id: 'overview', name: '实验室概览', icon: Activity },
  { id: 'trends', name: '趋势分析', icon: TrendingUp },
  { id: 'clustering', name: '行为分群', icon: Users },
  { id: 'quests', name: '探索任务', icon: Target }
]

const trendTabs = [
  { id: 'mood', name: '情绪趋势' },
  { id: 'tags', name: '标签分析' },
  { id: 'records', name: '记录频次' },
  { id: 'story', name: '剧情探索' },
  { id: 'rewards', name: '奖励行为' }
]

const activeTrendTab = ref('mood')

const overview = computed(() => moodLabStore.overview)
const trends = computed(() => moodLabStore.trends)
const clustering = computed(() => moodLabStore.clustering)
const quests = computed(() => moodLabStore.quests)

const moodColors = {
  happy: '#fbbf24',
  calm: '#60a5fa',
  sad: '#a78bfa',
  anxious: '#fb923c',
  angry: '#f87171'
}

const moodLabels = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气'
}

const levelColors = {
  S: '#fbbf24',
  A: '#f472b6',
  B: '#60a5fa',
  C: '#4ade80',
  D: '#9ca3af'
}

function getQuestTypeName(type) {
  const typeNames = {
    record: '记录',
    mood: '情绪',
    story: '剧情',
    reward: '奖励',
    tag: '标签',
    reflection: '回顾',
    achievement: '成就',
    exploration: '探索'
  }
  return typeNames[type] || type
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

function getTrendIcon(trend) {
  if (trend === 'improving') return ArrowUpRight
  if (trend === 'declining') return ArrowDownRight
  return Minus
}

function getTrendColor(trend) {
  if (trend === 'improving') return 'text-green-400'
  if (trend === 'declining') return 'text-red-400'
  return 'text-blue-400'
}

function getDifficultyColor(difficulty) {
  const colors = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    hard: 'bg-orange-500/20 text-orange-400',
    legendary: 'bg-purple-500/20 text-purple-400'
  }
  return colors[difficulty] || colors.easy
}

function getDifficultyLabel(difficulty) {
  const labels = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
    legendary: '传说'
  }
  return labels[difficulty] || difficulty
}

async function loadData() {
  isLoading.value = true
  try {
    await moodLabStore.fetchAll()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="mood-lab-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="page-icon-wrapper">
            <Sparkles class="page-icon" />
          </div>
          <div class="header-text">
            <h1 class="page-title">情绪实验室</h1>
            <p class="page-subtitle">探索你的情绪模式，发现成长轨迹</p>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="tab-icon" />
        <span class="tab-text">{{ tab.name }}</span>
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在加载情绪实验室数据...</p>
    </div>

    <div v-else class="tab-content">
      <div v-show="activeTab === 'overview'" class="overview-section">
        <div v-if="overview?.overallType" class="overall-type-card glass-card">
          <div class="type-header">
            <span class="type-icon">{{ overview.overallType.icon }}</span>
            <div class="type-info">
              <h2 class="type-name">{{ overview.overallType.name }}</h2>
              <p class="type-desc">{{ overview.overallType.description }}</p>
            </div>
            <div class="overall-score-badge">
              <span class="score-value">{{ overview.overallType.overallScore }}</span>
              <span class="score-label">综合指数</span>
            </div>
          </div>
          
          <div class="dimension-scores">
            <div class="dim-item">
              <div class="dim-header">
                <Calendar class="dim-icon record" />
                <span class="dim-label">记录行为</span>
                <span class="dim-score">{{ overview.clusters?.record?.level || 'D' }}</span>
              </div>
              <div class="dim-bar-bg">
                <div 
                  class="dim-bar record" 
                  :style="{ width: overview.overallType?.dimensionScores?.record + '%' }"
                ></div>
              </div>
              <span class="dim-type">{{ overview.clusters?.record?.name }}</span>
            </div>
            
            <div class="dim-item">
              <div class="dim-header">
                <Heart class="dim-icon mood" />
                <span class="dim-label">情绪模式</span>
                <span class="dim-score">{{ overview.clusters?.mood?.level || 'D' }}</span>
              </div>
              <div class="dim-bar-bg">
                <div 
                  class="dim-bar mood" 
                  :style="{ width: overview.overallType?.dimensionScores?.mood + '%' }"
                ></div>
              </div>
              <span class="dim-type">{{ overview.clusters?.mood?.name }}</span>
            </div>
            
            <div class="dim-item">
              <div class="dim-header">
                <BookOpen class="dim-icon story" />
                <span class="dim-label">剧情探索</span>
                <span class="dim-score">{{ overview.clusters?.story?.level || 'D' }}</span>
              </div>
              <div class="dim-bar-bg">
                <div 
                  class="dim-bar story" 
                  :style="{ width: overview.overallType?.dimensionScores?.story + '%' }"
                ></div>
              </div>
              <span class="dim-type">{{ overview.clusters?.story?.name }}</span>
            </div>
            
            <div class="dim-item">
              <div class="dim-header">
                <Gift class="dim-icon reward" />
                <span class="dim-label">奖励行为</span>
                <span class="dim-score">{{ overview.clusters?.reward?.level || 'D' }}</span>
              </div>
              <div class="dim-bar-bg">
                <div 
                  class="dim-bar reward" 
                  :style="{ width: overview.overallType?.dimensionScores?.reward + '%' }"
                ></div>
              </div>
              <span class="dim-type">{{ overview.clusters?.reward?.name }}</span>
            </div>
          </div>
        </div>

        <div class="quick-stats-grid">
          <div class="stat-card glass-card">
            <div class="stat-header">
              <Activity class="stat-icon mood" />
              <span class="stat-label">平均情绪分</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-value">{{ overview?.trendSummary?.moodTrend?.avgScore || 0 }}</span>
              <div class="stat-trend" :class="getTrendColor(overview?.trendSummary?.moodTrend?.trend)">
                <component :is="getTrendIcon(overview?.trendSummary?.moodTrend?.trend)" class="trend-icon" />
              </div>
            </div>
            <div class="stat-sub">
              <span class="mood-emoji">{{ getMoodEmoji(overview?.trendSummary?.moodTrend?.mostCommonMood) }}</span>
              <span class="stat-sub-text">主导情绪</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-header">
              <Calendar class="stat-icon record" />
              <span class="stat-label">记录率</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-value">{{ overview?.trendSummary?.recordRate || 0 }}%</span>
            </div>
            <div class="stat-sub">
              <Tag class="sub-icon" />
              <span class="stat-sub-text">{{ overview?.tagRichness?.level?.level }}标签库</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-header">
              <BookOpen class="stat-icon story" />
              <span class="stat-label">剧情进度</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-value">{{ overview?.trendSummary?.storyProgress || '0/0' }}</span>
            </div>
            <div class="stat-sub">
              <DoorOpen class="sub-icon" />
              <span class="stat-sub-text">已解锁房间</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-header">
              <Gift class="stat-icon reward" />
              <span class="stat-label">累计星币</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-value">{{ overview?.trendSummary?.totalReward || 0 }}</span>
              <Star class="coin-icon" />
            </div>
            <div class="stat-sub">
              <Target class="sub-icon" />
              <span class="stat-sub-text">{{ overview?.quests?.completed || 0 }}/{{ overview?.quests?.total || 0 }} 任务完成</span>
            </div>
          </div>
        </div>

        <div class="quests-preview glass-card">
          <div class="section-title-row">
            <div class="section-title">
              <Compass class="section-icon quest" />
              <h3>推荐探索任务</h3>
            </div>
            <button class="see-all-btn" @click="activeTab = 'quests'">
              查看全部
              <ChevronRight class="btn-icon" />
            </button>
          </div>
          
          <div class="quest-list-preview">
            <div 
              v-for="quest in overview?.quests?.recommended?.slice(0, 3) || []" 
              :key="quest.id"
              class="quest-item-mini"
            >
              <span class="quest-icon-mini">{{ quest.icon }}</span>
              <div class="quest-info-mini">
                <span class="quest-title-mini">{{ quest.title }}</span>
                <div class="quest-progress-mini">
                  <div class="progress-bar-bg">
                    <div 
                      class="progress-bar" 
                      :style="{ width: Math.min(100, (quest.current / quest.target) * 100) + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ quest.current }}/{{ quest.target }}</span>
                </div>
              </div>
              <div class="quest-reward-mini">
                <Star class="reward-star" />
                <span>{{ quest.reward }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'trends'" class="trends-section">
        <div class="trend-tab-nav">
          <button
            v-for="tab in trendTabs"
            :key="tab.id"
            class="trend-tab-btn"
            :class="{ active: activeTrendTab === tab.id }"
            @click="activeTrendTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </div>

        <div v-show="activeTrendTab === 'mood'" class="trend-content">
          <div class="trend-summary-cards">
            <div class="summary-card glass-card">
              <div class="summary-icon-wrapper avg">
                <Activity class="summary-icon" />
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ trends?.moodTrend?.overallStats?.avgScore || 0 }}</span>
                <span class="summary-label">平均情绪分</span>
              </div>
            </div>
            <div class="summary-card glass-card">
              <div class="summary-icon-wrapper trend" :class="getTrendColor(trends?.moodTrend?.overallStats?.trend)">
                <component :is="getTrendIcon(trends?.moodTrend?.overallStats?.trend)" class="summary-icon" />
              </div>
              <div class="summary-info">
                <span class="summary-value" :class="getTrendColor(trends?.moodTrend?.overallStats?.trend)">
                  {{ trends?.moodTrend?.overallStats?.trendValue > 0 ? '+' : '' }}{{ trends?.moodTrend?.overallStats?.trendValue || 0 }}
                </span>
                <span class="summary-label">情绪趋势</span>
              </div>
            </div>
            <div class="summary-card glass-card">
              <div class="summary-icon-wrapper days">
                <Calendar class="summary-icon" />
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ trends?.moodTrend?.overallStats?.totalDays || 0 }}</span>
                <span class="summary-label">记录天数</span>
              </div>
            </div>
            <div class="summary-card glass-card">
              <div class="summary-icon-wrapper dominant">
                <span class="dominant-emoji">{{ getMoodEmoji(trends?.moodTrend?.overallStats?.mostCommonMood) }}</span>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ moodLabels[trends?.moodTrend?.overallStats?.mostCommonMood] || '平静' }}</span>
                <span class="summary-label">主导情绪</span>
              </div>
            </div>
          </div>

          <div class="chart-card glass-card">
            <h3 class="chart-title">近6个月情绪趋势</h3>
            <div class="mood-chart-container">
              <svg class="mood-trend-chart" viewBox="0 0 100 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="moodAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <g class="grid-lines">
                  <line x1="0" y1="15" x2="100" y2="15" class="grid-line" />
                  <line x1="0" y1="30" x2="100" y2="30" class="grid-line" />
                  <line x1="0" y1="45" x2="100" y2="45" class="grid-line" />
                </g>
                <path 
                  v-if="trends?.moodTrend?.monthlyData?.filter(m => m.daysWithRecords > 0)?.length >= 2"
                  :d="(() => {
                    const data = trends.moodTrend.monthlyData.filter(m => m.daysWithRecords > 0)
                    let d = ''
                    data.forEach((m, i) => {
                      const x = (i / (data.length - 1)) * 100
                      const y = 55 - (m.avgScore / 5) * 45
                      if (i === 0) {
                        d += `M ${x} ${y}`
                      } else {
                        const prevX = ((i - 1) / (data.length - 1)) * 100
                        const prevY = 55 - (data[i - 1].avgScore / 5) * 45
                        const cpx1 = prevX + (x - prevX) / 3
                        const cpx2 = prevX + (x - prevX) * 2 / 3
                        d += ` C ${cpx1} ${prevY}, ${cpx2} ${y}, ${x} ${y}`
                      }
                    })
                    return d
                  })()"
                  fill="url(#moodAreaGradient)"
                  class="chart-area"
                />
                <path 
                  v-if="trends?.moodTrend?.monthlyData?.filter(m => m.daysWithRecords > 0)?.length >= 2"
                  :d="(() => {
                    const data = trends.moodTrend.monthlyData.filter(m => m.daysWithRecords > 0)
                    let d = ''
                    data.forEach((m, i) => {
                      const x = (i / (data.length - 1)) * 100
                      const y = 55 - (m.avgScore / 5) * 45
                      if (i === 0) {
                        d += `M ${x} ${y}`
                      } else {
                        const prevX = ((i - 1) / (data.length - 1)) * 100
                        const prevY = 55 - (data[i - 1].avgScore / 5) * 45
                        const cpx1 = prevX + (x - prevX) / 3
                        const cpx2 = prevX + (x - prevX) * 2 / 3
                        d += ` C ${cpx1} ${prevY}, ${cpx2} ${y}, ${x} ${y}`
                      }
                    })
                    return d
                  })()"
                  fill="none"
                  stroke="#8b5cf6"
                  stroke-width="2"
                  stroke-linecap="round"
                  class="chart-line"
                />
                <g class="data-points">
                  <g 
                    v-for="(m, i) in (trends?.moodTrend?.monthlyData?.filter(m => m.daysWithRecords > 0) || [])" 
                    :key="i"
                    class="data-point-group"
                  >
                    <circle 
                      :cx="(i / ((trends?.moodTrend?.monthlyData?.filter(m => m.daysWithRecords > 0)?.length - 1) || 1)) * 100" 
                      :cy="55 - (m.avgScore / 5) * 45" 
                      r="2.5"
                      :fill="moodColors[m.dominantMood] || '#8b5cf6'"
                      class="data-point"
                    />
                  </g>
                </g>
              </svg>
              <div class="chart-x-labels">
                <span 
                  v-for="m in (trends?.moodTrend?.monthlyData?.filter(m => m.daysWithRecords > 0) || [])" 
                  :key="m.label"
                  class="x-label"
                >
                  {{ m.month }}月
                </span>
              </div>
            </div>
          </div>

          <div class="mood-distribution-card glass-card">
            <h3 class="chart-title">情绪分布</h3>
            <div class="mood-distribution-list">
              <div 
                v-for="(count, mood) in (trends?.moodTrend?.monthlyData?.[trends?.moodTrend?.monthlyData?.length - 1]?.moodDistribution || {})"
                :key="mood"
                class="dist-item"
              >
                <span class="dist-emoji">{{ getMoodEmoji(mood) }}</span>
                <span class="dist-label">{{ moodLabels[mood] }}</span>
                <div class="dist-bar-bg">
                  <div 
                    class="dist-bar" 
                    :style="{ width: count + '%', backgroundColor: moodColors[mood] }"
                  ></div>
                </div>
                <span class="dist-value">{{ count }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTrendTab === 'tags'" class="trend-content">
          <div class="tags-header-cards">
            <div class="tag-stat-card glass-card">
              <div class="tag-stat-icon">
                <Tag class="stat-icon" />
              </div>
              <div class="tag-stat-info">
                <span class="tag-stat-value">{{ trends?.tagTrend?.totalTags || 0 }}</span>
                <span class="tag-stat-label">使用过的标签</span>
              </div>
            </div>
            <div class="tag-stat-card glass-card">
              <div class="tag-stat-icon period">
                <Clock class="stat-icon" />
              </div>
              <div class="tag-stat-info">
                <span class="tag-stat-value">{{ trends?.tagTrend?.periodDays || 0 }}天</span>
                <span class="tag-stat-label">统计周期</span>
              </div>
            </div>
          </div>

          <div class="top-tags-card glass-card">
            <h3 class="chart-title">高频标签 TOP 10</h3>
            <div class="tags-list">
              <div 
                v-for="(tag, index) in (trends?.tagTrend?.topTags || [])" 
                :key="tag.tag"
                class="tag-item"
              >
                <div class="tag-rank" :class="'rank-' + (index + 1)">
                  {{ index + 1 }}
                </div>
                <div class="tag-content">
                  <div class="tag-header-row">
                    <span class="tag-name">{{ tag.tag }}</span>
                    <span class="tag-count">{{ tag.count }}次</span>
                  </div>
                  <div class="tag-bar-bg">
                    <div 
                      class="tag-bar" 
                      :style="{ width: Math.min(100, (tag.count / (trends?.tagTrend?.topTags?.[0]?.count || 1)) * 100) + '%' }"
                    ></div>
                  </div>
                  <div class="tag-meta">
                    <span class="tag-meta-item">
                      <Activity class="meta-icon" />
                      平均权重 {{ tag.avgWeight }}
                    </span>
                    <span class="tag-meta-item">
                      <Calendar class="meta-icon" />
                      {{ tag.uniqueDays }}天
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTrendTab === 'records'" class="trend-content">
          <div class="record-stats-grid">
            <div class="record-stat glass-card">
              <Flame class="record-stat-icon streak" />
              <div class="record-stat-info">
                <span class="record-stat-value">{{ trends?.recordTrend?.currentStreak || 0 }}</span>
                <span class="record-stat-label">当前连续记录</span>
              </div>
            </div>
            <div class="record-stat glass-card">
              <Award class="record-stat-icon max" />
              <div class="record-stat-info">
                <span class="record-stat-value">{{ trends?.recordTrend?.maxStreak || 0 }}</span>
                <span class="record-stat-label">最长连续记录</span>
              </div>
            </div>
            <div class="record-stat glass-card">
              <BarChart3 class="record-stat-icon rate" />
              <div class="record-stat-info">
                <span class="record-stat-value">{{ trends?.recordTrend?.recordRate || 0 }}%</span>
                <span class="record-stat-label">记录率</span>
              </div>
            </div>
            <div class="record-stat glass-card">
              <Zap class="record-stat-icon avg" />
              <div class="record-stat-info">
                <span class="record-stat-value">{{ trends?.recordTrend?.avgRecordsPerDay || 0 }}</span>
                <span class="record-stat-label">日均记录</span>
              </div>
            </div>
          </div>

          <div class="weekday-stats-card glass-card">
            <h3 class="chart-title">星期记录偏好</h3>
            <div class="weekday-bars">
              <div 
                v-for="day in (trends?.recordTrend?.weekdayStats || [])" 
                :key="day.dayOfWeek"
                class="weekday-item"
              >
                <div class="weekday-bar-wrapper">
                  <div 
                    class="weekday-bar" 
                    :style="{ height: day.recordRate + '%' }"
                  ></div>
                </div>
                <span class="weekday-label">{{ day.dayName }}</span>
                <span class="weekday-value">{{ day.recordRate }}%</span>
              </div>
            </div>
          </div>

          <div class="segment-stats-card glass-card">
            <h3 class="chart-title">时段分布</h3>
            <div class="segment-list">
              <div class="segment-item">
                <div class="segment-info">
                  <span class="segment-emoji">🌅</span>
                  <span class="segment-name">早晨</span>
                </div>
                <div class="segment-bar-bg">
                  <div 
                    class="segment-bar morning" 
                    :style="{ width: Math.min(100, ((trends?.recordTrend?.segmentCounts?.morning || 0) / (trends?.recordTrend?.segmentCounts?.evening || 1)) * 100) + '%' }"
                  ></div>
                </div>
                <span class="segment-count">{{ trends?.recordTrend?.segmentCounts?.morning || 0 }}次</span>
              </div>
              <div class="segment-item">
                <div class="segment-info">
                  <span class="segment-emoji">☀️</span>
                  <span class="segment-name">下午</span>
                </div>
                <div class="segment-bar-bg">
                  <div 
                    class="segment-bar afternoon" 
                    :style="{ width: Math.min(100, ((trends?.recordTrend?.segmentCounts?.afternoon || 0) / (trends?.recordTrend?.segmentCounts?.evening || 1)) * 100) + '%' }"
                  ></div>
                </div>
                <span class="segment-count">{{ trends?.recordTrend?.segmentCounts?.afternoon || 0 }}次</span>
              </div>
              <div class="segment-item">
                <div class="segment-info">
                  <span class="segment-emoji">🌙</span>
                  <span class="segment-name">晚间</span>
                </div>
                <div class="segment-bar-bg">
                  <div 
                    class="segment-bar evening" 
                    style="width: 100%"
                  ></div>
                </div>
                <span class="segment-count">{{ trends?.recordTrend?.segmentCounts?.evening || 0 }}次</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTrendTab === 'story'" class="trend-content">
          <div class="story-stats-grid">
            <div class="story-stat glass-card">
              <DoorOpen class="story-stat-icon" />
              <div class="story-stat-info">
                <span class="story-stat-value">{{ trends?.storyTrend?.unlockedRooms || 0 }}/{{ trends?.storyTrend?.totalRooms || 0 }}</span>
                <span class="story-stat-label">已解锁房间</span>
              </div>
            </div>
            <div class="story-stat glass-card">
              <BookOpen class="story-stat-icon" />
              <div class="story-stat-info">
                <span class="story-stat-value">{{ trends?.storyTrend?.totalChaptersRead || 0 }}</span>
                <span class="story-stat-label">阅读章节</span>
              </div>
            </div>
            <div class="story-stat glass-card">
              <Zap class="story-stat-icon streak" />
              <div class="story-stat-info">
                <span class="story-stat-value">{{ trends?.storyTrend?.readingStreak || 0 }}</span>
                <span class="story-stat-label">连续阅读</span>
              </div>
            </div>
            <div class="story-stat glass-card">
              <PieChart class="story-stat-icon branch" />
              <div class="story-stat-info">
                <span class="story-stat-value">{{ trends?.storyTrend?.branchExplorationRate || 0 }}%</span>
                <span class="story-stat-label">分支探索率</span>
              </div>
            </div>
          </div>

          <div class="branch-compare-card glass-card">
            <h3 class="chart-title">主线 vs 支线</h3>
            <div class="branch-compare-content">
              <div class="branch-legend">
                <div class="legend-item main">
                  <span class="legend-dot"></span>
                  <span>主线剧情</span>
                  <span class="legend-count">{{ trends?.storyTrend?.mainBranchChapters || 0 }}章</span>
                </div>
                <div class="legend-item side">
                  <span class="legend-dot"></span>
                  <span>支线剧情</span>
                  <span class="legend-count">{{ trends?.storyTrend?.sideBranchChapters || 0 }}章</span>
                </div>
              </div>
              <div class="branch-pie">
                <svg viewBox="0 0 100 100" class="pie-chart">
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="rgba(139, 92, 246, 0.2)" 
                    stroke-width="12"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    stroke-width="12"
                    :stroke-dasharray="`${(trends?.storyTrend?.mainBranchChapters || 0) / ((trends?.storyTrend?.mainBranchChapters || 0) + (trends?.storyTrend?.sideBranchChapters || 0)) * 251.2} 251.2`"
                    stroke-dashoffset="62.8"
                    class="pie-main"
                  />
                </svg>
                <div class="pie-center">
                  <span class="pie-label">剧情</span>
                  <span class="pie-value">{{ trends?.storyTrend?.mainBranchChapters || 0 }}/{{ (trends?.storyTrend?.mainBranchChapters || 0) + (trends?.storyTrend?.sideBranchChapters || 0) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="rooms-progress-card glass-card">
            <h3 class="chart-title">房间进度</h3>
            <div class="rooms-list">
              <div 
                v-for="room in (trends?.storyTrend?.rooms || [])" 
                :key="room.id"
                class="room-progress-item"
              >
                <div class="room-header">
                  <span class="room-name">{{ room.name }}</span>
                  <span class="room-status" :class="{ unlocked: room.isUnlocked }">
                    {{ room.isUnlocked ? '已解锁' : '未解锁' }}
                  </span>
                </div>
                <div class="room-bar-bg">
                  <div 
                    class="room-bar" 
                    :class="{ locked: !room.isUnlocked }"
                    :style="{ width: room.progress + '%' }"
                  ></div>
                </div>
                <div class="room-meta">
                  <span>{{ room.maxChapterReached }}/{{ room.totalChapters }} 章节</span>
                  <span>{{ room.progress }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTrendTab === 'rewards'" class="trend-content">
          <div class="reward-stats-grid">
            <div class="reward-stat glass-card">
              <Target class="reward-stat-icon completed" />
              <div class="reward-stat-info">
                <span class="reward-stat-value">{{ trends?.rewardTrend?.totalCompleted || 0 }}</span>
                <span class="reward-stat-label">完成任务</span>
              </div>
            </div>
            <div class="reward-stat glass-card">
              <Gift class="reward-stat-icon claimed" />
              <div class="reward-stat-info">
                <span class="reward-stat-value">{{ trends?.rewardTrend?.totalClaimed || 0 }}</span>
                <span class="reward-stat-label">领取奖励</span>
              </div>
            </div>
            <div class="reward-stat glass-card">
              <Flame class="reward-stat-icon streak" />
              <div class="reward-stat-info">
                <span class="reward-stat-value">{{ trends?.rewardTrend?.claimStreak || 0 }}</span>
                <span class="reward-stat-label">连续领取</span>
              </div>
            </div>
            <div class="reward-stat glass-card">
              <Star class="reward-stat-icon coins" />
              <div class="reward-stat-info">
                <span class="reward-stat-value">{{ trends?.rewardTrend?.totalReward || 0 }}</span>
                <span class="reward-stat-label">获得星币</span>
              </div>
            </div>
          </div>

          <div class="claim-rate-card glass-card">
            <h3 class="chart-title">奖励领取率</h3>
            <div class="claim-rate-content">
              <div class="claim-rate-circle">
                <svg viewBox="0 0 100 100" class="rate-chart">
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="rgba(251, 191, 36, 0.2)" 
                    stroke-width="10"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#fbbf24" 
                    stroke-width="10"
                    :stroke-dasharray="`${(trends?.rewardTrend?.claimRate || 0) / 100 * 251.2} 251.2`"
                    stroke-dashoffset="62.8"
                    stroke-linecap="round"
                    class="rate-bar"
                  />
                </svg>
                <div class="rate-center">
                  <span class="rate-value">{{ trends?.rewardTrend?.claimRate || 0 }}%</span>
                  <span class="rate-label">领取率</span>
                </div>
              </div>
              <div class="claim-delay-info">
                <div class="delay-item">
                  <Clock class="delay-icon" />
                  <div>
                    <span class="delay-value">{{ trends?.rewardTrend?.avgClaimDelayDays || 0 }}天</span>
                    <span class="delay-label">平均领取延迟</span>
                  </div>
                </div>
                <p class="delay-tip">
                  {{ trends?.rewardTrend?.avgClaimDelayDays < 0.5 
                    ? '太棒了！你总是第一时间领取奖励~' 
                    : '任务完成后记得及时领取奖励哦' }}
                </p>
              </div>
            </div>
          </div>

          <div class="reward-type-card glass-card">
            <h3 class="chart-title">任务类型分布</h3>
            <div class="type-list">
              <div class="type-item">
                <div class="type-info">
                  <span class="type-icon-wrapper daily">
                    <Calendar class="type-icon" />
                  </span>
                  <span class="type-name">每日任务</span>
                </div>
                <span class="type-count">{{ trends?.rewardTrend?.typeStats?.daily?.completed || 0 }} 完成</span>
              </div>
              <div class="type-item">
                <div class="type-info">
                  <span class="type-icon-wrapper weekly">
                    <BarChart3 class="type-icon" />
                  </span>
                  <span class="type-name">每周任务</span>
                </div>
                <span class="type-count">{{ trends?.rewardTrend?.typeStats?.weekly?.completed || 0 }} 完成</span>
              </div>
              <div class="type-item">
                <div class="type-info">
                  <span class="type-icon-wrapper once">
                    <Award class="type-icon" />
                  </span>
                  <span class="type-name">一次性任务</span>
                </div>
                <span class="type-count">{{ trends?.rewardTrend?.typeStats?.once?.completed || 0 }} 完成</span>
              </div>
              <div class="type-item">
                <div class="type-info">
                  <span class="type-icon-wrapper chain">
                    <Zap class="type-icon" />
                  </span>
                  <span class="type-name">任务链</span>
                </div>
                <span class="type-count">{{ trends?.rewardTrend?.typeStats?.chain?.completed || 0 }} 完成</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'clustering'" class="clustering-section">
        <div class="cluster-overview-card glass-card">
          <div class="cluster-header">
            <Users class="cluster-section-icon" />
            <h2 class="cluster-section-title">行为画像分析</h2>
          </div>
          <p class="cluster-desc">基于你的行为数据，我们为你绘制了专属的行为画像</p>
        </div>

        <div class="cluster-cards-grid">
          <div class="cluster-card glass-card">
            <div class="cluster-card-header">
              <div class="cluster-icon-wrapper record">
                <Calendar class="cluster-icon" />
              </div>
              <div class="cluster-level-badge" :style="{ backgroundColor: (levelColors[clustering?.recordBehavior?.level] || '#9ca3af') + '20', color: levelColors[clustering?.recordBehavior?.level] || '#9ca3af' }">
                {{ clustering?.recordBehavior?.level || 'D' }}级
              </div>
            </div>
            <h3 class="cluster-name">{{ clustering?.recordBehavior?.name || '数据收集中' }}</h3>
            <p class="cluster-description">{{ clustering?.recordBehavior?.description || '继续记录心情来解锁你的行为画像' }}</p>
            
            <div class="cluster-traits">
              <span 
                v-for="trait in (clustering?.recordBehavior?.traits || [])" 
                :key="trait"
                class="trait-tag"
              >
                {{ trait }}
              </span>
            </div>

            <div class="cluster-metrics">
              <div class="metric-item">
                <span class="metric-label">记录率</span>
                <span class="metric-value">{{ clustering?.recordBehavior?.metrics?.recordRate || 0 }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">日均记录</span>
                <span class="metric-value">{{ clustering?.recordBehavior?.metrics?.avgRecordsPerDay || 0 }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">当前连续</span>
                <span class="metric-value">{{ clustering?.recordBehavior?.metrics?.currentStreak || 0 }}天</span>
              </div>
            </div>
          </div>

          <div class="cluster-card glass-card">
            <div class="cluster-card-header">
              <div class="cluster-icon-wrapper mood">
                <Heart class="cluster-icon" />
              </div>
              <div class="cluster-level-badge" :style="{ backgroundColor: (levelColors[clustering?.moodPattern?.level] || '#9ca3af') + '20', color: levelColors[clustering?.moodPattern?.level] || '#9ca3af' }">
                {{ clustering?.moodPattern?.level || 'D' }}级
              </div>
            </div>
            <h3 class="cluster-name">{{ clustering?.moodPattern?.name || '数据收集中' }}</h3>
            <p class="cluster-description">{{ clustering?.moodPattern?.description || '继续记录心情来解锁你的情绪模式' }}</p>
            
            <div class="cluster-traits">
              <span 
                v-for="trait in (clustering?.moodPattern?.traits || [])" 
                :key="trait"
                class="trait-tag"
              >
                {{ trait }}
              </span>
            </div>

            <div class="cluster-metrics">
              <div class="metric-item">
                <span class="metric-label">平均情绪分</span>
                <span class="metric-value">{{ clustering?.moodPattern?.metrics?.avgScore || 0 }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">主导情绪</span>
                <span class="metric-value">{{ moodLabels[clustering?.moodPattern?.metrics?.mostCommonMood] || '平静' }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">情绪波动</span>
                <span class="metric-value">{{ clustering?.moodPattern?.metrics?.volatility || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="cluster-card glass-card">
            <div class="cluster-card-header">
              <div class="cluster-icon-wrapper story">
                <BookOpen class="cluster-icon" />
              </div>
              <div class="cluster-level-badge" :style="{ backgroundColor: (levelColors[clustering?.storyExplorer?.level] || '#9ca3af') + '20', color: levelColors[clustering?.storyExplorer?.level] || '#9ca3af' }">
                {{ clustering?.storyExplorer?.level || 'D' }}级
              </div>
            </div>
            <h3 class="cluster-name">{{ clustering?.storyExplorer?.name || '数据收集中' }}</h3>
            <p class="cluster-description">{{ clustering?.storyExplorer?.description || '阅读更多故事来解锁你的探索画像' }}</p>
            
            <div class="cluster-traits">
              <span 
                v-for="trait in (clustering?.storyExplorer?.traits || [])" 
                :key="trait"
                class="trait-tag"
              >
                {{ trait }}
              </span>
            </div>

            <div class="cluster-metrics">
              <div class="metric-item">
                <span class="metric-label">解锁房间</span>
                <span class="metric-value">{{ clustering?.storyExplorer?.metrics?.unlockedRooms || 0 }}/{{ clustering?.storyExplorer?.metrics?.totalRooms || 0 }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">阅读章节</span>
                <span class="metric-value">{{ clustering?.storyExplorer?.metrics?.totalChaptersRead || 0 }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">分支探索率</span>
                <span class="metric-value">{{ clustering?.storyExplorer?.metrics?.branchExplorationRate || 0 }}%</span>
              </div>
            </div>
          </div>

          <div class="cluster-card glass-card">
            <div class="cluster-card-header">
              <div class="cluster-icon-wrapper reward">
                <Gift class="cluster-icon" />
              </div>
              <div class="cluster-level-badge" :style="{ backgroundColor: (levelColors[clustering?.rewardBehavior?.level] || '#9ca3af') + '20', color: levelColors[clustering?.rewardBehavior?.level] || '#9ca3af' }">
                {{ clustering?.rewardBehavior?.level || 'D' }}级
              </div>
            </div>
            <h3 class="cluster-name">{{ clustering?.rewardBehavior?.name || '数据收集中' }}</h3>
            <p class="cluster-description">{{ clustering?.rewardBehavior?.description || '完成更多任务来解锁你的奖励画像' }}</p>
            
            <div class="cluster-traits">
              <span 
                v-for="trait in (clustering?.rewardBehavior?.traits || [])" 
                :key="trait"
                class="trait-tag"
              >
                {{ trait }}
              </span>
            </div>

            <div class="cluster-metrics">
              <div class="metric-item">
                <span class="metric-label">领取率</span>
                <span class="metric-value">{{ clustering?.rewardBehavior?.metrics?.claimRate || 0 }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">连续领取</span>
                <span class="metric-value">{{ clustering?.rewardBehavior?.metrics?.claimStreak || 0 }}天</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">累计星币</span>
                <span class="metric-value">{{ clustering?.rewardBehavior?.metrics?.totalReward || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="tag-richness-card glass-card">
          <div class="tag-richness-header">
            <Shield class="tag-richness-icon" />
            <h3 class="tag-richness-title">标签丰富度</h3>
          </div>
          <div class="tag-richness-content">
            <div class="richness-level-big">
              <Crown class="richness-crown" />
              <span class="richness-level-text">{{ clustering?.tagRichness?.level?.level || '起步' }}</span>
            </div>
            <div class="richness-info">
              <p class="richness-desc">{{ clustering?.tagRichness?.level?.description || '正在积累中...' }}</p>
              <div class="richness-stats">
                <div class="rich-stat">
                  <span class="rich-stat-value">{{ clustering?.tagRichness?.totalTags || 0 }}</span>
                  <span class="rich-stat-label">使用过的标签</span>
                </div>
                <div class="rich-stat">
                  <span class="rich-stat-value">{{ clustering?.tagRichness?.avgWeight || 0 }}</span>
                  <span class="rich-stat-label">平均权重</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'quests'" class="quests-section">
        <div class="quests-header-card glass-card">
          <div class="quests-header-content">
            <div class="quests-header-left">
              <Target class="quests-header-icon" />
              <div>
                <h2 class="quests-header-title">个性化探索任务</h2>
                <p class="quests-header-subtitle">基于你的行为特征，为你定制的成长任务</p>
              </div>
            </div>
            <div class="quests-progress">
              <div class="quests-progress-circle">
                <svg viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="rgba(139, 92, 246, 0.2)" 
                    stroke-width="8"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    stroke-width="8"
                    :stroke-dasharray="`${(quests?.completedCount || 0) / (quests?.totalAvailable || 1) * 251.2} 251.2`"
                    stroke-dashoffset="62.8"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="quests-progress-center">
                  <span class="quests-progress-value">{{ quests?.completedCount || 0 }}/{{ quests?.totalAvailable || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="quests?.recommended?.length > 0" class="recommended-section">
          <h3 class="section-subtitle">
            <Sparkles class="subtitle-icon" />
            为你推荐
          </h3>
          <div class="quest-cards-row">
            <div 
              v-for="quest in quests.recommended" 
              :key="quest.id"
              class="quest-card recommended glass-card"
            >
              <div class="quest-card-header">
                <span class="quest-big-icon">{{ quest.icon }}</span>
                <div class="quest-header-info">
                  <span class="quest-type-tag" :class="quest.type">{{ getQuestTypeName(quest.type) }}</span>
                  <span :class="['quest-difficulty-tag', quest.difficulty]">{{ getDifficultyLabel(quest.difficulty) }}</span>
                </div>
              </div>
              <h4 class="quest-card-title">{{ quest.title }}</h4>
              <p class="quest-card-desc">{{ quest.description }}</p>
              
              <div class="quest-card-progress">
                <div class="progress-bar-bg large">
                  <div 
                    class="progress-bar" 
                    :style="{ width: Math.min(100, (quest.current / quest.target) * 100) + '%' }"
                  ></div>
                </div>
                <div class="progress-info">
                  <span class="progress-label">进度</span>
                  <span class="progress-value">{{ quest.current }}/{{ quest.target }}</span>
                </div>
              </div>

              <div class="quest-card-footer">
                <div class="quest-reward">
                  <Star class="reward-star-icon" />
                  <span class="reward-amount">{{ quest.reward }}</span>
                  <span class="reward-label">星币奖励</span>
                </div>
                <button class="quest-action-btn" :disabled="quest.current >= quest.target">
                  {{ quest.current >= quest.target ? '已完成' : '去完成' }}
                  <ChevronRight class="btn-arrow" />
                </button>
              </div>

              <div class="quest-tip">
                <span class="tip-icon">💡</span>
                <span class="tip-text">{{ quest.tips }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="all-quests-section">
          <h3 class="section-subtitle">
            <Compass class="subtitle-icon" />
            全部任务
          </h3>
          <div class="quest-list-full">
            <div 
              v-for="quest in (quests?.quests || [])" 
              :key="quest.id"
              class="quest-item-full glass-card"
            >
              <div class="quest-item-left">
                <span class="quest-icon-medium">{{ quest.icon }}</span>
              </div>
              <div class="quest-item-content">
                <div class="quest-item-header">
                  <h4 class="quest-item-title">{{ quest.title }}</h4>
                  <span :class="['quest-difficulty-badge', quest.difficulty]">
                    {{ getDifficultyLabel(quest.difficulty) }}
                  </span>
                </div>
                <p class="quest-item-desc">{{ quest.description }}</p>
                <div class="quest-item-progress-row">
                  <div class="quest-item-bar-bg">
                    <div 
                      class="quest-item-bar" 
                      :style="{ width: Math.min(100, (quest.current / quest.target) * 100) + '%' }"
                    ></div>
                  </div>
                  <span class="quest-item-progress-text">{{ quest.current }}/{{ quest.target }}</span>
                </div>
              </div>
              <div class="quest-item-right">
                <div class="quest-item-reward">
                  <Star class="quest-coin" />
                  <span>{{ quest.reward }}</span>
                </div>
                <span 
                  class="quest-status-badge"
                  :class="{ completed: quest.current >= quest.target }"
                >
                  {{ quest.current >= quest.target ? '已完成' : '进行中' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mood-lab-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-icon {
  width: 28px;
  height: 28px;
  color: var(--color-secondary);
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  margin: 0;
}

.page-subtitle {
  color: var(--color-text-muted);
  margin: 4px 0 0 0;
  font-size: 0.95rem;
}

.tab-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-lg);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text);
  }

  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2));
    color: var(--color-secondary);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.overall-type-card {
  padding: 28px;
  margin-bottom: 20px;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.type-icon {
  font-size: 3rem;
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  margin: 0 0 6px 0;
}

.type-desc {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 0.95rem;
}

.overall-score-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15));
  border-radius: var(--radius-xl);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.score-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.dimension-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.dim-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dim-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim-icon {
  width: 18px;
  height: 18px;
  
  &.record { color: #60a5fa; }
  &.mood { color: #f472b6; }
  &.story { color: #a78bfa; }
  &.reward { color: #fbbf24; }
}

.dim-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex: 1;
}

.dim-score {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
}

.dim-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
  
  &.record { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
  &.mood { background: linear-gradient(90deg, #f472b6, #ec4899); }
  &.story { background: linear-gradient(90deg, #a78bfa, #8b5cf6); }
  &.reward { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
}

.dim-type {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.quick-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.stat-icon {
  width: 20px;
  height: 20px;
  
  &.mood { color: #f472b6; }
  &.record { color: #60a5fa; }
  &.story { color: #a78bfa; }
  &.reward { color: #fbbf24; }
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.stat-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text);
}

.stat-trend {
  display: flex;
  align-items: center;
  
  &.text-green-400 { color: #4ade80; }
  &.text-red-400 { color: #f87171; }
  &.text-blue-400 { color: #60a5fa; }
}

.trend-icon {
  width: 18px;
  height: 18px;
}

.stat-sub {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
}

.mood-emoji {
  font-size: 1rem;
}

.stat-sub-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.coin-icon {
  width: 18px;
  height: 18px;
  color: #fbbf24;
}

.quests-preview {
  padding: 24px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }
}

.section-icon {
  width: 22px;
  height: 22px;
  
  &.quest { color: #a78bfa; }
}

.see-all-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(167, 139, 250, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(167, 139, 250, 0.25);
    transform: translateX(2px);
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.quest-list-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-item-mini {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(167, 139, 250, 0.2);
  }
}

.quest-icon-mini {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.quest-info-mini {
  flex: 1;
  min-width: 0;
}

.quest-title-mini {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quest-progress-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;

  &.large {
    height: 10px;
  }
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
  min-width: 50px;
  text-align: right;
}

.quest-reward-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: #fbbf24;
  font-size: 0.85rem;
  font-weight: 600;
}

.reward-star {
  width: 16px;
  height: 16px;
}

.dim-icon {
  width: 18px;
  height: 18px;

  &.record { color: #60a5fa; }
  &.mood { color: #f472b6; }
  &.story { color: #34d399; }
  &.reward { color: #fbbf24; }
}

.dim-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex: 1;
}

.dim-score {
  font-size: 0.85rem;
  font-weight: 700;
  font-family: var(--font-display);
}

.dim-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);

  &.record { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  &.mood { background: linear-gradient(90deg, #ec4899, #f472b6); }
  &.story { background: linear-gradient(90deg, #10b981, #34d399); }
  &.reward { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
}

.dim-type {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.quick-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 20px;
  height: 20px;

  &.mood { color: #f472b6; }
  &.record { color: #60a5fa; }
  &.story { color: #34d399; }
  &.reward { color: #fbbf24; }
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.stat-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.stat-trend {
  display: flex;
  align-items: center;

  &.text-green-400 { color: #4ade80; }
  &.text-red-400 { color: #f87171; }
  &.text-blue-400 { color: #60a5fa; }
}

.trend-icon {
  width: 18px;
  height: 18px;
}

.stat-sub {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
}

.stat-sub-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.mood-emoji {
  font-size: 1rem;
}

.coin-icon {
  width: 18px;
  height: 18px;
  color: #fbbf24;
}

.trend-tab-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.trend-tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-text);
  }

  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.2));
    color: var(--color-secondary);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
  }
}

.trend-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.trend-summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.summary-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.avg {
    background: rgba(244, 114, 182, 0.2);
    color: #f472b6;
  }

  &.trend {
    background: rgba(74, 222, 128, 0.15);

    &.text-green-400 { color: #4ade80; background: rgba(74, 222, 128, 0.15); }
    &.text-red-400 { color: #f87171; background: rgba(248, 113, 113, 0.15); }
    &.text-blue-400 { color: #60a5fa; background: rgba(96, 165, 250, 0.15); }
  }

  &.days {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  &.dominant {
    background: rgba(251, 191, 36, 0.15);
    font-size: 1.5rem;
  }
}

.summary-icon {
  width: 24px;
  height: 24px;
}

.dominant-emoji {
  font-size: 1.5rem;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);

  &.text-green-400 { color: #4ade80; }
  &.text-red-400 { color: #f87171; }
  &.text-blue-400 { color: #60a5fa; }
}

.summary-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.chart-card {
  padding: 24px;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 20px 0;
}

.mood-chart-container {
  position: relative;
  padding: 0 10px 30px 10px;
}

.mood-trend-chart {
  width: 100%;
  height: 250px;
}

.grid-lines {
  .grid-line {
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
}

.chart-area {
  opacity: 0.6;
}

.chart-line {
  filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3));
}

.data-points {
  .data-point {
    transition: r var(--transition-fast);

    &:hover {
      r: 4;
    }
  }
}

.chart-x-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  margin-top: 12px;
}

.x-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.mood-distribution-card {
  padding: 24px;
}

.mood-distribution-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dist-emoji {
  font-size: 1.25rem;
  width: 32px;
  flex-shrink: 0;
}

.dist-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  width: 60px;
  flex-shrink: 0;
}

.dist-bar-bg {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.dist-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.tags-header-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.tag-stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.tag-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.period {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }

  .stat-icon {
    width: 24px;
    height: 24px;
  }
}

.tag-stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.tag-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.top-tags-card {
  padding: 24px;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tag-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(96, 165, 250, 0.2);
  }
}

.tag-rank {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: var(--font-display);

  &.rank-1 {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #1f2937;
  }

  &.rank-2 {
    background: linear-gradient(135deg, #9ca3af, #6b7280);
    color: #1f2937;
  }

  &.rank-3 {
    background: linear-gradient(135deg, #d97706, #b45309);
    color: #fff;
  }
}

.tag-content {
  flex: 1;
  min-width: 0;
}

.tag-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tag-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.tag-count {
  font-size: 0.85rem;
  color: #60a5fa;
  font-weight: 600;
}

.tag-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 10px;
}

.tag-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.tag-meta {
  display: flex;
  gap: 16px;
}

.tag-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.meta-icon {
  width: 12px;
  height: 12px;
}

.record-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.record-stat {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.record-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.streak {
    background: rgba(251, 146, 60, 0.2);
    color: #fb923c;
  }

  &.max {
    background: rgba(244, 114, 182, 0.2);
    color: #f472b6;
  }

  &.rate {
    background: rgba(52, 211, 153, 0.2);
    color: #34d399;
  }

  &.avg {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }
}

.record-stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.record-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.weekday-stats-card {
  padding: 24px;
}

.weekday-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 200px;
  padding: 0 10px;
}

.weekday-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.weekday-bar-wrapper {
  width: 24px;
  height: 150px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.weekday-bar {
  width: 100%;
  background: linear-gradient(180deg, #60a5fa, #3b82f6);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  transition: height var(--transition-normal);
}

.weekday-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.weekday-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.segment-stats-card {
  padding: 24px;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.segment-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.segment-info {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100px;
  flex-shrink: 0;
}

.segment-emoji {
  font-size: 1.25rem;
}

.segment-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.segment-bar-bg {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.segment-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);

  &.morning { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
  &.afternoon { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
  &.evening { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
}

.segment-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.story-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.story-stat {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.story-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.streak {
    background: rgba(251, 146, 60, 0.2);
    color: #fb923c;
  }

  &.branch {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }
}

.story-stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.story-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.story-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.branch-compare-card {
  padding: 24px;
}

.branch-compare-content {
  display: flex;
  align-items: center;
  gap: 40px;
}

.branch-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);

  &.main .legend-dot {
    background: #8b5cf6;
  }

  &.side .legend-dot {
    background: rgba(139, 92, 246, 0.2);
    border: 2px solid #8b5cf6;
  }
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-count {
  margin-left: auto;
  font-weight: 600;
  color: var(--color-text);
}

.branch-pie {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.pie-chart {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.pie-main {
  transition: stroke-dasharray var(--transition-normal);
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pie-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.pie-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.rooms-progress-card {
  padding: 24px;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-progress-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.room-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.room-status {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);

  &.unlocked {
    background: rgba(52, 211, 153, 0.15);
    color: #34d399;
  }
}

.room-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 8px;
}

.room-bar {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);

  &.locked {
    background: rgba(255, 255, 255, 0.1);
  }
}

.room-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.reward-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.reward-stat {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.reward-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.completed {
    background: rgba(52, 211, 153, 0.2);
    color: #34d399;
  }

  &.claimed {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  &.streak {
    background: rgba(251, 146, 60, 0.2);
    color: #fb923c;
  }

  &.coins {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }
}

.reward-stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.reward-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.claim-rate-card {
  padding: 24px;
}

.claim-rate-content {
  display: flex;
  align-items: center;
  gap: 40px;
}

.claim-rate-circle {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.rate-chart {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.rate-bar {
  transition: stroke-dasharray var(--transition-normal);
}

.rate-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rate-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fbbf24;
  font-family: var(--font-display);
}

.rate-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.claim-delay-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.delay-item {
  display: flex;
  align-items: center;
  gap: 12px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}

.delay-icon {
  width: 24px;
  height: 24px;
  color: #a78bfa;
}

.delay-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.delay-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.delay-tip {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  padding: 12px 16px;
  background: rgba(167, 139, 250, 0.1);
  border-radius: var(--radius-md);
  border-left: 3px solid #a78bfa;
}

.reward-type-card {
  padding: 24px;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
}

.type-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;

  &.daily {
    background: rgba(52, 211, 153, 0.2);
    color: #34d399;
  }

  &.weekly {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  &.once {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }

  &.chain {
    background: rgba(251, 146, 60, 0.2);
    color: #fb923c;
  }
}

.type-icon {
  width: 18px;
  height: 18px;
}

.type-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.type-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.clustering-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cluster-overview-card {
  padding: 28px;
  text-align: center;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.cluster-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.cluster-section-icon {
  width: 28px;
  height: 28px;
  color: var(--color-secondary);
}

.cluster-section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  margin: 0;
}

.cluster-desc {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.cluster-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.cluster-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.1);
  }
}

.cluster-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cluster-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;

  &.record {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  &.mood {
    background: rgba(244, 114, 182, 0.2);
    color: #f472b6;
  }

  &.story {
    background: rgba(52, 211, 153, 0.2);
    color: #34d399;
  }

  &.reward {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }
}

.cluster-icon {
  width: 24px;
  height: 24px;
}

.cluster-level-badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 700;
  font-family: var(--font-display);
}

.cluster-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  font-family: var(--font-display);
}

.cluster-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.cluster-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trait-tag {
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.cluster-metrics {
  display: flex;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  flex: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.metric-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.tag-richness-card {
  padding: 24px;
}

.tag-richness-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tag-richness-icon {
  width: 24px;
  height: 24px;
  color: #fbbf24;
}

.tag-richness-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.tag-richness-content {
  display: flex;
  align-items: center;
  gap: 30px;
}

.richness-level-big {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 140px;
  flex-shrink: 0;
}

.richness-crown {
  width: 40px;
  height: 40px;
  color: #fbbf24;
}

.richness-level-text {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fbbf24;
  font-family: var(--font-display);
}

.richness-info {
  flex: 1;
}

.richness-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.richness-stats {
  display: flex;
  gap: 30px;
}

.rich-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rich-stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
}

.rich-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.quests-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.quests-header-card {
  padding: 28px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.quests-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quests-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quests-header-icon {
  width: 48px;
  height: 48px;
  color: var(--color-secondary);
}

.quests-header-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  margin: 0 0 6px 0;
}

.quests-header-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.quests-progress {
  flex-shrink: 0;
}

.quests-progress-circle {
  position: relative;
  width: 100px;
  height: 100px;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
}

.quests-progress-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.quests-progress-value {
  font-size: 0.9rem;
}

.section-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 16px 0;
}

.subtitle-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.quest-cards-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.quest-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all var(--transition-normal);
  position: relative;

  &.recommended {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.06));
    border-color: rgba(139, 92, 246, 0.2);
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(139, 92, 246, 0.15);
  }
}

.quest-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.quest-big-icon {
  font-size: 2.5rem;
}

.quest-header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.quest-type-tag {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;

  &.record { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
  &.mood { background: rgba(244, 114, 182, 0.2); color: #f472b6; }
  &.story { background: rgba(52, 211, 153, 0.2); color: #34d399; }
  &.reward { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
  &.tag { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
  &.reflection { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
  &.achievement { background: rgba(251, 146, 60, 0.2); color: #fb923c; }
  &.exploration { background: rgba(34, 211, 238, 0.2); color: #22d3ee; }
}

.quest-difficulty-tag {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;

  &.easy { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
  &.medium { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
  &.hard { background: rgba(251, 146, 60, 0.2); color: #fb923c; }
  &.legendary { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
}

.quest-card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.quest-card-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.quest-card-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.progress-label {
  color: var(--color-text-muted);
}

.progress-value {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.quest-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.quest-reward {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-star-icon {
  width: 18px;
  height: 18px;
  color: #fbbf24;
}

.reward-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fbbf24;
  font-family: var(--font-display);
}

.reward-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.quest-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-arrow {
  width: 16px;
  height: 16px;
}

.quest-tip {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(251, 191, 36, 0.08);
  border-radius: var(--radius-md);
  border-left: 3px solid #fbbf24;
}

.tip-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.tip-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.quest-list-full {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-item-full {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(139, 92, 246, 0.15);
  }
}

.quest-item-left {
  flex-shrink: 0;
}

.quest-icon-medium {
  font-size: 2rem;
}

.quest-item-content {
  flex: 1;
  min-width: 0;
}

.quest-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.quest-item-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.quest-difficulty-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;

  &.easy { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
  &.medium { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
  &.hard { background: rgba(251, 146, 60, 0.2); color: #fb923c; }
  &.legendary { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
}

.quest-item-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0 0 10px 0;
}

.quest-item-progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quest-item-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.quest-item-bar {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.quest-item-progress-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
  min-width: 50px;
  text-align: right;
}

.quest-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.quest-item-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fbbf24;
  font-size: 0.95rem;
  font-weight: 600;
}

.quest-coin {
  width: 16px;
  height: 16px;
}

.quest-status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;

  &.completed {
    background: rgba(52, 211, 153, 0.15);
    color: #34d399;
  }
}

@media (max-width: 1024px) {
  .dimension-scores {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .trend-summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .record-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .story-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .reward-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cluster-cards-grid {
    grid-template-columns: 1fr;
  }

  .quest-cards-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .mood-lab-page {
    padding: 16px;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .tab-nav {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1 1 calc(50% - 4px);
    padding: 10px 12px;
    font-size: 0.8rem;

    .tab-icon {
      width: 16px;
      height: 16px;
    }
  }

  .dimension-scores {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .quick-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    font-size: 1.4rem;
  }

  .trend-tab-nav {
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .trend-tab-btn {
    flex-shrink: 0;
    padding: 8px 14px;
    font-size: 0.8rem;
  }

  .trend-summary-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .summary-card {
    padding: 16px;
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .summary-value {
    font-size: 1.25rem;
  }

  .record-stats-grid,
  .story-stats-grid,
  .reward-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .record-stat,
  .story-stat,
  .reward-stat {
    padding: 16px;
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .branch-compare-content {
    flex-direction: column;
    gap: 20px;
  }

  .claim-rate-content {
    flex-direction: column;
    gap: 20px;
  }

  .tag-richness-content {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .richness-stats {
    justify-content: center;
  }

  .quests-header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .quests-header-left {
    flex-direction: column;
    text-align: center;
  }

  .quest-item-full {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quest-item-right {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
  }

  .type-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .overall-score-badge {
    order: 3;
    width: 100%;
  }
}
</style>