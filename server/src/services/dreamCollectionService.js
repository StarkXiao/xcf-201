const dreamCollectionRepository = require('../repositories/dreamCollectionRepository');
const achievementRepository = require('../repositories/achievementRepository');
const achievementService = require('./achievementService');

class DreamCollectionService {
  getOverview(userId) {
    return dreamCollectionRepository.getCollectionOverview(userId);
  }

  createEmotionFragment(userId, data) {
    const fragment = dreamCollectionRepository.createEmotionFragment(userId, {
      sourceType: data.sourceType || 'mood',
      sourceId: data.sourceId || null,
      emotionType: data.emotionType,
      title: data.title,
      content: data.content,
      moodColor: data.moodColor || null,
      tags: data.tags || null
    });

    this.updateCollectionGoals(userId, 'fragment');
    achievementRepository.checkAndUnlock(userId, 'collection_fragments', 
      dreamCollectionRepository.getEmotionFragmentCount(userId));
    achievementService.updateTaskProgress(userId, 'collection_fragment', 1);

    return fragment;
  }

  getEmotionFragments(userId, filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const fragments = dreamCollectionRepository.getEmotionFragments(userId, {
      ...filters,
      limit: pageSize,
      offset
    });

    const total = dreamCollectionRepository.getEmotionFragmentCount(userId, filters);

    return {
      fragments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  updateEmotionFragment(userId, fragmentId, data) {
    return dreamCollectionRepository.updateEmotionFragment(fragmentId, data);
  }

  deleteEmotionFragment(userId, fragmentId) {
    return dreamCollectionRepository.deleteEmotionFragment(fragmentId);
  }

  starEmotionFragment(userId, fragmentId, isStarred) {
    return dreamCollectionRepository.updateEmotionFragment(fragmentId, { isStarred });
  }

  getEmotionTypeStats(userId) {
    return dreamCollectionRepository.getEmotionTypeStats(userId);
  }

  unlockStoryCard(userId, data) {
    const existing = dreamCollectionRepository.getStoryCardByUserAndStory(userId, data.storyId);
    if (existing) return existing;

    const card = dreamCollectionRepository.createStoryCard(userId, {
      roomId: data.roomId,
      storyId: data.storyId,
      cardType: data.cardType || 'chapter',
      title: data.title,
      excerpt: data.excerpt || null,
      roomName: data.roomName || null,
      branchLabel: data.branchLabel || null,
      moodTheme: data.moodTheme || null
    });

    this.updateCollectionGoals(userId, 'story_card');
    achievementRepository.checkAndUnlock(userId, 'collection_story_cards',
      dreamCollectionRepository.getStoryCardCount(userId));
    achievementService.updateTaskProgress(userId, 'collection_story_card', 1);

    return card;
  }

  getStoryCards(userId, filters = {}) {
    const cards = dreamCollectionRepository.getStoryCards(userId, filters);
    const roomStats = dreamCollectionRepository.getStoryCardRoomStats(userId);
    const totalCount = dreamCollectionRepository.getStoryCardCount(userId);

    return {
      cards,
      roomStats,
      totalCount
    };
  }

  deleteStoryCard(userId, cardId) {
    return dreamCollectionRepository.deleteStoryCard(cardId);
  }

  createHighlight(userId, data) {
    const highlight = dreamCollectionRepository.createHighlight(userId, {
      sourceType: data.sourceType || 'story',
      sourceId: data.sourceId || null,
      roomId: data.roomId || null,
      title: data.title,
      content: data.content,
      highlightNote: data.highlightNote || null,
      moodTag: data.moodTag || null
    });

    this.updateCollectionGoals(userId, 'highlight');
    achievementRepository.checkAndUnlock(userId, 'collection_highlights',
      dreamCollectionRepository.getHighlightCount(userId));
    achievementService.updateTaskProgress(userId, 'collection_highlight', 1);

    return highlight;
  }

  getHighlights(userId, filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const highlights = dreamCollectionRepository.getHighlights(userId, {
      ...filters,
      limit: pageSize,
      offset
    });

    const total = dreamCollectionRepository.getHighlightCount(userId, filters);

    return {
      highlights,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  updateHighlight(userId, highlightId, data) {
    return dreamCollectionRepository.updateHighlight(highlightId, data);
  }

  deleteHighlight(userId, highlightId) {
    return dreamCollectionRepository.deleteHighlight(highlightId);
  }

  favoriteHighlight(userId, highlightId, isFavorite) {
    return dreamCollectionRepository.updateHighlight(highlightId, { isFavorite });
  }

  getGoals(userId, filters = {}) {
    const goals = dreamCollectionRepository.getGoals(userId, filters);

    return goals.map(goal => ({
      ...goal,
      progressPercent: goal.target_value > 0
        ? Math.min(100, Math.round((goal.current_progress / goal.target_value) * 100))
        : 0
    }));
  }

  createGoal(userId, data) {
    const goal = dreamCollectionRepository.createGoal(userId, {
      goalType: data.goalType,
      title: data.title,
      description: data.description || null,
      targetValue: data.targetValue || 1,
      relatedAchievementId: data.relatedAchievementId || null
    });

    return goal;
  }

  deleteGoal(userId, goalId) {
    return dreamCollectionRepository.deleteGoal(goalId);
  }

  updateCollectionGoals(userId, activityType) {
    const goals = dreamCollectionRepository.getGoals(userId, { isCompleted: false });

    const goalTypeMap = {
      'fragment': 'fragment_collection',
      'story_card': 'story_card_collection',
      'highlight': 'highlight_collection'
    };

    const mappedType = goalTypeMap[activityType];

    goals.forEach(goal => {
      if (goal.goal_type === mappedType || goal.goal_type === 'comprehensive_collection') {
        let newProgress = goal.current_progress + 1;
        if (newProgress > goal.target_value) {
          newProgress = goal.target_value;
        }
        dreamCollectionRepository.updateGoalProgress(goal.id, newProgress);

        if (newProgress >= goal.target_value && goal.related_achievement_id) {
          achievementRepository.checkAndUnlock(userId, 'collection_goal_completed',
            dreamCollectionRepository.getCollectionOverview(userId).completedGoalCount + 1);
        }
      }
    });
  }

  initializeDefaultGoals(userId) {
    const existingGoals = dreamCollectionRepository.getGoals(userId);
    if (existingGoals.length > 0) return existingGoals;

    const defaultGoals = [
      {
        goalType: 'fragment_collection',
        title: '情感收藏家',
        description: '收集 10 个情绪片段，记录你情绪世界的多彩面貌',
        targetValue: 10
      },
      {
        goalType: 'story_card_collection',
        title: '故事考古者',
        description: '解锁 15 张房间故事卡，拼凑梦境旅馆的完整图景',
        targetValue: 15
      },
      {
        goalType: 'highlight_collection',
        title: '高光猎手',
        description: '收藏 10 个高光内容，留住每一个闪光的瞬间',
        targetValue: 10
      },
      {
        goalType: 'comprehensive_collection',
        title: '梦境收藏大师',
        description: '完成所有收藏目标，成为梦境旅馆的终极收藏家',
        targetValue: 35
      }
    ];

    const goals = defaultGoals.map(g =>
      dreamCollectionRepository.createGoal(userId, g)
    );

    return goals;
  }
}

module.exports = new DreamCollectionService();
