/**
 * Scores a valid (slot, room) option so the best one can be selected.
 * Returns a score between 0 and 100.
 *
 * Room fit: reward rooms that are closer to the required capacity,
 * penalize excessive oversizing (e.g. booking a 100-seat room for 5 people).
 *
 * Optional availability: reward slots where more optional participants
 * are also free, even though they're not mandatory.
 */
function scoreOption(option, requiredCapacity) {
  // Room fit: 1.0 if capacity exactly matches, decreasing as it's more oversized
  const capacityRatio = requiredCapacity / option.room.capacity; // e.g. 5/10 = 0.5
  const roomFitScore = capacityRatio; // closer to 1 = better fit, closer to 0 = very oversized

  // Optional participant availability: fraction of optional participants who are free
  const optionalScore = option.optionalTotalCount === 0
    ? 1 // no optional participants at all -- treat as perfect score, nothing to lose
    : option.optionalAvailableCount / option.optionalTotalCount;

  // Weighted combination -- room fit matters slightly more for now
  const finalScore = (roomFitScore * 0.6 + optionalScore * 0.4) * 100;

  return Math.round(finalScore * 100) / 100; // round to 2 decimal places
}

module.exports = { scoreOption };
