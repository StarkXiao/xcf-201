const chapterNoteRepository = require('../repositories/chapterNoteRepository');
const roomRepository = require('../repositories/roomRepository');
const storyRepository = require('../repositories/storyRepository');
const taskRepository = require('../repositories/taskRepository');
const achievementService = require('./achievementService');

class ChapterNoteService {
  createNote(userId, roomId, storyId, content, moodTags = []) {
    if (!content || content.trim() === '') {
      throw new Error('札记内容不能为空');
    }

    const room = roomRepository.findById(userId, roomId);
    if (!room || !room.is_unlocked) {
      throw new Error('房间不存在或未解锁');
    }

    const story = storyRepository.findById(storyId);
    if (!story || story.room_id !== roomId) {
      throw new Error('章节不存在');
    }

    const readStoryIds = roomRepository.getReadStoryIds(userId, roomId);
    if (!readStoryIds.includes(storyId)) {
      throw new Error('请先阅读该章节后再写下札记');
    }

    const note = chapterNoteRepository.create(
      userId,
      roomId,
      storyId,
      story.chapter_number,
      story.branch_key,
      content.trim(),
      moodTags
    );

    const taskUpdates = [];
    const newlyCompletedTasks = [];

    const noteRecordResult = achievementService.updateTaskProgress(userId, 'chapter_note', 1);
    taskUpdates.push(...noteRecordResult.updates);
    newlyCompletedTasks.push(...noteRecordResult.newlyCompleted);

    const todayCount = chapterNoteRepository.getCountByDate(userId, this.getTodayStr());
    if (todayCount >= 3) {
      const deepNoteResult = achievementService.updateTaskProgress(userId, 'chapter_note_deep', 1);
      taskUpdates.push(...deepNoteResult.updates);
      newlyCompletedTasks.push(...deepNoteResult.newlyCompleted);
    }

    const totalCount = chapterNoteRepository.getTotalCount(userId);

    const noteTotalTaskIds = [28, 29, 30];
    noteTotalTaskIds.forEach(taskId => {
      const task = taskRepository.findById(taskId);
      if (task && task.type === 'once') {
        const existing = taskRepository.getUserTask(userId, taskId, new Date());
        const wasCompleted = existing && existing.is_completed;
        if (!wasCompleted) {
          const result = taskRepository.updateProgress(userId, taskId, totalCount);
          if (result) {
            taskUpdates.push({ taskId: task.id, type: 'once', current: result.current_progress });
            if (result.is_completed) {
              newlyCompletedTasks.push({
                taskId: task.id,
                title: task.title,
                reward: task.reward,
                type: 'once'
              });
            }
          }
        }
      }
    });

    return {
      note,
      newlyCompletedTasks,
      taskUpdates,
      totalCount
    };
  }

  getNoteByStoryId(userId, storyId) {
    return chapterNoteRepository.findByStoryId(userId, storyId);
  }

  getNotesByRoom(userId, roomId) {
    const notes = chapterNoteRepository.findByRoomId(userId, roomId);
    const count = chapterNoteRepository.getCountByRoom(userId, roomId);
    const stats = chapterNoteRepository.getStats(userId);

    return {
      notes,
      count,
      stats
    };
  }

  getMyNotes(userId, limit = 20, offset = 0) {
    const notes = chapterNoteRepository.findByUserId(userId, limit, offset);
    const totalCount = chapterNoteRepository.getTotalCount(userId);
    const stats = chapterNoteRepository.getStats(userId);

    return {
      notes,
      totalCount,
      stats
    };
  }

  deleteNote(userId, noteId) {
    if (!noteId) {
      throw new Error('札记ID不能为空');
    }

    const result = chapterNoteRepository.delete(userId, noteId);
    if (!result) {
      throw new Error('删除失败，札记不存在或无权限');
    }

    return { success: true };
  }

  getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
}

module.exports = new ChapterNoteService();
