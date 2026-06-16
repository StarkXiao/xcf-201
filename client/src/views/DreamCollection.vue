<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDreamCollectionStore } from '@/stores/dreamCollection'
import { useNotificationStore } from '@/stores/notification'
import { useRouter } from 'vue-router'
import {
  Moon, Star, Heart, BookOpen, Sparkles, Lock, Unlock,
  ChevronRight, Search, Filter, Plus, Trash2, Edit3,
  Bookmark, BookmarkCheck, Archive, Target, Trophy,
  Eye, X, Check, Flag, Palette, Droplets, Gem,
  Library, FolderHeart, Crown, Scroll
} from 'lucide-vue-next'

const collectionStore = useDreamCollectionStore()
const notificationStore = useNotificationStore()
const router = useRouter()

const activeTab = ref('overview')
const isLoading = ref(false)
const showCreateFragmentModal = ref(false)
const showCreateHighlightModal = ref(false)
const editingFragment = ref(null)
const editingHighlight = ref(null)

const fragmentFilter = ref({ emotionType: '', sourceType: '', keyword: '' })
const highlightFilter = ref({ sourceType: '', moodTag: '', keyword: '' })
const storyCardFilter = ref({ roomId: null })

const newFragment = ref({
  sourceType: 'mood',
  sourceId: null,
  emotionType: 'happy',
  title: '',
  content: '',
  moodColor: '',
  tags: ''
})

const newHighlight = ref({
  sourceType: 'story',
  sourceId: null,
  roomId: null,
  title: '',
  content: '',
  highlightNote: '',
  moodTag: ''
})

const emotionTypes = [
  { key: 'happy', label: '开心', emoji: '😊', color: '#FFD700' },
  { key: 'calm', label: '平静', emoji: '😌', color: '#87CEEB' },
  { key: 'sad', label: '难过', emoji: '😢', color: '#6B7280' },
  { key: 'anxious', label: '焦虑', emoji: '😰', color: '#F97316' },
  { key: 'angry', label: '生气', emoji: '😠', color: '#EF4444' }
]

const sourceTypes = [
  { key: 'mood', label: '心情记录', icon: Heart },
  { key: 'retrospective', label: '心情回顾', icon: Eye },
  { key: 'story', label: '故事章节', icon: BookOpen },
  { key: 'prescription', label: '情绪处方', icon: Sparkles },
  { key: 'manual', label: '手动创建', icon: Edit3 }
]

const moodTags = [
  { key: 'warm', label: '温暖', color: '#f97316' },
  { key: 'healing', label: '治愈', color: '#22c55e' },
  { key: 'inspiring', label: '鼓舞', color: '#eab308' },
  { key: 'reflective', label: '沉思', color: '#8b5cf6' },
  { key: 'growth', label: '成长', color: '#06b6d4' },
  { key: 'courage', label: '勇气', color: '#ef4444' }
]

const roomThemes = [
  { id: 1, name: '月光前厅', icon: '🌙', color: '#8b5cf6' },
  { id: 2, name: '星尘书房', icon: '📚', color: '#3b82f6' },
  { id: 3, name: '回忆花房', icon: '🌸', color: '#ec4899' },
  { id: 4, name: '回声长廊', icon: '🌊', color: '#06b6d4' },
  { id: 5, name: '梦境剧场', icon: '🎭', color: '#f97316' },
  { id: 6, name: '心愿阁楼', icon: '✨', color: '#fbbf24' }
]

const overview = computed(() => collectionStore.overview)
const fragments = computed(() => collectionStore.fragments)
const fragmentsTotal = computed(() => collectionStore.fragmentsTotal)
const storyCards = computed(() => collectionStore.storyCards)
const storyCardRoomStats = computed(() => collectionStore.storyCardRoomStats)
const storyCardTotalCount = computed(() => collectionStore.storyCardTotalCount)
const highlights = computed(() => collectionStore.highlights)
const highlightsTotal = computed(() => collectionStore.highlightsTotal)
const goals = computed(() => collectionStore.goals)
const activeGoals = computed(() => collectionStore.activeGoals)
const completedGoals = computed(() => collectionStore.completedGoals)

