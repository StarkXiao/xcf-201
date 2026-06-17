const roomRepository = require('../repositories/roomRepository');
const storyRepository = require('../repositories/storyRepository');
const achievementRepository = require('../repositories/achievementRepository');
const taskRepository = require('../repositories/taskRepository');
const achievementService = require('./achievementService');
const moodRepository = require('../repositories/moodRepository');
const notificationEvents = require('../utils/notificationEvents');
const dreamCollectionService = require('./dreamCollectionService');
const wishCommissionService = require('./wishCommissionService');

class RoomService {
  getRoomList(userId) {
    const rooms = roomRepository.findAll(userId);
    const unlockedCount = roomRepository.getUnlockedCount(userId);
    const totalCount = roomRepository.getTotalCount();
    const userProgress = roomRepository.getUnlockProgress(userId);
    
    const formattedRooms = rooms.map(room => {
      const unlockConditions = room.unlock_conditions ? JSON.parse(room.unlock_conditions) : null;
      const requiredMoodTypes = room.required_mood_types ? JSON.parse(room.required_mood_types) : null;
      const requiredTasks = room.required_tasks ? JSON.parse(room.required_tasks) : null;
      
      const conditionProgress = this.getConditionProgress(
        userId, 
        unlockConditions, 
        requiredMoodTypes, 
        requiredTasks,
        userProgress
      );
      
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        coverImage: room.cover_image,
        unlockCondition: room.unlock_condition,
        requiredDays: room.required_days,
        requiredMultiSegmentDays: room.required_multi_segment_days,
        requiredMoodTypes: requiredMoodTypes,
        requiredChapters: room.required_chapters,
        requiredTasks: requiredTasks,
        unlockConditions: unlockConditions,
        conditionProgress: conditionProgress,
        isUnlocked: !!room.is_unlocked,
        progress: room.current_chapter,
        totalChapters: room.total_chapters,
        currentBranch: room.current_branch || 'main',
        unlockedAt: room.unlocked_at
      };
    });
    
