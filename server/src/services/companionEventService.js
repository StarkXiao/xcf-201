const companionEventRepository = require('../repositories/companionEventRepository');
const companionRepository = require('../repositories/companionRepository');
const companionService = require('./companionService');

class CompanionEventService {
  getAvailableEvents(userId, companionId) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) {
      return { success: false, message: '旅伴不存在' };
    }

    const events = companionEventRepository.findAvailableEvents(
      userId,
      companionId,
      companion.companion_template_id,
      companion.level,
      companion.intimacy
    );

    return {
      success: true,
      data: events.map(event => this.formatEvent(event, companion))
    };
  }

  getCompletedEvents(userId, companionId) {
    const events = companionEventRepository.getUserEvents(userId, companionId);
    return {
      success: true,
      data: events.map(event => ({
        ...event,
        choiceMade: event.choice_made ? JSON.parse(event.choice_made) : null,
        rewards: event.rewards ? JSON.parse(event.rewards) : null,
        completedAt: event.completed_at
      }))
    };
  }

  triggerEvent(userId, companionId, eventId) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) {
      return { success: false, message: '旅伴不存在' };
    }

    const event = companionEventRepository.findEventById(eventId);
    if (!event) {
      return { success: false, message: '事件不存在' };
    }

    if (event.is_unique && companionEventRepository.hasCompletedEvent(userId, companionId, eventId)) {
      return { success: false, message: '该事件只能触发一次' };
    }

    if (event.required_level > companion.level) {
      return { success: false, message: `需要旅伴等级达到 ${event.required_level} 级` };
    }

    if (event.required_intimacy > companion.intimacy) {
      return { success: false, message: `需要亲密度达到 ${event.required_intimacy}` };
    }

    return {
      success: true,
      data: {
        event: this.formatEvent(event, companion),
        content: event.content,
        choices: event.choices ? JSON.parse(event.choices) : [],
        rewards: event.rewards ? JSON.parse(event.rewards) : null
      }
    };
  }

  completeEvent(userId, companionId, eventId, choiceId = null) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) {
      return { success: false, message: '旅伴不存在' };
    }

    const event = companionEventRepository.findEventById(eventId);
    if (!event) {
      return { success: false, message: '事件不存在' };
    }

    const choices = event.choices ? JSON.parse(event.choices) : [];
    const selectedChoice = choices.find(c => c.id === choiceId);

    let intimacyGain = selectedChoice?.intimacy || 0;
    let expGain = selectedChoice?.exp || 0;
    const rewards = event.rewards ? JSON.parse(event.rewards) : null;

    if (rewards) {
      intimacyGain += rewards.intimacy || 0;
      expGain += rewards.exp || 0;
    }

    const result = companionRepository.updateCompanionStats(
      userId, companionId, expGain, intimacyGain
    );

    companionRepository.addGrowthLog(
      userId, companionId,
      'event',
      `完成了事件「${event.title}」`,
      expGain, intimacyGain,
      'event', eventId
    );

    const userEvent = companionEventRepository.completeEvent(
      userId, companionId, eventId,
      selectedChoice ? { choiceId, text: selectedChoice.text } : null,
      true
    );

    const taskRepository = require('../repositories/taskRepository');
    taskRepository.updateTaskProgress(userId, 'companion_event', 1);

    if (result.leveledUp) {
      this.checkAndTriggerEvents(userId, companionId, 'companion_level_up', {
        newLevel: result.newLevel,
        oldLevel: result.oldLevel
      });
    }

    return {
      success: true,
      message: `事件「${event.title}」已完成`,
      data: {
        eventId,
        intimacyGain,
        expGain,
        rewards,
        selectedChoice,
        leveledUp: result.leveledUp,
        newLevel: result.level,
        companion: companionService.formatCompanionData(result)
      }
    };
  }

  checkAndTriggerEvents(userId, companionId, triggerType, triggerData = {}) {
    const companion = companionRepository.findUserCompanionById(userId, companionId);
    if (!companion) return [];

    const triggeredEvents = companionEventRepository.findTriggeredEvents(
      userId, companionId, triggerType, triggerData
    );

    const autoTriggered = [];

    for (const event of triggeredEvents) {
      if (companionEventRepository.hasCompletedEvent(userId, companionId, event.id)) {
        continue;
      }

      if (event.required_level > companion.level || event.required_intimacy > companion.intimacy) {
        continue;
      }

      autoTriggered.push({
        ...this.formatEvent(event, companion),
        content: event.content,
        choices: event.choices ? JSON.parse(event.choices) : [],
        rewards: event.rewards ? JSON.parse(event.rewards) : null
      });
    }

    return autoTriggered;
  }

  checkActionTriggers(userId, actionType, actionData = {}) {
    const companion = companionRepository.findActiveCompanion(userId);
    if (!companion) return [];

    return this.checkAndTriggerEvents(userId, companion.id, actionType, actionData);
  }

  formatEvent(event, companion) {
    const triggerCondition = event.trigger_condition ? JSON.parse(event.trigger_condition) : null;

    return {
      id: event.id,
      companionTemplateId: event.companion_template_id,
      companionName: event.companion_name || companion?.template_name,
      type: event.event_type,
      title: event.title,
      description: event.description,
      triggerCondition,
      requiredLevel: event.required_level,
      requiredIntimacy: event.required_intimacy,
      isUnique: !!event.is_unique,
      sortOrder: event.sort_order
    };
  }

  getEventRewards(eventId) {
    const event = companionEventRepository.findEventById(eventId);
    if (!event) return null;
    return event.rewards ? JSON.parse(event.rewards) : null;
  }
}

module.exports = new CompanionEventService();
