import { describe, expect, it } from "vitest";
import { needsDryingAnswer } from "../src/drying.js";

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
