import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

const BENCH = {
  swatches: [{ id: "white", brand: "Bambu", material: "PLA", colorName: "White", hex: "#FFFFFF" }],
};

describe("adding rolls from the bench", () => {
  it("puts as many of a color on the bench as you ask for, in one trip", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, BENCH);

    /* The route the button takes: pick a color, then say how many. Five rolls
       of the same filament is one order, not five identical trips. */
    const added = run(`(() => {
      render();
      document.getElementById("fab").click();
      document.querySelector('[data-pick="white"]').click();
      document.getElementById("f-qty").value = "5";
      document.getElementById("f-save").click();
      return {
        rolls: state.spools.length,
        unassigned: state.spares.length,
        sealed: state.spools.every(s => s.sealed),
        /* And they arrive as one pile with a count, not five cards. */
        cards: [...document.querySelectorAll("#spares-row .spool")].map(el => el.querySelector(".stack")?.textContent),
        toast: document.getElementById("toast").textContent,
      };
    })()`);

    expect(added).toEqual({
      rolls: 5, unassigned: 5, sealed: true, cards: ["5"],
      toast: "5 × White added to Unassigned.",
    });

    close();
  });
});
