const Router = require('koa-router');
const roomService = require('../services/roomService');
const chapterNoteService = require('../services/chapterNoteService');
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

router.post('/:id/notes', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  const { storyId, content, moodTags } = ctx.request.body;
  
  const result = chapterNoteService.createNote(
    user.userId,
    roomId,
    storyId,
    content,
    moodTags || []
  );
  
  ctx.body = {
    code: 200,
    message: '札记保存成功',
    data: result
  };
});

router.get('/:id/notes', async (ctx) => {
  const user = getCurrentUser(ctx);
  const roomId = parseInt(ctx.params.id);
  
  const result = chapterNoteService.getNotesByRoom(user.userId, roomId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/:id/notes/:storyId', async (ctx) => {
  const user = getCurrentUser(ctx);
  const storyId = parseInt(ctx.params.storyId);
  
  const note = chapterNoteService.getNoteByStoryId(user.userId, storyId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      note
    }
  };
});

router.delete('/notes/:noteId', async (ctx) => {
  const user = getCurrentUser(ctx);
  const noteId = parseInt(ctx.params.noteId);
  
  const result = chapterNoteService.deleteNote(user.userId, noteId);
  
  ctx.body = {
    code: 200,
    message: result.success ? '删除成功' : '删除失败',
    data: result
  };
});

router.get('/notes/my/list', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { page = 1, pageSize = 10 } = ctx.query;
  
  const pageNum = parseInt(page);
  const size = parseInt(pageSize);
  const offset = (pageNum - 1) * size;
  
  const result = chapterNoteService.getMyNotes(
    user.userId,
    size,
    offset
  );
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