const overviewCards = computed(() => {
  if (!overview.value) return []
  return [
    { key: 'fragments', label: '情绪片段', count: overview.value.fragmentCount || 0, icon: Droplets, color: '#87CEEB', description: '沉淀的情绪碎片' },
    { key: 'storyCards', label: '故事卡', count: overview.value.storyCardCount || 0, icon: Scroll, color: '#8b5cf6', description: '解锁的房间故事' },
    { key: 'highlights', label: '高光收藏', count: overview.value.highlightCount || 0, icon: Star, color: '#FFD700', description: '珍藏的闪光瞬间' },
    { key: 'goals', label: '收藏目标', count: `${overview.value.completedGoalCount || 0}/${overview.value.goalCount || 0}`, icon: Target, color: '#22c55e', description: '长期成长目标' }
  ]
})

const goalTypeLabels = {
  'fragment_collection': '情感收藏',
  'story_card_collection': '故事考古',
  'highlight_collection': '高光猎手',
  'comprehensive_collection': '收藏大师'
}

async function loadData() {
  isLoading.value = true
  await Promise.all([
    collectionStore.fetchOverview(),
    collectionStore.fetchFragments({ page: 1, pageSize: 50 }),
    collectionStore.fetchStoryCards(),
    collectionStore.fetchHighlights({ page: 1, pageSize: 50 }),
    collectionStore.fetchGoals()
  ])

  if (goals.value.length === 0) {
    await collectionStore.initDefaultGoals()
    await collectionStore.fetchGoals()
  }

  isLoading.value = false
}

function getEmotionInfo(type) {
  return emotionTypes.find(e => e.key === type) || emotionTypes[0]
}

function getSourceInfo(type) {
  return sourceTypes.find(s => s.key === type) || sourceTypes[4]
}

function getMoodTagInfo(key) {
  return moodTags.find(m => m.key === key) || moodTags[0]
}

