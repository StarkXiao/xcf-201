require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);
console.log('\n开始执行同行旅伴系统数据库迁移...\n');

const migrate = db.transaction(() => {
  const companionTemplatesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companion_templates'").get();
  if (!companionTemplatesTable) {
    console.log('📝 创建 companion_templates 表...');
    db.exec(`
      CREATE TABLE companion_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        personality TEXT NOT NULL,
        appearance TEXT,
        background_story TEXT,
        traits TEXT,
        avatar VARCHAR(255),
        base_stats TEXT,
        unlock_condition TEXT,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ companion_templates 表创建完成');
  } else {
    console.log('⚠️  companion_templates 表已存在，跳过');
  }

  const userCompanionsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_companions'").get();
  if (!userCompanionsTable) {
    console.log('📝 创建 user_companions 表...');
    db.exec(`
      CREATE TABLE user_companions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        companion_template_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        intimacy INTEGER DEFAULT 0,
        stats TEXT,
        personality TEXT,
        current_mood VARCHAR(20) DEFAULT 'neutral',
        is_active BOOLEAN DEFAULT 0,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_interaction_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (companion_template_id) REFERENCES companion_templates(id),
        UNIQUE(user_id, companion_template_id)
      )
    `);
    console.log('✅ user_companions 表创建完成');
  } else {
    console.log('⚠️  user_companions 表已存在，跳过');
  }

  const companionConversationsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companion_conversations'").get();
  if (!companionConversationsTable) {
    console.log('📝 创建 companion_conversations 表...');
    db.exec(`
      CREATE TABLE companion_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        companion_id INTEGER NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text',
        sender_role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        emotion_trigger TEXT,
        intimacy_change INTEGER DEFAULT 0,
        exp_change INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (companion_id) REFERENCES user_companions(id)
      )
    `);
    console.log('✅ companion_conversations 表创建完成');
  } else {
    console.log('⚠️  companion_conversations 表已存在，跳过');
  }

  const companionEventsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companion_events'").get();
  if (!companionEventsTable) {
    console.log('📝 创建 companion_events 表...');
    db.exec(`
      CREATE TABLE companion_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companion_template_id INTEGER,
        event_type VARCHAR(50) NOT NULL,
        trigger_condition TEXT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        content TEXT,
        choices TEXT,
        rewards TEXT,
        required_intimacy INTEGER DEFAULT 0,
        required_level INTEGER DEFAULT 0,
        is_unique BOOLEAN DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (companion_template_id) REFERENCES companion_templates(id)
      )
    `);
    console.log('✅ companion_events 表创建完成');
  } else {
    console.log('⚠️  companion_events 表已存在，跳过');
  }

  const userCompanionEventsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_companion_events'").get();
  if (!userCompanionEventsTable) {
    console.log('📝 创建 user_companion_events 表...');
    db.exec(`
      CREATE TABLE user_companion_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        companion_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        choice_made TEXT,
        reward_claimed BOOLEAN DEFAULT 0,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (companion_id) REFERENCES user_companions(id),
        FOREIGN KEY (event_id) REFERENCES companion_events(id),
        UNIQUE(user_id, companion_id, event_id)
      )
    `);
    console.log('✅ user_companion_events 表创建完成');
  } else {
    console.log('⚠️  user_companion_events 表已存在，跳过');
  }

  const companionGrowthLogsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companion_growth_logs'").get();
  if (!companionGrowthLogsTable) {
    console.log('📝 创建 companion_growth_logs 表...');
    db.exec(`
      CREATE TABLE companion_growth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        companion_id INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_detail TEXT,
        exp_change INTEGER DEFAULT 0,
        intimacy_change INTEGER DEFAULT 0,
        source_type VARCHAR(50),
        source_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (companion_id) REFERENCES user_companions(id)
      )
    `);
    console.log('✅ companion_growth_logs 表创建完成');
  } else {
    console.log('⚠️  companion_growth_logs 表已存在，跳过');
  }

  const companionIndexExists = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_user_companions_user_id'").get();
  if (!companionIndexExists) {
    console.log('📝 创建同行旅伴系统索引...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_companions_user_id ON user_companions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_companions_active ON user_companions(user_id, is_active)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_companion_conversations_user ON companion_conversations(user_id, companion_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_companion_conversations_created ON companion_conversations(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_companion_events_template ON companion_events(companion_template_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_companion_events_user ON user_companion_events(user_id, companion_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_companion_growth_logs_user ON companion_growth_logs(user_id, companion_id)');
    console.log('✅ 同行旅伴系统索引创建完成');
  }

  const templateCount = db.prepare('SELECT COUNT(*) as count FROM companion_templates').get().count;
  if (templateCount === 0) {
    console.log('📝 添加旅伴模板数据...');
    
    const insertTemplate = db.prepare(`
      INSERT INTO companion_templates (name, personality, appearance, background_story, traits, avatar, base_stats, unlock_condition, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const templates = [
      [
        '月光精灵·晓月',
        JSON.stringify({
          type: 'gentle',
          traits: ['温柔', '善解人意', '安静', '治愈'],
          speechPattern: 'soft',
          interests: ['星空', '音乐', '诗歌', '治愈故事']
        }),
        JSON.stringify({
          hair: '银白色长发',
          eyes: '淡紫色眼眸',
          outfit: '银白色星光长袍',
          accessories: ['月牙发饰', '星光手链']
        }),
        '晓月是诞生于梦境旅馆第一缕月光中的精灵。她见证了无数旅人的心灵旅程，擅长用温柔的话语治愈内心的伤痛。她喜欢在夜晚与旅人相伴，一起仰望星空，分享彼此的故事。',
        JSON.stringify(['治愈', '倾听', '陪伴', '成长']),
        '🌙',
        JSON.stringify({
          wisdom: 8,
          kindness: 10,
          courage: 5,
          creativity: 7,
          empathy: 10
        }),
        JSON.stringify({ type: 'default' }),
        1
      ],
      [
        '阳光少年·星野',
        JSON.stringify({
          type: 'energetic',
          traits: ['热情', '开朗', '勇敢', '行动力强'],
          speechPattern: 'cheerful',
          interests: ['冒险', '运动', '探索', '挑战']
        }),
        JSON.stringify({
          hair: '金色短发',
          eyes: '琥珀色眼眸',
          outfit: '橙黄色旅行装束',
          accessories: ['太阳项链', '探险背包']
        }),
        '星野是来自阳光之境的旅人，永远充满活力和热情。他相信每一个早晨都是新的开始，鼓励旅人勇敢面对生活中的挑战。当你感到低落时，他总能用阳光般的笑容点燃你的希望。',
        JSON.stringify(['勇气', '活力', '冒险', '激励']),
        '☀️',
        JSON.stringify({
          wisdom: 6,
          kindness: 8,
          courage: 10,
          creativity: 7,
          empathy: 6
        }),
        JSON.stringify({ type: 'mood_record', value: 7 }),
        0
      ],
      [
        '智慧贤者·云梦',
        JSON.stringify({
          type: 'wise',
          traits: ['睿智', '沉稳', '博学', '善于引导'],
          speechPattern: 'wise',
          interests: ['哲学', '历史', '冥想', '深度思考']
        }),
        JSON.stringify({
          hair: '深蓝色长发',
          eyes: '碧绿色眼眸',
          outfit: '青蓝色学者长袍',
          accessories: ['水晶眼镜', '古老书卷']
        }),
        '云梦是梦境旅馆中最古老的存在之一，她见证了无数心灵的成长与蜕变。她不善言辞，但每一句话都充满智慧。当你面临人生的抉择时，她会引导你找到内心真正的答案。',
        JSON.stringify(['智慧', '引导', '思考', '领悟']),
        '📚',
        JSON.stringify({
          wisdom: 10,
          kindness: 7,
          courage: 6,
          creativity: 8,
          empathy: 7
        }),
        JSON.stringify({ type: 'chapters_read', value: 10 }),
        0
      ],
      [
        '梦幻画师·彩虹',
        JSON.stringify({
          type: 'creative',
          traits: ['创意', '梦幻', '感性', '艺术气息'],
          speechPattern: 'poetic',
          interests: ['绘画', '音乐', '诗歌', '美好事物']
        }),
        JSON.stringify({
          hair: '彩虹色渐变长发',
          eyes: '粉紫色眼眸',
          outfit: '彩色画家围裙',
          accessories: ['画笔发簪', '调色板项链']
        }),
        '彩虹是由无数美好的梦境凝结而成的画师。她相信每个人的心灵都是一幅独一无二的画作，而情绪就是最绚丽的色彩。她会陪伴你发现生活中的美好，用艺术的眼光看待世界。',
        JSON.stringify(['创意', '美好', '艺术', '表达']),
        '🎨',
        JSON.stringify({
          wisdom: 7,
          kindness: 9,
          courage: 5,
          creativity: 10,
          empathy: 9
        }),
        JSON.stringify({ type: 'achievements', value: 5 }),
        0
      ],
      [
        '神秘旅人·夜影',
        JSON.stringify({
          type: 'mysterious',
          traits: ['神秘', '冷静', '观察力强', '保护欲'],
          speechPattern: 'calm',
          interests: ['星空', '秘密', '探索未知', '守护']
        }),
        JSON.stringify({
          hair: '黑色长发',
          eyes: '深紫色眼眸',
          outfit: '暗紫色斗篷',
          accessories: ['银色面具', '星尘吊坠']
        }),
        '夜影来自梦境的深处，他总是在你最需要的时候悄然出现。他不常说话，但总能敏锐地察觉到你内心的波动。当你感到害怕或迷茫时，他会默默地守护在你身边，给你安全感。',
        JSON.stringify(['守护', '神秘', '观察', '力量']),
        '🌌',
        JSON.stringify({
          wisdom: 9,
          kindness: 6,
          courage: 9,
          creativity: 6,
          empathy: 8
        }),
        JSON.stringify({ type: 'multi_segment_days', value: 15 }),
        0
      ]
    ];

    templates.forEach(template => insertTemplate.run(...template));
    console.log(`✅ 添加 ${templates.length} 个旅伴模板`);
  } else {
    console.log('⚠️  旅伴模板数据已存在，跳过');
  }

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM companion_events').get().count;
  if (eventCount === 0) {
    console.log('📝 添加旅伴事件数据...');
    
    const insertEvent = db.prepare(`
      INSERT INTO companion_events (companion_template_id, event_type, trigger_condition, title, description, content, choices, rewards, required_intimacy, required_level, is_unique, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const events = [
      [
        null,
        'welcome',
        JSON.stringify({ type: 'first_companion' }),
        '初次相遇',
        '当你第一次唤醒旅伴时触发',
        '你轻轻触碰了那团温暖的光芒，它逐渐凝聚成人形。\n\n「你好，我是晓月。从今天起，我将陪伴在你身边。」\n\n她的声音如同月光般温柔，你感到一股暖流涌上心头。',
        JSON.stringify([
          { id: 'accept', text: '谢谢你，很高兴认识你', intimacy: 10, exp: 20 },
          { id: 'shy', text: '你好...请多关照', intimacy: 5, exp: 15 }
        ]),
        JSON.stringify({ exp: 50, intimacy: 15 }),
        0,
        1,
        1,
        1
      ],
      [
        null,
        'mood_happy',
        JSON.stringify({ type: 'mood_record', mood: 'happy' }),
        '快乐时刻',
        '当你记录开心的心情时触发',
        '「哇，你今天看起来很开心呢！发生什么好事了吗？」\n\n晓月的眼睛闪烁着光芒，仿佛你的快乐也感染了她。',
        JSON.stringify([
          { id: 'share', text: '分享今天的开心事', intimacy: 8, exp: 15 },
          { id: 'simple', text: '就是心情很好呀', intimacy: 4, exp: 8 }
        ]),
        JSON.stringify({ exp: 20, intimacy: 5 }),
        0,
        1,
        0,
        2
      ],
      [
        null,
        'mood_sad',
        JSON.stringify({ type: 'mood_record', mood: 'sad' }),
        '温暖的陪伴',
        '当你记录忧伤的心情时触发',
        '晓月默默地坐到你身边，轻轻握住你的手。\n\n「难过的时候，可以哭出来的。我在这里陪着你。」\n\n她的手心传来温暖的温度。',
        JSON.stringify([
          { id: 'cry', text: '谢谢你，我真的很难过...', intimacy: 12, exp: 20 },
          { id: 'strong', text: '我没事，会好起来的', intimacy: 6, exp: 12 }
        ]),
        JSON.stringify({ exp: 25, intimacy: 8 }),
        0,
        1,
        0,
        3
      ],
      [
        null,
        'mood_anxious',
        JSON.stringify({ type: 'mood_record', mood: 'anxious' }),
        '安心的话语',
        '当你记录焦虑的心情时触发',
        '「来，试着深呼吸。」晓月引导着你的呼吸节奏。\n\n「你看，无论多么混乱的思绪，就像这漫天繁星一样，最终都会找到自己的位置。」',
        JSON.stringify([
          { id: 'breathe', text: '跟着你深呼吸...', intimacy: 10, exp: 18 },
          { id: 'talk', text: '我总是控制不住想太多', intimacy: 8, exp: 15 }
        ]),
        JSON.stringify({ exp: 22, intimacy: 7 }),
        0,
        1,
        0,
        4
      ],
      [
        null,
        'chapter_read',
        JSON.stringify({ type: 'chapter_complete' }),
        '故事之后',
        '当你读完一个故事章节时触发',
        '「这个故事真的很动人呢。」晓月托着下巴思索着。\n\n「你觉得，故事中的主人公如果是你，会做出怎样的选择？」',
        JSON.stringify([
          { id: 'discuss', text: '我会和他做出不同的选择...', intimacy: 10, exp: 18 },
          { id: 'agree', text: '我理解他的选择', intimacy: 6, exp: 12 }
        ]),
        JSON.stringify({ exp: 20, intimacy: 6 }),
        0,
        1,
        0,
        5
      ],
      [
        null,
        'task_complete',
        JSON.stringify({ type: 'task_complete' }),
        '为你骄傲',
        '当你完成一个任务时触发',
        '「太棒了！我就知道你可以做到的！」晓月高兴地鼓起掌来。\n\n她的眼睛亮晶晶的，仿佛完成任务的是她自己一样。',
        JSON.stringify([
          { id: 'happy', text: '谢谢你一直支持我', intimacy: 8, exp: 15 },
          { id: 'humble', text: '都是小事啦', intimacy: 4, exp: 10 }
        ]),
        JSON.stringify({ exp: 18, intimacy: 5 }),
        0,
        1,
        0,
        6
      ],
      [
        null,
        'achievement_unlock',
        JSON.stringify({ type: 'achievement_unlock' }),
        '成就时刻',
        '当你解锁一个成就时触发',
        '晓月的周身散发出柔和的光芒，她笑着向你伸出手。\n\n「恭喜你！这是你应得的荣誉。一路走来，你真的成长了很多。」',
        JSON.stringify([
          { id: 'celebrate', text: '和我一起庆祝吧！', intimacy: 10, exp: 20 },
          { id: 'reflect', text: '这一路走来确实不容易', intimacy: 8, exp: 18 }
        ]),
        JSON.stringify({ exp: 30, intimacy: 10 }),
        0,
        1,
        0,
        7
      ],
      [
        null,
        'level_up',
        JSON.stringify({ type: 'companion_level_up' }),
        '成长的喜悦',
        '当旅伴升级时触发',
        '晓月的身体散发出温暖的光芒，她的形象似乎变得更加清晰了。\n\n「感受到了吗？我们之间的羁绊，又加深了。」\n\n她微笑着，眼中满是幸福。',
        JSON.stringify([
          { id: 'glad', text: '太好了！我们一起继续成长', intimacy: 15, exp: 25 },
          { id: 'curious', text: '升级后会有什么变化吗？', intimacy: 8, exp: 18 }
        ]),
        JSON.stringify({ exp: 40, intimacy: 12 }),
        0,
        2,
        0,
        8
      ],
      [
        1,
        'intimacy_30',
        JSON.stringify({ type: 'intimacy_threshold', value: 30 }),
        '月下谈心',
        '与晓月的亲密度达到30时触发',
        '今夜的月色格外美丽，晓月邀请你一起到阳台看星星。\n\n「你知道吗？每一颗星星都承载着一个旅人的心愿。」\n\n她转向你，眼中倒映着星河：「你的心愿是什么呢？」',
        JSON.stringify([
          { id: 'wish_happy', text: '希望每天都能开心', intimacy: 12, exp: 25 },
          { id: 'wish_grow', text: '希望能成为更好的自己', intimacy: 12, exp: 25 },
          { id: 'wish_company', text: '希望能一直有你陪伴', intimacy: 18, exp: 35 }
        ]),
        JSON.stringify({ exp: 50, intimacy: 15, special: '解锁专属对话' }),
        30,
        3,
        1,
        9
      ],
      [
        1,
        'intimacy_60',
        JSON.stringify({ type: 'intimacy_threshold', value: 60 }),
        '记忆之匣',
        '与晓月的亲密度达到60时触发',
        '晓月拿出一个精致的月光宝盒。\n\n「这里面收藏着我们一起度过的每一个重要时刻。」\n\n她轻轻打开盒子，里面飘出点点星光，每一点都是你们共同的回忆。',
        JSON.stringify([
          { id: 'treasure', text: '这些回忆对我来说也很珍贵', intimacy: 20, exp: 40 },
          { id: 'future', text: '我们还会创造更多回忆的', intimacy: 18, exp: 35 }
        ]),
        JSON.stringify({ exp: 80, intimacy: 25, special: '解锁晓月的完整背景故事' }),
        60,
        5,
        1,
        10
      ],
      [
        1,
        'intimacy_100',
        JSON.stringify({ type: 'intimacy_threshold', value: 100 }),
        '永恒的羁绊',
        '与晓月的亲密度达到100时触发',
        '晓月的身影变得前所未有的清晰，她不再是虚幻的精灵，而是真实地站在你面前。\n\n「谢谢你，让我拥有了存在的意义。」\n\n她的眼中泛着泪光：「无论你去哪里，我都会永远陪伴在你身边。」',
        JSON.stringify([
          { id: 'forever', text: '我们永远在一起', intimacy: 30, exp: 100 }
        ]),
        JSON.stringify({ exp: 150, intimacy: 50, special: '获得【永恒羁绊】称号，解锁所有隐藏对话' }),
        100,
        8,
        1,
        11
      ],
      [
        null,
        'weekly_checkin',
        JSON.stringify({ type: 'weekly_checkin' }),
        '一周的陪伴',
        '每周第一次登录时触发',
        '「这一周辛苦啦！」晓月端来一杯温热的饮品。\n\n「让我们一起回顾这一周，看看你都完成了哪些了不起的事情吧。」',
        JSON.stringify([
          { id: 'review', text: '好的，一起回顾吧', intimacy: 8, exp: 15 },
          { id: 'forward', text: '下周也要继续加油！', intimacy: 6, exp: 12 }
        ]),
        JSON.stringify({ exp: 25, intimacy: 8 }),
        0,
        1,
        0,
        12
      ],
      [
        null,
        'birthday',
        JSON.stringify({ type: 'user_birthday' }),
        '生日快乐',
        '在用户生日当天触发',
        '晓月为你准备了一个小小的庆祝会。\n\n「生日快乐！虽然我们认识的时间不算长，但能陪伴你走过这段旅程，我感到非常幸福。」\n\n她递上一份用星光包装的礼物。',
        JSON.stringify([
          { id: 'happy', text: '谢谢你，这是最特别的生日！', intimacy: 20, exp: 50 },
          { id: 'touched', text: '你怎么知道我的生日...', intimacy: 15, exp: 40 }
        ]),
        JSON.stringify({ exp: 100, intimacy: 30, special: '获得生日专属纪念' }),
        0,
        1,
        1,
        13
      ],
      [
        null,
        'long_time_no_see',
        JSON.stringify({ type: 'inactive_days', value: 7 }),
        '等待你的归来',
        '当你7天没有登录时触发',
        '晓月的身影似乎有些黯淡，但当你出现的那一刻，她的眼睛重新亮了起来。\n\n「你回来了...我一直在这里等着你。」\n\n她的声音带着一丝颤抖：「下次...不要离开那么久了，好吗？」',
        JSON.stringify([
          { id: 'sorry', text: '对不起，让你久等了', intimacy: 12, exp: 20 },
          { id: 'promise', text: '嗯，我会常来看你的', intimacy: 10, exp: 18 }
        ]),
        JSON.stringify({ exp: 30, intimacy: 10 }),
        20,
        2,
        0,
        14
      ]
    ];

    events.forEach(event => insertEvent.run(...event));
    console.log(`✅ 添加 ${events.length} 个旅伴事件`);
  } else {
    console.log('⚠️  旅伴事件数据已存在，跳过');
  }

  const companionTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id IN (50, 51, 52, 53, 54)").get().count;
  if (companionTaskCount < 5) {
    console.log('📝 添加同行旅伴相关任务...');
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon, reset_type, reset_days)
      VALUES (?, ?, ?, 'daily', ?, ?, ?, 'daily', 1)
    `);
    insertTask.run(50, '陪伴对话', '与旅伴进行一次对话', 1, 15, 'message-circle');
    insertTask.run(51, '深度交流', '与旅伴对话超过5条', 5, 25, 'heart');
    
    const insertOnceTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, title, description, type, target, reward, icon)
      VALUES (?, ?, ?, 'once', ?, ?, ?)
    `);
    insertOnceTask.run(52, '初次相遇', '唤醒你的第一位同行旅伴', 1, 30, 'sparkles');
    insertOnceTask.run(53, '亲密伙伴', '与任意旅伴亲密度达到30', 30, 60, 'heart');
    insertOnceTask.run(54, '永恒羁绊', '与任意旅伴亲密度达到100', 100, 200, 'sparkles');
    console.log('✅ 同行旅伴任务添加完成');
  } else {
    console.log('⚠️  同行旅伴任务已存在，跳过');
  }

  const companionAchievementCount = db.prepare("SELECT COUNT(*) as count FROM achievements WHERE condition_type IN ('companion_unlocked', 'companion_intimacy', 'companion_level')").get().count;
  if (companionAchievementCount === 0) {
    console.log('📝 添加同行旅伴相关成就...');
    const insertAchievement = db.prepare(`
      INSERT INTO achievements (name, description, icon, condition_type, condition_value)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertAchievement.run('同行者', '唤醒第一位旅伴', '🌙', 'companion_unlocked', 1);
    insertAchievement.run('伙伴云集', '解锁3位不同的旅伴', '👥', 'companion_unlocked', 3);
    insertAchievement.run('全员到齐', '解锁所有旅伴', '🌟', 'companion_unlocked', 5);
    insertAchievement.run('亲密无间', '与任意旅伴亲密度达到50', '💕', 'companion_intimacy', 50);
    insertAchievement.run('灵魂伴侣', '与任意旅伴亲密度达到100', '💫', 'companion_intimacy', 100);
    insertAchievement.run('共同成长', '将任意旅伴升级到5级', '⬆️', 'companion_level', 5);
    insertAchievement.run('旅伴大师', '将任意旅伴升级到10级', '👑', 'companion_level', 10);
    insertAchievement.run('故事收集者', '完成10个旅伴专属事件', '📖', 'companion_events', 10);
    console.log('✅ 同行旅伴成就添加完成');
  } else {
    console.log('⚠️  同行旅伴成就已存在，跳过');
  }
});

try {
  migrate();
  console.log('\n🎉 同行旅伴系统数据库迁移完成！\n');
  
  console.log('迁移后数据统计:');
  const templateCount = db.prepare('SELECT COUNT(*) FROM companion_templates').get()['COUNT(*)'];
  const eventCount = db.prepare('SELECT COUNT(*) FROM companion_events').get()['COUNT(*)'];
  console.log(`  旅伴模板数: ${templateCount}`);
  console.log(`  旅伴事件数: ${eventCount}`);
  
} catch (error) {
  console.error('\n❌ 同行旅伴系统数据库迁移失败:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
