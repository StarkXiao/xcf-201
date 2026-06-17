const Router = require('koa-router');
const companionService = require('../services/companionService');
const companionConversationService = require('../services/companionConversationService');
const companionEventService = require('../services/companionEventService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/companions' });

router.get('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companions = companionService.getCompanionList(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: companions
  };
});

router.get('/active', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companion = companionService.getActiveCompanion(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: companion
  };
});

router.get('/:id', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const companion = companionService.getCompanionDetail(user.userId, companionId);
  
  if (!companion) {
    ctx.status = 404;
    ctx.body = { code: 404, message: '旅伴不存在', data: null };
    return;
  }

  ctx.body = {
    code: 200,
    message: 'success',
    data: companion
  };
});

router.post('/:id/activate', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const result = companionService.setActiveCompanion(user.userId, companionId);
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.message,
    data: result.companion
  };
});

router.post('/unlock/:templateId', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const templateId = parseInt(ctx.params.templateId);
  const { customName } = ctx.request.body || {};
  
  const result = companionService.unlockCompanion(user.userId, templateId, customName);
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.message,
    data: result.companion
  };
});

router.get('/:id/conversations', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const { limit = 50, offset = 0 } = ctx.query;
  
  const messages = companionConversationService.getConversation(
    user.userId, companionId,
    parseInt(limit), parseInt(offset)
  );
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: messages
  };
});

router.post('/:id/conversations', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const { content, context } = ctx.request.body || {};
  
  if (!content || !content.trim()) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '消息内容不能为空', data: null };
    return;
  }

  const result = await companionConversationService.sendMessage(
    user.userId, companionId, content.trim(), context
  );
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.success ? 'success' : result.message,
    data: result.success ? {
      userMessage: result.userMessage,
      companionMessage: result.companionMessage,
      intimacyGain: result.intimacyGain,
      expGain: result.expGain,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      companion: result.companion
    } : null
  };
});

router.delete('/:id/conversations', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const result = companionConversationService.clearConversation(user.userId, companionId);
  
  ctx.body = {
    code: 200,
    message: result.message,
    data: null
  };
});

router.post('/:id/greeting', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const { type = 'default' } = ctx.request.body || {};
  
  const greeting = companionConversationService.sendGreeting(
    user.userId, companionId, type
  );
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: greeting
  };
});

router.get('/:id/events', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const { type = 'available' } = ctx.query;
  
  let result;
  if (type === 'completed') {
    result = companionEventService.getCompletedEvents(user.userId, companionId);
  } else {
    result = companionEventService.getAvailableEvents(user.userId, companionId);
  }
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.success ? 'success' : result.message,
    data: result.data
  };
});

router.get('/:id/events/:eventId/trigger', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const eventId = parseInt(ctx.params.eventId);
  
  const result = companionEventService.triggerEvent(user.userId, companionId, eventId);
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.success ? 'success' : result.message,
    data: result.data
  };
});

router.post('/:id/events/:eventId/complete', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const companionId = parseInt(ctx.params.id);
  const eventId = parseInt(ctx.params.eventId);
  const { choiceId } = ctx.request.body || {};
  
  const result = companionEventService.completeEvent(
    user.userId, companionId, eventId, choiceId
  );
  
  ctx.body = {
    code: result.success ? 200 : 400,
    message: result.success ? 'success' : result.message,
    data: result.data
  };
});

router.get('/check/unlock', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未授权', data: null };
    return;
  }

  const newlyUnlocked = companionService.checkUnlockConditions(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: newlyUnlocked
  };
});

module.exports = router;
