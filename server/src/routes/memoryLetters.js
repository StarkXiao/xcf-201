const Router = require('koa-router');
const memoryLetterService = require('../services/memoryLetterService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/memory-letters' });

router.get('/config', async (ctx) => {
  const config = memoryLetterService.getConfig();
  ctx.body = {
    code: 200,
    message: 'success',
    data: config
  };
});

router.get('/stats', async (ctx) => {
  const user = getCurrentUser(ctx);
  const stats = memoryLetterService.getStats(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: stats
  };
});

router.get('/upcoming', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { limit } = ctx.query;
  
  const letters = memoryLetterService.getUpcomingDeliveries(
    user.userId,
    limit ? parseInt(limit) : 5
  );
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: letters
  };
});

router.get('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { status, page, pageSize } = ctx.query;
  
  const result = memoryLetterService.getLetters(user.userId, {
    status: status || null,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 10
  });
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;
  
  const letter = memoryLetterService.getLetterDetail(user.userId, parseInt(id));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: letter
  };
});

router.post('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const {
    title,
    letterContent,
    sourceDate,
    deliveryDate,
    includeMood,
    includeRoom,
    includeGrowth
  } = ctx.request.body;
  
  const result = memoryLetterService.createLetter(user.userId, {
    title,
    letterContent,
    sourceDate,
    deliveryDate,
    includeMood,
    includeRoom,
    includeGrowth
  });
  
  ctx.body = {
    code: 200,
    message: '信件创建成功',
    data: result
  };
});

router.post('/check-deliver', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = memoryLetterService.checkAndDeliverLetters(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/:id/read', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;
  
  const result = memoryLetterService.markAsRead(user.userId, parseInt(id));
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/:id/cancel', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;
  
  const result = memoryLetterService.cancelLetter(user.userId, parseInt(id));
  
  ctx.body = {
    code: 200,
    message: '信件已取消',
    data: result
  };
});

router.delete('/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;
  
  const result = memoryLetterService.deleteLetter(user.userId, parseInt(id));
  
  ctx.body = {
    code: 200,
    message: '信件已删除',
    data: result
  };
});

router.get('/snapshot/mood/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const snapshot = memoryLetterService.getMoodSnapshot(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: snapshot
  };
});

router.get('/snapshot/room/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const snapshot = memoryLetterService.getRoomSnapshot(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: snapshot
  };
});

router.get('/snapshot/growth/:date', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { date } = ctx.params;
  
  const snapshot = memoryLetterService.getGrowthSnapshot(user.userId, date);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: snapshot
  };
});

router.get('/source-dates/available', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const dates = memoryLetterService.getAvailableSourceDates(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: dates
  };
});

module.exports = router;
