import { describe, expect, it } from "vitest";
import { bridgeModules, openApp, setBench } from "./harness.js";

const settle = () => new Promise(done => setTimeout(done, 0));

describe("boot", () => {
  it("draws nothing until the module bridge has run", async () => {
    /* What a cold start actually looks like for as long as the src/*.js
       fetches are in flight: the classic script has run and called load(), and
       none of the modules exist yet. The block that installs them is a module
       script, so it is deferred — it cannot possibly have run by then. */
    const { run, window, close } = await openApp({ modules: false });

    setBench(run, {
      swatches: [{ id: "sw", brand: "T", material: "PLA", colorName: "Red", hex: "#C2231C" }],
      spools: [{ id: "sp", swatchId: "sw", low: false, sealed: false, ordered: false,
                 driedAt: "2026-07-01", since: "2026-07-01", used: 0 }],
      units: [{ id: "b1", kind: "box", name: "Box 1", slots: ["sp", null] }],
    });

    /* Rendering here would reach Drying.dryUsed and throw — after the header
       counts are in the DOM, before a single unit is drawn, and with nothing
       left to re-render afterwards. The result is an app that comes up as an
       empty workshop while the whole inventory sits intact behind it, so the
       only safe thing to have drawn at this point is nothing. */
    expect(run(`document.getElementById("bench-sections").children.length`)).toBe(0);

    bridgeModules({ window, run });
    await settle();

    /* And the wait is a wait, not a refusal: the bench appears once the
       modules do. */
    expect(run(`document.querySelectorAll("#bench-sections .unit").length`)).toBe(1);
    expect(run(`document.getElementById("s-count").textContent`)).toBe("1");

    close();
  });
});
