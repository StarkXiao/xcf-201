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
  const branchKey = ctx.query.branch || null;
  
  const result = roomService.getRoomDetail(user.userId, roomId, branchKey);
  
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
  const branchKey = ctx.request.body?.branch || null;
  
  const result = roomService.readChapter(user.userId, roomId, chapterNumber, branchKey);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:id/branches', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  
  const result = roomService.getAvailableBranches(user.userId, roomId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:id/branches/:branch', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  const branchKey = ctx.params.branch;
  
  const result = roomService.getBranchDetail(user.userId, roomId, branchKey);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/:id/branches/:branch/choose', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  const branchKey = ctx.params.branch;
  
  const result = roomService.chooseBranch(user.userId, roomId, branchKey);
  
  ctx.body = {
    code: 200,
    message: result.message,
    data: result
  };
});

router.get('/:id/history', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  
  const result = roomService.getStoryHistory(user.userId, roomId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/:id/jump/:storyId', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  const storyId = parseInt(ctx.params.storyId);
  
  const result = roomService.jumpToStory(user.userId, roomId, storyId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
