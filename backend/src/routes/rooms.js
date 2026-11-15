const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/rooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

router.post('/rooms', requireAuth, async (req, res) => {
  const { name, capacity } = req.body;

  if (!name || !capacity) {
    return res.status(400).json({ message: 'name and capacity are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO rooms (name, capacity) VALUES ($1, $2) RETURNING *',
      [name, capacity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

module.exports = router;