    return {
      rooms: formattedRooms,
      unlockedCount,
      totalCount,
      userProgress
    };
  }

  getConditionProgress(userId, unlockConditions, requiredMoodTypes, requiredTasks, userProgress) {
    if (!unlockConditions) return null;
    
    const progress = {};
    
    if (unlockConditions.days !== undefined) {
      progress.days = {
        current: userProgress.totalRecordDays,
        target: unlockConditions.days,
        met: userProgress.totalRecordDays >= unlockConditions.days
      };
    }
    
    if (unlockConditions.multiSegmentDays !== undefined) {
      progress.multiSegmentDays = {
        current: userProgress.multiSegmentDays,
        target: unlockConditions.multiSegmentDays,
        met: userProgress.multiSegmentDays >= unlockConditions.multiSegmentDays
      };
    }
    
    if (unlockConditions.moodTypeCount !== undefined) {
      progress.moodTypeCount = {
        current: userProgress.moodTypeCount,
        target: unlockConditions.moodTypeCount,
        met: userProgress.moodTypeCount >= unlockConditions.moodTypeCount
      };
    }
    
    if (unlockConditions.chapters !== undefined) {
      progress.chapters = {
        current: userProgress.totalChaptersRead,
        target: unlockConditions.chapters,
        met: userProgress.totalChaptersRead >= unlockConditions.chapters
      };
    }
    
    if (unlockConditions.tasks && unlockConditions.tasks.length > 0) {
      const completedTaskIds = roomRepository.getCompletedTasks(userId, unlockConditions.tasks);
      progress.tasks = {
        current: completedTaskIds.length,
        target: unlockConditions.tasks.length,
        met: completedTaskIds.length >= unlockConditions.tasks.length,
        completedIds: completedTaskIds,
        requiredIds: unlockConditions.tasks
      };
    }
    
    return progress;
  }

  checkRoomUnlockConditions(userId, room) {
    const unlockConditions = room.unlock_conditions ? JSON.parse(room.unlock_conditions) : null;
    const requiredTasks = room.required_tasks ? JSON.parse(room.required_tasks) : null;
    const userProgress = roomRepository.getUnlockProgress(userId);
    
    const result = {
      canUnlock: true,
      failedConditions: [],
      progress: null
    };
    
    if (!unlockConditions) {
      return result;
    }
    
    const conditionProgress = this.getConditionProgress(
      userId, 
      unlockConditions, 
      room.required_mood_types ? JSON.parse(room.required_mood_types) : null,
      requiredTasks,
      userProgress
    );
    
    result.progress = conditionProgress;
    
    for (const [key, value] of Object.entries(conditionProgress)) {
      if (!value.met) {
        result.canUnlock = false;
        result.failedConditions.push(key);
      }
    }
    
    return result;
  }

  getRoomDetail(userId, roomId, branchKey = null) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const activeBranch = branchKey || room.current_branch || 'main';
    
    const branchStories = storyRepository.findByRoomAndBranch(roomId, activeBranch);
    
    const branchProgress = roomRepository.getBranchProgress(userId, roomId, activeBranch);
    const maxChapterReached = branchProgress?.max_chapter_reached || 0;
    
    const chapters = branchStories.map((story, index) => {
      const chapterNum = story.chapter_number;
      const isUnlocked = chapterNum <= Math.max(maxChapterReached + 1, 1);
      
      return {
        id: story.id,
        title: story.title,
        chapterNumber: story.chapter_number,
        content: story.content,
        branchKey: story.branch_key,
        branchLabel: story.branch_label,
        isBranchPoint: story.is_branch_point,
        isEnding: story.is_ending,
        conditions: story.conditions,
        isUnlocked: isUnlocked,
        isRead: chapterNum <= maxChapterReached
      };
    });

    const allBranches = storyRepository.getBranchesForRoom(roomId);
    const availableBranches = this.getAvailableBranches(userId, roomId);
    const allBranchProgress = roomRepository.getAllBranchProgress(userId, roomId);

    const branchPoints = [];
    for (const story of branchStories) {
      if (story.is_branch_point) {
        const childBranches = storyRepository.getChildBranches(roomId, story.chapter_number);
        const childBranchesWithStatus = childBranches.map(cb => ({
          ...cb,
          isAvailable: this.checkBranchCondition(userId, cb.conditions),
          hasRead: allBranchProgress.some(bp => bp.branch_key === cb.branch_key && bp.max_chapter_reached > 0)
        }));
        branchPoints.push({
          chapterNumber: story.chapter_number,
          storyId: story.id,
          branches: childBranchesWithStatus
        });
      }
    }

    const history = roomRepository.getStoryHistory(userId, roomId);
    
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      coverImage: room.cover_image,
      chapters,
      currentBranch: activeBranch,
      currentChapter: maxChapterReached,
      totalChapters: branchStories.length,
      allBranches,
      availableBranches,
      branchProgress: allBranchProgress,
      branchPoints,
      history: history.slice(0, 20)
    };
  }

  unlockRoom(userId, roomId) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (room.is_unlocked) {
      return { success: false, message: '房间已解锁', notificationEvents: [] };
    }
    
    const checkResult = this.checkRoomUnlockConditions(userId, room);
    
    if (!checkResult.canUnlock) {
      const failedMessages = this.getFailedConditionMessages(checkResult.failedConditions, checkResult.progress);
      return {
        success: false,
        message: '解锁条件未满足',
        details: failedMessages,
        progress: checkResult.progress,
        notificationEvents: []
      };
    }
    
    const result = roomRepository.unlockRoom(userId, roomId);
    
    const events = [];
    
    if (result.success) {
      roomRepository.ensureBranchProgress(userId, roomId, 'main');
      roomRepository.setActiveBranch(userId, roomId, 'main');
      
      const unlockedCount = roomRepository.getUnlockedCount(userId);
      const newlyUnlockedAchievements = achievementRepository.checkAndUnlock(userId, 'rooms_unlocked', unlockedCount);
      
      events.push(notificationEvents.createRoomUnlockedEvent(room));
      
      if (newlyUnlockedAchievements && newlyUnlockedAchievements.length > 0) {
        newlyUnlockedAchievements.forEach(achievement => {
          if (achievement) {
            events.push(notificationEvents.createAchievementUnlockedEvent(achievement));
          }
        });
      }
      
      try {
        wishCommissionService.updateAllCommissions(userId);
      } catch (e) {
        console.error('更新心愿委托进度失败:', e);
      }
    }
    
    return {
      ...result,
      notificationEvents: events
    };
  }

  getFailedConditionMessages(failedConditions, progress) {
    const messages = [];
    const conditionLabels = {
      days: '记录天数',
      multiSegmentDays: '多段记录天数',
      moodTypeCount: '情绪类型数量',
      chapters: '章节阅读数',
      tasks: '任务完成数'
    };
    
    for (const key of failedConditions) {
      const p = progress[key];
      if (p) {
        messages.push(`${conditionLabels[key] || key}: ${p.current} / ${p.target}`);
      }
    }
    
    return messages;
  }

  readChapter(userId, roomId, chapterNumber, branchKey = null) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const activeBranch = branchKey || room.current_branch || 'main';
    
    const story = storyRepository.getStoryByBranchAndChapter(roomId, activeBranch, chapterNumber);
    if (!story) {
      throw new Error('章节不存在');
    }
    
    roomRepository.updateBranchProgress(userId, roomId, activeBranch, story.id, chapterNumber);
    roomRepository.addStoryToHistory(userId, roomId, story.id, activeBranch);
    
    if (chapterNumber > (room.current_chapter || 0)) {
      roomRepository.updateProgress(userId, roomId, chapterNumber);
    }
    
    const chaptersRead = roomRepository.getChaptersRead(userId);
    achievementRepository.checkAndUnlock(userId, 'chapters_read', chaptersRead);
    
    const branchStories = storyRepository.findByRoomAndBranch(roomId, activeBranch);
    const totalChapters = branchStories.length;
    
    achievementService.updateTaskProgress(userId, 'story_read', 1);

    dreamCollectionService.unlockStoryCard(userId, {
      roomId: roomId,
      storyId: story.id,
      cardType: story.is_ending ? 'ending' : (story.is_branch_point ? 'branch_point' : 'chapter'),
      title: story.title,
      excerpt: story.content ? story.content.substring(0, 120) : null,
      roomName: room.name,
      branchLabel: story.branch_label || null,
      moodTheme: null
    });

    let nextBranchChoices = [];
    if (story.is_branch_point) {
      const childBranches = storyRepository.getChildBranches(roomId, chapterNumber);
      nextBranchChoices = childBranches.map(cb => ({
        ...cb,
        isAvailable: this.checkBranchCondition(userId, cb.conditions)
      }));
    }
    
    try {
      wishCommissionService.updateAllCommissions(userId);
    } catch (e) {
      console.error('更新心愿委托进度失败:', e);
    }
    
    return {
      success: true,
      story: {
        id: story.id,
        title: story.title,
        chapterNumber: story.chapter_number,
        content: story.content,
        branchKey: story.branch_key,
        branchLabel: story.branch_label,
        isBranchPoint: story.is_branch_point,
        isEnding: story.is_ending
      },
      nextBranchChoices,
      currentBranch: activeBranch
    };
  }

  getAvailableBranches(userId, roomId) {
    const allBranches = storyRepository.getBranchesForRoom(roomId);
    const branchProgress = roomRepository.getAllBranchProgress(userId, roomId);
    
    return allBranches.map(branch => {
      const progress = branchProgress.find(bp => bp.branch_key === branch.branch_key);
      const sampleStory = storyRepository.getStoryByBranchAndChapter(roomId, branch.branch_key, 1);
      const conditions = sampleStory?.conditions || null;
      
      return {
        ...branch,
        isAvailable: this.checkBranchCondition(userId, conditions),
        isUnlocked: progress?.max_chapter_reached > 0,
        maxChapterReached: progress?.max_chapter_reached || 0,
        lastReadAt: progress?.last_read_at || null
      };
    });
  }

  checkBranchCondition(userId, conditions) {
    if (!conditions) return true;

    if (conditions.moodTypes && conditions.moodTypes.length > 0) {
      const recentMoods = this.getRecentDominantMoods(userId, 7);
      const hasMatchingMood = conditions.moodTypes.some(mt => 
        recentMoods.some(rm => rm.moodType === mt)
      );
      if (!hasMatchingMood && recentMoods.length > 0) {
        const topMood = this.getTopMoodType(recentMoods);
        if (!conditions.moodTypes.includes(topMood)) {
          return false;
        }
      }
    }

    if (conditions.streakDays) {
      const streakDays = moodRepository.getStreakDays(userId);
      if (streakDays < conditions.streakDays) {
        return false;
      }
    }

    if (conditions.moodTypeCount) {
      const moodTypes = moodRepository.getMoodTypes(userId);
      if (moodTypes.length < conditions.moodTypeCount) {
        return false;
      }
    }

    if (conditions.completedTasks && conditions.completedTasks.length > 0) {
      for (const taskId of conditions.completedTasks) {
        const task = taskRepository.findById(taskId);
        if (!task) continue;
        
        if (task.type === 'daily') {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const userTask = taskRepository.getUserTask(userId, taskId, todayStr);
          if (!userTask || !userTask.is_completed) {
            return false;
          }
        } else {
          const userOnceTasks = taskRepository.getUserOnceTasks(userId);
          const userTask = userOnceTasks.find(t => t.id === taskId);
          if (!userTask || !userTask.is_completed) {
            return false;
          }
        }
      }
    }

    return true;
  }

  getRecentDominantMoods(userId, days = 7) {
    const today = new Date();
    const moods = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const aggregate = moodRepository.getDayAggregate(userId, dateStr);
      if (aggregate) {
        moods.push({
          date: dateStr,
          moodType: aggregate.dominantMood,
          score: aggregate.averageScore
        });
      }
    }
    
    return moods;
  }

  getTopMoodType(moods) {
    const moodCount = {};
    for (const mood of moods) {
      moodCount[mood.moodType] = (moodCount[mood.moodType] || 0) + 1;
    }
    
    let topMood = 'calm';
    let maxCount = 0;
    for (const [moodType, count] of Object.entries(moodCount)) {
      if (count > maxCount) {
        maxCount = count;
        topMood = moodType;
      }
    }
    
    return topMood;
  }

  chooseBranch(userId, roomId, branchKey) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const branches = storyRepository.getBranchesForRoom(roomId);
    const branchExists = branches.some(b => b.branch_key === branchKey);
    if (!branchExists) {
      throw new Error('分支不存在');
    }

    const sampleStory = storyRepository.getStoryByBranchAndChapter(roomId, branchKey, 1);
    const conditions = sampleStory?.conditions || null;
    
    if (!this.checkBranchCondition(userId, conditions)) {
      throw new Error('不满足该分支的解锁条件');
    }

    roomRepository.setActiveBranch(userId, roomId, branchKey);
    roomRepository.ensureBranchProgress(userId, roomId, branchKey);

    return {
      success: true,
      message: '分支切换成功',
      currentBranch: branchKey
    };
  }

  getBranchDetail(userId, roomId, branchKey) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const branches = storyRepository.getBranchesForRoom(roomId);
    const branchExists = branches.some(b => b.branch_key === branchKey);
    if (!branchExists) {
      throw new Error('分支不存在');
    }

    const branchStories = storyRepository.findByRoomAndBranch(roomId, branchKey);
    const progress = roomRepository.getBranchProgress(userId, roomId, branchKey);
    const sampleStory = branchStories[0];

    return {
      branchKey,
      branchLabel: sampleStory?.branch_label || branchKey,
      totalChapters: branchStories.length,
      maxChapterReached: progress?.max_chapter_reached || 0,
      lastReadAt: progress?.last_read_at || null,
      conditions: sampleStory?.conditions || null,
      isAvailable: this.checkBranchCondition(userId, sampleStory?.conditions || null),
      chapters: branchStories.map((s, i) => ({
        id: s.id,
        title: s.title,
        chapterNumber: s.chapter_number,
        isUnlocked: i < (progress?.max_chapter_reached || 0) + 1,
        isRead: i < (progress?.max_chapter_reached || 0)
      }))
    };
  }

  getStoryHistory(userId, roomId) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const history = roomRepository.getStoryHistory(userId, roomId);
    
    return {
      history,
      totalRead: history.length
    };
  }

  jumpToStory(userId, roomId, storyId) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }

    const story = storyRepository.findById(storyId);
    if (!story || story.room_id !== roomId) {
      throw new Error('故事不存在');
    }

    const readStoryIds = roomRepository.getReadStoryIds(userId, roomId);
    if (!readStoryIds.includes(storyId)) {
      throw new Error('该章节尚未阅读，无法跳转');
    }

    roomRepository.setActiveBranch(userId, roomId, story.branch_key);
    roomRepository.updateBranchProgress(userId, roomId, story.branch_key, storyId, story.chapter_number);

    dreamCollectionService.unlockStoryCard(userId, {
      roomId: roomId,
      storyId: story.id,
      cardType: story.is_ending ? 'ending' : (story.is_branch_point ? 'branch_point' : 'chapter'),
      title: story.title,
      excerpt: story.content ? story.content.substring(0, 120) : null,
      roomName: room.name,
      branchLabel: story.branch_label || null,
      moodTheme: null
    });

    return {
      success: true,
      story: {
        id: story.id,
        title: story.title,
        chapterNumber: story.chapter_number,
        content: story.content,
        branchKey: story.branch_key,
        branchLabel: story.branch_label,
        isBranchPoint: story.is_branch_point,
        isEnding: story.is_ending
      },
      currentBranch: story.branch_key
    };
  }
}

module.exports = new RoomService();
