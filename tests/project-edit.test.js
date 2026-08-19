import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

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
    pickers: card.querySelectorAll("select[data-use]").length,
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
});
