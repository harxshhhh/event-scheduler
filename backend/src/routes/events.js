const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const WORK_START = '09:00';
const WORK_END = '17:00';

function isWithinOfficeHours(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const timeStr = date.toTimeString().slice(0, 5); // "HH:MM"
  return timeStr >= WORK_START && timeStr <= WORK_END;
}

router.post('/events', requireAuth, async (req, res) => {
  const {
    title,
    duration_minutes,
    requested_window_start,
    requested_window_end,
    required_capacity,
    participants,
  } = req.body;

  if (!title || !duration_minutes || !requested_window_start || !requested_window_end || !required_capacity) {
    return res.status(400).json({
      message: 'title, duration_minutes, requested_window_start, requested_window_end and required_capacity are required',
    });
  }

  if (duration_minutes <= 0) {
    return res.status(400).json({ message: 'duration_minutes must be positive' });
  }

  if (required_capacity <= 0) {
    return res.status(400).json({ message: 'required_capacity must be positive' });
  }

  const startDate = new Date(requested_window_start);
  const endDate = new Date(requested_window_end);

  if (startDate >= endDate) {
    return res.status(400).json({ message: 'requested_window_start must be before requested_window_end' });
  }

  if (!isWithinOfficeHours(requested_window_start) || !isWithinOfficeHours(requested_window_end)) {
    return res.status(400).json({
      message: `Requested window must fall within office hours (${WORK_START}-${WORK_END})`,
    });
  }

    const windowMinutes = (endDate - startDate) / 60000;
  if (duration_minutes > windowMinutes) {
    return res.status(400).json({
      message: `duration_minutes (${duration_minutes}) cannot be longer than the requested window (${windowMinutes} minutes)`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `INSERT INTO events
        (title, duration_minutes, requested_window_start, requested_window_end, required_capacity, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, duration_minutes, requested_window_start, requested_window_end, required_capacity, req.user.userId]
    );
    const event = eventResult.rows[0];

    if (Array.isArray(participants)) {
      for (const p of participants) {
        await client.query(
          'INSERT INTO event_participants (event_id, user_id, is_mandatory) VALUES ($1, $2, $3)',
          [event.id, p.user_id, !!p.is_mandatory]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ event, participants: participants || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Failed to create event' });
  } finally {
    client.release();
  }
});

router.get('/events', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

router.get('/events/:id', requireAuth, async (req, res) => {
  try {
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const participantsResult = await pool.query(
      `SELECT u.id, u.name, u.email, ep.is_mandatory
       FROM event_participants ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.event_id = $1`,
      [req.params.id]
    );

    res.json({ event: eventResult.rows[0], participants: participantsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
});
router.put('/events/:id', requireAuth, async (req, res) => {
  const {
    title,
    duration_minutes,
    requested_window_start,
    requested_window_end,
    required_capacity,
  } = req.body;

  if (!title || !duration_minutes || !requested_window_start || !requested_window_end || !required_capacity) {
    return res.status(400).json({
      message: 'title, duration_minutes, requested_window_start, requested_window_end and required_capacity are required',
    });
  }

  if (duration_minutes <= 0 || required_capacity <= 0) {
    return res.status(400).json({ message: 'duration_minutes and required_capacity must be positive' });
  }

  const startDate = new Date(requested_window_start);
  const endDate = new Date(requested_window_end);
  if (startDate >= endDate) {
    return res.status(400).json({ message: 'requested_window_start must be before requested_window_end' });
  }

  try {
    const existing = await pool.query('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const result = await pool.query(
      `UPDATE events
       SET title = $1,
           duration_minutes = $2,
           requested_window_start = $3,
           requested_window_end = $4,
           required_capacity = $5,
           status = 'pending',
           scheduled_start = NULL,
           scheduled_end = NULL,
           room_id = NULL
       WHERE id = $6
       RETURNING *`,
      [title, duration_minutes, requested_window_start, requested_window_end, required_capacity, req.params.id]
    );

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

module.exports = router;
