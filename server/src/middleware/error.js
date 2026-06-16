const errorHandler = async (ctx, next) => {
  try {
    await next();
    
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = {
        code: 404,
        message: '请求的资源不存在',
        data: null
      };
    }
  } catch (error) {
    console.error('错误捕获:', error);
    
    if (error.name === 'JsonWebTokenError') {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '无效的 Token',
        data: null
      };
    } else if (error.name === 'TokenExpiredError') {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: 'Token 已过期',
        data: null
      };
    } else if (error.status === 401) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: error.message || '未授权访问',
        data: null
      };
    } else {
      ctx.status = error.status || 500;
      ctx.body = {
        code: ctx.status,
        message: error.message || '服务器内部错误',
        data: null
      };
    }
  }
};

const responseFormatter = async (ctx, next) => {
  await next();
  
  if (ctx.body && !ctx.body.code) {
    ctx.body = {
      code: ctx.status,
      message: 'success',
      data: ctx.body
    };
  }
};

module.exports = {
  errorHandler,
  responseFormatter
};
