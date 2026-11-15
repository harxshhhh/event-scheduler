const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { findValidSlots } = require('../scheduler/findValidSlots');

const router = Router();

// POST /api/events/:id/schedule -- run the scheduling engine for this event
router.post('/events/:id/schedule', requireAuth, async (req, res) => {
  const eventId = req.params.id;

  try {
    // 1. Load the event
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = eventResult.rows[0];

    // 2. Load its participants
    const participantsResult = await pool.query(
      'SELECT user_id, is_mandatory FROM event_participants WHERE event_id = $1',
      [eventId]
    );
    const allParticipantUserIds = participantsResult.rows.map(p => p.user_id);
    const mandatoryUserIds = participantsResult.rows.filter(p => p.is_mandatory).map(p => p.user_id);

    if (allParticipantUserIds.length === 0) {
      return res.status(400).json({ message: 'Event has no participants to schedule against' });
    }

    // 3. Run the engine
    const result = await findValidSlots(event, allParticipantUserIds, mandatoryUserIds);

    if (!result.bestOption) {
      return res.status(200).json({
        scheduled: false,
        message: 'No feasible schedule found for this event.',
        rejectionReasons: result.rejectionReasons.slice(0, 10), // cap the list for readability
      });
    }

    // 4. Save the chosen schedule back onto the event
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

    res.json({
      scheduled: true,
      event: updateResult.rows[0],
      chosenOption: result.bestOption,
      totalOptionsConsidered: result.validOptions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Scheduling failed' });
  }
});

module.exports = router;
