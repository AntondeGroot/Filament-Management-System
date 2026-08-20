/* Booting index.html so its logic can be tested.
 *
 * The app is one HTML file with one inline <script> and no exports, so there is
 * nothing to import. Instead each test runs the real document in JSDOM and
 * reaches into the realm it created.
 *
 * Two kinds of name live in that realm, and they are reached differently:
 *
 *   - `function` declarations (dueList, migrate, emptyBench…) become
 *     properties of the window, so `win.dueList` works.
 *   - Top-level `const` and `let` (state, DEFAULT_DRY, dryingOn…) go to the
 *     global *lexical* environment, which is not the window object. They are
 *     only reachable from code evaluated inside the realm — hence `run`.
 *
 * `run` is therefore the general tool, and everything below is built on it.
 */

import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

import * as alarms from "../src/alarms.js";
import * as batch from "../src/batch.js";
import * as intake from "../src/intake.js";
import * as color from "../src/color.js";
import * as desiccant from "../src/desiccant.js";
import * as drying from "../src/drying.js";
import * as mesh from "../src/mesh.js";
import * as polymaker from "../src/polymaker.js";
import * as reminders from "../src/reminders.js";
import * as setup from "../src/setup.js";
import * as wheel from "../src/wheel.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

/* index.html hands its modules to the classic script through globals, using a
 * <script type="module"> block. JSDOM does not implement module scripts at all,
 * so it never runs that block and the app boots with every one of them missing.
 *
 * The same handover is performed here instead, from Node's own imports. It has
 * to happen in beforeParse: the inline script runs during construction and
 * reaches for these while rendering the first frame. */
const MODULES = { Alarms: alarms, Batch: batch, Color: color, Desiccant: desiccant, Drying: drying,
                  Intake: intake, Mesh: mesh, Polymaker: polymaker, Reminders: reminders, Setup: setup, Wheel: wheel };

/* Boots a fresh copy of the app.
 *
 * `now` freezes the clock before any test code runs. The scheduling code
 * branches on whether 09:00 has already passed today, so a test written against
 * the real clock would pass all morning and fail all afternoon. */
export async function openApp({ now, modules = true } = {}) {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    beforeParse: window => modules && Object.assign(window, MODULES),
  });
  const run = code => dom.window.eval(code);

  /* load() is async and finishes after the script itself returns. Nothing in it
     overwrites state once storage fails — which it does here, since JSDOM has
     no IndexedDB — but letting it settle first keeps its render() out of the
     middle of a test. */
  await new Promise(resolve => setTimeout(resolve, 50));

  if (now) freezeClock(run, now);

  return { run, window: dom.window, close: () => dom.window.close() };
}

/* Performs the handover late, the way the deferred module block does in a
   browser — for the one test that boots with `modules: false` to watch what the
   app does while the fetches are still in flight. */
export function bridgeModules({ window, run }) {
  Object.assign(window, MODULES);
  run("window.bridged()");
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

/* Sheets ask whether the pointer is coarse before deciding to focus a field,
   and JSDOM has no matchMedia at all — without this the modal throws on its way
   up, and the throw is swallowed by the event handler that opened it. "Not a
   phone" is both the desktop answer and the branch that does something. */
export const stubMedia = run =>
  run(`globalThis.matchMedia = query => ({ matches: false, media: query });`);

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

/* Puts the app on the Android path, with a plugin that remembers rather than
 * notifies. Scheduling is the one part of the app with no visible output at
 * all — what it does is hand a list to Android and forget about it — so this
 * stub is the only place a test can see what was actually queued.
 *
 * getPending answers with whatever is still queued, because syncScheduled()
 * cancels the lot before rebuilding: a stub that always answered "nothing
 * pending" would let a leak through where every save doubled the queue. */
export function stubAndroid(run) {
  run(`(() => {
    globalThis.__queue = [];
    const LocalNotifications = {
      checkPermissions: async () => ({ display: "granted" }),
      requestPermissions: async () => ({ display: "granted" }),
      getPending: async () => ({ notifications: globalThis.__queue.map(n => ({ id: n.id })) }),
      cancel: async ({ notifications }) => {
        const gone = new Set(notifications.map(n => n.id));
        globalThis.__queue = globalThis.__queue.filter(n => !gone.has(n.id));
      },
      schedule: async ({ notifications }) => { globalThis.__queue.push(...notifications); },
    };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications } };
    nativePerm = "granted";
  })()`);
}

/* Rebuilds the queue the way a save does, and reports what Android was left
   holding — again as plain data, in local time. */
export async function nativelyScheduled(run) {
  await run("syncScheduled()");
  return run(`globalThis.__queue.map(n => ({
    id: n.id, title: n.title, on: n.schedule.at.toDateString(),
  }))`);
}
