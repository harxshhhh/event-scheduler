const pool = require('../db/pool');

/**
 * Checks whether a given room has enough capacity for the event,
 * AND is not already booked for an overlapping time slot.
 *
 * @param {number} roomId
 * @param {number} requiredCapacity
 * @param {string} candidateStart - ISO timestamp
 * @param {string} candidateEnd   - ISO timestamp
 * @returns {boolean} true if the room is a VALID choice, false otherwise
 */
async function isRoomAvailable(roomId, requiredCapacity, candidateStart, candidateEnd) {
  // Check 1: does the room have enough capacity?
  const roomResult = await pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);

  if (roomResult.rows.length === 0) {
    return false; // room doesn't exist
  }

  const room = roomResult.rows[0];
  if (room.capacity < requiredCapacity) {
    return false; // too small
  }

  // Check 2: is the room already booked for an overlapping event?
  const conflictResult = await pool.query(
    `SELECT id FROM events
     WHERE room_id = $1
       AND status = 'scheduled'
       AND scheduled_start < $3
       AND scheduled_end > $2`,
    [roomId, candidateStart, candidateEnd]
  );

  return conflictResult.rows.length === 0;
}

module.exports = { isRoomAvailable };
