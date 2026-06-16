const userRepository = require('../repositories/userRepository');
const achievementService = require('./achievementService');
const { hashPasswordSync, comparePasswordSync } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

class AuthService {
  async register(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('用户名、邮箱和密码不能为空');
    }
    
    if (username.length < 3 || username.length > 20) {
      throw new Error('用户名长度必须在 3-20 个字符之间');
    }
    
    if (password.length < 6) {
      throw new Error('密码长度不能少于 6 个字符');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('邮箱格式不正确');
    }
    
    const existingUser = userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }
    
    const existingEmail = userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('邮箱已被注册');
    }
    
    const passwordHash = hashPasswordSync(password);
    const user = userRepository.create(username, email, passwordHash);
    
    const token = generateToken({
      userId: user.id,
      username: user.username
    });
    
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      token
    };
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }
    
    const user = userRepository.findByUsername(username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }
    
    const isValid = comparePasswordSync(password, user.password_hash);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }
    
    const token = generateToken({
      userId: user.id,
      username: user.username
    });
    
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      token
    };
  }

  getProfile(userId) {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    const stats = userRepository.getStats(userId);
    const taskStats = achievementService.getTaskStats(userId);
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      checkInDays: stats.check_in_days,
      totalMoods: stats.total_moods,
      unlockedRooms: stats.unlocked_rooms,
      unlockedAchievements: stats.unlocked_achievements,
      taskStats: {
        dailyCompleted: taskStats.dailyCompleted,
        weeklyCompleted: taskStats.weeklyCompleted,
        onceCompleted: taskStats.onceCompleted,
        chainCompleted: taskStats.chainCompleted,
        totalCompleted: taskStats.totalCompleted,
        totalClaimed: taskStats.totalClaimed
      },
      createdAt: user.created_at
    };
  }
}

module.exports = new AuthService();
