const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/users -- list all users (needed later to pick participants for an event)
router.get('/users', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
