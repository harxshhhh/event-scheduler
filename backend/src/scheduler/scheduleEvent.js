const pool = require('../db/pool');
const { findValidSlots } = require('./findValidSlots');

/**
 * Runs the scheduling engine for one event and saves the result.
 * Returns { status, body } so the route can send it straight back.
 */
async function scheduleEvent(eventId) {
  const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
  if (eventResult.rows.length === 0) {
    return { status: 404, body: { message: 'Event not found' } };
  }
  const event = eventResult.rows[0];

  const participantsResult = await pool.query(
    'SELECT user_id, is_mandatory FROM event_participants WHERE event_id = $1',
    [eventId]
  );
  const allParticipantUserIds = participantsResult.rows.map(p => p.user_id);
  const mandatoryUserIds = participantsResult.rows.filter(p => p.is_mandatory).map(p => p.user_id);

  if (allParticipantUserIds.length === 0) {
    return { status: 400, body: { message: 'Event has no participants to schedule against' } };
  }

  const result = await findValidSlots(event, allParticipantUserIds, mandatoryUserIds);

  if (!result.bestOption) {
    return {
      status: 200,
      body: {
        scheduled: false,
        message: 'No feasible schedule found for this event.',
        rejectionReasons: result.rejectionReasons.slice(0, 10),
      },
    };
  }

  const updateResult = await pool.query(
    `UPDATE events
     SET status = 'scheduled',
         scheduled_start = $1,
         scheduled_end = $2,
         room_id = $3
     WHERE id = $4
     RETURNING *`,
    [result.bestOption.slot.start, result.bestOption.slot.end, result.bestOption.room.id, eventId]
  );

  return {
    status: 200,
    body: {
      scheduled: true,
      event: updateResult.rows[0],
      chosenOption: result.bestOption,
      totalOptionsConsidered: result.validOptions.length,
    },
  };
}

/**
 * Schedules every pending event in priority order: high (3) first, then
 * normal (2), then low (1). Events with the same priority go oldest first.
 * Because events are scheduled one at a time, a high-priority event gets
 * first pick of slots and rooms, and lower-priority events fit around it.
 */
async function schedulePending() {
  const pending = await pool.query(
    `SELECT id, title, priority FROM events
     WHERE status = 'pending'
     ORDER BY priority DESC, created_at ASC, id ASC`
  );

  const results = [];
  for (const row of pending.rows) {
    const { status, body } = await scheduleEvent(row.id);
    results.push({
      id: row.id,
      title: row.title,
      priority: row.priority,
      scheduled: status === 200 && body.scheduled === true,
      message: body.message || null,
    });
  }

  return {
    total: results.length,
    scheduledCount: results.filter(r => r.scheduled).length,
    results,
  };
}

module.exports = { scheduleEvent, schedulePending };