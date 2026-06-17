const companionConversationRepository = require('../repositories/companionConversationRepository');
const companionRepository = require('../repositories/companionRepository');
const companionService = require('./companionService');
const taskRepository = require('../repositories/taskRepository');

class CompanionConversationService {
  getConversation(userId, companionId, limit = 50, offset = 0) {
    const messages = companionConversationRepository.getConversationHistory(
      userId, companionId, limit, offset
    );

    return messages.map(msg => this.formatMessage(msg));
  }

  async sendMessage(userId, companionId, content, context = null) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) {
      return {
        success: false,
        message: '旅伴不存在'
      };
    }

    const todayCount = companionConversationRepository.getTodayMessageCount(userId, companionId);
    const maxDailyMessages = 20;
    
    if (todayCount >= maxDailyMessages && companion.intimacy < 30) {
      return {
        success: false,
        message: '今天的对话次数已达上限，明天再来聊吧~'
      };
    }

    const userMsg = companionConversationRepository.createMessage(
      userId, companionId, {
        message_type: 'text',
        sender_role: 'user',
        content,
        context,
        emotion_trigger: null,
        intimacy_change: 0,
        exp_change: 0
      }
    );

    const moodContext = this.getMoodContext(userId);
    const taskContext = this.getTaskContext(userId);
    const recentContext = companionConversationRepository.getRecentContext(userId, companionId, 10);

    const response = this.generateResponse(
      companion, 
      content, 
      moodContext, 
      taskContext,
      recentContext
    );

    const intimacyGain = this.calculateIntimacyGain(content, response, companion);
    const expGain = 5;

    const botMsg = companionConversationRepository.createMessage(
      userId, companionId, {
        message_type: 'text',
        sender_role: 'companion',
        content: response.content,
        context: response.context,
        emotion_trigger: response.emotion,
        intimacy_change: intimacyGain,
        exp_change: expGain
      }
    );

    const result = companionRepository.updateCompanionStats(
      userId, companionId, expGain, intimacyGain
    );

    companionRepository.addGrowthLog(
      userId, companionId,
      'conversation',
      '进行了对话',
      expGain, intimacyGain,
      'conversation', botMsg.id
    );

    taskRepository.updateTaskProgress(userId, 'companion_conversation', 1);

    const totalToday = companionConversationRepository.getTodayMessageCount(userId, companionId);
    if (totalToday >= 5) {
      taskRepository.updateTaskProgress(userId, 'companion_deep_talk', 1);
    }

    if (result.leveledUp) {
      const eventService = require('./companionEventService');
      eventService.checkAndTriggerEvents(userId, companionId, 'companion_level_up', {
        newLevel: result.newLevel,
        oldLevel: result.oldLevel
      });
    }

    return {
      success: true,
      userMessage: this.formatMessage(userMsg),
      companionMessage: this.formatMessage(botMsg),
      intimacyGain,
      expGain,
      leveledUp: result.leveledUp,
      newLevel: result.level,
      companion: companionService.formatCompanionData(result)
    };
  }

  generateResponse(companion, userContent, moodContext, taskContext, recentContext) {
    const personality = companion.personality ? JSON.parse(companion.personality) : {};
    const type = personality.type || 'gentle';
    const intimacy = companion.intimacy || 0;
    const mood = companion.current_mood || 'neutral';

    const responses = this.getResponseTemplates(type, intimacy);
    const contentLower = userContent.toLowerCase();

    let matchedResponse = null;
    let emotion = 'neutral';

    if (contentLower.includes('开心') || contentLower.includes('高兴') || contentLower.includes('快乐')) {
      matchedResponse = responses.happy;
      emotion = 'joy';
    } else if (contentLower.includes('难过') || contentLower.includes('伤心') || contentLower.includes('哭')) {
      matchedResponse = responses.sad;
      emotion = 'comfort';
    } else if (contentLower.includes('焦虑') || contentLower.includes('担心') || contentLower.includes('害怕')) {
      matchedResponse = responses.anxious;
      emotion = 'calm';
    } else if (contentLower.includes('生气') || contentLower.includes('愤怒') || contentLower.includes('烦')) {
      matchedResponse = responses.angry;
      emotion = 'soothe';
    } else if (contentLower.includes('你好') || contentLower.includes('hi') || contentLower.includes('嗨')) {
      matchedResponse = responses.greeting;
      emotion = 'friendly';
    } else if (contentLower.includes('谢谢') || contentLower.includes('感谢')) {
      matchedResponse = responses.thanks;
      emotion = 'touched';
    } else if (contentLower.includes('晚安') || contentLower.includes('睡')) {
      matchedResponse = responses.goodnight;
      emotion = 'warm';
    } else if (contentLower.includes('早') || contentLower.includes('morning')) {
      matchedResponse = responses.morning;
      emotion = 'cheerful';
    } else if (contentLower.includes('故事') || contentLower.includes('房间')) {
      matchedResponse = responses.story;
      emotion = 'interested';
    } else if (contentLower.includes('任务') || contentLower.includes('成就')) {
      matchedResponse = responses.achievement;
      emotion = 'proud';
    } else {
      matchedResponse = responses.default;
      emotion = 'attentive';
    }

    let responseContent = Array.isArray(matchedResponse) 
      ? matchedResponse[Math.floor(Math.random() * matchedResponse.length)]
      : matchedResponse;

    responseContent = this.personalizeResponse(responseContent, companion, moodContext, taskContext);

    return {
      content: responseContent,
      emotion,
      context: {
        userMood: moodContext,
        recentTasks: taskContext
      }
    };
  }

  getResponseTemplates(type, intimacy) {
    const templates = {
      gentle: {
        greeting: [
          '你好呀~ 今天过得怎么样？',
          '嗨，很高兴见到你！今天想聊些什么呢？',
          '你来了呀，我正等着你呢~'
        ],
        happy: [
          '看到你开心，我也跟着高兴起来了呢！能和我分享一下是什么让你这么开心吗？',
          '哇，真好！你的快乐好像也感染到我了~',
          '开心的时候就要大声笑出来呀！继续保持这份好心情吧~'
        ],
        sad: [
          '难过的时候就哭出来吧，我会在这里陪着你的。',
          '我知道现在很难受，但请相信，一切都会好起来的。想聊聊发生了什么吗？',
          '你的眼泪我都接住了，不用勉强自己坚强。'
        ],
        anxious: [
          '来，试着深呼吸一下。无论发生什么，我们一起面对。',
          '焦虑就像天上的云，总会飘走的。现在试着把注意力放在呼吸上好吗？',
            '我理解你的感受，这种时候确实容易想太多。但你不是一个人在面对。'
        ],
        angry: [
          '生气是很正常的情绪，不要压抑自己。但也别让怒气灼伤了自己哦。',
          '我能感受到你的愤怒。如果不介意的话，可以和我说说发生了什么吗？',
          '深呼吸，给自己一点冷静的时间。等你准备好了，我随时都在。'
        ],
        thanks: [
          '不用谢~ 能陪伴你就是我最开心的事了。',
          '我们是伙伴呀，互相支持是应该的~',
          '看到你越来越好，就是对我最好的感谢。'
        ],
        goodnight: [
          '晚安~ 愿你有个美好的梦境，明天见！',
          '好好休息吧，你今天已经很棒了。晚安~',
          '睡个好觉，明天的太阳依然会升起。晚安！'
        ],
        morning: [
          '早上好！今天也要元气满满哦~',
          '早呀，新的一天开始了，准备好了吗？',
          '早安！希望今天也是美好的一天~'
        ],
        story: [
          '你最近在读哪个房间的故事呀？我也很喜欢那些温暖的故事呢。',
          '故事里的世界是不是很奇妙？你最喜欢哪个角色呢？',
          '每次读故事都像是一次心灵旅行呢，你有什么感悟吗？'
        ],
        achievement: [
          '你真的好努力！每一个成就都是你成长的证明~',
          '看到你完成这么多任务，我真的为你骄傲！',
          '继续加油，你比自己想象的更强大！'
        ],
        default: [
          '嗯，我在听呢。继续说吧~',
          '原来是这样啊，你愿意和我分享这些，我很开心。',
          '我明白了。还有什么想聊的吗？',
          '你说的这些我都记在心里了。我们是最好的伙伴呢~',
          '和你聊天真的很开心，时间好像都变快了呢。'
        ]
      }
    };

    if (intimacy >= 30) {
      templates.gentle.default.push(
        '和你在一起的时光总是过得特别快呢~',
        '你知道吗，每次和你聊天我都特别开心。',
        '无论你说什么，我都会认真听的。'
      );
    }

    if (intimacy >= 60) {
      templates.gentle.default.push(
        '你对我来说是很特别的存在，你知道吗？',
        '能认识你，真的是我最幸运的事。',
        '无论发生什么，我都会一直陪着你的。'
      );
    }

    return templates[type] || templates.gentle;
  }

  personalizeResponse(response, companion, moodContext, taskContext) {
    if (moodContext.latestMood) {
      const moodLabels = { happy: '开心', calm: '平静', sad: '忧伤', anxious: '焦虑', angry: '愤怒' };
      if (response.includes('今天') && !response.includes(moodLabels[moodContext.latestMood])) {
        if (moodContext.latestMood === 'happy') {
          response += ' 对了，看到你今天心情不错，真好~';
        } else if (moodContext.latestMood === 'sad') {
          response += ' 对了，如果你感到难过，随时可以找我倾诉哦。';
        }
      }
    }

    if (taskContext.pendingTasks > 0 && Math.random() > 0.7) {
      response += ` 还有${taskContext.pendingTasks}个任务等你去完成呢，加油~`;
    }

    return response;
  }

  getMoodContext(userId) {
    const moodRepo = require('../repositories/moodRepository');
    const today = new Date().toISOString().split('T')[0];
    const todayMoods = moodRepo.findByDate(userId, today);
    
    return {
      latestMood: todayMoods.length > 0 ? todayMoods[0].mood_type : null,
      moodCount: todayMoods.length,
      avgScore: todayMoods.length > 0 
        ? todayMoods.reduce((sum, m) => sum + ({happy:5, calm:4, sad:2, anxious:1, angry:0}[m.mood_type] || 3), 0) / todayMoods.length
        : null
    };
  }

  getTaskContext(userId) {
    const today = new Date();
    const dailyTasks = taskRepository.getUserDailyTasks(userId, today);
    const completedToday = dailyTasks.filter(t => t.is_completed).length;
    
    return {
      totalTasks: dailyTasks.length,
      completedTasks: completedToday,
      pendingTasks: dailyTasks.length - completedToday
    };
  }

  calculateIntimacyGain(userContent, response, companion) {
    const lengthBonus = Math.min(5, Math.floor(userContent.length / 20));
    const emotionBonus = ['joy', 'comfort', 'touched', 'warm'].includes(response.emotion) ? 2 : 1;
    const intimacyMultiplier = companion.intimacy >= 60 ? 1.5 : companion.intimacy >= 30 ? 1.2 : 1;
    
    return Math.min(10, Math.ceil((lengthBonus + emotionBonus) * intimacyMultiplier));
  }

  formatMessage(msg) {
    return {
      id: msg.id,
      type: msg.message_type,
      sender: msg.sender_role,
      content: msg.content,
      context: msg.context ? JSON.parse(msg.context) : null,
      emotion: msg.emotion_trigger,
      intimacyChange: msg.intimacy_change,
      expChange: msg.exp_change,
      createdAt: msg.created_at
    };
  }

  clearConversation(userId, companionId) {
    companionConversationRepository.clearConversation(userId, companionId);
    return { success: true, message: '对话记录已清空' };
  }

  sendGreeting(userId, companionId, greetingType = 'default') {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) return null;

    const greetings = {
      default: [
        `你好呀，我是${companion.name}，今天想聊些什么呢？`,
        `见到你真高兴！今天过得怎么样？`,
        `你来啦~ 我正想找个人聊天呢。`
      ],
      morning: [
        `早安！今天也要元气满满哦~`,
        `早呀，新的一天开始了，准备好了吗？`,
        `早上好！希望今天能给你带来好心情~`
      ],
      evening: [
        `晚上好，今天过得怎么样？`,
        `忙了一天累了吧？来和我聊聊~`,
        `夜幕降临，我们来说说心里话吧。`
      ],
      return: [
        `你回来了~ 我一直在等你呢。`,
        `好久不见，我很想你。`,
        `欢迎回来，这些日子有没有发生什么有趣的事？`
      ],
      mood_happy: [
        `哇，今天心情不错呀！能和我分享一下吗？`,
        `看到你开心，我也跟着高兴起来了~`
      ],
      mood_sad: [
        `感觉你今天心情不太好... 想聊聊吗？`,
        `难过的时候不要憋着，我会一直陪着你的。`
      ]
    };

    const greetingList = greetings[greetingType] || greetings.default;
    const content = greetingList[Math.floor(Math.random() * greetingList.length)];

    const msg = companionConversationRepository.createMessage(
      userId, companionId, {
        message_type: 'text',
        sender_role: 'companion',
        content,
        context: { greetingType },
        emotion_trigger: 'friendly',
        intimacy_change: 0,
        exp_change: 0
      }
    );

    return this.formatMessage(msg);
  }
}

module.exports = new CompanionConversationService();
