import { describe, expect, it } from "vitest";
import { openApp, queuedAlarms, setBench } from "./harness.js";

describe("alarms()", () => {
  it("collapses every overdue spool onto one alarm the next morning", async () => {
    /* 14:00, so 09:00 today is already gone and the next slot is tomorrow. */
    const { run, close } = await openApp({ now: "2026-08-15T14:00:00" });
    setBench(run, {
      due: [
        { name: "Basic Black", at: "2026-08-01" },   /* a fortnight overdue */
        { name: "Grey", at: "2026-08-10" },          /* a few days overdue */
        { name: "Sky Blue", at: "2026-08-15" },      /* due today, slot missed */
      ],
    });

    const queued = queuedAlarms(run);

    expect(queued).toHaveLength(1);
    expect(queued[0].at).toEqual([2026, 8, 16, 9]);
    expect(queued[0].title).toBe("3 spools need drying");
    expect(queued[0].body).toBe("Basic Black, Grey, Sky Blue");

    close();
  });

  it("groups spools due the same day into a single alarm, one per day", async () => {
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });
    setBench(run, {
      due: [
        { name: "Grey", at: "2026-09-01" },
        { name: "Basic Black", at: "2026-09-01" },   /* same day as Grey */
        { name: "Sky Blue", at: "2026-09-05" },      /* its own morning */
      ],
    });

    const queued = queuedAlarms(run);

    expect(queued).toHaveLength(2);
    expect(queued[0].at).toEqual([2026, 9, 1, 9]);
    expect(queued[0].title).toBe("2 spools need drying");
    expect(queued[0].body).toBe("Grey, Basic Black");
    expect(queued[1].at).toEqual([2026, 9, 5, 9]);
    expect(queued[1].title).toBe("1 spool needs drying");   /* singular agrees */
    expect(queued[1].body).toBe("Sky Blue");

    close();
  });

  it("reuses the same id for a morning so rescheduling replaces the alarm", async () => {
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });
    setBench(run, { due: [{ name: "Grey", at: "2026-09-01" }] });

    const first = queuedAlarms(run);

    /* A save that changes nothing about that day still rebuilds the queue from
       scratch — syncScheduled() cancels and re-schedules on every save. */
    const again = queuedAlarms(run);
    expect(again[0].id).toBe(first[0].id);

    /* A different morning must not collide with it, or one would silently
       overwrite the other in Android's queue. */
    setBench(run, { due: [{ name: "Grey", at: "2026-09-02" }] });
    expect(queuedAlarms(run)[0].id).not.toBe(first[0].id);

    close();
  });

  it("drops entries past the sixty day horizon", async () => {
    /* 60 days from 06:30 on 15 Aug lands at 06:30 on 14 Oct. */
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });
    setBench(run, {
      due: [
        { name: "Sky Blue", at: "2026-10-13" },      /* inside the horizon */
        { name: "Grey", at: "2026-10-14" },          /* 09:00 that day is past it */
        { name: "Basic Black", at: "2026-12-01" },   /* far beyond */
      ],
    });

    const queued = queuedAlarms(run);

    expect(queued).toHaveLength(1);
    expect(queued[0].body).toBe("Sky Blue");

    close();
  });

  it("caps the queue at twenty four alarms, keeping the soonest", async () => {
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });

    /* Thirty consecutive mornings from 20 August, every one of them inside the
       sixty day horizon — so the horizon plays no part in what gets dropped. */
    const pad = n => String(n).padStart(2, "0");
    const due = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(2026, 7, 20 + i);   /* Date months are 0-based: 7 is August */
      return {
        name: `Colour ${i}`,
        at: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
      };
    });
    setBench(run, { due });

    const queued = queuedAlarms(run);

    expect(queued).toHaveLength(24);
    expect(queued[0].at).toEqual([2026, 8, 20, 9]);    /* the nearest morning survives */
    expect(queued[23].at).toEqual([2026, 9, 12, 9]);   /* the six after this are dropped */

    close();
  });

  it("names at most three spools in the body and counts the rest", async () => {
    const { run, close } = await openApp({ now: "2026-08-15T06:30:00" });
    const dueOn = names => names.map(name => ({ name, at: "2026-09-01" }));

    /* Three is the most it will spell out, and it does so without a suffix. */
    setBench(run, { due: dueOn(["Basic Black", "Grey", "Sky Blue"]) });
    expect(queuedAlarms(run)[0].body).toBe("Basic Black, Grey, Sky Blue");

    /* The fourth is where it starts counting instead of listing. */
    setBench(run, { due: dueOn(["Basic Black", "Grey", "Sky Blue", "Cold White", "Forest Green"]) });
    const queued = queuedAlarms(run);
    expect(queued[0].body).toBe("Basic Black, Grey, Sky Blue and 2 more");
    expect(queued[0].title).toBe("5 spools need drying");   /* the title still counts them all */

    close();
  });
});