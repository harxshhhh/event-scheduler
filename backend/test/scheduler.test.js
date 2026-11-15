const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createFakeDb } = require('./helpers/fakeDb');
const { findValidSlots } = require('../src/scheduler/findValidSlots');
const { scheduleEvent, schedulePending } = require('../src/scheduler/scheduleEvent');

// 2026-11-15 is a Sunday, 2026-11-16 a Monday, 2026-11-17 a Tuesday.
const SUNDAY = '2026-11-15';
const MONDAY = '2026-11-16';

const ROOMS = [
  { id: 1, name: 'Room A', capacity: 10 },
  { id: 2, name: 'Room B', capacity: 30 },
  { id: 3, name: 'Room C', capacity: 100 },
];

function makeEvent(overrides = {}) {
  return {
    id: 1, title: 'Test event', duration_minutes: 60,
    requested_window_start: `${MONDAY}T09:00:00`, requested_window_end: `${MONDAY}T12:00:00`,
    required_capacity: 5, status: 'pending', priority: 2, room_id: null,
    created_at: 1, ...overrides,
  };
}

const avail = (user_id, day_of_week, start_time, end_time) => ({ user_id, day_of_week, start_time, end_time });

describe('Hard constraints: participant availability', () => {
  test('regression: Sunday event is rejected when the participant is only free Mon/Tue', async () => {
    createFakeDb({ rooms: ROOMS, availability: [avail(1, 1, '09:00:00', '17:00:00'), avail(1, 2, '09:00:00', '17:00:00')] });
    const event = makeEvent({ requested_window_start: `${SUNDAY}T09:00:00`, requested_window_end: `${SUNDAY}T12:00:00` });
    const result = await findValidSlots(event, [1], []); // nobody marked mandatory
    assert.equal(result.bestOption, null);
    assert.ok(result.rejectionReasons.length > 0);
  });

  test('Monday event inside the participant availability is scheduled', async () => {
    createFakeDb({ rooms: ROOMS, availability: [avail(1, 1, '09:00:00', '17:00:00')] });
    const result = await findValidSlots(makeEvent(), [1], []);
    assert.ok(result.bestOption);
  });

  test('Monday event outside the availability hours is rejected', async () => {
    createFakeDb({ rooms: ROOMS, availability: [avail(1, 1, '09:00:00', '13:00:00')] });
    const event = makeEvent({ requested_window_start: `${MONDAY}T14:00:00`, requested_window_end: `${MONDAY}T16:00:00` });
    const result = await findValidSlots(event, [1], []);
    assert.equal(result.bestOption, null);
  });

  test('conflicting availability: two mandatory participants who never overlap -> no feasible slot', async () => {
    createFakeDb({
      rooms: ROOMS,
      availability: [avail(1, 1, '09:00:00', '11:00:00'), avail(2, 1, '13:00:00', '17:00:00')],
    });
    const event = makeEvent({ requested_window_start: `${MONDAY}T09:00:00`, requested_window_end: `${MONDAY}T17:00:00` });
    const result = await findValidSlots(event, [1, 2], [1, 2]);
    assert.equal(result.bestOption, null);
    assert.ok(result.rejectionReasons.length > 0);
  });

  test('an unavailable optional participant does not block the slot when someone is mandatory', async () => {
    createFakeDb({ rooms: ROOMS, availability: [avail(1, 1, '09:00:00', '17:00:00')] });
    const result = await findValidSlots(makeEvent(), [1, 2], [1]); // user 2 optional, has no availability
    assert.ok(result.bestOption);
  });
});

