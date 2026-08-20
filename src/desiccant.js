/* When to go and look at the desiccant.
 *
 * The beads in an AMS keep working right up until they don't, and they give no
 * sign either way — so this is a calendar, not a measurement. You say how often
 * you want to look and which day of the week suits you, and everything here
 * works out the mornings that answer implies.
 *
 * Nothing in here reads the DOM or the bench: settings in, dates out. That is
 * what lets "checked on a Monday, wanted on Saturdays" and "three weeks
 * overdue" be checked against known dates rather than against a phone. */

import { atNotifyHour } from "./alarms.js";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const HORIZON_DAYS = 60;   /* the same horizon the drying alarms use */
const MAX_ALARMS = 6;      /* a fortnightly check fills a quarter of that */

/* Drying alarms are numbered by the day they fire — a five figure number of
   days since the epoch. Starting well above that keeps the two queues apart,
   so neither can quietly overwrite the other on Android. */
const ID_BASE = 900000;

/* One question, asked on a schedule. Which AMS the beads are in, and how many
   tubs there are, is not something this can know better than you can — and a
   list of them would not change what you go and do. */
const TITLE = "Check the desiccant";
const BODY = "Swap or dry the beads in your AMS.";

const midnight = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fromISO = day => new Date(day + "T00:00:00");
const plusDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const plusWeeks = (d, n) => plusDays(d, n * 7);

const every = s => Math.max(1, Math.min(52, Math.round(s.everyWeeks) || 1));
const onDay = s => ((Math.round(s.weekday) % 7) + 7) % 7;

/* The morning the next check is owed: a whole interval after the last one, then
   forward to the day of the week you asked for. Check on that day and the two
   coincide exactly, which is the point — "every second Saturday" stays on
   Saturdays however long you leave it. */
export function nextCheck(s, now) {
  const after = plusWeeks(s.checkedOn ? fromISO(s.checkedOn) : midnight(now), every(s));
  return plusDays(after, (onDay(s) - after.getDay() + 7) % 7);
}

export const isDue = (s, now) => nextCheck(s, now) <= midnight(now);

/* Every morning worth an alarm between now and the horizon. A check that was
   missed is owed this morning rather than on each morning it was missed, so a
   month away collapses into one nudge, the way an overdue spool's does. */
export function upcoming(s, now) {
  const start = midnight(now);
  const end = plusDays(start, HORIZON_DAYS).getTime();
  const out = [];
  let at = nextCheck(s, now);
  if (at <= start) {
    out.push(start);
    while (at <= start) at = plusWeeks(at, every(s));
  }
  for (; at.getTime() <= end; at = plusWeeks(at, every(s))) out.push(at);
  return out.slice(0, MAX_ALARMS);
}

/* The same shape the drying alarms are scheduled in, so both queues can be
   handed to the plugin together. A slot that has already gone by this morning
   moves to tomorrow's, because Android will not hold an alarm for the past. */
export function alarms(state, now) {
  const s = state.desiccant;
  if (!s || !s.on) return [];
  return upcoming(s, now).map(day => {
    const at = atNotifyHour(day) > now ? atNotifyHour(day) : atNotifyHour(plusDays(now, 1));
    return {
      id: ID_BASE + Math.round(at.getTime() / 864e5),
      title: TITLE,
      body: BODY,
      schedule: { at, allowWhileIdle: true },
    };
  });
}

/* What every path says, in one place, so no two of them word it differently. */
export const headline = () => TITLE;
export const wording = () => BODY;

export function nextLabel(s, now) {
  const at = nextCheck(s, now);
  const days = Math.round((at - midnight(now)) / 864e5);
  if (days < 0) return `overdue since ${dayLabel(at)}`;
  if (days === 0) return "due today";
  return `next ${dayLabel(at)}`;
}

const dayLabel = d => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
