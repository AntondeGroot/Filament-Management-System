import { describe, expect, it } from "vitest";
import { dryUsed, daysLeft, needsDryingAnswer, spent } from "../src/drying.js";

/* Only the two fields the decision reads. Anything else on a spool would be
   noise here, and inventing it would suggest the rule depends on it. */
const roll = (id, driedAt) => ({ id, driedAt });

const TODAY = "2026-08-17";
const YESTERDAY = "2026-08-16";

describe("needsDryingAnswer()", () => {
  it("asks only about the rolls whose drying is not already on record", () => {
    const asked = needsDryingAnswer({
      fromKind: "dryer",
      toKind: "box",
      spools: [
        roll("sp-old", YESTERDAY),   /* the countdown has been running since yesterday */
        roll("sp-done", TODAY),      /* already answered today — asking again is noise */
        roll("sp-never", null),      /* never dried at all, which is not the same as dry */
      ],
      today: TODAY,
    });

    /* Per roll, not all-or-nothing. A batch out of the dryer routinely mixes
       one that was marked dry an hour ago with two that were not, and either
       asking about all three or skipping all three teaches you to dismiss the
       prompt without reading it. */
    expect(asked).toEqual(["sp-old", "sp-never"]);
  });

  it("stays quiet when the question is not worth putting", () => {
    const rolls = [roll("sp-a", YESTERDAY), roll("sp-b", YESTERDAY)];
    const move = change =>
      needsDryingAnswer({ fromKind: "dryer", toKind: "box", spools: rolls, today: TODAY, ...change });

    /* These two rolls do produce a question when nothing gets in the way, so
       every empty result below is the gate doing it rather than the batch
       being uninteresting. */
    expect(move()).toEqual(["sp-a", "sp-b"]);

    /* Never in a dryer, so there is nothing to have finished. */
    expect(move({ fromKind: "box" })).toEqual([]);

    /* Dryer to dryer is not the end of anything. */
    expect(move({ toKind: "dryer" })).toEqual([]);

    /* On the reorder queue a spool is empty, and how dry an empty spool is
       does not matter to anyone. */
    expect(move({ toKind: null, toZone: "reorder" })).toEqual([]);

    /* Unassigned is not the same: that is filament you still own and will
       print with, so the question stands. */
    expect(move({ toKind: null, toZone: "spares" })).toEqual(["sp-a", "sp-b"]);
  });
});

describe("dryUsed()", () => {
  it("charges each stay at the rate of the place it was spent", () => {
    const BOX = 26 * 7;   /* a sealed box keeps a roll twenty-six weeks */
    const AMS = 12 * 7;   /* an AMS, twelve */

    /* Four weeks in the box is four of its twenty-six. */
    const afterBox = dryUsed(0, 28, BOX);
    expect(afterBox).toBeCloseTo(4 / 26, 6);

    /* Two more in the AMS is two of its twelve, on top of what was banked —
       not two twenty-sixths, and not a fresh start either. */
    const afterAms = dryUsed(afterBox, 14, AMS);
    expect(afterAms).toBeCloseTo(4 / 26 + 2 / 12, 6);

    /* The whole six weeks billed at AMS rates, which is what a single drying
       date forces: it cannot know the first four were spent somewhere safe.
       Nearly twice the true figure, and the reason this is a ledger. */
    expect(dryUsed(0, 42, AMS)).toBeCloseTo(6 / 12, 6);
    expect(afterAms).toBeLessThan(dryUsed(0, 42, AMS));
  });
});

describe("daysLeft()", () => {
  it("reports what is left, and never less than none", () => {
    const BOX = 26 * 7;

    /* Nothing spent leaves the whole window; half spent leaves half of it. */
    expect(daysLeft(0, BOX)).toBe(BOX);
    expect(daysLeft(0.5, BOX)).toBe(BOX / 2);

    /* Overdue does not run backwards. A roll 179% through its window is due
       now, not due four months ago. A negative would date the reminder into
       the past, where the worker compares it against today, finds it long
       gone, and nothing ever fires. */
    expect(daysLeft(2.79, BOX)).toBe(0);

    /* A dryer has no window, so there is nothing to run out of. dueList checks
       this with Number.isFinite and leaves the roll out; any large number
       instead would have planted a real-looking date years away. */
    expect(daysLeft(0.5, 0)).toBe(Infinity);
  });
});

describe("spent()", () => {
  it("charges nothing where there is no window to run out", () => {
    const BOX = 26 * 7;

    /* An ordinary stay costs its share, which is the whole rule. */
    expect(spent(28, BOX)).toBeCloseTo(4 / 26, 6);

    /* A dryer has no window. A roll can sit in one for a year and owe nothing,
       which is what lets the ledger keep running while it dries instead of
       having to be stopped and restarted around each visit. */
    expect(spent(365, 0)).toBe(0);

    /* Setting a type to "never" in Setup arrives here as the same thing. */
    expect(spent(365, null)).toBe(0);

    /* And the one that would be quietly catastrophic: a missing interval makes
       weeks * 7 into NaN. NaN spreads through every later sum, and because
       NaN > 1 is false, every roll it touched would simply never come due —
       no error, no droplet, no reminder, ever. */
    expect(spent(365, NaN)).toBe(0);

    /* Moving a roll on the day it arrived costs nothing, so shuffling things
       about does not slowly add up. */
    expect(spent(0, BOX)).toBe(0);
  });
});
