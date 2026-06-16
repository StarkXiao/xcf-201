const Router = require('koa-router');
const retrospectiveService = require('../services/retrospectiveService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/retrospectives' });

router.get('/config', async (ctx) => {
  const config = retrospectiveService.getConfig();
  ctx.body = {
    code: 200,
    message: 'success',
    data: config
  };
});

router.post('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { moodId, recordDate, timeSegment, retrospectType, content, moodShift, tags } = ctx.request.body;
  
  const result = retrospectiveService.createRetrospective(
    user.userId,
    { moodId, recordDate, timeSegment, retrospectType, content, moodShift, tags }
  );
  
  ctx.body = {
    code: 200,
    message: '回顾创建成功',
    data: result
  };
});

router.get('/date/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const result = retrospectiveService.getRetrospectivesByDate(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/month', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { year, month } = ctx.query;
  
  const result = retrospectiveService.getMonthRetrospectives(user.userId, year, month);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.delete('/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;
  
  const result = retrospectiveService.deleteRetrospective(user.userId, parseInt(id));
  
  ctx.body = {
    code: 200,
    message: result.success ? '删除成功' : '删除失败',
    data: result
  };
});

module.exports = router;
