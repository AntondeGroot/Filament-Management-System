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
