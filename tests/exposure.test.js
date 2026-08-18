import { describe, expect, it } from "vitest";
import { openApp, setBench } from "./harness.js";

/* Twenty-eight days before the frozen clock below.
 *
 * The hour matters: daysSince rounds to the nearest day, so a clock set to
 * midday makes the stay 28.5 days and rounds it up to 29. Nine in the morning
 * leaves it unambiguously 28. Harmless in the app — a stay costs a day more or
 * less depending on when a roll is moved — but a test asserting exact fractions
 * has to sit away from the boundary. */
const NOW = "2026-08-18T09:00:00";
const DRIED = "2026-07-21";
const BOX = 26 * 7, AMS = 12 * 7;

const roll = id => ({ id, swatchId: "sw", low: false, sealed: false, ordered: false,
                      driedAt: DRIED, since: DRIED, used: 0 });

describe("banking a stay", () => {
  it("bills the roll a swap displaces before it moves", async () => {
    const { run, close } = await openApp({ now: NOW });
    setBench(run, {
      swatches: [{ id: "sw", brand: "T", material: "PLA", colorName: "Red", hex: "#C2231C" }],
      spools: [roll("kept"), roll("bumped")],
      units: [
        { id: "box", kind: "box", name: "Box", slots: ["kept", null, null, null] },
        { id: "ams", kind: "ams", name: "AMS", slots: ["bumped", null, null, null] },
      ],
    });

    /* Dropping onto an occupied slot swaps the two. The dragged roll leaves
       through detach and is billed there; the one it displaces never goes near
       detach — it is written straight into the vacated slot — so it has to be
       billed on its own account. Miss that and it is handed back every day it
       spent in the AMS, which is a refund for being shoved. */
    run(`place("kept", { unitId: "ams", slot: 0 })`);

    const banked = run(`Object.fromEntries(state.spools.map(s => [s.id, s.used]))`);
    const where = run(`({ ams: unit("ams").slots[0], box: unit("box").slots[0] })`);

    expect(where).toEqual({ ams: "kept", box: "bumped" });
    expect(banked.kept).toBeCloseTo(28 / BOX, 5);      /* four weeks of twenty-six */
    expect(banked.bumped).toBeCloseTo(28 / AMS, 5);    /* four weeks of twelve */

    close();
  });
});
