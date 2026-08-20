import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

const noteLine = run => run(`(() => {
  const el = document.querySelector("#swatch-list .sw-note");
  return el ? el.textContent.trim() : null;
})()`);

describe("a swatch note", () => {
  it("is written in the sheet, shows on the row, and leaves nothing behind when cleared", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, {
      swatches: [{ id: "sw", brand: "Polyterra", material: "PLA", colorName: "Lava Red", hex: "#C9293C" }],
    });
    run("render()");

    expect(noteLine(run)).toBe(null);   /* most of a library has nothing to say */

    run(`swatchForm(state.swatches[0])`);
    run(`document.querySelector('[data-nkind="spec"]').click()`);
    run(`document.getElementById("w-note").value = "50 mm/s or it strings badly"`);
    run(`document.getElementById("w-save").click()`);

    /* The kind is the one control in that sheet with no input behind it — it
       lives in a closure and is read back at save, so this is the assertion
       that says the picker was actually wired to the save. */
    expect(run("state.swatches[0].note")).toEqual({ kind: "spec", text: "50 mm/s or it strings badly" });
    expect(noteLine(run)).toBe("50 mm/s or it strings badly");

    /* Cleared back to nothing. An empty note object left on the swatch would
       still count as a note everywhere that asks — a blank line under the row,
       and a mark on every roll of this color out on the bench. */
    run(`swatchForm(state.swatches[0])`);
    run(`document.querySelector('[data-nkind=""]').click()`);
    run(`document.getElementById("w-note").value = "   "`);
    run(`document.getElementById("w-save").click()`);

    expect(run("state.swatches[0].note")).toBe(null);
    expect(noteLine(run)).toBe(null);

    close();
  });
});

describe("a roll of a color that carries a note", () => {
  it("shows its swatch's mark wherever it is sitting, and drops it when the note goes", async () => {
    const { run, close } = await openApp();
    setBench(run, {
      swatches: [{ id: "sw", brand: "Polyterra", material: "PLA", colorName: "Lava Red", hex: "#C9293C",
                   note: { kind: "spec", text: "50 mm/s or it strings badly" } }],
      spools: [{ id: "r1", swatchId: "sw", low: false, sealed: false, ordered: false,
                 driedAt: "2026-08-01", since: "2026-08-01", used: 0 }],
      units: [{ id: "ams", kind: "ams", name: "AMS A", slots: ["r1", null, null, null] }],
    });
    run("render()");

    const marks = () => run(`[...document.querySelectorAll("#bench-sections .notemark")].map(el => el.title)`);

    /* Collapsed, which is how a unit sits by default — a row of chips and no
       room for words. This is the case that matters: the AMS at a glance, just
       before you send a print to it. */
    expect(marks()).toEqual(["50 mm/s or it strings badly"]);

    /* And opened, where the roll is drawn as a card instead. Same mark, from
       the same note — nothing about it is copied onto the spool. */
    run(`unit("ams").open = true; render()`);
    expect(marks()).toEqual(["50 mm/s or it strings badly"]);

    /* Cleared on the swatch, gone from the bench: the roll never held the note,
       it only ever showed the one its color carries. */
    run(`state.swatches[0].note = null; render()`);
    expect(marks()).toEqual([]);

    close();
  });
});
