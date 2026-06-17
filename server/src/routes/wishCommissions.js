const Router = require('koa-router');
const router = new Router({ prefix: '/api/wish-commissions' });
const wishCommissionService = require('../services/wishCommissionService');

router.get('/templates', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { type, difficulty, limit, offset } = ctx.query;
    
    const params = {
      type: type || null,
      difficulty: difficulty || null,
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : null
    };
    
    const result = wishCommissionService.getCommissionTemplates(userId, params);
    
    ctx.body = {
      code: 200,
      message: '获取委托模板成功',
      data: result
    };
  } catch (error) {
    console.error('获取委托模板失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取委托模板失败'
    };
  }
});

router.get('/templates/types', async (ctx) => {
  try {
    const types = wishCommissionService.getCommissionTypes();
    
    ctx.body = {
      code: 200,
      message: '获取委托类型成功',
      data: types
    };
  } catch (error) {
    console.error('获取委托类型失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取委托类型失败'
    };
  }
});

router.get('/my', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { status, type, limit, offset } = ctx.query;
    
    const params = {
      status: status || null,
      type: type || null,
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : null
    };
    
    const commissions = wishCommissionService.getUserCommissions(userId, params);
    
    ctx.body = {
      code: 200,
      message: '获取我的委托成功',
      data: commissions
    };
  } catch (error) {
    console.error('获取我的委托失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取我的委托失败'
    };
  }
});

router.get('/my/stats', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const stats = wishCommissionService.getStats(userId);
    
    ctx.body = {
      code: 200,
      message: '获取委托统计成功',
      data: stats
    };
  } catch (error) {
    console.error('获取委托统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取委托统计失败'
    };
  }
});

router.get('/my/:id', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    
    const commissions = wishCommissionService.getUserCommissions(userId, { status: null });
    const commission = commissions.find(c => c.id === parseInt(id));
    
    if (!commission) {
      ctx.status = 404;
      ctx.body = {
        code: 404,
        message: '委托不存在'
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: '获取委托详情成功',
      data: commission
    };
  } catch (error) {
    console.error('获取委托详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取委托详情失败'
    };
  }
});

router.post('/accept/:templateId', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { templateId } = ctx.params;
    
    const commission = wishCommissionService.acceptCommission(userId, parseInt(templateId));
    
    ctx.body = {
      code: 200,
      message: '接取委托成功',
      data: commission
    };
  } catch (error) {
    console.error('接取委托失败:', error);
    ctx.status = 400;
    ctx.body = {
      code: 400,
      message: error.message || '接取委托失败'
    };
  }
});

router.post('/progress/update', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const result = wishCommissionService.updateAllCommissions(userId);
    
    ctx.body = {
      code: 200,
      message: '更新委托进度成功',
      data: result
    };
  } catch (error) {
    console.error('更新委托进度失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '更新委托进度失败'
    };
  }
});

router.post('/:id/claim', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    
    const result = wishCommissionService.claimReward(userId, parseInt(id));
    
    ctx.body = {
      code: 200,
      message: '领取奖励成功',
      data: result
    };
  } catch (error) {
    console.error('领取奖励失败:', error);
    ctx.status = 400;
    ctx.body = {
      code: 400,
      message: error.message || '领取奖励失败'
    };
  }
});

router.get('/coins/info', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const info = wishCommissionService.getStarCoinInfo(userId);
    
    ctx.body = {
      code: 200,
      message: '获取星币信息成功',
      data: info
    };
  } catch (error) {
    console.error('获取星币信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取星币信息失败'
    };
  }
});

router.get('/retrospectives', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { limit, offset } = ctx.query;
    
    const retros = wishCommissionService.getRetrospectives(
      userId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0
    );
    
    ctx.body = {
      code: 200,
      message: '获取复盘列表成功',
      data: retros
    };
  } catch (error) {
    console.error('获取复盘列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取复盘列表失败'
    };
  }
});

router.get('/:commissionId/retrospective', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { commissionId } = ctx.params;
    
    const retro = wishCommissionService.getRetrospectiveByCommission(userId, parseInt(commissionId));
    
    ctx.body = {
      code: 200,
      message: '获取复盘详情成功',
      data: retro
    };
  } catch (error) {
    console.error('获取复盘详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: error.message || '获取复盘详情失败'
    };
  }
});

router.post('/:commissionId/retrospective', async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const { commissionId } = ctx.params;
    const { content, mood_after, insight, growth_tags, rating } = ctx.request.body;
    
    if (!content || content.trim().length === 0) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: '复盘内容不能为空'
      };
      return;
    }
    
    const retro = wishCommissionService.createRetrospective(userId, parseInt(commissionId), {
      content: content.trim(),
      mood_after: mood_after || null,
      insight: insight || null,
      growth_tags: growth_tags || [],
      rating: rating || 0
    });
    
    ctx.body = {
      code: 200,
      message: '提交复盘成功',
      data: retro
    };
  } catch (error) {
    console.error('提交复盘失败:', error);
    ctx.status = 400;
    ctx.body = {
      code: 400,
      message: error.message || '提交复盘失败'
    };
  }
});

module.exports = router;
