const Router = require('koa-router');
const moodLabService = require('../services/moodLabService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/mood-lab' });

router.get('/overview', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = moodLabService.getLabOverview(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = moodLabService.getTrendAnalysis(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/mood', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { months = 6 } = ctx.query;
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getMoodTrendStats(user.userId, parseInt(months));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/tags', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { days = 30 } = ctx.query;
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getTagStats(user.userId, parseInt(days));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/tags/:tag', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { tag } = ctx.params;
  const { days = 30 } = ctx.query;
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getTagTrend(user.userId, tag, parseInt(days));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/record-frequency', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { days = 90 } = ctx.query;
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getRecordFrequencyStats(user.userId, parseInt(days));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/story', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getStoryStats(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/trends/rewards', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { days = 30 } = ctx.query;
  
  const moodLabRepository = require('../repositories/moodLabRepository');
  const result = moodLabRepository.getRewardStats(user.userId, parseInt(days));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/clustering', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = moodLabService.getBehaviorClustering(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/quests', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = moodLabService.getPersonalizedQuests(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
