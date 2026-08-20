import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";
import { inReachOrder } from "../src/swatches.js";

describe("inReachOrder()", () => {
  it("puts what is loaded first, then what is nearly empty, and the sealed bag last", () => {
    /* Five rolls of one color, listed in the order they happen to sit in the
       bench — which is no order at all. */
    const rolls = [
      { place: "Shelf", sealed: true },
      { place: "Box 1" },
      { place: "Box 2", low: true },
      { place: "P1S", machine: true },
      { place: "AMS A", machine: true, low: true },
    ];

    expect(inReachOrder(rolls).map(r => r.place)).toEqual([
      /* Both machines before anything in storage: the roll is already on the
         printer, so starting with it costs nothing at all. */
      "AMS A",     /* and the low one first even there — same reason as below */
      "P1S",
      /* Then the one running low, ahead of the full roll in the same box.
         Finishing a nearly empty spool is the only way to stop collecting
         them, and it is the print you are about to start that does it. */
      "Box 2",
      "Box 1",
      /* Last, whatever the print needs: opening a sealed bag is a decision,
         and it can wait until there is nothing else left to reach for. */
      "Shelf",
    ]);
  });

  it("stacks rolls that would say the same thing, and only those", () => {
    /* Five rolls across two shelves, and three lines' worth of news. */
    const rolls = [
      { place: "Shelf", sealed: true },
      { place: "Bench shelf" },
      { place: "Shelf", sealed: true },
      { place: "Bench shelf" },
      /* Same shelf as the pair above, but this one is nearly empty — which is
         the entire reason you would go to that shelf rather than the other, so
         it stays a line of its own. */
      { place: "Bench shelf", low: true },
    ];

    expect(inReachOrder(rolls).map(r => [r.place, r.n])).toEqual([
      ["Bench shelf", 1],   /* the low one, first */
      ["Bench shelf", 2],
      ["Shelf", 2],         /* sealed, last */
    ]);
  });
});

describe("the magnifier on a swatch", () => {
  it("opens the whereabouts rather than the swatch form under it", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, {
      swatches: [{ id: "sw", brand: "Polyterra", material: "PLA", colorName: "Lava Red", hex: "#C9293C" }],
      spools: [{ id: "r1", swatchId: "sw", low: true, sealed: false, ordered: false,
                 driedAt: "2026-08-01", since: "2026-08-01", used: 0 }],
      units: [{ id: "b1", kind: "box", name: "Box 1", slots: ["r1", null] }],
    });
    run("render()");

    /* The button sits inside the swatch row, and the row opens the form — so
       the whole question is which of the two a tap on the circle reaches. */
    run(`document.querySelector("[data-swfind]").click()`);

    expect(run(`document.querySelector("#scrim h2").textContent`)).toBe("Lava Red");
    expect(run(`document.querySelectorAll("#scrim .wrow").length`)).toBe(1);
    expect(run(`document.querySelector("#scrim .wrow .wp").textContent`)).toBe("Box 1");
    /* The form's Save button is the tell: if this is here, the wrong sheet won. */
    expect(run(`!!document.querySelector("#w-save")`)).toBe(false);

    close();
  });
});
