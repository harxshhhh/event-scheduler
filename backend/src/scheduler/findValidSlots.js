const pool = require('../db/pool');
const { generateCandidateSlots } = require('./candidateSlots');
const { hasTimeConflict } = require('./timeConflict');
const { isRoomAvailable } = require('./roomAvailability');
const { checkMandatoryParticipants } = require('./participantAvailability');
const { scoreOption } = require('./scoreOption');

async function findValidSlots(event, allParticipantUserIds, mandatoryUserIds) {
  const slots = generateCandidateSlots(
    event.requested_window_start,
    event.requested_window_end,
    event.duration_minutes
  );

  const roomsResult = await pool.query('SELECT id, name, capacity FROM rooms ORDER BY capacity');
  const rooms = roomsResult.rows;

  const validOptions = [];
  const rejectionReasons = [];

  for (const slot of slots) {
    const startISO = slot.start.toISOString();
    const endISO = slot.end.toISOString();

   const requiredUserIds = mandatoryUserIds.length > 0 ? mandatoryUserIds : allParticipantUserIds;
const mandatoryCheck = await checkMandatoryParticipants(requiredUserIds, startISO, endISO);
    if (!mandatoryCheck.allAvailable) {
      rejectionReasons.push({
        slot: { start: startISO, end: endISO },
        reason: `Mandatory participant(s) unavailable: ${mandatoryCheck.unavailableUserIds.join(', ')}`,
      });
      continue;
    }

    let hasConflict = false;
    for (const userId of allParticipantUserIds) {
      if (await hasTimeConflict(userId, startISO, endISO)) {
        hasConflict = true;
        rejectionReasons.push({
          slot: { start: startISO, end: endISO },
          reason: `Participant ${userId} has a conflicting event`,
        });
        break;
      }
    }
    if (hasConflict) continue;

    for (const room of rooms) {
      const roomOk = await isRoomAvailable(room.id, event.required_capacity, startISO, endISO);
      if (roomOk) {
        const optionalUserIds = allParticipantUserIds.filter(id => !mandatoryUserIds.includes(id));
        let optionalAvailableCount = 0;
        for (const userId of optionalUserIds) {
          const { allAvailable } = await checkMandatoryParticipants([userId], startISO, endISO);
          if (allAvailable) optionalAvailableCount++;
        }

        const option = {
          slot: { start: startISO, end: endISO },
          room,
          optionalAvailableCount,
          optionalTotalCount: optionalUserIds.length,
        };

        option.score = scoreOption(option, event.required_capacity);
        validOptions.push(option);
      }
    }
  }

  // Sort best-first
  validOptions.sort((a, b) => b.score - a.score);

  return {
    validOptions,
    rejectionReasons,
    bestOption: validOptions.length > 0 ? validOptions[0] : null,
  };
}

module.exports = { findValidSlots };
