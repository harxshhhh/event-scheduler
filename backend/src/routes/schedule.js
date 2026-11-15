const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { scheduleEvent, schedulePending } = require('../scheduler/scheduleEvent');

const router = Router();

// POST /api/events/:id/schedule -- run the scheduling engine for this event
router.post('/events/:id/schedule', requireAuth, async (req, res) => {
  try {
    const { status, body } = await scheduleEvent(req.params.id);
    res.status(status).json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Scheduling failed' });
  }
});

// POST /api/schedule-pending -- schedule all pending events, highest priority first
router.post('/schedule-pending', requireAuth, async (req, res) => {
  try {
    res.json(await schedulePending());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Scheduling failed' });
  }
});

module.exports = router;