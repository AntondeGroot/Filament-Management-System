/* When to ask whether a spool actually came out dry.
 *
 * Taking a roll off the dryer is the only moment anyone knows whether the job
 * finished, and realistically the only moment they will remember to record it.
 * Ask then or the countdown quietly restarts from a date that was never true.
 *
 * The rules for when the question does not arise matter as much as when it
 * does — a prompt that appears when the answer is obvious gets dismissed
 * without being read, and then so does the one that mattered. */

/* The ids worth asking about, given a move.
 *
 * A roll is asked about when it leaves a dryer with a cycle still unanswered.
 * That flag is set the moment it goes in and cleared only by an answer, which
 * makes the question belong to the visit rather than to the calendar.
 *
 * It used to key off "already recorded as dried today", which looked the same
 * until a roll dried in the morning went back in for a second run: the answer
 * on file was about the first cycle, and the second one was never asked about.
 * Time in the dryer is not measured at all, deliberately — someone drying a
 * backlog records it hours later, so any duration the app could compute would
 * be the gap between two pieces of data entry rather than between two events.
 *
 * The rest is about when the question is not worth putting: into another dryer
 * it is still drying, and onto the reorder queue it is an empty spool whose
 * dryness is beside the point. */
export function needsDryingAnswer({ fromKind, toKind, toZone, spools }) {
  if (fromKind !== "dryer") return [];
  if (toKind === "dryer") return [];
  if (toZone === "reorder") return [];
  return spools.filter(s => s && s.dryPending).map(s => s.id);
}

/* Phrased as a question about the rolls in hand, not about the app's state —
   "did it come out dry" is answerable while standing at the dryer. */
export const dryingQuestion = n =>
  (n === 1 ? "Did it come out dry?" : `Did these ${n} come out dry?`);

/* ---------------- how much of a roll's dryness is gone ----------------
 *
 * A date alone cannot answer this. Four weeks in a sealed box costs a roll far
 * less than four weeks in an AMS, so "dried on the 3rd" only means something
 * alongside where it has been since. Charging the whole elapsed time at the
 * current place's rate — which is what a single date forces — bills box time at
 * AMS prices, and worse, hands the time back when the roll is moved home again.
 *
 * So dryness is a fraction spent rather than a date passed. Each stay bills for
 * itself when the roll leaves, the total is banked, and the stay in progress is
 * added on top. Moving a roll can then never make it drier than it was. */

/* What a stay of `days` costs somewhere a roll keeps for `windowDays`. A dryer
   has no window and costs nothing, which is the point of a dryer. */
export const spent = (days, windowDays) =>
  (windowDays > 0 && days > 0 ? days / windowDays : 0);

/* Everything banked from previous places, plus the stay in progress. 1 means
   the roll is due; past 1 it is overdue by that much again. */
export const dryUsed = (banked, days, windowDays) =>
  (banked || 0) + spent(days, windowDays);

/* How long the roll has left if it stays where it is. Somewhere with no window
   it never runs out, which Infinity says more honestly than a huge number. */
export const daysLeft = (used, windowDays) =>
  (windowDays > 0 ? Math.max(0, (1 - used) * windowDays) : Infinity);
