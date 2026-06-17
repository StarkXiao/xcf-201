<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWishCommissionStore } from '@/stores/wishCommission'
import { useNotificationStore } from '@/stores/notification'
import { 
  Scroll, Star, Trophy, Target, Flame, BookOpen, Heart, 
  Palette, Layers, PenTool, Moon, Sunrise, Cloud, CloudRain,
  Wind, FlameKindling, DoorOpen, Feather, RotateCcw, Coins,
  Gem, Sparkles, Award, BookOpenCheck, Clock, CheckCircle,
  Gift, ChevronRight, X, Zap, TrendingUp, BarChart3
} from 'lucide-vue-next'

const wishCommissionStore = useWishCommissionStore()
const notificationStore = useNotificationStore()

const activeTab = ref('hall')
const activeTypeFilter = ref('all')
const activeDifficultyFilter = ref('all')
const isLoading = ref(false)
const claimingId = ref(null)
const acceptingId = ref(null)
const showRetroModal = ref(false)
const selectedCommission = ref(null)
const retroContent = ref('')
const retroMood = ref('')
const retroInsight = ref('')
const retroRating = ref(0)
const hoverRating = ref(0)

const templates = computed(() => wishCommissionStore.templates)
const templateTypes = computed(() => wishCommissionStore.templateTypes)
const myCommissions = computed(() => wishCommissionStore.myCommissions)
const stats = computed(() => wishCommissionStore.stats)
const coinInfo = computed(() => wishCommissionStore.coinInfo)
const retrospectives = computed(() => wishCommissionStore.retrospectives)

const filteredTemplates = computed(() => {
  let list = templates.value
  
  if (activeTypeFilter.value !== 'all') {
    list = list.filter(t => t.type === activeTypeFilter.value)
  }
  
  if (activeDifficultyFilter.value !== 'all') {
    list = list.filter(t => t.difficulty === activeDifficultyFilter.value)
  }
  
  return list
})

const acceptedCommissions = computed(() => 
  myCommissions.value.filter(c => c.status === 'accepted')
)

const completedCommissions = computed(() => 
  myCommissions.value.filter(c => c.status === 'completed')
)

const claimedCommissions = computed(() => 
  myCommissions.value.filter(c => c.status === 'claimed')
)

const moodOptions = [
  { value: 'happy', label: '开心', color: 'var(--mood-happy)' },
  { value: 'calm', label: '平静', color: 'var(--mood-calm)' },
  { value: 'sad', label: '难过', color: 'var(--mood-sad)' },
  { value: 'anxious', label: '焦虑', color: 'var(--mood-anxious)' },
  { value: 'angry', label: '愤怒', color: 'var(--mood-angry)' }
]

const difficultyConfig = {
  easy: { label: '简单', color: '#4ADE80', bgColor: 'rgba(74, 222, 128, 0.15)' },
  normal: { label: '普通', color: '#60A5FA', bgColor: 'rgba(96, 165, 250, 0.15)' },
  hard: { label: '困难', color: '#F472B6', bgColor: 'rgba(244, 114, 182, 0.15)' }
}

function getIconComponent(iconName) {
  const iconMap = {
    'scroll': Scroll,
    'sunrise': Sunrise,
    'pen-tool': PenTool,
    'moon': Moon,
    'layers': Layers,
    'palette': Palette,
    'paintbrush': Palette,
    'flame': Flame,
    'calendar-days': Star,
    'trophy': Trophy,
    'book-open': BookOpen,
    'book-marked': BookOpen,
    'door-open': DoorOpen,
    'feather': Feather,
    'rotate-ccw': RotateCcw,
    'smile': Heart,
    'cloud': Cloud,
    'cloud-rain': CloudRain,
    'wind': Wind,
    'flame-kindling': FlameKindling,
    'sparkles': Sparkles,
    'award': Award,
    'coins': Coins,
    'gem': Gem,
    'book-open-check': BookOpenCheck,
    'star': Star,
    'target': Target,
    'heart': Heart
  }
  return iconMap[iconName] || Scroll
}

function getTypeLabel(type) {
  const typeItem = templateTypes.value.find(t => t.type === type)
  return typeItem?.label || type
}

