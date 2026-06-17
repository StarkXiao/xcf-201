const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testCompanionAPI() {
  console.log('=== 同行旅伴系统API测试 ===\n');
  
  try {
    console.log('1. 测试登录获取token...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: 'test123456'
    });
    
    const token = loginRes.data?.data?.token;
    if (!token) {
      console.log('登录失败，尝试注册新用户...');
      await axios.post(`${BASE_URL}/auth/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'test123456'
      });
      
      const loginRes2 = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'testuser',
        password: 'test123456'
      });
      
      const token2 = loginRes2.data?.data?.token;
      if (!token2) {
        console.error('无法获取token，测试终止');
        return;
      }
    }
    
    const authHeader = { Authorization: `Bearer ${token}` };
    console.log('✅ 登录成功\n');

    console.log('2. 获取旅伴列表...');
    const companionsRes = await axios.get(`${BASE_URL}/companions`, { headers: authHeader });
    console.log('状态码:', companionsRes.status);
    console.log('旅伴数量:', companionsRes.data?.data?.length || 0);
    console.log('✅ 获取旅伴列表成功\n');

    console.log('3. 获取当前激活的旅伴...');
    const activeRes = await axios.get(`${BASE_URL}/companions/active`, { headers: authHeader });
    console.log('状态码:', activeRes.status);
    if (activeRes.data?.data) {
      console.log('当前旅伴:', activeRes.data.data.name);
      console.log('等级:', activeRes.data.data.level);
      console.log('亲密度:', activeRes.data.data.intimacy);
    }
    console.log('✅ 获取当前旅伴成功\n');

    if (activeRes.data?.data?.id) {
      const companionId = activeRes.data.data.id;
      
      console.log('4. 获取旅伴详情...');
      const detailRes = await axios.get(`${BASE_URL}/companions/${companionId}`, { headers: authHeader });
      console.log('状态码:', detailRes.status);
      console.log('成长日志数量:', detailRes.data?.data?.growthLogs?.length || 0);
      console.log('✅ 获取旅伴详情成功\n');

      console.log('5. 获取对话历史...');
      const convRes = await axios.get(`${BASE_URL}/companions/${companionId}/conversations`, { headers: authHeader });
      console.log('状态码:', convRes.status);
      console.log('对话数量:', convRes.data?.data?.length || 0);
      console.log('✅ 获取对话历史成功\n');

      console.log('6. 发送测试消息...');
      const msgRes = await axios.post(`${BASE_URL}/companions/${companionId}/conversations`, {
        content: '你好，今天过得怎么样？'
      }, { headers: authHeader });
      console.log('状态码:', msgRes.status);
      if (msgRes.data?.data?.companionMessage) {
        console.log('旅伴回复:', msgRes.data.data.companionMessage.content);
        console.log('经验获得:', msgRes.data.data.expGain);
        console.log('亲密度获得:', msgRes.data.data.intimacyGain);
      }
      console.log('✅ 发送消息成功\n');

      console.log('7. 获取可用事件...');
      const eventsRes = await axios.get(`${BASE_URL}/companions/${companionId}/events`, { headers: authHeader });
      console.log('状态码:', eventsRes.status);
      console.log('可用事件数量:', eventsRes.data?.data?.length || 0);
      console.log('✅ 获取事件列表成功\n');

      console.log('8. 检查解锁条件...');
      const unlockRes = await axios.get(`${BASE_URL}/companions/check/unlock`, { headers: authHeader });
      console.log('状态码:', unlockRes.status);
      console.log('新解锁旅伴数量:', unlockRes.data?.data?.length || 0);
      console.log('✅ 检查解锁条件成功\n');
    }

    console.log('🎉 所有API测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompanionAPI();
