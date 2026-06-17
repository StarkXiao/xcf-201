const Router = require('koa-router');
const healingMapService = require('../services/healingMapService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/healing-map' });

router.get('/overview', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = healingMapService.getOverview(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/stages', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = healingMapService.getStages(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/stages/:stageId', async (ctx) => {
  const user = getCurrentUser(ctx);
  const stageId = parseInt(ctx.params.stageId);
  
  try {
    const result = healingMapService.getStageDetail(user.userId, stageId);
    
    ctx.body = {
      code: 200,
      message: 'success',
      data: result
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.post('/stages/:stageId/claim', async (ctx) => {
  const user = getCurrentUser(ctx);
  const stageId = parseInt(ctx.params.stageId);
  
  try {
    const result = healingMapService.claimStageReward(user.userId, stageId);
    
    ctx.body = {
      code: result.success ? 200 : 400,
      message: result.message,
      data: result
    };
  } catch (error) {
    ctx.body = {
      code: 400,
      message: error.message,
      data: null
    };
  }
});

router.get('/journey', async (ctx) => {
  const user = getCurrentUser(ctx);
  const limit = parseInt(ctx.query.limit) || 50;
  
  const result = healingMapService.getJourney(user.userId, limit);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/milestones', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = healingMapService.getMilestones(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/unlocks', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = healingMapService.getUnlocks(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/progress/update', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { eventType, amount } = ctx.request.body;
  
  const result = healingMapService.updateProgress(user.userId, eventType, amount || 1);
  
  ctx.body = {
    code: 200,
    message: '进度更新成功',
    data: result
  };
});

module.exports = router;