describe('Hard constraints: rooms and time clashes', () => {
  const everyoneFree = [avail(1, 1, '09:00:00', '17:00:00'), avail(2, 1, '09:00:00', '17:00:00')];

  test('room capacity: event larger than every room has no feasible slot', async () => {
    createFakeDb({ rooms: ROOMS, availability: everyoneFree });
    const result = await findValidSlots(makeEvent({ required_capacity: 200 }), [1], [1]);
    assert.equal(result.bestOption, null);
  });

  test('best-fit room: a 5-person event gets the smallest room (Room A)', async () => {
    createFakeDb({ rooms: ROOMS, availability: everyoneFree });
    const result = await findValidSlots(makeEvent(), [1], [1]);
    assert.equal(result.bestOption.room.name, 'Room A');
  });

  test('room already booked: the next suitable room is chosen', async () => {
    createFakeDb({
      rooms: ROOMS, availability: everyoneFree,
      events: [{ id: 9, status: 'scheduled', room_id: 1, scheduled_start: `${MONDAY}T09:00:00.000Z`, scheduled_end: `${MONDAY}T12:00:00.000Z` }],
    });
    const result = await findValidSlots(makeEvent(), [1], [1]);
    assert.equal(result.bestOption.room.name, 'Room B');
  });

  test('no feasible solution when every suitable room is booked', async () => {
    createFakeDb({
      rooms: ROOMS, availability: everyoneFree,
      events: ROOMS.map((r, i) => ({ id: 20 + i, status: 'scheduled', room_id: r.id, scheduled_start: `${MONDAY}T09:00:00.000Z`, scheduled_end: `${MONDAY}T12:00:00.000Z` })),
    });
    const result = await findValidSlots(makeEvent(), [1], [1]);
    assert.equal(result.bestOption, null);
  });

  test('participant time clash: a participant already in an overlapping event rejects the slot', async () => {
    createFakeDb({
      rooms: ROOMS, availability: everyoneFree,
      events: [{ id: 9, status: 'scheduled', room_id: 3, scheduled_start: `${MONDAY}T09:00:00.000Z`, scheduled_end: `${MONDAY}T12:00:00.000Z` }],
      participants: [{ event_id: 9, user_id: 1, is_mandatory: true }],
    });
    const result = await findValidSlots(makeEvent(), [1], [1]);
    assert.equal(result.bestOption, null);
    assert.ok(result.rejectionReasons.some(r => r.reason.includes('conflicting event')));
  });
});

describe('Scheduling priorities', () => {
  // One 1-hour window, one participant, so two events cannot both fit.
  const oneSlot = { requested_window_start: `${MONDAY}T09:00:00`, requested_window_end: `${MONDAY}T10:00:00` };
  const baseData = () => ({
    rooms: ROOMS,
    availability: [avail(1, 1, '09:00:00', '17:00:00')],
    participants: [
      { event_id: 1, user_id: 1, is_mandatory: true },
      { event_id: 2, user_id: 1, is_mandatory: true },
    ],
  });

  test('a high-priority event created LATER still wins the contested slot', async () => {
    const db = createFakeDb({
      ...baseData(),
      events: [
        makeEvent({ id: 1, title: 'Low, created first', priority: 1, created_at: 1, ...oneSlot }),
        makeEvent({ id: 2, title: 'High, created second', priority: 3, created_at: 2, ...oneSlot }),
      ],
    });
    const summary = await schedulePending();
    assert.equal(db.events.find(e => e.id === 2).status, 'scheduled');
    assert.equal(db.events.find(e => e.id === 1).status, 'pending');
    assert.equal(summary.scheduledCount, 1);
    assert.equal(summary.results[0].id, 2); // high priority handled first
  });

  test('equal priority: the older event wins', async () => {
    const db = createFakeDb({
      ...baseData(),
      events: [
        makeEvent({ id: 1, priority: 2, created_at: 1, ...oneSlot }),
        makeEvent({ id: 2, priority: 2, created_at: 2, ...oneSlot }),
      ],
    });
    await schedulePending();
    assert.equal(db.events.find(e => e.id === 1).status, 'scheduled');
    assert.equal(db.events.find(e => e.id === 2).status, 'pending');
  });

  test('both events are scheduled when there is room for both', async () => {
    const db = createFakeDb({
      ...baseData(),
      events: [
        makeEvent({ id: 1, priority: 1, created_at: 1, requested_window_start: `${MONDAY}T09:00:00`, requested_window_end: `${MONDAY}T11:00:00` }),
        makeEvent({ id: 2, priority: 3, created_at: 2, requested_window_start: `${MONDAY}T09:00:00`, requested_window_end: `${MONDAY}T11:00:00` }),
      ],
    });
    const summary = await schedulePending();
    assert.equal(summary.scheduledCount, 2);
  });

  test('scheduleEvent returns 404 for an event that does not exist', async () => {
    createFakeDb({ ...baseData(), events: [] });
    const { status } = await scheduleEvent(99);
    assert.equal(status, 404);
  });
});