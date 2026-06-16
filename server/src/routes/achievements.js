const Router = require('koa-router');
const achievementService = require('../services/achievementService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api' });

router.get('/tasks', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = achievementService.getTasks(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/tasks/:id/claim', async (ctx) => {
  const user = getCurrentUser(ctx);
  const taskId = parseInt(ctx.params.id);
  
  const result = achievementService.claimTaskReward(user.userId, taskId);
  
  ctx.body = {
    code: 200,
    message: result.success ? '奖励领取成功' : '奖励领取失败',
    data: result
  };
});

router.get('/achievements', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = achievementService.getAchievements(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
