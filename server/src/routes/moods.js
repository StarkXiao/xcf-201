const Router = require('koa-router');
const moodService = require('../services/moodService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/moods' });

router.post('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date, moodType, content, tags } = ctx.request.body;
  
  const result = moodService.createMood(user.userId, date, moodType, content, tags);
  
  ctx.body = {
    code: 200,
    message: '心情记录成功',
    data: result
  };
});

router.get('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { year, month } = ctx.query;
  
  const result = moodService.getMoodsByMonth(user.userId, year, month);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const result = moodService.getMoodByDate(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.delete('/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const success = moodService.deleteMood(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: success ? '删除成功' : '删除失败',
    data: { success }
  };
});

module.exports = router;
