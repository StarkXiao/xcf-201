const roomRepository = require('../repositories/roomRepository');
const storyRepository = require('../repositories/storyRepository');
const achievementRepository = require('../repositories/achievementRepository');
const taskRepository = require('../repositories/taskRepository');

class RoomService {
  getRoomList(userId) {
    const rooms = roomRepository.findAll(userId);
    const unlockedCount = roomRepository.getUnlockedCount(userId);
    const totalCount = roomRepository.getTotalCount();
    
    const formattedRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      coverImage: room.cover_image,
      unlockCondition: room.unlock_condition,
      requiredDays: room.required_days,
      isUnlocked: !!room.is_unlocked,
      progress: room.current_chapter,
      totalChapters: room.total_chapters,
      unlockedAt: room.unlocked_at
    }));
    
    return {
      rooms: formattedRooms,
      unlockedCount,
      totalCount
    };
  }

  getRoomDetail(userId, roomId) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }
    
    const stories = storyRepository.findByRoomId(roomId);
    
    const chapters = stories.map((story, index) => ({
      id: story.id,
      title: story.title,
      chapterNumber: story.chapter_number,
      content: story.content,
      isUnlocked: index < room.current_chapter || index === 0
    }));
    
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      coverImage: room.cover_image,
      chapters,
      currentChapter: room.current_chapter
    };
  }

  unlockRoom(userId, roomId) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (room.is_unlocked) {
      return { success: false, message: '房间已解锁' };
    }
    
    const result = roomRepository.unlockRoom(userId, roomId);
    
    if (result.success) {
      const unlockedCount = roomRepository.getUnlockedCount(userId);
      achievementRepository.checkAndUnlock(userId, 'rooms_unlocked', unlockedCount);
    }
    
    return result;
  }

  readChapter(userId, roomId, chapterNumber) {
    const room = roomRepository.findById(userId, roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (!room.is_unlocked) {
      throw new Error('房间未解锁');
    }
    
    const story = storyRepository.findByChapter(roomId, chapterNumber);
    if (!story) {
      throw new Error('章节不存在');
    }
    
    roomRepository.updateProgress(userId, roomId, chapterNumber);
    
    const chaptersRead = roomRepository.getChaptersRead(userId);
    achievementRepository.checkAndUnlock(userId, 'chapters_read', chaptersRead);
    
    const totalChapters = roomRepository.findById(userId, roomId).total_chapters;
    if (chapterNumber >= totalChapters) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      taskRepository.updateProgress(userId, 5, todayStr, 1);
    }
    
    return {
      success: true,
      story: {
        id: story.id,
        title: story.title,
        chapterNumber: story.chapter_number,
        content: story.content
      }
    };
  }
}

module.exports = new RoomService();
