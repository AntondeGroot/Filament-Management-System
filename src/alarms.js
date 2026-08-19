/* Turning a shelf of due dates into a queue of morning alarms.
 *
 * The bench keeps one entry per spool, keyed by the day it goes stale. Android
 * wants the opposite shape — one alarm per day, carrying the names that land on
 * it — so this is where the two are reconciled. Nothing here talks to the
 * plugin or reads the bench: it is a list in, a list out, which is why the
 * awkward parts (a backlog, a horizon, a queue that is full) can be checked
 * against known dates rather than against a phone. */

export const NOTIFY_HOUR = 9;      /* nobody wants to hear about a damp spool at midnight */
const HORIZON_DAYS = 60;           /* further out than this and the date is guesswork anyway */
const MAX_ALARMS = 24;             /* Android's queue is finite; stay well inside it */

export const atNotifyHour = d => { const x = new Date(d); x.setHours(NOTIFY_HOUR, 0, 0, 0); return x; };

/* `due` is the bench's list of { name, at }; `headline` titles a morning given
   how many rolls it carries. Anything already overdue collapses onto the next
   morning, so a backlog arrives as one notification rather than twenty. */
export function plan(due, now, headline) {
  const soonest = atNotifyHour(now) > now ? atNotifyHour(now) : atNotifyHour(new Date(now.getTime() + 864e5));
  const horizon = now.getTime() + HORIZON_DAYS * 864e5;
  const days = new Map();

  for (const d of due) {
    const on = atNotifyHour(new Date(d.at + "T00:00:00"));
    const when = (on > now ? on : soonest).getTime();
    if (when > horizon) continue;
    if (!days.has(when)) days.set(when, []);
    days.get(when).push(d.name);
  }

  return [...days.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_ALARMS)
    .map(([when, names]) => ({
      /* Days since the epoch: stable, so rescheduling replaces the alarm for a
         morning instead of stacking a second one on top of it. */
      id: Math.round(when / 864e5),
      title: headline(names.length),
      body: names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : ""),
      schedule: { at: new Date(when), allowWhileIdle: true },
    }));
}
