const Router = require('koa-router');
const dreamCollectionService = require('../services/dreamCollectionService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api' });

router.get('/dream-collection/overview', async (ctx) => {
  const user = getCurrentUser(ctx);
  const overview = dreamCollectionService.getOverview(user.userId);

  ctx.body = {
    code: 200,
    message: 'success',
    data: overview
  };
});

router.get('/dream-collection/fragments', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { emotionType, sourceType, isStarred, keyword, page, pageSize } = ctx.query;

  const result = dreamCollectionService.getEmotionFragments(user.userId, {
    emotionType: emotionType || undefined,
    sourceType: sourceType || undefined,
    isStarred: isStarred !== undefined ? isStarred === 'true' : undefined,
    keyword: keyword || undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20
  });

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/dream-collection/fragments', async (ctx) => {
  const user = getCurrentUser(ctx);
  const data = ctx.request.body;

  try {
    const fragment = dreamCollectionService.createEmotionFragment(user.userId, data);

    ctx.body = {
      code: 200,
      message: '情绪片段收藏成功',
      data: fragment
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.put('/dream-collection/fragments/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const fragmentId = parseInt(ctx.params.id);
  const data = ctx.request.body;

  const result = dreamCollectionService.updateEmotionFragment(user.userId, fragmentId, data);

  if (result) {
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result
    };
  } else {
    ctx.body = {
      code: 404,
      message: '片段不存在',
      data: null
    };
  }
});

router.delete('/dream-collection/fragments/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const fragmentId = parseInt(ctx.params.id);

  const success = dreamCollectionService.deleteEmotionFragment(user.userId, fragmentId);

  ctx.body = {
    code: success ? 200 : 404,
    message: success ? '删除成功' : '片段不存在',
    data: null
  };
});

router.post('/dream-collection/fragments/:id/star', async (ctx) => {
  const user = getCurrentUser(ctx);
  const fragmentId = parseInt(ctx.params.id);
  const { isStarred } = ctx.request.body;

  const result = dreamCollectionService.starEmotionFragment(user.userId, fragmentId, isStarred);

  ctx.body = {
    code: result ? 200 : 404,
    message: result ? '操作成功' : '片段不存在',
    data: result
  };
});

router.get('/dream-collection/fragments/stats', async (ctx) => {
  const user = getCurrentUser(ctx);
  const stats = dreamCollectionService.getEmotionTypeStats(user.userId);

  ctx.body = {
    code: 200,
    message: 'success',
    data: stats
  };
});

router.get('/dream-collection/story-cards', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { roomId, cardType, moodTheme } = ctx.query;

  const result = dreamCollectionService.getStoryCards(user.userId, {
    roomId: roomId ? parseInt(roomId) : undefined,
    cardType: cardType || undefined,
    moodTheme: moodTheme || undefined
  });

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/dream-collection/story-cards/unlock', async (ctx) => {
  const user = getCurrentUser(ctx);
  const data = ctx.request.body;

  try {
    const card = dreamCollectionService.unlockStoryCard(user.userId, data);

    ctx.body = {
      code: 200,
      message: '故事卡解锁成功',
      data: card
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.delete('/dream-collection/story-cards/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const cardId = parseInt(ctx.params.id);

  const success = dreamCollectionService.deleteStoryCard(user.userId, cardId);

  ctx.body = {
    code: success ? 200 : 404,
    message: success ? '删除成功' : '故事卡不存在',
    data: null
  };
});

router.get('/dream-collection/highlights', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { sourceType, moodTag, isFavorite, keyword, page, pageSize } = ctx.query;

  const result = dreamCollectionService.getHighlights(user.userId, {
    sourceType: sourceType || undefined,
    moodTag: moodTag || undefined,
    isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
    keyword: keyword || undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20
  });

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/dream-collection/highlights', async (ctx) => {
  const user = getCurrentUser(ctx);
  const data = ctx.request.body;

  try {
    const highlight = dreamCollectionService.createHighlight(user.userId, data);

    ctx.body = {
      code: 200,
      message: '高光收藏成功',
      data: highlight
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.put('/dream-collection/highlights/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const highlightId = parseInt(ctx.params.id);
  const data = ctx.request.body;

  const result = dreamCollectionService.updateHighlight(user.userId, highlightId, data);

  if (result) {
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result
    };
  } else {
    ctx.body = {
      code: 404,
      message: '高光不存在',
      data: null
    };
  }
});

router.delete('/dream-collection/highlights/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const highlightId = parseInt(ctx.params.id);

  const success = dreamCollectionService.deleteHighlight(user.userId, highlightId);

  ctx.body = {
    code: success ? 200 : 404,
    message: success ? '删除成功' : '高光不存在',
    data: null
  };
});

router.post('/dream-collection/highlights/:id/favorite', async (ctx) => {
  const user = getCurrentUser(ctx);
  const highlightId = parseInt(ctx.params.id);
  const { isFavorite } = ctx.request.body;

  const result = dreamCollectionService.favoriteHighlight(user.userId, highlightId, isFavorite);

  ctx.body = {
    code: result ? 200 : 404,
    message: result ? '操作成功' : '高光不存在',
    data: result
  };
});

router.get('/dream-collection/goals', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { goalType, isCompleted } = ctx.query;

  const goals = dreamCollectionService.getGoals(user.userId, {
    goalType: goalType || undefined,
    isCompleted: isCompleted !== undefined ? isCompleted === 'true' : undefined
  });

  ctx.body = {
    code: 200,
    message: 'success',
    data: goals
  };
});

router.post('/dream-collection/goals', async (ctx) => {
  const user = getCurrentUser(ctx);
  const data = ctx.request.body;

  try {
    const goal = dreamCollectionService.createGoal(user.userId, data);

    ctx.body = {
      code: 200,
      message: '目标创建成功',
      data: goal
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.post('/dream-collection/goals/init', async (ctx) => {
  const user = getCurrentUser(ctx);

  const goals = dreamCollectionService.initializeDefaultGoals(user.userId);

  ctx.body = {
    code: 200,
    message: '默认目标初始化成功',
    data: goals
  };
});

router.delete('/dream-collection/goals/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const goalId = parseInt(ctx.params.id);

  const success = dreamCollectionService.deleteGoal(user.userId, goalId);

  ctx.body = {
    code: success ? 200 : 404,
    message: success ? '删除成功' : '目标不存在',
    data: null
  };
});

module.exports = router;
