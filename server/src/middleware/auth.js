const jwt = require('koa-jwt');
const { JWT_SECRET } = process.env;

const authMiddleware = jwt({
  secret: JWT_SECRET,
  passthrough: false
});

const optionalAuthMiddleware = jwt({
  secret: JWT_SECRET,
  passthrough: true
});

const getCurrentUser = (ctx) => {
  return ctx.state.user || null;
};

const requireAuth = async (ctx, next) => {
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
  await next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  getCurrentUser,
  requireAuth
};
