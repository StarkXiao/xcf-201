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
  
  try {
    const result = achievementService.claimTaskReward(user.userId, taskId);
    
    ctx.body = {
      code: 200,
      message: result.success ? '奖励领取成功' : '奖励领取失败',
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

router.post('/tasks/progress/update', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { taskType, amount } = ctx.request.body;
  
  const result = achievementService.updateTaskProgress(user.userId, taskType, amount || 1);
  
  ctx.body = {
    code: 200,
    message: '任务进度更新成功',
    data: result
  };
});

router.get('/tasks/stats', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = achievementService.getTaskStats(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
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

router.get('/reminders', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = achievementService.getReminders(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
