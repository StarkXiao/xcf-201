const moodRepository = require('../repositories/moodRepository');
const userRepository = require('../repositories/userRepository');
const roomRepository = require('../repositories/roomRepository');
const achievementRepository = require('../repositories/achievementRepository');
const taskRepository = require('../repositories/taskRepository');

const VALID_MOOD_TYPES = ['happy', 'calm', 'sad', 'anxious', 'angry'];

class MoodService {
  createMood(userId, date, moodType, content = '', tags = []) {
    if (!date) {
      const today = new Date();
      date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    if (!VALID_MOOD_TYPES.includes(moodType)) {
      throw new Error('无效的心情类型');
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('日期格式不正确，请使用 YYYY-MM-DD 格式');
    }
    
    const recordDate = new Date(date);
    const today = new Date();
    if (recordDate > today) {
      throw new Error('不能记录未来的心情');
    }
    
    const mood = moodRepository.create(userId, date, moodType, content, tags);
    
    userRepository.updateStats(userId);
    
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    taskRepository.updateProgress(userId, 1, todayStr, 1);
    
    if (content && content.length >= 50) {
      taskRepository.updateProgress(userId, 2, todayStr, 1);
    }
    
    const streakDays = moodRepository.getStreakDays(userId);
    if (streakDays >= 7) {
      taskRepository.updateProgress(userId, 3, todayStr, 7);
    }
    
    const moodTypes = moodRepository.getMoodTypes(userId);
    if (moodTypes.length >= 5) {
      taskRepository.updateProgress(userId, 4, todayStr, 5);
    }
    
    const newlyUnlockedAchievements = [];
    
    const totalMoods = moodRepository.findByMonth(userId, recordDate.getFullYear(), recordDate.getMonth() + 1).length;
    const totalMoodsAll = userRepository.getStats(userId).total_moods;
    
    newlyUnlockedAchievements.push(
      ...achievementRepository.checkAndUnlock(userId, 'total_moods', totalMoodsAll),
      ...achievementRepository.checkAndUnlock(userId, 'check_in_streak', streakDays)
    );
    
    const unlockedRooms = this.checkRoomUnlocks(userId, streakDays);
    
    const allAchievements = achievementRepository.getUserAchievements(userId);
    const unlockedCount = allAchievements.filter(a => a.is_unlocked).length;
    const totalCount = achievementRepository.getTotalCount();
    
    if (unlockedCount >= totalCount - 1) {
      newlyUnlockedAchievements.push(
        ...achievementRepository.checkAndUnlock(userId, 'all_achievements', 1)
      );
    }
    
    return {
      mood,
      newlyUnlockedAchievements: newlyUnlockedAchievements.filter(a => a),
      newlyUnlockedRooms: unlockedRooms,
      stats: moodRepository.getStats(userId, recordDate.getFullYear(), recordDate.getMonth() + 1)
    };
  }

  checkRoomUnlocks(userId, streakDays) {
    const rooms = roomRepository.findAll(userId);
    const newlyUnlocked = [];
    
    for (const room of rooms) {
      if (!room.is_unlocked && room.required_days > 0 && streakDays >= room.required_days) {
        const result = roomRepository.unlockRoom(userId, room.id);
        if (result.success) {
          newlyUnlocked.push(room);
        }
      }
    }
    
    if (newlyUnlocked.length > 0) {
      achievementRepository.checkAndUnlock(userId, 'rooms_unlocked', roomRepository.getUnlockedCount(userId));
    }
    
    return newlyUnlocked;
  }

  getMoodByDate(userId, date) {
    return moodRepository.findByDate(userId, date);
  }

  getMoodsByMonth(userId, year, month) {
    if (!year || !month) {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }
    
    year = parseInt(year);
    month = parseInt(month);
    
    if (month < 1 || month > 12) {
      throw new Error('月份必须在 1-12 之间');
    }
    
    const records = moodRepository.findByMonth(userId, year, month);
    const stats = moodRepository.getStats(userId, year, month);
    
    return {
      records,
      stats
    };
  }

  deleteMood(userId, date) {
    const result = moodRepository.delete(userId, date);
    if (result) {
      userRepository.updateStats(userId);
    }
    return result;
  }
}

module.exports = new MoodService();
