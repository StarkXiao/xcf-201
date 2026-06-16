require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);

const db = new Database(resolvedPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log(`数据库路径: ${resolvedPath}`);
console.log('\n开始导入初始数据...\n');

const seedData = db.transaction(() => {
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount > 0) {
    console.log('⚠️  房间数据已存在，跳过导入');
  } else {
    console.log('📦 导入房间数据...');
    const insertRoom = db.prepare(`
      INSERT INTO rooms (name, description, cover_image, unlock_condition, required_days, total_chapters, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const rooms = [
      ['月光前厅', '梦境旅馆的入口，月光从彩色玻璃窗洒下，照亮了铺满星光的地板。', 'room1.jpg', '默认解锁', 0, 3, 1],
      ['星尘书房', '堆满古老书籍的书房，每一本书都记录着一个旅人的梦境故事。', 'room2.jpg', '记录心情 3 天', 3, 4, 2],
      ['回忆花房', '种满奇异花卉的温室，每朵花都承载着一段珍贵的回忆。', 'room3.jpg', '记录心情 7 天', 7, 4, 3],
      ['回声长廊', '长长的走廊，墙壁上挂满了会低声细语的画像。', 'room4.jpg', '记录心情 14 天', 14, 5, 4],
      ['梦境剧场', '华丽的剧院，舞台上正在上演着你内心深处的故事。', 'room5.jpg', '记录心情 21 天', 21, 5, 5],
      ['心愿阁楼', '旅馆的最高处，可以看到整个梦境世界的星空。', 'room6.jpg', '记录心情 30 天', 30, 6, 6]
    ];
    
    rooms.forEach(room => insertRoom.run(...room));
    console.log(`✅ 导入 ${rooms.length} 个房间数据`);
  }

  const storyCount = db.prepare('SELECT COUNT(*) as count FROM stories').get().count;
  if (storyCount > 0) {
    console.log('⚠️  故事章节数据已存在，跳过导入');
  } else {
    console.log('📖 导入故事章节数据...');
    const insertStory = db.prepare(`
      INSERT INTO stories (room_id, chapter_number, title, content)
      VALUES (?, ?, ?, ?)
    `);
    
    const stories = [
      [1, 1, '初入梦境', '你推开那扇刻满星辰图案的木门，一阵温暖的风迎面吹来。门上的风铃发出清脆的声响，仿佛在说：「欢迎来到梦境旅馆，疲惫的旅人。」...'],
      [1, 2, '守夜人', '前台后站着一位穿着紫色长袍的老人，他的胡须像是用银河编织而成。「每一位来到这里的人，都有需要安放的心情。」他微笑着递给你一把黄铜钥匙...'],
      [1, 3, '第一扇门', '走廊两侧排列着无数扇门，每一扇都散发着不同颜色的微光。老人停下脚步，指向最靠近的那扇：「这是月光前厅，属于你的第一个房间。记录下你的心情，就能打开更多的门...」'],
      [2, 1, '推开书房的门', '当你记录了三天的心情后，星尘书房的门微微颤动着，散发出柔和的光芒。你握住冰冷的门把手，一股奇异的力量顺着指尖传来...'],
      [2, 2, '会说话的书', '一本封面上镶嵌着月亮宝石的古书从书架上飞了下来，在你面前翻开。「我叫「星辰」，是这家旅馆的记忆守护者。让我来告诉你那些曾经来到这里的旅人们的故事...」'],
      [2, 3, '第一位旅人', '书页上浮现出一个年轻女孩的身影，她的笑容像阳光一样灿烂。「她曾经和你一样，每天记录着自己的心情。有开心，有难过，有迷茫...但正是这些记录，让她找到了真正的自己...」'],
      [2, 4, '你的故事', '「现在，该写下你的故事了。」星辰合上书本，「每一次心情记录，都是你故事中的一页。继续书写吧，直到你的故事也能温暖后来的旅人。」']
    ];
    
    stories.forEach(story => insertStory.run(...story));
    console.log(`✅ 导入 ${stories.length} 个故事章节`);
  }

  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  if (taskCount > 0) {
    console.log('⚠️  任务数据已存在，跳过导入');
  } else {
    console.log('📋 导入任务数据...');
    const insertTask = db.prepare(`
      INSERT INTO tasks (title, description, type, target, reward)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const tasks = [
      ['每日心情', '记录今日的心情', 'daily', 1, 10],
      ['心情随笔', '在心情记录中写下至少 50 字的随笔', 'daily', 1, 15],
      ['坚持一周', '连续 7 天记录心情', 'once', 7, 100],
      ['情感专家', '体验所有 5 种心情类型', 'once', 5, 80],
      ['故事读者', '阅读完一个房间的所有章节', 'once', 1, 50]
    ];
    
    tasks.forEach(task => insertTask.run(...task));
    console.log(`✅ 导入 ${tasks.length} 个任务数据`);
  }

  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;
  if (achievementCount > 0) {
    console.log('⚠️  成就数据已存在，跳过导入');
  } else {
    console.log('🏆 导入成就数据...');
    const insertAchievement = db.prepare(`
      INSERT INTO achievements (name, description, icon, condition_type, condition_value)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const achievements = [
      ['初入梦境', '完成第一次心情记录', '🌙', 'total_moods', 1],
      ['一周旅人', '连续记录心情 7 天', '⭐', 'check_in_streak', 7],
      ['半月访客', '连续记录心情 15 天', '🌟', 'check_in_streak', 15],
      ['月度住客', '连续记录心情 30 天', '💫', 'check_in_streak', 30],
      ['心情收藏家', '累计记录 10 次心情', '📝', 'total_moods', 10],
      ['情感丰富', '累计记录 50 次心情', '📚', 'total_moods', 50],
      ['房间探索者', '解锁 3 个房间', '🚪', 'rooms_unlocked', 3],
      ['梦境常客', '解锁所有房间', '🏆', 'rooms_unlocked', 6],
      ['故事达人', '阅读 10 个故事章节', '📖', 'chapters_read', 10],
      ['完美旅人', '完成所有成就', '👑', 'all_achievements', 1]
    ];
    
    achievements.forEach(achievement => insertAchievement.run(...achievement));
    console.log(`✅ 导入 ${achievements.length} 个成就数据`);
  }
});

try {
  seedData();
  console.log('\n🎉 所有初始数据导入完成！\n');
  
  console.log('数据统计:');
  console.log(`  房间数: ${db.prepare('SELECT COUNT(*) FROM rooms').get()['COUNT(*)']}`);
  console.log(`  故事章节数: ${db.prepare('SELECT COUNT(*) FROM stories').get()['COUNT(*)']}`);
  console.log(`  任务数: ${db.prepare('SELECT COUNT(*) FROM tasks').get()['COUNT(*)']}`);
  console.log(`  成就数: ${db.prepare('SELECT COUNT(*) FROM achievements').get()['COUNT(*)']}`);
  
} catch (error) {
  console.error('\n❌ 数据导入失败:', error.message);
  process.exit(1);
} finally {
  db.close();
  console.log('\n数据库连接已关闭');
}
