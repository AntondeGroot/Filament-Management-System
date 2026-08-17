/* When to ask whether a spool actually came out dry.
 *
 * Taking a roll off the dryer is the only moment anyone knows whether the job
 * finished, and realistically the only moment they will remember to record it.
 * Ask then or the countdown quietly restarts from a date that was never true.
 *
 * The rules for when the question does not arise matter as much as when it
 * does — a prompt that appears when the answer is obvious gets dismissed
 * without being read, and then so does the one that mattered. */

/* The ids worth asking about, given a move. Empty when the question is not
   worth putting: the roll is going into another dryer and is still drying, it
   is on its way to the reorder queue where it is an empty spool and dryness is
   beside the point, or it was already marked dry today and the answer is on
   record. */
export function needsDryingAnswer({ fromKind, toKind, toZone, spools, today }) {
  if (fromKind !== "dryer") return [];
  if (toKind === "dryer") return [];
  if (toZone === "reorder") return [];
  return spools.filter(s => s && s.driedAt !== today).map(s => s.id);
}

/* Phrased as a question about the rolls in hand, not about the app's state —
   "did it come out dry" is answerable while standing at the dryer. */
export const dryingQuestion = n =>
  (n === 1 ? "Did it come out dry?" : `Did these ${n} come out dry?`);
