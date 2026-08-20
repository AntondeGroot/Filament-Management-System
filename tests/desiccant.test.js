import { describe, expect, it } from "vitest";
import { alarms } from "../src/desiccant.js";
import { nativelyScheduled, openApp, setBench, stubAndroid } from "./harness.js";
import { nextCheck, upcoming } from "../src/desiccant.js";

/* Local, and readable in the failure message: "Sat Sep 05 2026" says both the
   date and the weekday, which is the whole of what these assertions are about. */
const day = d => d.toDateString();

describe("nextCheck()", () => {
  it("waits a whole interval, then lands on the weekday that was asked for", () => {
    /* Every second Saturday, checked on Monday 17 August because that is when
       you happened to open the lid. A fortnight on is Monday 31 August, which
       is not a Saturday — so the next check is owed on the Saturday *after* it.
       The Saturday before would be a rest of twelve days, not fourteen. */
    const midweek = { everyWeeks: 2, weekday: 6, checkedOn: "2026-08-17" };
    expect(day(nextCheck(midweek, new Date("2026-08-17T20:00:00")))).toBe("Sat Sep 05 2026");

    /* And once you are on the day, you stay on it: a check made on Saturday 15
       August is owed again exactly fourteen days later, with nothing to shift.
       That is what keeps "every second Saturday" from drifting a day later
       every time it is used. */
    const onDay = { everyWeeks: 2, weekday: 6, checkedOn: "2026-08-15" };
    expect(day(nextCheck(onDay, new Date("2026-08-15T20:00:00")))).toBe("Sat Aug 29 2026");
  });
});

describe("upcoming()", () => {
  it("owes a missed check this morning, then picks the cadence back up", () => {
    /* Every second Saturday, last checked on Saturday 4 July, and it is now
       Thursday 20 August: three Saturdays have gone by unanswered. */
    const lapsed = { everyWeeks: 2, weekday: 6, checkedOn: "2026-07-04" };

    expect(upcoming(lapsed, new Date("2026-08-20T14:00:00")).map(day)).toEqual([
      /* Today, Thursday, even though Thursday is not the day you asked for —
         a check that is already owed is owed now, and waiting nine days for
         the next Saturday would be the app keeping the lapse to itself. */
      "Thu Aug 20 2026",
      /* And exactly one nudge for it, not one per Saturday missed: 18 July,
         1 August and 15 August are gone, and replaying them would fill the
         queue with three alarms for the same forgotten tub. */
      "Sat Aug 29 2026",
      "Sat Sep 12 2026",
      "Sat Sep 26 2026",
      "Sat Oct 10 2026",   /* the sixty day horizon ends four days later */
    ]);
  });
});

describe("alarms()", () => {
  it("queues nothing until the reminder is switched on", () => {
    const settings = { everyWeeks: 2, weekday: 6, checkedOn: "2026-08-15" };
    const now = new Date("2026-08-29T06:30:00");   /* the morning a check is owed */

    expect(alarms({ desiccant: { ...settings, on: false } }, now)).toEqual([]);
    expect(alarms({ desiccant: { ...settings, on: true } }, now)).not.toEqual([]);

    /* And a bench saved before any of this existed has no desiccant settings at
       all. It reaches here on the first load, before migrate() has run under
       some paths, so the answer has to be "nothing queued" rather than a throw
       that takes the whole scheduling pass down with it — including the drying
       alarms, which have nothing to do with this. */
    expect(alarms({}, now)).toEqual([]);
  });
});

describe("the queue Android is handed", () => {
  it("carries the desiccant check even when drying reminders are off", async () => {
    /* 06:30, so 09:00 today is still ahead and nothing has to be moved. */
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });
    stubAndroid(run);
    setBench(run, {
      notify: false,                                 /* drying reminders never switched on */
      due: [{ name: "Grey", at: "2026-08-29" }],     /* and a spool going stale that same morning */
      desiccant: { on: true, everyWeeks: 2, weekday: 6, checkedOn: "2026-08-15", notifiedOn: null },
    });

    /* Two independent switches. Wanting to be told about the beads and not
       about the spools is an ordinary way to run this, and it used to be
       impossible: one early return covered both. */
    const alone = await nativelyScheduled(run);
    expect(alone.map(n => n.title)).toEqual(["Check the desiccant", "Check the desiccant",
                                             "Check the desiccant", "Check the desiccant"]);
    expect(alone[0].on).toBe("Sat Aug 29 2026");

    run("state.notify = true");
    const both = await nativelyScheduled(run);
    const morning = both.filter(n => n.on === "Sat Aug 29 2026");

    /* Both land on the same morning, and Android keys its queue by id — so if
       the two schemes ever met, one of these would silently replace the other
       and only one of the two would ever arrive. */
    expect(morning.map(n => n.title).sort()).toEqual(["1 spool needs drying", "Check the desiccant"]);
    expect(morning[0].id).not.toBe(morning[1].id);

    /* Rebuilt, not appended: the queue is cancelled and re-scheduled on every
       save, so a second pass over the same bench leaves the same five alarms. */
    expect(await nativelyScheduled(run)).toEqual(both);

    close();
  });
});

describe("Checked today", () => {
  it("counts the next check from the day you looked, not the day it was owed", async () => {
    /* Owed on Saturday 29 August, and you get to it on Thursday the 20th. */
    const { run, close } = await openApp({ now: "2026-08-20T14:00:00" });
    setBench(run, {
      desiccant: { on: true, everyWeeks: 2, weekday: 6, checkedOn: "2026-08-15", notifiedOn: "2026-08-20" },
    });
    run("render()");

    run(`document.getElementById("desic-done").click()`);

    expect(run("state.desiccant.checkedOn")).toBe("2026-08-20");

    /* A fortnight from Thursday, then on to the Saturday: the whole schedule
       moves with you rather than handing you a five day "fortnight". */
    expect(run(`Desiccant.nextCheck(state.desiccant, new Date()).toDateString()`)).toBe("Sat Sep 05 2026");

    /* And today's nudge is spent. Without clearing it, checking early on a
       morning you were already told about would leave the stamp set and swallow
       the reminder if you switched the schedule around later the same day. */
    expect(run("state.desiccant.notifiedOn")).toBe(null);

    /* What the service worker reads when it wakes up with the app closed. */
    expect(run("state.desiccantDue")).toBe("2026-09-05");

    close();
  });
});
