const db = require('../config/database');

class EmotionPrescriptionRepository {
  createPrescription(data) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO emotion_prescriptions 
      (user_id, period_type, start_date, end_date, mood_trend, avg_mood_score, 
       dominant_mood, mood_fluctuation, suggestions, companion_advice, 
       room_recommendations, task_recommendations, highlights, insights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.userId,
      data.periodType,
      data.startDate,
      data.endDate,
      data.moodTrend,
      data.avgMoodScore,
      data.dominantMood,
      data.moodFluctuation,
      JSON.stringify(data.suggestions || []),
      JSON.stringify(data.companionAdvice || []),
      JSON.stringify(data.roomRecommendations || []),
      JSON.stringify(data.taskRecommendations || []),
      JSON.stringify(data.highlights || []),
      JSON.stringify(data.insights || [])
    );
    
    return this.findPrescriptionById(result.lastInsertRowid);
  }

  findPrescriptionById(id) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_prescriptions WHERE id = ?
    `);
    const result = stmt.get(id);
    return this.formatPrescription(result);
  }

  findLatestPrescription(userId, periodType = 'weekly') {
    const stmt = db.prepare(`
      SELECT * FROM emotion_prescriptions 
      WHERE user_id = ? AND period_type = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    const result = stmt.get(userId, periodType);
    return this.formatPrescription(result);
  }

  findPrescriptionsByPeriod(userId, periodType, limit = 12) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_prescriptions 
      WHERE user_id = ? AND period_type = ?
      ORDER BY start_date DESC LIMIT ?
    `);
    const results = stmt.all(userId, periodType, limit);
    return results.map(r => this.formatPrescription(r));
  }

  findPrescriptionByDateRange(userId, periodType, startDate, endDate) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_prescriptions 
      WHERE user_id = ? AND period_type = ? AND start_date = ? AND end_date = ?
    `);
    const result = stmt.get(userId, periodType, startDate, endDate);
    return this.formatPrescription(result);
  }

  markAsViewed(id) {
    const stmt = db.prepare(`
      UPDATE emotion_prescriptions SET is_viewed = 1 WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getPrescriptionStats(userId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN is_viewed = 1 THEN 1 ELSE 0 END) as viewedCount,
        MAX(created_at) as lastGeneratedAt
      FROM emotion_prescriptions 
      WHERE user_id = ?
    `);
    return stmt.get(userId);
  }

  createStageArchive(data) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO emotion_stage_archives 
      (user_id, archive_type, period_label, start_date, end_date, 
       mood_summary, room_journey, task_accomplishments, growth_insights,
       title, total_mood_records, total_chapters_read, total_tasks_completed, avg_mood_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.userId,
      data.archiveType,
      data.periodLabel,
      data.startDate,
      data.endDate,
      JSON.stringify(data.moodSummary || {}),
      JSON.stringify(data.roomJourney || []),
      JSON.stringify(data.taskAccomplishments || []),
      JSON.stringify(data.growthInsights || []),
      data.title,
      data.totalMoodRecords || 0,
      data.totalChaptersRead || 0,
      data.totalTasksCompleted || 0,
      data.avgMoodScore || 0
    );
    
    return this.findArchiveById(result.lastInsertRowid);
  }

  findArchiveById(id) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_stage_archives WHERE id = ?
    `);
    const result = stmt.get(id);
    return this.formatArchive(result);
  }

  findLatestArchive(userId, archiveType = 'monthly') {
    const stmt = db.prepare(`
      SELECT * FROM emotion_stage_archives 
      WHERE user_id = ? AND archive_type = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    const result = stmt.get(userId, archiveType);
    return this.formatArchive(result);
  }

  findAllArchives(userId, limit = 12) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_stage_archives 
      WHERE user_id = ?
      ORDER BY start_date DESC LIMIT ?
    `);
    const results = stmt.all(userId, limit);
    return results.map(r => this.formatArchive(r));
  }

  findArchivesByType(userId, archiveType, limit = 12) {
    const stmt = db.prepare(`
      SELECT * FROM emotion_stage_archives 
      WHERE user_id = ? AND archive_type = ?
      ORDER BY start_date DESC LIMIT ?
    `);
    const results = stmt.all(userId, archiveType, limit);
    return results.map(r => this.formatArchive(r));
  }

  formatPrescription(result) {
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      periodType: result.period_type,
      startDate: result.start_date,
      endDate: result.end_date,
      moodTrend: result.mood_trend,
      avgMoodScore: result.avg_mood_score,
      dominantMood: result.dominant_mood,
      moodFluctuation: result.mood_fluctuation,
      suggestions: result.suggestions ? JSON.parse(result.suggestions) : [],
      companionAdvice: result.companion_advice ? JSON.parse(result.companion_advice) : [],
      roomRecommendations: result.room_recommendations ? JSON.parse(result.room_recommendations) : [],
      taskRecommendations: result.task_recommendations ? JSON.parse(result.task_recommendations) : [],
      highlights: result.highlights ? JSON.parse(result.highlights) : [],
      insights: result.insights ? JSON.parse(result.insights) : [],
      isViewed: !!result.is_viewed,
      createdAt: result.created_at
    };
  }

  formatArchive(result) {
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      archiveType: result.archive_type,
      periodLabel: result.period_label,
      startDate: result.start_date,
      endDate: result.end_date,
      moodSummary: result.mood_summary ? JSON.parse(result.mood_summary) : {},
      roomJourney: result.room_journey ? JSON.parse(result.room_journey) : [],
      taskAccomplishments: result.task_accomplishments ? JSON.parse(result.task_accomplishments) : [],
      growthInsights: result.growth_insights ? JSON.parse(result.growth_insights) : [],
      title: result.title,
      totalMoodRecords: result.total_mood_records,
      totalChaptersRead: result.total_chapters_read,
      totalTasksCompleted: result.total_tasks_completed,
      avgMoodScore: result.avg_mood_score,
      createdAt: result.created_at
    };
  }
}

module.exports = new EmotionPrescriptionRepository();
