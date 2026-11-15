const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/availability', requireAuth, async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;
  const userId = req.user.userId;

  if (day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ message: 'day_of_week, start_time and end_time are required' });
  }

  if (start_time >= end_time) {
    return res.status(400).json({ message: 'start_time must be before end_time' });
  }

  try {
    // Prevent adding an exact duplicate slot
    const existing = await pool.query(
      'SELECT id FROM availability WHERE user_id = $1 AND day_of_week = $2 AND start_time = $3 AND end_time = $4',
      [userId, day_of_week, start_time, end_time]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'This exact availability slot already exists' });
    }

    const result = await pool.query(
      'INSERT INTO availability (user_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, day_of_week, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add availability' });
  }
});

router.get('/availability/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM availability WHERE user_id = $1 ORDER BY day_of_week, start_time',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch availability' });
  }
});

router.get('/availability/:userId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM availability WHERE user_id = $1 ORDER BY day_of_week, start_time',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch availability' });
  }
});

module.exports = router;
