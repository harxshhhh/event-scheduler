// A tiny in-memory stand-in for PostgreSQL, so the scheduler can be tested
// without Docker. It answers only the queries the scheduler makes.
const pool = require('../../src/db/pool');

function createFakeDb(data) {
  const db = {
    rooms: data.rooms || [],
    availability: data.availability || [],
    events: data.events || [],
    participants: data.participants || [],
  };

  pool.query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT id, name, capacity FROM rooms')) {
      return { rows: [...db.rooms].sort((a, b) => a.capacity - b.capacity) };
    }
    if (s.startsWith('SELECT capacity FROM rooms WHERE id')) {
      return { rows: db.rooms.filter(r => r.id === params[0]).map(r => ({ capacity: r.capacity })) };
    }
    if (s.includes('FROM availability')) {
      const [userId, dow, st, et] = params;
      return {
        rows: db.availability
          .filter(a => a.user_id === userId && a.day_of_week === dow && a.start_time <= st && a.end_time >= et)
          .map(a => ({ id: 1 })),
      };
    }
    if (s.includes('JOIN event_participants')) {
      const [userId, start, end] = params;
      const mine = db.participants.filter(p => p.user_id === userId).map(p => p.event_id);
      return {
        rows: db.events.filter(e =>
          mine.includes(e.id) && e.status === 'scheduled' &&
          new Date(e.scheduled_start) < new Date(end) && new Date(e.scheduled_end) > new Date(start)),
      };
    }
    if (s.includes('WHERE room_id = $1')) {
      const [roomId, start, end] = params;
      return {
        rows: db.events.filter(e =>
          e.room_id === roomId && e.status === 'scheduled' &&
          new Date(e.scheduled_start) < new Date(end) && new Date(e.scheduled_end) > new Date(start)),
      };
    }
    if (s.startsWith('SELECT * FROM events WHERE id')) {
      return { rows: db.events.filter(e => String(e.id) === String(params[0])) };
    }
    if (s.startsWith('SELECT user_id, is_mandatory FROM event_participants')) {
      return { rows: db.participants.filter(p => String(p.event_id) === String(params[0])) };
    }
    if (s.startsWith("SELECT id, title, priority FROM events WHERE status = 'pending'")) {
      return {
        rows: db.events
          .filter(e => e.status === 'pending')
          .sort((a, b) => b.priority - a.priority || a.created_at - b.created_at || a.id - b.id),
      };
    }
    if (s.startsWith("UPDATE events SET status = 'scheduled'")) {
      const [start, end, roomId, id] = params;
      const ev = db.events.find(e => String(e.id) === String(id));
      Object.assign(ev, { status: 'scheduled', scheduled_start: start, scheduled_end: end, room_id: roomId });
      return { rows: [ev] };
    }
    throw new Error('fakeDb: unhandled query: ' + s.slice(0, 80));
  };

  return db;
}

module.exports = { createFakeDb };