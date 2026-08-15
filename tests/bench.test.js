import { describe, expect, it } from "vitest";
import { openApp, setBench } from "./harness.js";

describe("migrate()", () => {
  it("does not add a dryer to an empty bench", async () => {
    const { run, close } = await openApp();

    /* Exactly what a first run saves: no units, because nothing has been added
       yet. The dryer migration exists for benches saved before dryers were a
       kind, and it used to fire on this one too. */
    setBench(run, {});

    run("migrate()");   /* what load() does on every reload */

    expect(run("state.units")).toEqual([]);

    close();
  });

  it("adds one dryer to a saved bench that predates dryers, ahead of the boxes", async () => {
    const { run, close } = await openApp();
    setBench(run, {
      units: [
        { id: "prn-1", kind: "printer", name: "X1 Carbon", slots: [null] },
        { id: "box-1", kind: "box", name: "Box 1", slots: [null, null, null, null] },
        { id: "shelf-1", kind: "shelf", name: "Shelf", slots: [null, null, null, null, null, null] },
      ],
    });

    run("migrate()");

    /* Placed before the first box rather than appended: a dryer is a machine,
       and the Setup screen reads machines before storage. */
    expect(run("state.units.map(u => u.kind)")).toEqual(["printer", "dryer", "box", "shelf"]);

    /* migrate() runs on every load, so it has to be idempotent — otherwise the
       bench grows a dryer each time the app opens. */
    run("migrate()");
    expect(run("state.units.map(u => u.kind)")).toEqual(["printer", "dryer", "box", "shelf"]);

    close();
  });
});

describe("emptyBench()", () => {
  it("starts empty, with the default drying intervals", async () => {
    const { run, close } = await openApp();
    const fresh = run("emptyBench()");

    /* Nothing to delete on a first run. This is what replaced the sample data,
       so every collection has to be empty — one stray seeded folder or swatch
       and a new install starts by asking you to tidy up after it. */
    expect(fresh.swatches).toEqual([]);
    expect(fresh.spools).toEqual([]);
    expect(fresh.units).toEqual([]);
    expect(fresh.spares).toEqual([]);
    expect(fresh.reorder).toEqual([]);
    expect(fresh.projects).toEqual([]);
    expect(fresh.folders).toEqual([]);

    /* Configuration is not content: a fresh bench still knows how long each
       kind of place keeps a spool. A dryer is null because nothing goes damp
       inside one, which is different from a type set to "never". */
    expect(fresh.dryWeeks).toEqual({ printer: 4, ams: 12, dryer: null, box: 26, shelf: 4 });
    expect(fresh.dryTracking).toBe(true);
    expect(fresh.notify).toBe(false);

    close();
  });
});