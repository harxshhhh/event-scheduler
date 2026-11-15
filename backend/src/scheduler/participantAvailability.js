const pool = require('../db/pool');

/**
 * Checks whether a single user has declared availability that FULLY covers
 * the candidate time range.
 *
 * Availability is stored as day_of_week (0=Sunday..6=Saturday) + start_time/end_time
 * (time of day only, no specific date) -- so we derive the day-of-week and
 * time-of-day from the candidate's actual timestamp, then check for an
 * availability window that contains that range.
 *
 * NOTE: this assumes the event does not span midnight (starts and ends on the
 * same day) -- a reasonable simplification for a first version.
 *
 * @param {number} userId
 * @param {string} candidateStart - ISO timestamp, e.g. "2026-09-08T10:00:00"
 * @param {string} candidateEnd   - ISO timestamp, e.g. "2026-09-08T11:00:00"
 * @returns {boolean} true if the user IS available for this exact range
 */
async function isParticipantAvailable(userId, candidateStart, candidateEnd) {
  const start = new Date(candidateStart);
  const end = new Date(candidateEnd);

  const dayOfWeek = start.getDay(); // 0=Sunday..6=Saturday

  // Extract just the time-of-day portion, e.g. "10:00:00"
  const startTime = start.toTimeString().slice(0, 8);
  const endTime = end.toTimeString().slice(0, 8);

  const result = await pool.query(
    `SELECT id FROM availability
     WHERE user_id = $1
       AND day_of_week = $2
       AND start_time <= $3
       AND end_time >= $4`,
    [userId, dayOfWeek, startTime, endTime]
  );

  return result.rows.length > 0;
}

/**
 * Checks that EVERY mandatory participant for a given list of user ids
 * is available for the candidate slot. Returns the list of any users who
 * are NOT available, so the caller can explain why a slot was rejected.
 *
 * @param {number[]} mandatoryUserIds
 * @param {string} candidateStart
 * @param {string} candidateEnd
 * @returns {Promise<{allAvailable: boolean, unavailableUserIds: number[]}>}
 */
async function checkMandatoryParticipants(mandatoryUserIds, candidateStart, candidateEnd) {
  const unavailableUserIds = [];

  for (const userId of mandatoryUserIds) {
    const available = await isParticipantAvailable(userId, candidateStart, candidateEnd);
    if (!available) {
      unavailableUserIds.push(userId);
    }
  }

  return {
    allAvailable: unavailableUserIds.length === 0,
    unavailableUserIds,
  };
}

module.exports = { isParticipantAvailable, checkMandatoryParticipants };
