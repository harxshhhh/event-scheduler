const pool = require('../db/pool');

/**
 * Checks whether a given user already has a scheduled event that overlaps
 * with the candidate time range.
 *
 * @param {number} userId
 * @param {string} candidateStart - ISO timestamp, e.g. "2026-09-08T10:00:00"
 * @param {string} candidateEnd   - ISO timestamp, e.g. "2026-09-08T11:00:00"
 * @returns {boolean} true if there IS a conflict, false if the user is free
 */
async function hasTimeConflict(userId, candidateStart, candidateEnd) {
  const result = await pool.query(
    `SELECT e.id, e.title, e.scheduled_start, e.scheduled_end
     FROM events e
     JOIN event_participants ep ON ep.event_id = e.id
     WHERE ep.user_id = $1
       AND e.status = 'scheduled'
       AND e.scheduled_start < $3
       AND e.scheduled_end > $2`,
    [userId, candidateStart, candidateEnd]
  );

  return result.rows.length > 0;
}

module.exports = { hasTimeConflict };
