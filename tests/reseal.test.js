import { describe, expect, it } from "vitest";
import { openApp, setBench, setClock, stubMedia } from "./harness.js";

/* Half a roll of TPU on a shelf, dried a fortnight ago: half of the four weeks
   a shelf gets is already spent, and the ledger says so. */
const BENCH = {
  swatches: [{ id: "sw", brand: "Bambu", material: "TPU", colorName: "Grey", hex: "#888888" }],
  spools: [{ id: "sp-1", swatchId: "sw", low: true, sealed: false, ordered: false,
             driedAt: "2026-07-18", since: "2026-07-18", used: 0 }],
  units: [{ id: "sh", kind: "shelf", name: "Shelf", slots: ["sp-1"], open: true }],
};

const SHELF_WINDOW = 4 * 7;
const AMS_WINDOW = 12 * 7;
const A_FORTNIGHT = 14 / SHELF_WINDOW;
const THREE_WEEKS = 21 / SHELF_WINDOW;
const THREE_WEEKS_IN_AN_AMS = 21 / AMS_WINDOW;

describe("resealing a roll", () => {
  it("stops the drying clock where it stands, and starts it again from there", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    setBench(run, BENCH);

    /* What the app would say if you asked it now: how much of the window is
       gone, whether that is past due, and whether it would nag you about it. */
    const ledger = () => run(`(() => {
      const s = spool("sp-1"), d = dryState(s);
      return { used: d.used, stale: d.stale, driedAt: s.driedAt, nagging: needsDrying().length };
    })()`);

    run(`setSealed(spool("sp-1"), true)`);
    expect(ledger()).toEqual({ used: A_FORTNIGHT, stale: false, driedAt: "2026-07-18", nagging: 0 });

    /* Two months in a bag with a handful of desiccant. Nothing is spent in
       there — and nothing is repaired either: the fortnight it had already
       spent on the shelf is still spent when it comes out. */
    setClock(run, "2026-10-01T10:00:00");
    expect(ledger()).toEqual({ used: A_FORTNIGHT, stale: false, driedAt: "2026-07-18", nagging: 0 });

    run(`setSealed(spool("sp-1"), false)`);
    expect(ledger()).toEqual({ used: A_FORTNIGHT, stale: false, driedAt: "2026-07-18", nagging: 0 });

    /* Three more weeks in the open takes it past four weeks' worth of shelf,
       which is the whole point of not handing the bag back as a fresh start. */
    setClock(run, "2026-10-22T10:00:00");
    expect(ledger()).toEqual({ used: A_FORTNIGHT + THREE_WEEKS, stale: true, driedAt: "2026-07-18", nagging: 1 });

    close();
  });

  /* The other kind of sealed roll: one that arrived that way and has never been
     opened. It has no drying to resume, so the rule that resumes one must not
     leave it with nothing — a roll out of a factory bag is dry today. */
  it("stamps a roll that came sealed from the factory dry on the day it is opened", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    setBench(run, {
      swatches: BENCH.swatches,
      spools: [{ id: "sp-new", swatchId: "sw", low: false, sealed: true, ordered: false, driedAt: null }],
      spares: ["sp-new"],
    });

    const roll = () => run(`(() => {
      const s = spool("sp-new");
      return { sealed: s.sealed, driedAt: s.driedAt, since: s.since, used: dryState(s).used };
    })()`);

    /* Nothing is known about it and nothing needs to be: a bag it has not been
       taken out of is the whole of its drying history. */
    expect(roll()).toEqual({ sealed: true, driedAt: null, since: undefined, used: 0 });

    run(`setSealed(spool("sp-new"), false)`);
    expect(roll()).toEqual({ sealed: false, driedAt: "2026-08-01", since: "2026-08-01", used: 0 });

    close();
  });

  /* The roll on the sheet is half a roll of TPU, which is the case the button
     exists for: bagging it says nothing about how much of it is left. */
  it("reseals the roll on the sheet without forgetting it is running low", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    stubMedia(run);
    setBench(run, BENCH);

    const sealed = run(`(() => {
      render();
      openSpool("sp-1");
      document.getElementById("d-seal").click();
      const card = document.querySelector('[data-unit="sh"] .spool');
      const s = spool("sp-1");
      return {
        sealed: s.sealed, low: s.low,
        tags: [...card.querySelectorAll(".tag")].map(t => t.textContent),
        label: card.getAttribute("aria-label"),
        sheetOpen: !!document.getElementById("scrim"),
        toast: document.getElementById("toast").textContent,
      };
    })()`);

    expect(sealed).toEqual({
      sealed: true, low: true,
      tags: ["Sealed", "Low"],
      label: "Bambu TPU Grey, sealed, running low",
      sheetOpen: false,
      toast: "Grey sealed — its drying clock stops here.",
    });

    /* And the button is a way back out, not a one-way trip. */
    expect(run(`(() => { openSpool("sp-1"); return document.getElementById("d-seal").textContent; })()`))
      .toBe("Open it");

    close();
  });

  /* A bag travels. The roll goes from the shelf into a box in the same bag, and
     the ledger has to bill the journey at nothing — a stay is charged when a
     roll leaves a place, and the place a sealed roll is in is the bag. */
  it("charges a bagged roll nothing for being carried, and opens it where it left off", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    stubMedia(run);
    setBench(run, {
      ...BENCH,
      units: [
        { id: "sh", kind: "shelf", name: "Shelf", slots: ["sp-1"], open: true },
        { id: "bx", kind: "box", name: "Box", slots: [null, null, null, null], open: true },
        { id: "ams", kind: "ams", name: "AMS", slots: [null, null, null, null], open: true },
      ],
    });

    const roll = () => run(`(() => {
      const s = spool("sp-1"), d = dryState(s);
      return { sealed: s.sealed, used: d.used, driedAt: s.driedAt, at: (locationOf("sp-1") || {}).unitId };
    })()`);

    run(`render(); setSealed(spool("sp-1"), true); save(); render();`);
    setClock(run, "2026-09-01T10:00:00");            /* a month in the bag */
    run(`place("sp-1", { unitId: "bx", slot: 0 })`);
    expect(roll()).toEqual({ sealed: true, used: A_FORTNIGHT, driedAt: "2026-07-18", at: "bx" });

    /* Onto the AMS, which is the one move a bag cannot survive: you cannot
       print through a sealed bag, so the app takes it out of it. */
    setClock(run, "2026-09-15T10:00:00");
    run(`place("sp-1", { unitId: "ams", slot: 0 })`);
    expect(roll()).toEqual({ sealed: false, used: A_FORTNIGHT, driedAt: "2026-07-18", at: "ams" });
    expect(run(`document.getElementById("toast").textContent`)).toBe("Grey opened");

    /* And from there it spends AMS time, on top of the fortnight of shelf it
       was already carrying. Not a fresh twelve weeks. */
    setClock(run, "2026-10-06T10:00:00");
    expect(roll().used).toBe(A_FORTNIGHT + THREE_WEEKS_IN_AN_AMS);

    close();
  });

  /* The edit sheet's own way in, which used to be the only one: sealing there
     meant picking a third State, and it threw the drying date away on the way
     past. A bag is not a third kind of roll, so it is a checkbox now — and it
     pauses the date rather than wiping it. */
  it("pauses the drying date from the edit sheet, and hands it back when unchecked", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    stubMedia(run);
    setBench(run, BENCH);

    const editSeal = check => run(`(() => {
      openSpool("sp-1");
      document.getElementById("d-edit").click();
      const box = document.getElementById("f-sealed");
      const offered = document.getElementById("f-dried").value;
      box.checked = ${check};
      box.dispatchEvent(new Event("change"));
      const dateField = document.getElementById("f-dried-wrap").style.display;
      document.getElementById("f-save").click();
      const s = spool("sp-1");
      return { offered, dateField, sealed: s.sealed, low: s.low, driedAt: s.driedAt, used: dryState(s).used };
    })()`);

    run(`render()`);
    expect(editSeal(true)).toEqual({
      offered: "2026-07-18", dateField: "none",
      sealed: true, low: true, driedAt: "2026-07-18", used: A_FORTNIGHT,
    });

    /* And the date it was still holding is the one the sheet offers back. */
    expect(editSeal(false)).toEqual({
      offered: "2026-07-18", dateField: "block",
      sealed: false, low: true, driedAt: "2026-07-18", used: A_FORTNIGHT,
    });

    close();
  });

  /* Wherever the roll is. A roll loaded in an AMS is not in a bag and the app
     knows it, but the sheet still offers the bag: what it records is what you
     say you did with it, and the only thing it insists on is the move it
     cannot survive — going back onto a machine takes it out again. */
  it("offers the bag wherever the roll is, loaded on a machine included", async () => {
    const { run, close } = await openApp({ now: "2026-08-01T10:00:00" });
    stubMedia(run);
    setBench(run, {
      ...BENCH,
      units: [{ id: "ams", kind: "ams", name: "AMS", slots: ["sp-1", null, null, null], open: true }],
    });

    const sealed = run(`(() => {
      render();
      openSpool("sp-1");
      const label = document.getElementById("d-seal").textContent;
      document.getElementById("d-seal").click();
      const s = spool("sp-1");
      return { label, sealed: s.sealed, at: (locationOf("sp-1") || {}).unitId };
    })()`);

    expect(sealed).toEqual({ label: "Seal it", sealed: true, at: "ams" });

    close();
  });
});