async function loadData() {
  isLoading.value = true
  await Promise.all([
    wishCommissionStore.fetchTemplates(),
    wishCommissionStore.fetchTemplateTypes(),
    wishCommissionStore.fetchMyCommissions(),
    wishCommissionStore.fetchStats(),
    wishCommissionStore.fetchCoinInfo(),
    wishCommissionStore.fetchRetrospectives()
  ])
  isLoading.value = false
}

async function handleAccept(templateId) {
  acceptingId.value = templateId
  const result = await wishCommissionStore.acceptCommission(templateId)
  acceptingId.value = null
  
  if (!result.success) {
    notificationStore.error(result.message, '接取失败')
  }
}

async function handleClaim(commissionId) {
  claimingId.value = commissionId
  const result = await wishCommissionStore.claimReward(commissionId)
  claimingId.value = null
  
  if (!result.success) {
    notificationStore.error(result.message, '领取失败')
  }
}

function openRetroModal(commission) {
  selectedCommission.value = commission
  retroContent.value = ''
  retroMood.value = ''
  retroInsight.value = ''
  retroRating.value = 0
  hoverRating.value = 0
  showRetroModal.value = true
}

async function submitRetrospective() {
  if (!retroContent.value.trim()) {
    notificationStore.error('请填写复盘内容', '提交失败')
    return
  }
  
  const result = await wishCommissionStore.createRetrospective(
    selectedCommission.value.id,
    {
      content: retroContent.value,
      mood_after: retroMood.value || null,
      insight: retroInsight.value || null,
      rating: retroRating.value
    }
  )
  
  if (result.success) {
    showRetroModal.value = false
    selectedCommission.value = null
  } else {
    notificationStore.error(result.message, '提交失败')
  }
}