function getRoomTheme(roomId) {
  return roomThemes.find(r => r.id === roomId) || roomThemes[0]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function truncateText(text, maxLen = 80) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function openCreateFragment() {
  newFragment.value = {
    sourceType: 'manual',
    sourceId: null,
    emotionType: 'happy',
    title: '',
    content: '',
    moodColor: '',
    tags: ''
  }
  showCreateFragmentModal.value = true
}

async function submitFragment() {
  if (!newFragment.value.title || !newFragment.value.content) {
    notificationStore.warning('请填写标题和内容')
    return
  }

  const result = await collectionStore.createFragment(newFragment.value)
  if (result.success) {
    notificationStore.success('✨ 情绪片段收藏成功', '收藏成功')
    showCreateFragmentModal.value = false
    await collectionStore.fetchFragments({ page: 1, pageSize: 50 })
  } else {
    notificationStore.error(result.message)
  }
}

async function toggleStarFragment(fragment) {
  const result = await collectionStore.starFragment(fragment.id, !fragment.is_starred)
  if (result.success) {
    fragment.is_starred = !fragment.is_starred
  }
}

async function removeFragment(id) {
  const result = await collectionStore.deleteFragment(id)
  if (result.success) {
    notificationStore.success('已移除情绪片段')
  }
}

function openCreateHighlight() {
  newHighlight.value = {
    sourceType: 'story',
    sourceId: null,
    roomId: null,
    title: '',
    content: '',
    highlightNote: '',
    moodTag: ''
  }
  showCreateHighlightModal.value = true
}

async function submitHighlight() {
  if (!newHighlight.value.title || !newHighlight.value.content) {
    notificationStore.warning('请填写标题和内容')
    return
  }

  const result = await collectionStore.createHighlight(newHighlight.value)
  if (result.success) {
    notificationStore.success('🌟 高光内容收藏成功', '收藏成功')
    showCreateHighlightModal.value = false
    await collectionStore.fetchHighlights({ page: 1, pageSize: 50 })
  } else {
    notificationStore.error(result.message)
  }
}

async function toggleFavoriteHighlight(highlight) {
  const result = await collectionStore.favoriteHighlight(highlight.id, !highlight.is_favorite)
  if (result.success) {
    highlight.is_favorite = !highlight.is_favorite
  }
}

async function removeHighlight(id) {
  const result = await collectionStore.deleteHighlight(id)
  if (result.success) {
    notificationStore.success('已移除高光收藏')
  }
}

async function filterFragments() {
  const params = { page: 1, pageSize: 50 }
  if (fragmentFilter.value.emotionType) params.emotionType = fragmentFilter.value.emotionType
  if (fragmentFilter.value.sourceType) params.sourceType = fragmentFilter.value.sourceType
  if (fragmentFilter.value.keyword) params.keyword = fragmentFilter.value.keyword
  await collectionStore.fetchFragments(params)
}

async function filterHighlights() {
  const params = { page: 1, pageSize: 50 }
  if (highlightFilter.value.sourceType) params.sourceType = highlightFilter.value.sourceType
  if (highlightFilter.value.moodTag) params.moodTag = highlightFilter.value.moodTag
  if (highlightFilter.value.keyword) params.keyword = highlightFilter.value.keyword
  await collectionStore.fetchHighlights(params)
}

async function filterStoryCards() {
  const params = {}
  if (storyCardFilter.value.roomId) params.roomId = storyCardFilter.value.roomId
  await collectionStore.fetchStoryCards(params)
}

function goToRoom(roomId) {
  router.push(`/rooms/${roomId}`)
}

onMounted(() => {
  loadData()
})

watch(activeTab, () => {
  if (activeTab.value === 'fragments') {
    collectionStore.fetchFragments({ page: 1, pageSize: 50 })
  } else if (activeTab.value === 'storyCards') {
    collectionStore.fetchStoryCards()
  } else if (activeTab.value === 'highlights') {
    collectionStore.fetchHighlights({ page: 1, pageSize: 50 })
  } else if (activeTab.value === 'goals') {
    collectionStore.fetchGoals()
  }
})
</script>

<template>
  <div class="page-container dream-collection">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <Moon class="title-icon" />
          梦境收藏馆
        </h1>
        <p class="page-subtitle">沉淀情绪片段 · 解锁故事卡片 · 收藏高光时刻</p>
      </div>
    </header>

    <nav class="tab-nav">
      <button
        v-for="tab in [
          { key: 'overview', label: '概览', icon: Archive },
          { key: 'fragments', label: '情绪片段', icon: Droplets },
          { key: 'storyCards', label: '故事卡', icon: Scroll },
          { key: 'highlights', label: '高光收藏', icon: Star },
          { key: 'goals', label: '收藏目标', icon: Target }
        ]"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="tab-icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div v-if="isLoading" class="loading-state">
      <Moon class="loading-icon spinning" />
      <p>正在加载收藏馆...</p>
    </div>

    <template v-else>
      <!-- Overview Tab -->
      <section v-if="activeTab === 'overview'" class="tab-content">
        <div class="overview-grid">
          <div
            v-for="card in overviewCards"
            :key="card.key"
            class="overview-card glass-card"
            @click="activeTab = card.key"
          >
            <div class="overview-card-icon" :style="{ background: `${card.color}22`, color: card.color }">
              <component :is="card.icon" />
            </div>
            <div class="overview-card-info">
              <span class="overview-card-count">{{ card.count }}</span>
              <span class="overview-card-label">{{ card.label }}</span>
              <span class="overview-card-desc">{{ card.description }}</span>
            </div>
            <ChevronRight class="overview-card-arrow" />
          </div>
        </div>

        <div class="overview-sections">
          <div class="glass-card section-card">
            <h3 class="section-title">
              <Palette class="section-icon" />
              情绪光谱
            </h3>
            <div class="emotion-spectrum">
              <div
                v-for="stat in (overview?.emotionTypeStats || [])"
                :key="stat.emotion_type"
                class="spectrum-item"
              >
                <span class="spectrum-emoji">{{ getEmotionInfo(stat.emotion_type).emoji }}</span>
                <span class="spectrum-label">{{ getEmotionInfo(stat.emotion_type).label }}</span>
                <div class="spectrum-bar-wrap">
                  <div
                    class="spectrum-bar"
                    :style="{
                      width: `${Math.min(100, (stat.count / (overview?.fragmentCount || 1)) * 100)}%`,
                      background: getEmotionInfo(stat.emotion_type).color
                    }"
                  />
                </div>
                <span class="spectrum-count">{{ stat.count }}</span>
              </div>
              <div v-if="!overview?.emotionTypeStats?.length" class="empty-hint">
                还没有情绪片段，去收藏第一片情绪吧
              </div>
            </div>
          </div>

          <div class="glass-card section-card">
            <h3 class="section-title">
              <Library class="section-icon" />
              房间探索
            </h3>
            <div class="room-explore">
              <div
                v-for="roomStat in (overview?.roomStats || [])"
                :key="roomStat.room_id"
                class="room-stat-item"
                @click="goToRoom(roomStat.room_id)"
              >
                <span class="room-stat-icon">{{ getRoomTheme(roomStat.room_id).icon }}</span>
                <div class="room-stat-info">
                  <span class="room-stat-name">{{ roomStat.room_name }}</span>
                  <span class="room-stat-cards">{{ roomStat.card_count }} 张故事卡</span>
                </div>
                <ChevronRight class="room-stat-arrow" />
              </div>
              <div v-if="!overview?.roomStats?.length" class="empty-hint">
                还没有解锁故事卡，去探索房间吧
              </div>
            </div>
          </div>

          <div class="glass-card section-card">
            <h3 class="section-title">
              <Flag class="section-icon" />
              目标进度
            </h3>
            <div class="goal-progress-list">
              <div
                v-for="goal in activeGoals.slice(0, 3)"
                :key="goal.id"
                class="goal-progress-item"
              >
                <div class="goal-progress-header">
                  <span class="goal-progress-title">{{ goal.title }}</span>
                  <span class="goal-progress-pct">{{ goal.progressPercent || 0 }}%</span>
                </div>
                <div class="goal-progress-bar-wrap">
                  <div
                    class="goal-progress-bar"
                    :style="{ width: `${goal.progressPercent || 0}%` }"
                  />
                </div>
                <span class="goal-progress-detail">{{ goal.current_progress }} / {{ goal.target_value }}</span>
              </div>
              <div v-if="!activeGoals.length" class="empty-hint">
                暂无进行中的收藏目标
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Fragments Tab -->
      <section v-if="activeTab === 'fragments'" class="tab-content">
        <div class="section-toolbar">
          <div class="filter-group">
            <select v-model="fragmentFilter.emotionType" class="filter-select" @change="filterFragments">
              <option value="">全部情绪</option>
              <option v-for="e in emotionTypes" :key="e.key" :value="e.key">{{ e.emoji }} {{ e.label }}</option>
            </select>
            <select v-model="fragmentFilter.sourceType" class="filter-select" @change="filterFragments">
              <option value="">全部来源</option>
              <option v-for="s in sourceTypes" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
          <div class="search-group">
            <Search class="search-icon" />
            <input
              v-model="fragmentFilter.keyword"
              class="search-input"
              placeholder="搜索情绪片段..."
              @keyup.enter="filterFragments"
            />
          </div>
          <button class="btn-primary create-btn" @click="openCreateFragment">
            <Plus class="btn-icon" />
            沉淀片段
          </button>
        </div>

        <div class="fragment-grid">
          <div
            v-for="fragment in fragments"
            :key="fragment.id"
            class="fragment-card glass-card"
            :class="{ starred: fragment.is_starred }"
          >
            <div class="fragment-card-header">
              <div class="fragment-emotion-badge" :style="{ background: `${getEmotionInfo(fragment.emotion_type).color}33`, color: getEmotionInfo(fragment.emotion_type).color }">
                {{ getEmotionInfo(fragment.emotion_type).emoji }}
                {{ getEmotionInfo(fragment.emotion_type).label }}
              </div>
              <div class="fragment-actions">
                <button class="action-btn" :class="{ active: fragment.is_starred }" @click="toggleStarFragment(fragment)">
                  <Star v-if="!fragment.is_starred" />
                  <Sparkles v-else />
                </button>
                <button class="action-btn danger" @click="removeFragment(fragment.id)">
                  <Trash2 />
                </button>
              </div>
            </div>
            <h4 class="fragment-title">{{ fragment.title }}</h4>
            <p class="fragment-content">{{ truncateText(fragment.content, 120) }}</p>
            <div class="fragment-footer">
              <span class="fragment-source">
                <component :is="getSourceInfo(fragment.source_type).icon" class="source-icon" />
                {{ getSourceInfo(fragment.source_type).label }}
              </span>
              <span class="fragment-date">{{ formatDate(fragment.created_at) }}</span>
            </div>
          </div>
        </div>

        <div v-if="!fragments.length" class="empty-state glass-card">
          <Droplets class="empty-icon" />
          <h3>还没有情绪片段</h3>
          <p>记录心情时，将值得沉淀的片段收藏到这里</p>
          <button class="btn-primary" @click="openCreateFragment">
            <Plus class="btn-icon" />
            创建第一个片段
          </button>
        </div>
      </section>

      <!-- Story Cards Tab -->
      <section v-if="activeTab === 'storyCards'" class="tab-content">
        <div class="section-toolbar">
          <div class="filter-group">
            <select v-model="storyCardFilter.roomId" class="filter-select" @change="filterStoryCards">
              <option :value="null">全部房间</option>
              <option v-for="room in roomThemes" :key="room.id" :value="room.id">{{ room.icon }} {{ room.name }}</option>
            </select>
          </div>
          <button class="btn-secondary" @click="router.push('/rooms')">
            <BookOpen class="btn-icon" />
            前往探索
          </button>
        </div>

        <div v-if="storyCardRoomStats.length" class="room-stats-bar glass-card">
          <div
            v-for="roomStat in storyCardRoomStats"
            :key="roomStat.room_id"
            class="room-stat-chip"
            :style="{ borderColor: getRoomTheme(roomStat.room_id).color }"
            @click="storyCardFilter.roomId = roomStat.room_id; filterStoryCards()"
          >
            <span>{{ getRoomTheme(roomStat.room_id).icon }}</span>
            <span>{{ roomStat.room_name }}</span>
            <span class="chip-count">{{ roomStat.card_count }}</span>
          </div>
        </div>

        <div class="story-card-grid">
          <div
            v-for="card in storyCards"
            :key="card.id"
            class="story-card glass-card"
            :style="{ '--card-accent': getRoomTheme(card.room_id).color }"
            @click="goToRoom(card.room_id)"
          >
            <div class="story-card-room-badge">
              <span>{{ getRoomTheme(card.room_id).icon }}</span>
              <span>{{ card.room_name }}</span>
            </div>
            <div class="story-card-accent-bar" />
            <h4 class="story-card-title">{{ card.title }}</h4>
            <p v-if="card.excerpt" class="story-card-excerpt">{{ truncateText(card.excerpt, 100) }}</p>
            <div class="story-card-footer">
              <span v-if="card.branch_label" class="story-card-branch">
                <Sparkles class="branch-icon" />
                {{ card.branch_label }}
              </span>
              <span v-if="card.mood_theme" class="story-card-mood">
                {{ getEmotionInfo(card.mood_theme).emoji }}
                {{ getEmotionInfo(card.mood_theme).label }}
              </span>
              <span class="story-card-date">{{ formatDate(card.unlocked_at) }}</span>
            </div>
          </div>
        </div>

        <div v-if="!storyCards.length" class="empty-state glass-card">
          <Scroll class="empty-icon" />
          <h3>还没有故事卡</h3>
          <p>阅读房间故事时，精彩章节会自动解锁为故事卡</p>
          <button class="btn-primary" @click="router.push('/rooms')">
            <BookOpen class="btn-icon" />
            去探索房间
          </button>
        </div>
      </section>

      <!-- Highlights Tab -->
      <section v-if="activeTab === 'highlights'" class="tab-content">
        <div class="section-toolbar">
          <div class="filter-group">
            <select v-model="highlightFilter.sourceType" class="filter-select" @change="filterHighlights">
              <option value="">全部来源</option>
              <option value="story">故事章节</option>
              <option value="prescription">情绪处方</option>
              <option value="retrospective">心情回顾</option>
              <option value="mood">心情记录</option>
            </select>
            <select v-model="highlightFilter.moodTag" class="filter-select" @change="filterHighlights">
              <option value="">全部标签</option>
              <option v-for="tag in moodTags" :key="tag.key" :value="tag.key">{{ tag.label }}</option>
            </select>
          </div>
          <div class="search-group">
            <Search class="search-icon" />
            <input
              v-model="highlightFilter.keyword"
              class="search-input"
              placeholder="搜索高光内容..."
              @keyup.enter="filterHighlights"
            />
          </div>
          <button class="btn-primary create-btn" @click="openCreateHighlight">
            <Plus class="btn-icon" />
            收藏高光
          </button>
        </div>

        <div class="highlight-list">
          <div
            v-for="highlight in highlights"
            :key="highlight.id"
            class="highlight-card glass-card"
            :class="{ favorited: highlight.is_favorite }"
          >
            <div class="highlight-card-header">
              <span class="highlight-source-badge">
                <component :is="getSourceInfo(highlight.source_type).icon" class="source-icon" />
                {{ getSourceInfo(highlight.source_type).label }}
              </span>
              <div class="highlight-actions">
                <button class="action-btn" :class="{ active: highlight.is_favorite }" @click="toggleFavoriteHighlight(highlight)">
                  <BookmarkCheck v-if="highlight.is_favorite" />
                  <Bookmark v-else />
                </button>
                <button class="action-btn danger" @click="removeHighlight(highlight.id)">
                  <Trash2 />
                </button>
              </div>
            </div>
            <h4 class="highlight-title">{{ highlight.title }}</h4>
            <p class="highlight-content">{{ truncateText(highlight.content, 150) }}</p>
            <p v-if="highlight.highlight_note" class="highlight-note">
              <Edit3 class="note-icon" />
              {{ highlight.highlight_note }}
            </p>
            <div class="highlight-footer">
              <span v-if="highlight.mood_tag" class="highlight-mood-tag" :style="{ background: `${getMoodTagInfo(highlight.mood_tag).color}22`, color: getMoodTagInfo(highlight.mood_tag).color }">
                {{ getMoodTagInfo(highlight.mood_tag).label }}
              </span>
              <span class="highlight-date">{{ formatDate(highlight.created_at) }}</span>
            </div>
          </div>
        </div>

        <div v-if="!highlights.length" class="empty-state glass-card">
          <Star class="empty-icon" />
          <h3>还没有高光收藏</h3>
          <p>收藏那些让你心动的文字和瞬间</p>
          <button class="btn-primary" @click="openCreateHighlight">
            <Plus class="btn-icon" />
            收藏第一个高光
          </button>
        </div>
      </section>

      <!-- Goals Tab -->
      <section v-if="activeTab === 'goals'" class="tab-content">
        <div v-if="activeGoals.length" class="goals-section">
          <h3 class="goals-section-title">
            <Target class="section-icon" />
            进行中的目标
          </h3>
          <div class="goals-grid">
            <div
              v-for="goal in activeGoals"
              :key="goal.id"
              class="goal-card glass-card"
            >
              <div class="goal-type-badge" :class="goal.goal_type">
                {{ goalTypeLabels[goal.goal_type] || '收藏目标' }}
              </div>
              <h4 class="goal-title">{{ goal.title }}</h4>
              <p v-if="goal.description" class="goal-desc">{{ goal.description }}</p>
              <div class="goal-progress-wrap">
                <div class="goal-progress-info">
                  <span>{{ goal.current_progress }} / {{ goal.target_value }}</span>
                  <span>{{ goal.progressPercent || 0 }}%</span>
                </div>
                <div class="goal-progress-track">
                  <div class="goal-progress-fill" :style="{ width: `${goal.progressPercent || 0}%` }" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="completedGoals.length" class="goals-section">
          <h3 class="goals-section-title">
            <Trophy class="section-icon" />
            已完成的目标
          </h3>
          <div class="goals-grid completed">
            <div
              v-for="goal in completedGoals"
              :key="goal.id"
              class="goal-card glass-card completed"
            >
              <div class="goal-type-badge" :class="goal.goal_type">
                {{ goalTypeLabels[goal.goal_type] || '收藏目标' }}
              </div>
              <h4 class="goal-title">{{ goal.title }}</h4>
              <div class="goal-completed-badge">
                <Check />
                已达成
              </div>
              <span v-if="goal.completed_at" class="goal-completed-date">
                {{ formatDate(goal.completed_at) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="!goals.length" class="empty-state glass-card">
          <Target class="empty-icon" />
          <h3>还没有收藏目标</h3>
          <p>设定收藏目标，在成就体系中持续成长</p>
          <button class="btn-primary" @click="collectionStore.initDefaultGoals(); loadData()">
            <Sparkles class="btn-icon" />
            初始化默认目标
          </button>
        </div>
      </section>
    </template>

    <!-- Create Fragment Modal -->
    <Teleport to="body">
      <div v-if="showCreateFragmentModal" class="modal-overlay" @click.self="showCreateFragmentModal = false">
        <div class="modal glass-card">
          <div class="modal-header">
            <h3>沉淀情绪片段</h3>
            <button class="modal-close" @click="showCreateFragmentModal = false">
              <X />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">情绪类型</label>
              <div class="emotion-selector">
                <button
                  v-for="e in emotionTypes"
                  :key="e.key"
                  class="emotion-option"
                  :class="{ active: newFragment.emotionType === e.key }"
                  :style="{ '--emo-color': e.color }"
                  @click="newFragment.emotionType = e.key"
                >
                  {{ e.emoji }} {{ e.label }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">来源</label>
              <select v-model="newFragment.sourceType" class="form-select">
                <option v-for="s in sourceTypes" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="newFragment.title" class="input-field" placeholder="给这片情绪起个名字..." />
            </div>
            <div class="form-group">
              <label class="form-label">内容</label>
              <textarea v-model="newFragment.content" class="input-field textarea" rows="4" placeholder="记录你此刻的感受..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">标签（逗号分隔）</label>
              <input v-model="newFragment.tags" class="input-field" placeholder="如：温暖, 治愈, 感悟" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreateFragmentModal = false">取消</button>
            <button class="btn-primary" @click="submitFragment">
              <Sparkles class="btn-icon" />
              收藏片段
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Highlight Modal -->
    <Teleport to="body">
      <div v-if="showCreateHighlightModal" class="modal-overlay" @click.self="showCreateHighlightModal = false">
        <div class="modal glass-card">
          <div class="modal-header">
            <h3>收藏高光内容</h3>
            <button class="modal-close" @click="showCreateHighlightModal = false">
              <X />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">来源类型</label>
              <select v-model="newHighlight.sourceType" class="form-select">
                <option value="story">故事章节</option>
                <option value="prescription">情绪处方</option>
                <option value="retrospective">心情回顾</option>
                <option value="mood">心情记录</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">情绪标签</label>
              <div class="mood-tag-selector">
                <button
                  v-for="tag in moodTags"
                  :key="tag.key"
                  class="mood-tag-option"
                  :class="{ active: newHighlight.moodTag === tag.key }"
                  :style="{ '--tag-color': tag.color }"
                  @click="newHighlight.moodTag = tag.key"
                >
                  {{ tag.label }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="newHighlight.title" class="input-field" placeholder="给这段高光起个名字..." />
            </div>
            <div class="form-group">
              <label class="form-label">内容</label>
              <textarea v-model="newHighlight.content" class="input-field textarea" rows="4" placeholder="收藏的文字或感悟..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">收藏备注</label>
              <input v-model="newHighlight.highlightNote" class="input-field" placeholder="为什么收藏这段内容..." />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreateHighlightModal = false">取消</button>
            <button class="btn-primary" @click="submitHighlight">
              <Star class="btn-icon" />
              收藏高光
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.dream-collection {
  padding-bottom: 40px;
}

.page-header {
  margin-bottom: 24px;
}

.title-icon {
  width: 36px;
  height: 36px;
  color: var(--color-secondary);
  animation: pulse 3s ease-in-out infinite;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.tab-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--color-text);
  }

  &.active {
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.2), rgba(123, 163, 201, 0.2));
    color: var(--color-secondary);
    box-shadow: inset 0 0 0 1px rgba(232, 180, 217, 0.3);
  }
}

