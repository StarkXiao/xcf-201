const Router = require('koa-router');
const roomService = require('../services/roomService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/rooms' });

router.get('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  
  const result = roomService.getRoomList(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  
  const result = roomService.getRoomDetail(user.userId, roomId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/:id/unlock', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  
  const result = roomService.unlockRoom(user.userId, roomId);
  
  ctx.body = {
    code: 200,
    message: result.message,
    data: result
  };
});

router.post('/:id/chapters/:chapter/read', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  const chapterNumber = parseInt(ctx.params.chapter);
  
  const result = roomService.readChapter(user.userId, roomId, chapterNumber);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
