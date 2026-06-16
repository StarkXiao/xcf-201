const Router = require('koa-router');
const authService = require('../services/authService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/auth' });

router.post('/register', async (ctx) => {
  const { username, email, password } = ctx.request.body;
  
  const result = await authService.register(username, email, password);
  
  ctx.body = {
    code: 200,
    message: '注册成功',
    data: result
  };
});

router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  
  const result = await authService.login(username, password);
  
  ctx.body = {
    code: 200,
    message: '登录成功',
    data: result
  };
});

router.get('/profile', async (ctx) => {
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
  
  const profile = authService.getProfile(user.userId);
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: profile
  };
});

module.exports = router;
