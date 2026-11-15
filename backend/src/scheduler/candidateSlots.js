/**
 * Generates candidate time slots of `durationMinutes` length, at hourly
 * intervals, within the requested window.
 *
 * Example: window 09:00-17:00, duration 60min -> slots at 09:00, 10:00, ... 16:00
 * (16:00-17:00 is the last slot that still fits before the window ends)
 *
 * @param {string} windowStart - ISO timestamp
 * @param {string} windowEnd   - ISO timestamp
 * @param {number} durationMinutes
 * @returns {Array<{start: Date, end: Date}>}
 */
function generateCandidateSlots(windowStart, windowEnd, durationMinutes) {
  const slots = [];
  const windowStartDate = new Date(windowStart);
  const windowEndDate = new Date(windowEnd);
  const durationMs = durationMinutes * 60 * 1000;
  const stepMs = 60 * 60 * 1000; // hourly steps

  let slotStart = new Date(windowStartDate);

  while (true) {
    const slotEnd = new Date(slotStart.getTime() + durationMs);
    if (slotEnd > windowEndDate) break;

    slots.push({ start: new Date(slotStart), end: slotEnd });
    slotStart = new Date(slotStart.getTime() + stepMs);
  }

  return slots;
}

module.exports = { generateCandidateSlots };
