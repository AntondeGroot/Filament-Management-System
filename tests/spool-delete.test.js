import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

/* A roll on a shelf, and a file in the log.
 *
 * The file is the whole point of this fixture. Deleting a roll used to walk
 * every project clearing a spoolIds list that projects stopped carrying — so
 * with nothing in the log it worked, and with a single file in it the handler
 * threw halfway: the roll left state, and close(), save() and render() never
 * ran. What you saw was a deleted roll still sitting on the shelf, still there
 * after a reload, until some other change happened to redraw the bench. */
const BENCH = {
  swatches: [{ id: "sw", brand: "Bambu", material: "PLA", colorName: "Red", hex: "#C2231C" }],
  spools: [{ id: "sp-1", swatchId: "sw", low: false, sealed: false, ordered: false,
             driedAt: "2026-08-01", since: "2026-08-01", used: 0 }],
  units: [{ id: "sh", kind: "shelf", name: "Shelf", slots: ["sp-1", null], open: true }],
  projects: [{ id: "pj-1", kind: "3mf", name: "keychain.3mf", title: "keychain", note: "",
               folder: null, added: "2026-08-01", thumb: null, seconds: 0, uses: [] }],
};

describe("deleting a roll", () => {
  it("takes it off the bench there and then, with files in the log", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, BENCH);

    const after = run(`(() => {
      render();
      openSpool("sp-1");
      document.getElementById("d-del").click();
      return {
        onShelf: document.querySelectorAll('[data-unit="sh"] .spool').length,
        sheetOpen: !!document.getElementById("scrim"),
        slots: unit("sh").slots.slice(),
        spools: state.spools.length,
      };
    })()`);

    expect(after).toEqual({ onShelf: 0, sheetOpen: false, slots: [null, null], spools: 0 });

    close();
  });
});
