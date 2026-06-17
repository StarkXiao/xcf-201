const notificationRepository = require('../repositories/notificationRepository');
const notificationEvents = require('../utils/notificationEvents');

class NotificationService {
  createFromEvent(userId, event, options = {}) {
    const relatedType = options.relatedType || this._getRelatedType(event.type);
    const relatedId = options.relatedId || this._getRelatedId(event);

    return notificationRepository.create({
      userId,
      type: event.type,
      category: event.category,
      icon: event.icon,
      title: event.title,
      message: event.message,
      data: event.data,
      priority: event.priority,
      duration: event.duration,
      relatedType,
      relatedId
    });
  }

  createManyFromEvents(userId, events, options = {}) {
    if (!Array.isArray(events) || events.length === 0) return [];

    const notifications = events.map(event => {
      const relatedType = (options.eventMap && options.eventMap[event.id]?.relatedType)
        || this._getRelatedType(event.type);
      const relatedId = (options.eventMap && options.eventMap[event.id]?.relatedId)
        || this._getRelatedId(event);

      return {
        userId,
        type: event.type,
        category: event.category,
        icon: event.icon,
        title: event.title,
        message: event.message,
        data: event.data,
        priority: event.priority,
        duration: event.duration,
        relatedType,
        relatedId
      };
    });

    return notificationRepository.batchCreate(notifications);
  }

  createMemoryLetterDeliveredNotification(userId, letter) {
    const event = notificationEvents.createMemoryLetterDeliveredEvent(letter);
    return this.createFromEvent(userId, event, {
      relatedType: 'memory_letter',
      relatedId: letter.id
    });
  }

  createMemoryLetterCreatedNotification(userId, letter) {
    const event = notificationEvents.createMemoryLetterCreatedEvent(letter);
    return this.createFromEvent(userId, event, {
      relatedType: 'memory_letter',
      relatedId: letter.id
    });
  }

  getUnread(userId, limit = 50) {
    return notificationRepository.findByUserId(userId, {
      limit,
      includeRead: false,
      includeDismissed: false
    });
  }

  getAll(userId, options = {}) {
    return notificationRepository.findByUserId(userId, {
      limit: options.limit || 50,
      offset: options.offset || 0,
      includeRead: options.includeRead !== false,
      includeDismissed: options.includeDismissed !== false
    });
  }

  getUnreadCount(userId) {
    return notificationRepository.getUnreadCount(userId);
  }

  markAsRead(userId, id) {
    return notificationRepository.markAsRead(userId, id);
  }

  markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  dismiss(userId, id) {
    return notificationRepository.dismiss(userId, id);
  }

  clearOld(userId, days = 30) {
    return notificationRepository.clearOld(userId, days);
  }

  _getRelatedType(eventType) {
    const typeMap = {
      [notificationEvents.EVENT_TYPES.MEMORY_LETTER_CREATED]: 'memory_letter',
      [notificationEvents.EVENT_TYPES.MEMORY_LETTER_DELIVERED]: 'memory_letter',
      [notificationEvents.EVENT_TYPES.MOOD_RECORDED]: 'mood_record',
      [notificationEvents.EVENT_TYPES.ROOM_UNLOCKED]: 'room',
      [notificationEvents.EVENT_TYPES.TASK_COMPLETED]: 'task',
      [notificationEvents.EVENT_TYPES.TASK_CLAIMABLE]: 'task',
      [notificationEvents.EVENT_TYPES.ACHIEVEMENT_UNLOCKED]: 'achievement'
    };
    return typeMap[eventType] || null;
  }

  _getRelatedId(event) {
    const data = event.data || {};
    return data.letterId
      || data.roomId
      || data.taskId
      || data.achievementId
      || null;
  }
}

module.exports = new NotificationService();
