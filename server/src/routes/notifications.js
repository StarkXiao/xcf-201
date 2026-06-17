const Router = require('koa-router');
const notificationService = require('../services/notificationService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/notifications' });

router.get('/unread', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { limit } = ctx.query;

  const notifications = notificationService.getUnread(
    user.userId,
    limit ? parseInt(limit) : 50
  );
  const unreadCount = notificationService.getUnreadCount(user.userId);

  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      notifications,
      unreadCount
    }
  };
});

router.get('/', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { limit, offset, includeRead, includeDismissed } = ctx.query;

  const notifications = notificationService.getAll(user.userId, {
    limit: limit ? parseInt(limit) : 50,
    offset: offset ? parseInt(offset) : 0,
    includeRead: includeRead === 'true' || includeRead === undefined,
    includeDismissed: includeDismissed === 'true' || includeDismissed === undefined
  });
  const unreadCount = notificationService.getUnreadCount(user.userId);

  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      notifications,
      unreadCount
    }
  };
});

router.get('/unread-count', async (ctx) => {
  const user = getCurrentUser(ctx);
  const count = notificationService.getUnreadCount(user.userId);

  ctx.body = {
    code: 200,
    message: 'success',
    data: { unreadCount: count }
  };
});

router.post('/:id/read', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;

  const success = notificationService.markAsRead(user.userId, parseInt(id));

  ctx.body = {
    code: 200,
    message: success ? '已标记为已读' : '标记失败',
    data: { success }
  };
});

router.post('/read-all', async (ctx) => {
  const user = getCurrentUser(ctx);

  const count = notificationService.markAllAsRead(user.userId);

  ctx.body = {
    code: 200,
    message: `已将 ${count} 条通知标记为已读`,
    data: { updatedCount: count }
  };
});

router.post('/:id/dismiss', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;

  const success = notificationService.dismiss(user.userId, parseInt(id));

  ctx.body = {
    code: 200,
    message: success ? '通知已清除' : '清除失败',
    data: { success }
  };
});

router.delete('/old', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { days = 30 } = ctx.query;

  const deleted = notificationService.clearOld(user.userId, parseInt(days));

  ctx.body = {
    code: 200,
    message: `已清理 ${deleted} 条旧通知`,
    data: { deletedCount: deleted }
  };
});

module.exports = router;
