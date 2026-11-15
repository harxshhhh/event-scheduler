require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');
const usersRoutes = require('./routes/users');
const availabilityRoutes = require('./routes/availability');
const eventsRoutes = require('./routes/events');
const scheduleRoutes = require('./routes/schedule');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', server_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Database not reachable' });
  }
});

app.use('/api', roomsRoutes);
app.use('/api', usersRoutes);
app.use('/api', availabilityRoutes);
app.use('/api', eventsRoutes);
app.use('/api', scheduleRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Scheduler API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