function setRating(rating) {
  retroRating.value = rating
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getStatusText(status) {
  const statusMap = {
    'accepted': '进行中',
    'completed': '待领取',
    'claimed': '已完成',
    'expired': '已过期'
  }
  return statusMap[status] || status
}

function getStatusClass(status) {
  return `status-${status}`
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="wish-commission-page page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <Scroll class="title-icon" />
          心愿委托
        </h1>
        <p class="page-subtitle">接受委托，完成挑战，收获星币与成长</p>
      </div>
      <div class="header-stats">
        <div class="stat-card star-coin-stat">
          <Coins class="stat-icon" />
          <div class="stat-content">
            <span class="stat-value">{{ coinInfo?.balance || 0 }}</span>
            <span class="stat-label">星币余额</span>
          </div>
        </div>
        <div class="stat-card">
          <Trophy class="stat-icon" />
          <div class="stat-content">
            <span class="stat-value">{{ stats?.totalCompleted || 0 }}</span>
            <span class="stat-label">已完成委托</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'hall' }"
        @click="activeTab = 'hall'"
      >
        <Target class="tab-icon" />
        委托大厅
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'my' }"
        @click="activeTab = 'my'"
      >
        <BookOpen class="tab-icon" />
        我的委托
        <span v-if="completedCommissions.length > 0" class="tab-badge">
          {{ completedCommissions.length }}
        </span>
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'retrospective' }"
        @click="activeTab = 'retrospective'"
      >
        <BookOpenCheck class="tab-icon" />
        成长复盘
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'stats' }"
        @click="activeTab = 'stats'"
      >
        <BarChart3 class="tab-icon" />
        数据统计
      </button>
    </div>

    <div v-if="activeTab === 'hall'" class="tab-content">
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">类型:</span>
          <button 
            class="filter-btn"
            :class="{ active: activeTypeFilter === 'all' }"
            @click="activeTypeFilter = 'all'"
          >
            全部
          </button>
          <button 
            v-for="typeItem in templateTypes" 
            :key="typeItem.type"
            class="filter-btn"
            :class="{ active: activeTypeFilter === typeItem.type }"
            @click="activeTypeFilter = typeItem.type"
          >
            {{ typeItem.label }}
          </button>
        </div>
        <div class="filter-group">
          <span class="filter-label">难度:</span>
          <button 
            class="filter-btn"
            :class="{ active: activeDifficultyFilter === 'all' }"
            @click="activeDifficultyFilter = 'all'"
          >
            全部
          </button>
          <button 
            v-for="(config, key) in difficultyConfig" 
            :key="key"
            class="filter-btn"
            :class="{ active: activeDifficultyFilter === key }"
            @click="activeDifficultyFilter = key"
          >
            {{ config.label }}
          </button>
        </div>
      </div>

      <div class="commission-grid">
        <div 
          v-for="template in filteredTemplates" 
          :key="template.id"
          class="commission-card glass-card"
          :class="[`difficulty-${template.difficulty}`, { accepted: template.isAccepted }]"
        >
          <div class="card-header">
            <div class="card-icon-wrapper" :style="{ background: difficultyConfig[template.difficulty]?.bgColor }">
              <component :is="getIconComponent(template.icon)" class="card-icon" :style="{ color: difficultyConfig[template.difficulty]?.color }" />
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ template.title }}</h3>
              <span class="card-type">{{ getTypeLabel(template.type) }}</span>
            </div>
            <span class="difficulty-badge" :style="{ background: difficultyConfig[template.difficulty]?.bgColor, color: difficultyConfig[template.difficulty]?.color }">
              {{ difficultyConfig[template.difficulty]?.label }}
            </span>
          </div>
          
          <p class="card-description">{{ template.description }}</p>
          
          <div class="card-rewards">
            <div class="reward-item">
              <Coins class="reward-icon" />
              <span>{{ template.rewardCoins }} 星币</span>
            </div>
            <div v-if="template.rewardExp" class="reward-item">
              <Zap class="reward-icon" />
              <span>{{ template.rewardExp }} 经验</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="target-info">
              <Target class="target-icon" />
              <span>目标: {{ template.target }}</span>
            </div>
            <button 
              class="accept-btn"
              :class="{ accepted: template.isAccepted, loading: acceptingId === template.id }"
              :disabled="template.isAccepted || acceptingId === template.id"
              @click="handleAccept(template.id)"
            >
              <span v-if="acceptingId === template.id">接取中...</span>
              <span v-else-if="template.isAccepted">已接取</span>
              <span v-else>接取委托</span>
              <ChevronRight class="btn-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'my'" class="tab-content">
      <div class="my-commissions-section">
        <div class="section-header">
          <h3><Flame class="section-icon" /> 进行中 ({{ acceptedCommissions.length }})</h3>
        </div>
        <div v-if="acceptedCommissions.length === 0" class="empty-state">
          <Clock class="empty-icon" />
          <p>暂无进行中的委托</p>
          <button class="btn-primary" @click="activeTab = 'hall'">去委托大厅看看</button>
        </div>
        <div v-else class="my-commission-list">
          <div 
            v-for="commission in acceptedCommissions" 
            :key="commission.id"
            class="my-commission-card glass-card"
          >
            <div class="commission-header">
              <div class="commission-title-row">
                <h4>{{ commission.title }}</h4>
                <span class="status-badge status-accepted">进行中</span>
              </div>
              <span class="commission-type">{{ getTypeLabel(commission.type) }}</span>
            </div>
            
            <div class="progress-section">
              <div class="progress-bar-container">
                <div 
                  class="progress-bar" 
                  :style="{ width: commission.progressPercent + '%' }"
                ></div>
              </div>
              <div class="progress-info">
                <span>{{ commission.current }} / {{ commission.target }}</span>
                <span>{{ commission.progressPercent }}%</span>
              </div>
            </div>

            <div class="commission-footer">
              <div class="reward-preview">
                <Coins class="reward-icon small" />
                <span>{{ commission.rewardCoins }} 星币</span>
              </div>
              <span class="deadline-text" v-if="commission.deadline">
                截止: {{ formatDate(commission.deadline) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="my-commissions-section">
        <div class="section-header">
          <h3><Gift class="section-icon" /> 待领取 ({{ completedCommissions.length }})</h3>
        </div>
        <div v-if="completedCommissions.length === 0" class="empty-state small">
          <p>暂无待领取的委托奖励</p>
        </div>
        <div v-else class="my-commission-list">
          <div 
            v-for="commission in completedCommissions" 
            :key="commission.id"
            class="my-commission-card glass-card completed"
          >
            <div class="commission-header">
              <div class="commission-title-row">
                <h4>{{ commission.title }}</h4>
                <span class="status-badge status-completed">待领取</span>
              </div>
              <span class="commission-type">{{ getTypeLabel(commission.type) }}</span>
            </div>
            
            <div class="completion-info">
              <CheckCircle class="check-icon" />
              <span>委托已完成，快去领取奖励吧！</span>
            </div>

            <div class="commission-footer">
              <div class="reward-preview highlight">
                <Coins class="reward-icon small" />
                <span>+{{ commission.rewardCoins }} 星币</span>
              </div>
              <button 
                class="claim-btn"
                :class="{ loading: claimingId === commission.id }"
                :disabled="claimingId === commission.id"
                @click="handleClaim(commission.id)"
              >
                <span v-if="claimingId === commission.id">领取中...</span>
                <span v-else>领取奖励</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="my-commissions-section">
        <div class="section-header">
          <h3><Trophy class="section-icon" /> 已完成 ({{ claimedCommissions.length }})</h3>
        </div>
        <div v-if="claimedCommissions.length === 0" class="empty-state small">
          <p>暂无已完成的委托</p>
        </div>
        <div v-else class="my-commission-list">
          <div 
            v-for="commission in claimedCommissions.slice(0, 5)" 
            :key="commission.id"
            class="my-commission-card glass-card claimed"
          >
            <div class="commission-header">
              <div class="commission-title-row">
                <h4>{{ commission.title }}</h4>
                <span class="status-badge status-claimed">已完成</span>
              </div>
              <span class="commission-type">{{ getTypeLabel(commission.type) }}</span>
            </div>
            
            <div class="claimed-info">
              <span class="completed-time">完成于 {{ formatDate(commission.claimedAt) }}</span>
              <span class="claimed-reward">获得 {{ commission.rewardCoins }} 星币</span>
            </div>

            <div class="commission-footer">
              <button 
                class="retro-btn"
                @click="openRetroModal(commission)"
              >
                <BookOpenCheck class="btn-icon" />
                写复盘
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'retrospective'" class="tab-content">
      <div class="retrospective-section">
        <div class="section-header">
          <h3><BookOpenCheck class="section-icon" /> 我的复盘</h3>
          <span class="count-badge">{{ retrospectives.length }} 篇</span>
        </div>
        
        <div v-if="retrospectives.length === 0" class="empty-state">
          <BookOpen class="empty-icon" />
          <p>还没有写过复盘</p>
          <p class="empty-hint">完成委托后，可以写下你的感悟和收获</p>
        </div>
        
        <div v-else class="retrospective-list">
          <div 
            v-for="retro in retrospectives" 
            :key="retro.id"
            class="retrospective-card glass-card"
          >
            <div class="retro-header">
              <div class="retro-title">
                <h4>{{ retro.commissionTitle }}</h4>
                <span class="retro-type">{{ getTypeLabel(retro.commissionType) }}</span>
              </div>
              <div class="retro-rating">
                <Star 
                  v-for="i in 5" 
                  :key="i" 
                  class="star-icon"
                  :class="{ filled: i <= retro.rating }"
                />
              </div>
            </div>
            
            <p class="retro-content">{{ retro.content }}</p>
            
            <div v-if="retro.insight" class="retro-insight">
              <span class="insight-label">💡 感悟:</span>
              <p>{{ retro.insight }}</p>
            </div>

            <div class="retro-footer">
              <span v-if="retro.moodAfter" class="retro-mood">
                完成后心情: {{ moodOptions.find(m => m.value === retro.moodAfter)?.label || retro.moodAfter }}
              </span>
              <span class="retro-date">{{ formatDate(retro.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'stats'" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card glass-card large">
          <div class="stat-header">
            <Coins class="stat-icon large" />
            <span class="stat-label">星币余额</span>
          </div>
          <div class="stat-value large">{{ coinInfo?.balance || 0 }}</div>
          <div class="stat-sub">累计获得 {{ coinInfo?.totalEarned || 0 }} 星币</div>
        </div>
        
        <div class="stat-card glass-card large">
          <div class="stat-header">
            <Trophy class="stat-icon large" />
            <span class="stat-label">完成委托</span>
          </div>
          <div class="stat-value large">{{ stats?.totalCompleted || 0 }}</div>
          <div class="stat-sub">进行中 {{ stats?.acceptedCount || 0 }} 个</div>
        </div>
        
        <div class="stat-card glass-card large">
          <div class="stat-header">
            <BookOpenCheck class="stat-icon large" />
            <span class="stat-label">复盘数量</span>
          </div>
          <div class="stat-value large">{{ stats?.retroCount || 0 }}</div>
          <div class="stat-sub">记录成长的足迹</div>
        </div>
      </div>

      <div v-if="stats?.typeStats?.length > 0" class="type-stats-section glass-card">
        <h3 class="section-title"><TrendingUp class="section-icon" /> 委托类型分布</h3>
        <div class="type-stats-list">
          <div 
            v-for="typeStat in stats.typeStats" 
            :key="typeStat.type"
            class="type-stat-item"
          >
            <span class="type-name">{{ getTypeLabel(typeStat.type) }}</span>
            <div class="type-bar-container">
              <div 
                class="type-bar" 
                :style="{ width: (typeStat.count / Math.max(...stats.typeStats.map(t => t.count)) * 100) + '%' }"
              ></div>
            </div>
            <span class="type-count">{{ typeStat.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showRetroModal" class="modal-overlay" @click.self="showRetroModal = false">
        <div class="modal-content glass-card">
          <div class="modal-header">
            <h3>写下复盘</h3>
            <button class="close-btn" @click="showRetroModal = false">
              <X class="close-icon" />
            </button>
          </div>
          
          <div class="modal-body">
            <div class="retro-commission-info">
              <span class="info-label">委托:</span>
              <span class="info-value">{{ selectedCommission?.title }}</span>
            </div>
            
            <div class="form-group">
              <label class="form-label">复盘内容 *</label>
              <textarea 
                v-model="retroContent"
                class="form-textarea"
                placeholder="完成这个委托后，你有什么感受和收获？"
                rows="5"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">完成后的心情</label>
              <div class="mood-selector">
                <button 
                  v-for="mood in moodOptions"
                  :key="mood.value"
                  class="mood-option"
                  :class="{ selected: retroMood === mood.value }"
                  :style="{ borderColor: retroMood === mood.value ? mood.color : 'transparent' }"
                  @click="retroMood = mood.value"
                >
                  <span class="mood-dot" :style="{ background: mood.color }"></span>
                  <span>{{ mood.label }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">感悟/收获</label>
              <textarea 
                v-model="retroInsight"
                class="form-textarea"
                placeholder="有什么特别的感悟或收获吗？（选填）"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">满意度评分</label>
              <div class="rating-stars">
                <Star 
                  v-for="i in 5" 
                  :key="i" 
                  class="rating-star"
                  :class="{ filled: i <= (hoverRating || retroRating) }"
                  @mouseenter="hoverRating = i"
                  @mouseleave="hoverRating = 0"
                  @click="setRating(i)"
                />
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showRetroModal = false">取消</button>
            <button class="btn-primary" @click="submitRetrospective">提交复盘</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.wish-commission-page {
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 2rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  width: 36px;
  height: 36px;
  color: var(--color-secondary);
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 1rem;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  width: 32px;
  height: 32px;
  color: var(--color-secondary);
}

.stat-card.star-coin-stat .stat-icon {
  color: var(--color-gold);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
  position: relative;
  
  &:hover {
    color: var(--color-text);
  }
  
  &.active {
    color: var(--color-secondary);
    border-bottom-color: var(--color-secondary);
  }
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-badge {
  background: var(--color-error);
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.filter-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(232, 180, 217, 0.3), rgba(123, 163, 201, 0.3));
    color: var(--color-secondary);
    border-color: var(--color-secondary);
  }
}

.commission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.commission-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(232, 180, 217, 0.2);
  }
  
  &.accepted {
    opacity: 0.7;
    
    &:hover {
      transform: none;
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon {
  width: 28px;
  height: 28px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 4px;
  font-family: var(--font-display);
}

.card-type {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.difficulty-badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.card-description {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.6;
  margin-bottom: 16px;
  flex: 1;
}

.card-rewards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.reward-icon {
  width: 16px;
  height: 16px;
  color: var(--color-gold);
  
  &.small {
    width: 14px;
    height: 14px;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.target-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.target-icon {
  width: 14px;
  height: 14px;
}

.accept-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 20px;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  color: var(--color-bg-dark);
  font-weight: 600;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 180, 217, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.accepted {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text-muted);
  }
}

.btn-arrow {
  width: 16px;
  height: 16px;
}

.my-commissions-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  
  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25rem;
    font-family: var(--font-display);
  }
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary);
}

.count-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.my-commission-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.my-commission-card {
  padding: 20px 24px;
  
  &.completed {
    border-color: rgba(74, 222, 128, 0.3);
  }
  
  &.claimed {
    opacity: 0.85;
  }
}

.commission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.commission-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  
  h4 {
    font-size: 1.0625rem;
    font-weight: 600;
    font-family: var(--font-display);
  }
}

.status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  
  &.status-accepted {
    background: rgba(96, 165, 250, 0.2);
    color: #60A5FA;
  }
  
  &.status-completed {
    background: rgba(74, 222, 128, 0.2);
    color: #4ADE80;
  }
  
  &.status-claimed {
    background: rgba(212, 175, 55, 0.2);
    color: var(--color-gold);
  }
  
  &.status-expired {
    background: rgba(248, 113, 113, 0.2);
    color: var(--color-error);
  }
}

.commission-type {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.progress-section {
  margin-bottom: 16px;
}

.progress-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.commission-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reward-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  
  &.highlight {
    color: var(--color-gold);
    font-weight: 500;
  }
}

.deadline-text {
  font-size: 0.8125rem;
  color: var(--color-error);
}

.completion-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(74, 222, 128, 0.1);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  color: #4ADE80;
  font-size: 0.9375rem;
}

.check-icon {
  width: 20px;
  height: 20px;
}

.claim-btn {
  padding: 8px 24px;
  background: linear-gradient(135deg, #4ADE80, #22C55E);
  color: var(--color-bg-dark);
  font-weight: 600;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(74, 222, 128, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.claimed-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.claimed-reward {
  color: var(--color-gold);
}

.retro-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: var(--color-secondary);
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-muted);
  
  &.small {
    padding: 40px 20px;
  }
  
  p {
    margin-bottom: 8px;
  }
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.7;
}

.retrospective-section {
  .section-header {
    margin-bottom: 20px;
  }
}

.retrospective-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.retrospective-card {
  padding: 24px;
}

.retro-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.retro-title {
  h4 {
    font-size: 1.0625rem;
    font-weight: 600;
    margin-bottom: 4px;
    font-family: var(--font-display);
  }
}

.retro-type {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.retro-rating {
  display: flex;
  gap: 4px;
}

.star-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.2);
  
  &.filled {
    color: var(--color-gold);
    fill: var(--color-gold);
  }
}

.retro-content {
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

.retro-insight {
  padding: 12px 16px;
  background: rgba(232, 180, 217, 0.1);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  
  .insight-label {
    font-weight: 500;
    color: var(--color-secondary);
    display: block;
    margin-bottom: 4px;
  }
  
  p {
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
    line-height: 1.6;
  }
}

.retro-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.retro-mood {
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card.large {
  flex-direction: column;
  align-items: flex-start;
  padding: 28px;
  
  .stat-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  
  .stat-icon.large {
    width: 36px;
    height: 36px;
  }
  
  .stat-label {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
  }
  
  .stat-value.large {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  
  .stat-sub {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
}

.type-stats-section {
  padding: 28px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
  margin-bottom: 20px;
  font-family: var(--font-display);
}

.type-stats-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.type-name {
  width: 120px;
  flex-shrink: 0;
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
}

.type-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.type-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary), var(--color-accent));
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.type-count {
  width: 40px;
  text-align: right;
  font-weight: 600;
  color: var(--color-text);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    font-size: 1.25rem;
    font-family: var(--font-display);
  }
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  padding: 8px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.retro-commission-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(232, 180, 217, 0.1);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.info-label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.info-value {
  color: var(--color-secondary);
  font-weight: 500;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  color: var(--color-text);
}

.form-textarea {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: var(--font-body);
  resize: vertical;
  transition: all var(--transition-fast);
  
  &::placeholder {
    color: var(--color-text-muted);
  }
  
  &:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px rgba(232, 180, 217, 0.2);
    outline: none;
  }
}

.mood-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mood-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  &.selected {
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-text);
  }
}

.mood-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.rating-stars {
  display: flex;
  gap: 8px;
}

.rating-star {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    transform: scale(1.1);
  }
  
  &.filled {
    color: var(--color-gold);
    fill: var(--color-gold);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }
  
  .header-stats {
    width: 100%;
    
    .stat-card {
      flex: 1;
    }
  }
  
  .tabs {
    overflow-x: auto;
    padding-bottom: 0;
  }
  
  .tab-btn {
    padding: 10px 16px;
    font-size: 0.875rem;
    white-space: nowrap;
  }
  
  .commission-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-bar {
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .type-name {
    width: 100px;
    font-size: 0.875rem;
  }
}
</style>
