require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const Router = require('koa-router');

const { errorHandler, responseFormatter } = require('./src/middleware/error');
const { authMiddleware } = require('./src/middleware/auth');

const PORT = process.env.PORT || 3000;

const app = new Koa();
const router = new Router();

app.use(cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '10mb'
}));

app.use(errorHandler);

app.use(async (ctx, next) => {
  console.log(`[${new Date().toLocaleString()}] ${ctx.method} ${ctx.url}`);
  await next();
  console.log(`[${new Date().toLocaleString()}] ${ctx.method} ${ctx.url} - ${ctx.status}`);
});

router.get('/', async (ctx) => {
  ctx.body = {
    name: '梦境旅馆 API',
    version: '1.0.0',
    description: '心情记录与剧情探索应用后端服务',
    endpoints: {
      auth: '/api/auth/*',
      moods: '/api/moods/*',
      rooms: '/api/rooms/*',
      tasks: '/api/tasks/*',
      achievements: '/api/achievements/*',
      profile: '/api/profile/*',
      prescriptions: '/api/prescriptions/*',
      dreamCollection: '/api/dream-collection/*',
      wishCommissions: '/api/wish-commissions/*',
      crisisCenter: '/api/crisis-center/*',
      healingMap: '/api/healing-map/*'
    }
  };
});

router.get('/api/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});

const authRoutes = require('./src/routes/auth');
const moodRoutes = require('./src/routes/moods');
const roomRoutes = require('./src/routes/rooms');
const achievementRoutes = require('./src/routes/achievements');
const retrospectiveRoutes = require('./src/routes/retrospectives');
const prescriptionRoutes = require('./src/routes/emotionPrescriptions');
const dreamCollectionRoutes = require('./src/routes/dreamCollections');
const companionRoutes = require('./src/routes/companions');
const wishCommissionRoutes = require('./src/routes/wishCommissions');
const crisisCenterRoutes = require('./src/routes/crisisCenter');
const memoryLetterRoutes = require('./src/routes/memoryLetters');
const notificationRoutes = require('./src/routes/notifications');
const moodLabRoutes = require('./src/routes/moodLabs');
const healingMapRoutes = require('./src/routes/healingMap');
const memoryLetterService = require('./src/services/memoryLetterService');

const publicRouter = new Router();
publicRouter.get('/api/auth/login', async (ctx) => {
  ctx.body = { message: '请使用 POST 方法登录' };
});

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

app.use(authMiddleware.unless({
  path: [
    /^\/$/,
    /^\/api\/health$/,
    /^\/api\/auth\/login$/,
    /^\/api\/auth\/register$/,
    /^\/api\/prescriptions\/config$/
  ]
}));

app.use(responseFormatter);

app.use(router.routes());
app.use(router.allowedMethods());
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());
app.use(moodRoutes.routes());
app.use(moodRoutes.allowedMethods());
app.use(roomRoutes.routes());
app.use(roomRoutes.allowedMethods());
app.use(achievementRoutes.routes());
app.use(achievementRoutes.allowedMethods());
app.use(retrospectiveRoutes.routes());
app.use(retrospectiveRoutes.allowedMethods());
app.use(prescriptionRoutes.routes());
app.use(prescriptionRoutes.allowedMethods());
app.use(dreamCollectionRoutes.routes());
app.use(dreamCollectionRoutes.allowedMethods());
app.use(companionRoutes.routes());
app.use(companionRoutes.allowedMethods());
app.use(wishCommissionRoutes.routes());
app.use(wishCommissionRoutes.allowedMethods());
app.use(crisisCenterRoutes.routes());
app.use(crisisCenterRoutes.allowedMethods());
app.use(memoryLetterRoutes.routes());
app.use(memoryLetterRoutes.allowedMethods());
app.use(notificationRoutes.routes());
app.use(notificationRoutes.allowedMethods());
app.use(moodLabRoutes.routes());
app.use(moodLabRoutes.allowedMethods());
app.use(healingMapRoutes.routes());
app.use(healingMapRoutes.allowedMethods());

const lastCheckedUsers = new Map();
const CHECK_COOLDOWN_MS = 5 * 60 * 1000;

app.use(async (ctx, next) => {
  await next();

  if (ctx.state && ctx.state.user && ctx.state.user.userId) {
    const userId = ctx.state.user.userId;
    const now = Date.now();
    const lastChecked = lastCheckedUsers.get(userId) || 0;

    if (now - lastChecked > CHECK_COOLDOWN_MS) {
      lastCheckedUsers.set(userId, now);
      try {
        setImmediate(() => {
          memoryLetterService.checkAndDeliverLetters(userId);
        });
      } catch (e) {
        // ignore async error
      }
    }
  }
});

function startScheduler() {
  const INTERVAL_MS = 30 * 60 * 1000;
  console.log(`[Scheduler] 信件投递定时任务已启动，每 ${INTERVAL_MS / 60000} 分钟执行一次`);

  setInterval(() => {
    try {
      console.log(`[Scheduler] [${new Date().toLocaleString()}] 开始全局信件投递检查...`);
      const result = memoryLetterService.checkAndDeliverLetters(null);
      if (result.deliveredCount > 0) {
        console.log(`[Scheduler] 本次送达 ${result.deliveredCount} 封信件，涉及用户 ${Object.keys(result.deliveredByUser).length} 人`);
      } else {
        console.log('[Scheduler] 本次检查无待送达信件');
      }
    } catch (e) {
      console.error('[Scheduler] 全局信件投递检查出错:', e);
    }
  }, INTERVAL_MS);

  setTimeout(() => {
    try {
      console.log('[Scheduler] 服务启动后首次全局信件投递检查...');
      const result = memoryLetterService.checkAndDeliverLetters(null);
      if (result.deliveredCount > 0) {
        console.log(`[Scheduler] 启动检查送达 ${result.deliveredCount} 封信件`);
      }
    } catch (e) {
      console.error('[Scheduler] 启动信件投递检查出错:', e);
    }
  }, 5000);
}

startScheduler();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║       🌙 梦境旅馆后端服务启动成功 🌙                        ║
  ║                                                          ║
  ║       服务地址: http://localhost:${PORT}                     ║
  ║       健康检查: http://localhost:${PORT}/api/health          ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