.tab-icon {
  width: 16px;
  height: 16px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.loading-icon {
  width: 40px;
  height: 40px;
  color: var(--color-secondary);
}

.spinning {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}

.overview-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  & > :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.overview-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-card-count {
  font-size: 1.6rem;
  font-weight: 700;
  font-family: var(--font-display);
}

.overview-card-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.overview-card-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.overview-card-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.overview-sections {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.section-card {
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  margin-bottom: 16px;
}

.section-icon {
  width: 18px;
  height: 18px;
  color: var(--color-secondary);
}

.emotion-spectrum {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spectrum-item {
  display: grid;
  grid-template-columns: 28px 40px 1fr 30px;
  align-items: center;
  gap: 8px;
}

.spectrum-emoji {
  font-size: 1.1rem;
  text-align: center;
}

.spectrum-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.spectrum-bar-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.spectrum-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.spectrum-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-align: right;
}

.room-explore {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.room-stat-icon {
  font-size: 1.3rem;
}

.room-stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.room-stat-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.room-stat-cards {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.room-stat-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.goal-progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.goal-progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.goal-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-progress-title {
  font-size: 0.85rem;
  font-weight: 500;
}

.goal-progress-pct {
  font-size: 0.85rem;
  color: var(--color-secondary);
  font-weight: 600;
}

.goal-progress-bar-wrap {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.goal-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.goal-progress-detail {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.section-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;

  option {
    background: var(--color-bg-dark);
    color: var(--color-text);
  }
}

.search-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  color: var(--color-text);
  font-size: 0.85rem;

  &::placeholder {
    color: var(--color-text-muted);
  }
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px !important;
  font-size: 0.85rem !important;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.fragment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.fragment-card {
  padding: 20px;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  &.starred {
    border-color: rgba(255, 215, 0, 0.3);
  }
}

.fragment-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fragment-emotion-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
}

.fragment-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);

  & > :deep(svg) {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }

  &.active {
    color: var(--color-gold);
    background: rgba(212, 175, 55, 0.15);
  }

  &.danger:hover {
    color: var(--color-error);
    background: rgba(248, 113, 113, 0.15);
  }
}

.fragment-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.fragment-content {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.fragment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.fragment-source {
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-icon {
  width: 12px;
  height: 12px;
}

.room-stats-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.room-stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.chip-count {
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}

.story-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.story-card {
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}

.story-card-room-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.story-card-accent-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-accent, var(--color-secondary));
}

.story-card-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.story-card-excerpt {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.story-card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.story-card-branch {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-accent);
}

.branch-icon {
  width: 12px;
  height: 12px;
}

.story-card-mood {
  display: flex;
  align-items: center;
  gap: 4px;
}

.story-card-date {
  margin-left: auto;
}

.highlight-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.highlight-card {
  padding: 20px;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  &.favorited {
    border-color: rgba(255, 215, 0, 0.2);
  }
}

.highlight-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.highlight-source-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.highlight-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.highlight-content {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.highlight-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-accent);
  font-style: italic;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(123, 163, 201, 0.08);
  border-radius: var(--radius-sm);
}

.note-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.highlight-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.highlight-mood-tag {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}

.highlight-date {
  margin-left: auto;
}

.mood-tag-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-tag-option {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &.active {
    background: color-mix(in srgb, var(--tag-color) 20%, transparent);
    color: var(--tag-color);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tag-color) 40%, transparent);
  }
}

