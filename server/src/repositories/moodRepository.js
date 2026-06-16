const db = require('../config/database');

const VALID_SEGMENTS = ['morning', 'afternoon', 'evening', 'day'];
const BACKFILL_DAYS = 7;

class MoodRepository {
  create(userId, date, timeSegment, moodType, content = '', tags = [], tagWeights = {}) {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const tagWeightsStr = typeof tagWeights === 'object' ? JSON.stringify(tagWeights) : tagWeights;
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO moods (user_id, record_date, time_segment, mood_type, content, tags, tag_weights)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, date, timeSegment, moodType, content, tagsStr, tagWeightsStr);
    return this.findByDateAndSegment(userId, date, timeSegment);
  }

  findByDateAndSegment(userId, date, timeSegment) {
    const stmt = db.prepare(`
      SELECT id, user_id, record_date, time_segment, mood_type, content, tags, tag_weights, created_at
      FROM moods
      WHERE user_id = ? AND record_date = ? AND time_segment = ?
    `);
    const result = stmt.get(userId, date, timeSegment);
    return this.formatMood(result);
  }

  findByDate(userId, date) {
    const stmt = db.prepare(`
      SELECT id, user_id, record_date, time_segment, mood_type, content, tags, tag_weights, created_at
      FROM moods
      WHERE user_id = ? AND record_date = ?
      ORDER BY 
        CASE time_segment 
          WHEN 'morning' THEN 1 
          WHEN 'afternoon' THEN 2 
          WHEN 'evening' THEN 3 
          WHEN 'day' THEN 4 
          ELSE 5 
        END
    `);
    const results = stmt.all(userId, date);
    return results.map(r => this.formatMood(r));
  }

  getDayAggregate(userId, date) {
    const segments = this.findByDate(userId, date);
    if (segments.length === 0) return null;

    const moodScores = {
      happy: 5,
      calm: 4,
      sad: 2,
      anxious: 1,
      angry: 0
    };

    const segmentWeights = {
      morning: 0.3,
      afternoon: 0.3,
      evening: 0.4,
      day: 1.0
    };

    let totalWeight = 0;
    let weightedScore = 0;
    const moodTypes = [];
    let totalContentLength = 0;
    const allTags = new Set();
    let totalTagWeight = 0;

    for (const seg of segments) {
      const weight = segmentWeights[seg.time_segment] || 0.33;
      const score = moodScores[seg.mood_type] !== undefined ? moodScores[seg.mood_type] : 3;
      
      weightedScore += score * weight;
      totalWeight += weight;
      
      if (!moodTypes.includes(seg.mood_type)) {
        moodTypes.push(seg.mood_type);
      }
      
      if (seg.content) {
        totalContentLength += seg.content.length;
      }
      
      if (seg.tags) {
        seg.tags.forEach(t => allTags.add(t));
      }
      
      if (seg.tag_weights) {
        totalTagWeight += Object.values(seg.tag_weights).reduce((a, b) => a + b, 0);
      }
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 3;
    
    let dominantMood = 'calm';
    const moodEntries = Object.entries(moodScores);
    for (let i = moodEntries.length - 1; i >= 0; i--) {
      if (finalScore >= moodEntries[i][1] - 0.5) {
        dominantMood = moodEntries[i][0];
        break;
      }
    }

    return {
      record_date: date,
      segments,
      segmentCount: segments.length,
      dominantMood,
      averageScore: finalScore,
      moodTypes,
      totalContentLength,
      tags: Array.from(allTags),
      totalTagWeight
    };
  }

  findByMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT id, user_id, record_date, time_segment, mood_type, content, tags, tag_weights, created_at
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      ORDER BY record_date, 
        CASE time_segment 
          WHEN 'morning' THEN 1 
          WHEN 'afternoon' THEN 2 
          WHEN 'evening' THEN 3 
          WHEN 'day' THEN 4 
          ELSE 5 
        END
    `);
    const results = stmt.all(userId, startDate, endDate);
    return results.map(r => this.formatMood(r));
  }

  getMonthAggregates(userId, year, month) {
    const records = this.findByMonth(userId, year, month);
    const dateMap = new Map();

    for (const record of records) {
      if (!dateMap.has(record.record_date)) {
        dateMap.set(record.record_date, []);
      }
      dateMap.get(record.record_date).push(record);
    }

    const aggregates = [];
    for (const [date, segments] of dateMap) {
      const agg = this.getDayAggregate(userId, date);
      if (agg) {
        aggregates.push(agg);
      }
    }

    return aggregates;
  }

  getStats(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const distStmt = db.prepare(`
      SELECT mood_type, COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      GROUP BY mood_type
    `);
    const distribution = distStmt.all(userId, startDate, endDate);
    
    const moodDist = {};
    distribution.forEach(d => {
      moodDist[d.mood_type] = d.count;
    });

    const segmentStmt = db.prepare(`
      SELECT time_segment, COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
      GROUP BY time_segment
    `);
    const segmentDist = segmentStmt.all(userId, startDate, endDate);
    const segmentDistribution = {};
    segmentDist.forEach(s => {
      segmentDistribution[s.time_segment] = s.count;
    });

    const dayCountStmt = db.prepare(`
      SELECT COUNT(DISTINCT record_date) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
    `);
    const { count: daysWithRecords } = dayCountStmt.get(userId, startDate, endDate);

    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND record_date BETWEEN ? AND ?
    `);
    const { count: totalThisMonth } = totalStmt.get(userId, startDate, endDate);

    const multiSegmentStmt = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT record_date, COUNT(*) as seg_count
        FROM moods
        WHERE user_id = ? AND record_date BETWEEN ? AND ?
        GROUP BY record_date
        HAVING seg_count >= 3
      )
    `);
    const { count: multiSegmentDays } = multiSegmentStmt.get(userId, startDate, endDate);
    
    const streakDays = this.getStreakDays(userId);
    const multiSegmentStreak = this.getMultiSegmentStreak(userId);
    
    return {
      moodDistribution: moodDist,
      segmentDistribution,
      streakDays,
      multiSegmentStreak,
      totalThisMonth,
      totalRecords: totalThisMonth,
      daysWithRecords,
      multiSegmentDays
    };
  }

  getStreakDays(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ?
      ORDER BY record_date DESC
    `);
    const dates = stmt.all(userId);
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const recordDate = new Date(dates[i].record_date);
      recordDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && recordDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (recordDate.getTime() === yesterday.getTime()) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return streak;
  }

  getMultiSegmentStreak(userId) {
    const stmt = db.prepare(`
      SELECT record_date, COUNT(DISTINCT time_segment) as seg_count
      FROM moods
      WHERE user_id = ? AND time_segment IN ('morning', 'afternoon', 'evening')
      GROUP BY record_date
      HAVING seg_count >= 3
      ORDER BY record_date DESC
    `);
    const dates = stmt.all(userId);
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const recordDate = new Date(dates[i].record_date);
      recordDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && recordDate < expectedDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (recordDate.getTime() === yesterday.getTime()) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return streak;
  }

  getSegmentCount(userId, segment) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM moods
      WHERE user_id = ? AND time_segment = ?
    `);
    return stmt.get(userId, segment).count;
  }

  getMultiSegmentDaysCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT record_date, COUNT(DISTINCT time_segment) as seg_count
        FROM moods
        WHERE user_id = ? AND time_segment IN ('morning', 'afternoon', 'evening')
        GROUP BY record_date
        HAVING seg_count >= 3
      )
    `);
    return stmt.get(userId).count;
  }

  getTotalTagWeightCount(userId) {
    const stmt = db.prepare(`
      SELECT tag_weights
      FROM moods
      WHERE user_id = ? AND tag_weights IS NOT NULL AND tag_weights != ''
    `);
    const results = stmt.all(userId);
    let count = 0;
    
    for (const row of results) {
      try {
        const weights = JSON.parse(row.tag_weights);
        count += Object.keys(weights).length;
      } catch (e) {
        // skip invalid JSON
      }
    }
    
    return count;
  }

  getMoodTypes(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT mood_type
      FROM moods
      WHERE user_id = ?
    `);
    return stmt.all(userId).map(r => r.mood_type);
  }

  canBackfill(userId, date) {
    const recordDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    recordDate.setHours(0, 0, 0, 0);
    
    if (recordDate > today) {
      return { allowed: false, reason: '不能记录未来的心情' };
    }
    
    const diffTime = today.getTime() - recordDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > BACKFILL_DAYS) {
      return { allowed: false, reason: `最多只能补录过去 ${BACKFILL_DAYS} 天的心情` };
    }
    
    return { allowed: true };
  }

  delete(userId, date, timeSegment = null) {
    let stmt;
    if (timeSegment) {
      stmt = db.prepare(`
        DELETE FROM moods WHERE user_id = ? AND record_date = ? AND time_segment = ?
      `);
      const result = stmt.run(userId, date, timeSegment);
      return result.changes > 0;
    } else {
      stmt = db.prepare(`
        DELETE FROM moods WHERE user_id = ? AND record_date = ?
      `);
      const result = stmt.run(userId, date);
      return result.changes > 0;
    }
  }

  formatMood(result) {
    if (!result) return null;
    
    return {
      ...result,
      tags: result.tags ? result.tags.split(',').filter(t => t) : [],
      tag_weights: result.tag_weights ? JSON.parse(result.tag_weights) : {}
    };
  }

  getValidSegments() {
    return [...VALID_SEGMENTS];
  }

  getBackfillDays() {
    return BACKFILL_DAYS;
  }

  getLastRecordDate(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ?
      ORDER BY record_date DESC
      LIMIT 1
    `);
    const result = stmt.get(userId);
    return result ? result.record_date : null;
  }

  getUniqueDates(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT record_date
      FROM moods
      WHERE user_id = ?
      ORDER BY record_date DESC
    `);
    return stmt.all(userId);
  }
}

module.exports = new MoodRepository();
