import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

/* A file whose colors were logged in the order the slicer named them, which is
   no order at all: black, then blue, then red, then one nothing matched. */
const SCRAMBLED = {
  swatches: [
    { id: "sw-black", brand: "Bambu", material: "PLA", colorName: "Black", hex: "#161616" },
    { id: "sw-blue", brand: "Elegoo", material: "PETG", colorName: "Blue", hex: "#1F8BB4" },
    { id: "sw-red", brand: "Polyterra", material: "PLA", colorName: "Red", hex: "#C9293C" },
  ],
  projects: [{ id: "pj-1", kind: "3mf", name: "keychain.3mf", title: "keychain", note: "",
               folder: null, added: "2026-08-01", thumb: null, seconds: 0,
               uses: [{ swatchId: "sw-black" }, { swatchId: "sw-blue" }, { swatchId: "sw-red" },
                      { swatchId: null, type: "PLA", color: "#FFEA88" }] }],
};

const labels = run => run(`[...document.querySelectorAll(".proj .nm, .proj .pick")].map(el => el.textContent)`);

/* One file with one color on it — the shape a sliced .3mf leaves behind. */
const ONE_FILE = {
  swatches: [{ id: "sw-1", brand: "Bambu", material: "PLA", colorName: "Red", hex: "#C2231C" }],
  projects: [{ id: "pj-1", kind: "3mf", name: "keychain.3mf", title: "keychain", note: "",
               folder: null, added: "2026-08-01", thumb: null, seconds: 0,
               uses: [{ swatchId: "sw-1", grams: 12 }] }],
};

const shown = run => run(`(() => {
  const card = document.querySelector(".proj");
  return {
    name: card.querySelector(".fil .nm")?.textContent ?? null,
    pickers: card.querySelectorAll("[data-pickuse]").length,
    removes: card.querySelectorAll("[data-usedel]").length,
  };
})()`);

describe("a file's colors", () => {
  it("reads as a list until you ask to edit, and only then can be changed", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, ONE_FILE);
    run("render()");

    /* Nothing to hit by accident: the color is text, and the × that would drop
       it is not on the page at all. */
    expect(shown(run)).toEqual({ name: "Bambu Red · PLA", pickers: 0, removes: 0 });

    run(`document.querySelector("[data-projedit]").click()`);

    expect(shown(run)).toEqual({ name: null, pickers: 1, removes: 1 });

    /* Done puts it back — the controls are borrowed, not switched on for good. */
    run(`document.querySelector("[data-projedit]").click()`);

    expect(shown(run).removes).toBe(0);

    close();
  });

  it("reads in swatch order, editing or not, without losing which slot is which", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, SCRAMBLED);
    run("render()");

    /* Rainbow, then neutrals, and whatever the library cannot name last — the
       same run as the swatches tab, so a palette is recognised rather than read. */
    expect(labels(run)).toEqual([
      "Polyterra Red · PLA",
      "Elegoo Blue · PETG",
      "Bambu Black · PLA",
      "Unmatched — PLA #FFEA88",
    ]);

    run(`document.querySelector("[data-projedit]").click()`);

    /* The same order with the controls on. What changes is what each row is:
       a line of text becomes a button that opens the swatch list. */
    expect(labels(run)).toEqual([
      "Polyterra Red · PLA",
      "Elegoo Blue · PETG",
      "Bambu Black · PLA",
      "Unmatched — PLA #FFEA88",
    ]);

    /* And each button still points at the filament it was drawn for, not at
       whatever the sort put in that position. */
    expect(run(`[...document.querySelectorAll("[data-pickuse]")].map(b => b.dataset.pickuse)`))
      .toEqual(["pj-1|2", "pj-1|1", "pj-1|0", "pj-1|3"]);

    close();
  });
});
