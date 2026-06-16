const Router = require('koa-router');
const emotionPrescriptionService = require('../services/emotionPrescriptionService');
const { getCurrentUser } = require('../middleware/auth');

const router = new Router({ prefix: '/api/prescriptions' });

router.get('/config', async (ctx) => {
  const config = emotionPrescriptionService.getConfig();
  ctx.body = {
    code: 200,
    message: 'success',
    data: config
  };
});

router.get('/latest', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { periodType = 'weekly' } = ctx.query;

  const result = emotionPrescriptionService.getLatestPrescription(user.userId, periodType);

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.get('/list', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { periodType = 'weekly', limit = 12 } = ctx.query;

  const result = emotionPrescriptionService.getPrescriptionList(
    user.userId,
    periodType,
    parseInt(limit)
  );

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/generate/weekly', async (ctx) => {
  const user = getCurrentUser(ctx);

  const result = emotionPrescriptionService.generateWeeklyPrescription(user.userId);

  ctx.body = {
    code: 200,
    message: '周处方笺生成成功',
    data: result
  };
});

router.post('/generate/daily', async (ctx) => {
  const user = getCurrentUser(ctx);

  const result = emotionPrescriptionService.generateDailyPrescription(user.userId);

  ctx.body = {
    code: 200,
    message: '日处方笺生成成功',
    data: result
  };
});

router.post('/:id/view', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { id } = ctx.params;

  const result = emotionPrescriptionService.viewPrescription(user.userId, parseInt(id));

  if (!result) {
    ctx.status = 404;
    ctx.body = {
      code: 404,
      message: '处方笺不存在'
    };
    return;
  }

  ctx.body = {
    code: 200,
    message: '查看成功',
    data: result
  };
});

router.get('/archives', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { archiveType, limit = 12 } = ctx.query;

  let result;
  if (archiveType) {
    result = emotionPrescriptionService.getArchiveList(
      user.userId,
      archiveType,
      parseInt(limit)
    );
  } else {
    result = emotionPrescriptionService.getAllArchives(user.userId, parseInt(limit));
  }

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  };
});

router.post('/archives/generate/monthly', async (ctx) => {
  const user = getCurrentUser(ctx);
  const { year, month } = ctx.request.body;

  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1);

  const result = emotionPrescriptionService.generateMonthlyArchive(
    user.userId,
    targetYear,
    targetMonth
  );

  ctx.body = {
    code: 200,
    message: '月度档案生成成功',
    data: result
  };
});

module.exports = router;
