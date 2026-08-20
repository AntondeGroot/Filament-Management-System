import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

const marks = run => run(`document.querySelectorAll("#swatch-list .sw-print svg").length`);

describe("the printed mark", () => {
  it("is ticked in the swatch's own sheet, and shows up on its row", async () => {
    const { run, close } = await openApp();
    stubMedia(run);   /* the sheet asks whether the pointer is coarse on its way up */
    setBench(run, {
      swatches: [{ id: "sw", brand: "Elegoo", material: "PLA", colorName: "Red", hex: "#FF0000" }],
    });
    run("render()");

    /* Nothing until you say so. The box is still in the row — it holds the
       column's edge — but there is no mark in it. */
    expect(marks(run)).toBe(0);

    run(`swatchForm(state.swatches[0])`);
    run(`document.getElementById("w-print").checked = true`);
    run(`document.getElementById("w-save").click()`);

    expect(run("state.swatches[0].printed")).toBe(true);
    expect(marks(run)).toBe(1);

    /* And it comes back off the same way: a chip gets lost or thrown out, and
       the sheet has to be able to say so. */
    run(`swatchForm(state.swatches[0])`);
    run(`document.getElementById("w-print").checked = false`);
    run(`document.getElementById("w-save").click()`);

    expect(run("state.swatches[0].printed")).toBe(false);
    expect(marks(run)).toBe(0);

    close();
  });
});
