/* Booting index.html so its logic can be tested.
 *
 * The app is one HTML file with one inline <script> and no exports, so there is
 * nothing to import. Instead each test runs the real document in JSDOM and
 * reaches into the realm it created.
 *
 * Two kinds of name live in that realm, and they are reached differently:
 *
 *   - `function` declarations (dueList, alarms, migrate, emptyBench…) become
 *     properties of the window, so `win.alarms` works.
 *   - Top-level `const` and `let` (state, DEFAULT_DRY, dryingOn…) go to the
 *     global *lexical* environment, which is not the window object. They are
 *     only reachable from code evaluated inside the realm — hence `run`.
 *
 * `run` is therefore the general tool, and everything below is built on it.
 */

import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

/* Boots a fresh copy of the app.
 *
 * `now` freezes the clock before any test code runs. The scheduling code
 * branches on whether 09:00 has already passed today, so a test written against
 * the real clock would pass all morning and fail all afternoon. */
export async function openApp({ now } = {}) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/" });
  const run = code => dom.window.eval(code);

  /* load() is async and finishes after the script itself returns. Nothing in it
     overwrites state once storage fails — which it does here, since JSDOM has
     no IndexedDB — but letting it settle first keeps its render() out of the
     middle of a test. */
  await new Promise(resolve => setTimeout(resolve, 50));

  if (now) freezeClock(run, now);

  return { run, window: dom.window, close: () => dom.window.close() };
}

/* Replaces Date inside the realm, not in the test's own. The app builds its
   dates with `new Date()` and `Date.now()` there, and the two realms have
   separate globals, so vi.setSystemTime() would not reach it. */
function freezeClock(run, when) {
  run(`(() => {
    const Real = Date;
    const fixed = new Real(${JSON.stringify(when)}).getTime();
    globalThis.Date = class extends Real {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  })()`);
}

/* The drag code needs four things JSDOM does not implement: pointer capture,
 * hit testing, animation frames, and a window that scrolls. Without them the
 * handlers throw before reaching any logic worth testing.
 *
 * Each is stubbed to the smallest thing that lets the code run, and frames are
 * left inert on purpose — queued rather than fired — so a test steps the
 * scrolling itself instead of racing a real clock. `frames()` runs whatever is
 * pending; `scrolledBy()` reports how far the page was asked to move. */
export function stubDragEnvironment(run) {
  run(`(() => {
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    document.elementFromPoint = () => null;
    globalThis.__queued = [];
    globalThis.__scrolled = 0;
    globalThis.requestAnimationFrame = fn => globalThis.__queued.push(fn);
    globalThis.cancelAnimationFrame = () => { globalThis.__queued.length = 0; };
    globalThis.scrollBy = (x, y) => { globalThis.__scrolled += y; };
    /* scrollY has to answer for the scrolling above, or the drag concludes the
       page will not move and stops after a single frame — that check is how it
       knows it has reached the end of the document. */
    Object.defineProperty(globalThis, "scrollY", {
      configurable: true,
      get: () => globalThis.__scrolled,
    });
  })()`);
}

/* Runs the frames the drag has queued, once each. */
export const frames = run => run(`(() => {
  const due = globalThis.__queued.splice(0);
  due.forEach(fn => fn());
  return due.length;
})()`);

export const scrolledBy = run => run("globalThis.__scrolled");

/* Puts the app on a known bench. Starts from the app's own emptyBench() so a
   test only has to state the part it cares about, and so a new required field
   shows up here rather than as a mystery failure. */
export function setBench(run, patch = {}) {
  run(`state = Object.assign(emptyBench(), ${JSON.stringify(patch)})`);
}

/* alarms() returns Date objects, which do not survive the realm boundary
   cleanly — instanceof fails, and toISOString() would make every assertion
   depend on the machine's timezone. So the interesting parts are read out
   inside the realm, in local time, as plain data. */
export function queuedAlarms(run) {
  return run(`alarms().map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    at: [
      a.schedule.at.getFullYear(),
      a.schedule.at.getMonth() + 1,
      a.schedule.at.getDate(),
      a.schedule.at.getHours(),
    ],
    allowWhileIdle: a.schedule.allowWhileIdle,
  }))`);
}