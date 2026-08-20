import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

const roll = (id, swatchId) => ({ id, swatchId, low: false, sealed: false, ordered: false,
                                  driedAt: "2026-08-01", since: "2026-08-01", used: 0 });

/* Three identical blacks and a red on a shelf, and a box with room in it. */
const BENCH = {
  swatches: [{ id: "black", brand: "Bambu", material: "PLA", colorName: "Black", hex: "#161616" },
             { id: "red", brand: "Polyterra", material: "PLA", colorName: "Red", hex: "#C9293C" }],
  spools: ["b1", "b2", "b3"].map(id => roll(id, "black")).concat(roll("r1", "red"), roll("r2", "red")),
  units: [{ id: "sh", kind: "shelf", name: "Shelf", slots: ["b1", "b2", "b3", "r1"], open: true },
          { id: "bx", kind: "box", name: "Box", slots: [null, null], open: true }],
  spares: ["r2"],
};

describe("a shelf", () => {
  it("piles rolls rather than slotting them, and gives up one at a time", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, BENCH);

    const drawn = run(`(() => {
      render();
      const cards = [...document.querySelectorAll('[data-unit="sh"] .spool')];
      return {
        /* Two cards for four rolls: the identical blacks read as one pile. */
        piles: cards.map(el => el.querySelector(".stack")?.textContent ?? "1"),
        empties: document.querySelectorAll('[data-unit="sh"] .slot.free').length,
        /* No slot to aim at, so the shelf itself is what you drop onto. */
        takesDrops: !!document.querySelector('[data-unit="sh"][data-drop="unit"]'),
      };
    })()`);

    expect(drawn).toEqual({ piles: ["3", "1"], empties: 0, takesDrops: true });

    /* Grabbing the pile takes the roll on top of it, not the pile. */
    run(`place("b1", { unitId: "bx", slot: 0 })`);

    expect(run(`unit("sh").slots`)).toEqual(["b2", "b3", "r1"]);
    expect(run(`unit("bx").slots`)).toEqual(["b1", null]);

    /* And a roll dropped on the shelf is put down on it — there is no full. */
    run(`place("r2", targetFrom(document.querySelector('[data-unit="sh"]')).target)`);

    expect(run(`unit("sh").slots`)).toEqual(["b2", "b3", "r1", "r2"]);
    expect(run(`state.spares`)).toEqual([]);

    close();
  });

  it("stacks the unsealed rolls only, and says the same thing collapsed", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, {
      ...BENCH,
      /* Same color throughout. What separates the piles is the state of the
         roll: a sealed roll is not interchangeable with an open one, and one
         running low is not interchangeable with a full one. */
      spools: [roll("u1", "black"), roll("u2", "black"),
               { ...roll("s1", "black"), sealed: true }, { ...roll("s2", "black"), sealed: true },
               { ...roll("l1", "black"), low: true }],
      units: [{ id: "sh", kind: "shelf", name: "Shelf", slots: ["u1", "u2", "s1", "s2", "l1"], open: true }],
      spares: [],
    });

    const counts = sel => run(`[...document.querySelectorAll('[data-unit="sh"] ${sel}')]
      .map(el => el.querySelector(".stack, .xn")?.textContent ?? "")`);

    run("render()");

    /* Two open, two sealed, one low — three cards, not one of five. */
    expect(counts(".spool:not(.mini)")).toEqual(["2", "2", ""]);

    run(`unit("sh").open = false; render()`);

    /* Collapsed, the miniatures carry the same counts rather than repeating
       one chip per roll. */
    expect(counts(".spool.mini")).toEqual(["×2", "×2", ""]);

    close();
  });
});
