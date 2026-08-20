import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

/* A roll of each color, both left on an open shelf since the spring — well past
   the four weeks a shelf gets. Nothing here is sealed, so drying is the only
   thing that could take either of them out of the count. */
const bench = {
  swatches: [
    { id: "keep", brand: "Polyterra", material: "PLA", colorName: "Lava Red", hex: "#C9293C" },
    { id: "gone", brand: "Sunlu", material: "PLA", colorName: "Mud Brown", hex: "#7A5A3A",
      retired: true, retiredWhy: "muddy in daylight" },
  ],
  spools: [
    { id: "r1", swatchId: "keep", low: false, sealed: false, ordered: false,
      driedAt: "2026-04-01", since: "2026-04-01", used: 0 },
    { id: "r2", swatchId: "gone", low: false, sealed: false, ordered: false,
      driedAt: "2026-04-01", since: "2026-04-01", used: 0 },
  ],
  units: [{ id: "sh", kind: "shelf", name: "Shelf", slots: ["r1", "r2"] }],
};

describe("drying a retired color", () => {
  it("stops counting its rolls once Setup says not to", async () => {
    const { run, close } = await openApp({ now: "2026-08-20T09:00:00" });
    setBench(run, bench);

    /* Left alone, a retired color dries out like any other — it is still
       plastic on a shelf, and the app should not decide otherwise for you. */
    expect(run("needsDrying().length")).toBe(2);
    expect(run("dueList().length")).toBe(2);

    run("state.dryRetired = false; save()");

    /* Switched off, the retired roll leaves the countdown wherever it is
       sitting — it is the one you reach for to test a bridge, and nobody dries
       a spool for that. */
    expect(run("needsDrying().length")).toBe(1);
    expect(run(`needsDrying()[0].swatchId`)).toBe("keep");

    /* dueList() is the one that matters when the app is shut: it is what the
       service worker reads and what the Android alarms are built from, so a
       roll dropped from the screen but left in here would still wake you up
       about a spool you had told the app to ignore. */
    expect(run("state.due.map(d => d.name)")).toEqual(["Lava Red"]);

    close();
  });
});

const shelf = {
  swatches: [
    { id: "keep", brand: "Polyterra", material: "PLA", colorName: "Lava Red", hex: "#C9293C" },
    { id: "also", brand: "Jupiter", material: "PLA", colorName: "Sulfur Yellow", hex: "#FFFF62" },
    { id: "gone", brand: "Sunlu", material: "PLA", colorName: "Mud Brown", hex: "#7A5A3A",
      retired: true, retiredWhy: "muddy in daylight" },
  ],
};
const ids = (run, where) =>
  run(`[...document.querySelectorAll("${where} .swatch")].map(el => el.dataset.swatch)`);

describe("the retired drawer", () => {
  it("takes the color out of the library, and out of the count with it", async () => {
    const { run, close } = await openApp();
    setBench(run, shelf);
    run("render()");

    /* The library is what you own and might reach for. A color you have
       finished with is neither, so it is not in the list and not in the tally
       above it — a "3 colors" that includes one you would never print again is
       a count of nothing in particular. */
    expect(ids(run, "#swatch-list")).toEqual(["keep", "also"]);
    expect(run(`document.getElementById("swatch-meta").textContent`)).toBe("2 colors · 0 in stock");

    /* Shut by default, and the header says what is behind it. */
    expect(run(`document.querySelector("[data-swretired] .eyebrow").textContent`)).toBe("Retired");
    expect(run(`document.querySelector("[data-swretired] .meta").textContent.trim()`)).toBe("1 color ▸");
    expect(ids(run, "#swatch-retired")).toEqual([]);

    run(`document.querySelector("[data-swretired]").click()`);

    expect(ids(run, "#swatch-retired")).toEqual(["gone"]);
    /* And the reason is on the row, which is the whole point of keeping it. */
    expect(run(`document.querySelector("#swatch-retired .sw-note").textContent.trim()`))
      .toBe("muddy in daylight");

    close();
  });
});

describe("a retired color", () => {
  it("can still be made into a roll — retired is not deleted", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, shelf);
    run("render()");

    /* Straight from its own sheet: the reason you keep a retired color at all
       is that there is half a roll of it in a box and you will print test
       cubes with it for years. */
    run(`swatchForm(state.swatches.find(w => w.id === "gone"))`);
    run(`document.getElementById("w-spool").click()`);
    run(`document.getElementById("f-save").click()`);

    expect(run(`state.spools.map(s => s.swatchId)`)).toEqual(["gone"]);
    expect(run(`state.spares.length`)).toBe(1);

    /* And it is still offered when a roll is asked which color it is, so an
       existing spool can be pointed at it too. */
    run(`swatchPicker(() => {})`);
    expect(run(`!!document.querySelector('[data-pick="gone"]')`)).toBe(true);

    close();
  });
});

describe("a roll of a retired color", () => {
  it("carries the ban out onto the bench, alongside whatever the note says", async () => {
    const { run, close } = await openApp();
    setBench(run, {
      swatches: [{ id: "gone", brand: "Sunlu", material: "PLA", colorName: "Mud Brown", hex: "#7A5A3A",
                   retired: true, retiredWhy: "muddy in daylight",
                   note: { kind: "spec", text: "50 mm/s" } }],
      spools: [{ id: "r1", swatchId: "gone", low: false, sealed: false, ordered: false,
                 driedAt: "2026-08-01", since: "2026-08-01", used: 0 }],
      units: [{ id: "ams", kind: "ams", name: "AMS A", slots: ["r1", null, null, null] }],
    });
    run("render()");

    const marks = () => run(`[...document.querySelectorAll("#bench-sections .notemark")].map(el => el.title)`);

    /* Collapsed, which is how a unit sits by default. Both marks: how to print
       it, and the fact that this is one you have finished with — the second is
       what stops you reaching for it for the job you actually care about. */
    expect(marks()).toEqual(["50 mm/s", "Retired — muddy in daylight"]);

    /* And opened, where the roll is drawn as a card instead. */
    run(`unit("ams").open = true; render()`);
    expect(marks()).toEqual(["50 mm/s", "Retired — muddy in daylight"]);

    /* Un-retired on the swatch and the ban is gone from the roll: the roll was
       never told, it only ever showed what its color says. */
    run(`state.swatches[0].retired = false; render()`);
    expect(marks()).toEqual(["50 mm/s"]);

    close();
  });
});
