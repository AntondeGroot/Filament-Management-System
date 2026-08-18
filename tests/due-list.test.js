import { describe, expect, it } from "vitest";
import { openApp, setBench } from "./harness.js";

/* A due date is now projected from today at the rate of wherever the roll is,
   rather than being driedAt plus a window — so these need a fixed clock. Set
   two weeks after the drying date, which is early enough that nothing here has
   run out, and the two ways of reckoning agree exactly. */
const NOW = "2026-06-15T09:00:00";

/* Small factories so a test states only what it is about. A spool is an
   instance of a swatch — the swatch carries the identity and the name that ends
   up in the notification. */
const swatch = (id, colorName) => ({ id, brand: "Test", material: "PLA", colorName, hex: "#888888" });
const spool = (id, swatchId, extra = {}) =>
  ({ id, swatchId, low: false, sealed: false, ordered: false, driedAt: null, ...extra });

describe("dueList()", () => {
  it("dates each spool from its dried date plus the window for where it sits", async () => {
    const { run, close } = await openApp({ now: NOW });
    setBench(run, {
      swatches: [swatch("sw-a", "Basic Black"), swatch("sw-b", "Sky Blue")],
      spools: [
        spool("sp-a", "sw-a", { driedAt: "2026-06-01" }),
        spool("sp-b", "sw-b", { driedAt: "2026-06-01" }),   /* same day, different place */
      ],
      units: [
        { id: "ams-a", kind: "ams", name: "AMS unit A", slots: ["sp-a", null, null, null] },
        { id: "shelf-1", kind: "shelf", name: "Shelf", slots: ["sp-b", null, null, null, null, null] },
      ],
    });

    /* Defaults: an AMS keeps a spool 12 weeks (84 days), an open shelf 4 (28). */
    expect(run("dueList()")).toEqual([
      { name: "Basic Black", at: "2026-08-24" },
      { name: "Sky Blue", at: "2026-06-29" },
    ]);

    close();
  });

  it("excludes sealed spools", async () => {
    const { run, close } = await openApp({ now: NOW });
    setBench(run, {
      swatches: [swatch("sw-a", "Basic Black"), swatch("sw-b", "Sky Blue")],
      spools: [
        spool("sp-open", "sw-a", { driedAt: "2026-06-01" }),
        /* Dated on purpose: a sealed roll normally has no driedAt at all, and
           the missing date would exclude it through a different branch. Giving
           it one leaves `sealed` as the only reason it can be left out. */
        spool("sp-sealed", "sw-b", { driedAt: "2026-06-01", sealed: true }),
      ],
      units: [
        { id: "shelf-1", kind: "shelf", name: "Shelf", slots: ["sp-open", "sp-sealed", null, null, null, null] },
      ],
    });

    expect(run("dueList()")).toEqual([{ name: "Basic Black", at: "2026-06-29" }]);

    close();
  });

  it("excludes spools queued for reorder", async () => {
    const { run, close } = await openApp({ now: NOW });
    /* Neither spool is in a unit, so both take the same LOOSE_DRY window of 4
       weeks. That leaves the reorder queue as the only difference between
       them — a spare roll on the pile is still filament you own and dry, one
       waiting to be rebought is not. */
    setBench(run, {
      swatches: [swatch("sw-a", "Cold White"), swatch("sw-b", "Sunflower Yellow")],
      spools: [
        spool("sp-spare", "sw-a", { driedAt: "2026-06-01" }),
        spool("sp-reorder", "sw-b", { driedAt: "2026-06-01" }),
      ],
      spares: ["sp-spare"],
      reorder: ["sp-reorder"],
    });

    expect(run("dueList()")).toEqual([{ name: "Cold White", at: "2026-06-29" }]);

    close();
  });

  it("is empty when drying is not being tracked", async () => {
    const { run, close } = await openApp({ now: NOW });
    const bench = {
      swatches: [swatch("sw-a", "Basic Black")],
      spools: [spool("sp-a", "sw-a", { driedAt: "2026-06-01" })],
      units: [{ id: "shelf-1", kind: "shelf", name: "Shelf", slots: ["sp-a", null, null, null, null, null] }],
    };

    /* This bench does produce an entry, so an empty list below is the switch
       doing it rather than the bench being uninteresting. */
    setBench(run, bench);
    expect(run("dueList()")).toHaveLength(1);

    /* The master switch in Setup. */
    setBench(run, { ...bench, dryTracking: false });
    expect(run("dueList()")).toEqual([]);

    /* Or every type set to "never", which comes to the same thing. */
    setBench(run, {
      ...bench,
      dryWeeks: { printer: null, ams: null, dryer: null, box: null, shelf: null },
    });
    expect(run("dueList()")).toEqual([]);

    close();
  });
});