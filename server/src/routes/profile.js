const Router = require('koa-router');
const profileService = require('../services/profileService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/profile' });

router.get('/growth', async (ctx) => {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = {
      code: 401,
      message: '未授权，请先登录',
      data: null
    };
    return;
  }
  
  const growthProfile = profileService.getGrowthProfile(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: growthProfile
  };
});

module.exports = router;