.goals-section {
  margin-bottom: 32px;
}

.goals-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  margin-bottom: 16px;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.goal-card {
  padding: 20px;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
  }

  &.completed {
    opacity: 0.85;
  }
}

.goal-type-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
  margin-bottom: 10px;

  &.fragment_collection {
    background: rgba(135, 206, 235, 0.15);
    color: #87CEEB;
  }

  &.story_card_collection {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  &.highlight_collection {
    background: rgba(255, 215, 0, 0.15);
    color: #FFD700;
  }

  &.comprehensive_collection {
    background: rgba(232, 180, 217, 0.15);
    color: var(--color-secondary);
  }
}

.goal-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
  font-family: var(--font-display);
}

.goal-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 14px;
  line-height: 1.5;
}

.goal-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.goal-progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.goal-progress-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.goal-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.goal-completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-success);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 6px;

  & > :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

.goal-completed-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.empty-state p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  max-width: 300px;
}

.empty-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 16px 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 1.2rem;
  }
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }

  & > :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-select {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 0.9rem;

  option {
    background: var(--color-bg-dark);
  }
}

.emotion-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.emotion-option {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &.active {
    background: color-mix(in srgb, var(--emo-color) 20%, transparent);
    color: var(--emo-color);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--emo-color) 40%, transparent);
  }
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 1024px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .overview-sections {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .section-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .search-group {
    min-width: unset;
  }

  .fragment-grid,
  .story-card-grid,
  .highlight-list {
    grid-template-columns: 1fr;
  }

  .goals-grid {
    grid-template-columns: 1fr;
  }
}
</style>
