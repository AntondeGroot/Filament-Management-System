import { describe, expect, it } from "vitest";
import { frames, openApp, scrolledBy, setBench, stubDragEnvironment } from "./harness.js";

const ONE_SPOOL = {
  swatches: [{ id: "sw-1", brand: "T", material: "PLA", colorName: "Red", hex: "#C2231C" }],
  spools: [{ id: "sp-1", swatchId: "sw-1", low: false, sealed: false, ordered: false, driedAt: null }],
  spares: ["sp-1"],
};

describe("press and hold to drag", () => {
  it("keeps the press-and-hold alive through a small drift", async () => {
    const { run, close } = await openApp();
    stubDragEnvironment(run);
    setBench(run, ONE_SPOOL);

    const result = run(`(() => {
      render();
      swipeStart(document.querySelector(".spool"), { clientX: 100, clientY: 200, pointerId: 1 });
      const armed = !!(swipe && swipe.hold);

      /* Three pixels across, eight down: the shape of a finger resting on a
         card, not of anyone asking for anything. Vertical beats horizontal,
         which is precisely what used to cancel the whole gesture and leave a
         press-and-hold impossible to perform on a phone. */
      swipeMove({ clientX: 103, clientY: 208 });

      const held = { armed, survived: swipe !== null, stillCounting: !!(swipe && swipe.hold) };
      if (swipe) { clearTimeout(swipe.hold); swipe = null; }
      return held;
    })()`);

    expect(result.armed).toBe(true);
    expect(result.survived).toBe(true);
    expect(result.stillCounting).toBe(true);

    close();
  });

  it("abandons the hold once the finger really moves", async () => {
    const { run, close } = await openApp();
    stubDragEnvironment(run);
    setBench(run, ONE_SPOOL);

    const result = run(`(() => {
      render();
      const card = document.querySelector(".spool");
      const press = () => swipeStart(card, { clientX: 100, clientY: 200, pointerId: 1 });

      /* Straight down, well past the slop. That is someone scrolling the page,
         so the gesture is let go of entirely. */
      press();
      swipeMove({ clientX: 100, clientY: 240 });
      const scrolling = { released: swipe === null };

      /* Straight across is a swipe. The hold must not still be armed
         underneath it, or it fires mid-swipe and lifts the card out from
         under the gesture already in progress. */
      press();
      swipeMove({ clientX: 140, clientY: 200 });
      const swiping = { active: !!(swipe && swipe.active), stillCounting: !!(swipe && swipe.hold) };

      if (swipe) swipeCancel();
      return { scrolling, swiping };
    })()`);

    expect(result.scrolling.released).toBe(true);
    expect(result.swiping.active).toBe(true);
    expect(result.swiping.stillCounting).toBe(false);

    close();
  });

  it("scrolls toward whichever edge the drag is near", async () => {
    const { run, close } = await openApp();
    stubDragEnvironment(run);
    setBench(run, ONE_SPOOL);

    /* Something has to be in hand: the page only scrolls itself mid-drag. */
    const rates = run(`(() => {
      render();
      drag = { id: "sp-1", active: true, ghost: document.createElement("div") };
      document.body.appendChild(drag.ghost);
      const rateAt = y => { edgeWatch(100, y); return Math.round(edgeRate * 10) / 10; };
      return {
        top: rateAt(10),
        middle: rateAt(Math.round(innerHeight / 2)),
        bottom: rateAt(innerHeight - 10),
        corner: rateAt(innerHeight),          /* hard against the edge, at full speed */
      };
    })()`);

    /* Negative is upwards. The middle of the screen must sit perfectly still,
       or the page creeps under every drag that is going nowhere near an edge. */
    expect(rates.top).toBeLessThan(0);
    expect(rates.middle).toBe(0);
    expect(rates.bottom).toBeGreaterThan(0);
    expect(rates.corner).toBeGreaterThan(rates.bottom);

    /* Aimed at the bottom edge, each frame should carry the page further. */
    run(`edgeWatch(100, innerHeight - 10)`);
    const travel = [];
    for (let i = 0; i < 3; i++) { frames(run); travel.push(scrolledBy(run)); }

    expect(travel[0]).toBeGreaterThan(0);
    expect(travel[1]).toBeGreaterThan(travel[0]);
    expect(travel[2]).toBeGreaterThan(travel[1]);

    run(`edgeStop(); drag.ghost.remove(); drag = null;`);
    close();
  });

  it("starts a touch drag from the move button but not the rest of the header", async () => {
    const { run, close } = await openApp();
    stubDragEnvironment(run);
    setBench(run, {
      swatches: [{ id: "sw-1", brand: "T", material: "PLA", colorName: "Red", hex: "#C2231C" }],
      spools: Array.from({ length: 4 }, (_, i) =>
        ({ id: "sp-" + i, swatchId: "sw-1", low: false, sealed: false, ordered: false, driedAt: null })),
      units: [{ id: "ams-a", kind: "ams", name: "AMS A", slots: ["sp-0", "sp-1", "sp-2", "sp-3"] }],
    });

    const result = run(`(() => {
      render();
      /* PointerEvent is not in JSDOM, and only four of its fields are read. */
      const press = (el, pointerType) => {
        const e = new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, button: 0 });
        Object.defineProperty(e, "pointerType", { value: pointerType });
        Object.defineProperty(e, "pointerId", { value: 1 });
        el.dispatchEvent(e);
        const got = udrag && { touch: udrag.touch, n: udrag.n, armed: !!udrag.hold, active: udrag.active };
        if (udrag) { clearTimeout(udrag.hold); udrag = null; }
        return got;
      };

      /* The header is also the collapse toggle, so a finger on it must not
         pick up the pile — that is why the drag was disabled on touch
         altogether, and why narrowing it to the button is the whole fix. */
      return {
        headerByTouch: press(document.querySelector(".unit-name"), "touch"),
        buttonByTouch: press(document.querySelector("[data-umove]"), "touch"),
        headerByMouse: press(document.querySelector(".unit-name"), "mouse"),
      };
    })()`);

    expect(result.headerByTouch).toBe(null);
    expect(result.buttonByTouch).toEqual({ touch: true, n: 4, armed: true, active: false });
    /* A mouse still grabs anywhere on the header, and without waiting. */
    expect(result.headerByMouse).toEqual({ touch: false, n: 4, armed: false, active: false });

    close();
  });
});