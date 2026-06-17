const Router = require('koa-router');
const crisisCenterService = require('../services/crisisCenterService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/crisis-center' });

router.get('/analysis', async (ctx) => {
  const user = getCurrentUser(ctx);
  const result = crisisCenterService.getFullAnalysis(user.userId);
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

module.exports = router;
