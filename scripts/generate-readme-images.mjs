/* Regenerates the screenshots in docs/screenshots/, by photographing the real
 * app rather than by drawing pictures of it — so they cannot drift away from
 * how it actually looks.
 *
 * Every shot is taken at a phone's size and pixel density. This is a phone app;
 * a desktop screenshot would show a layout almost nobody uses, with the bench
 * spread across three columns and the tab bar along the top.
 *
 * The bench below is invented, not anyone's real inventory, and is picked to
 * show what the app is for: a spread of colour, rolls in every kind of place,
 * a dryer mid-cycle and a pile of identical blacks stacked into one card.
 *
 * Needs Chrome, which it drives over the DevTools protocol. No headless browser
 * dependency, and no npm install to run it.
 *
 * Usage:
 *   npm run screenshots
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "docs/screenshots");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* A phone, in CSS pixels, at the density most of them have. */
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
                ".png": "image/png", ".webmanifest": "application/manifest+json" };

/* ---------------------------------------------------------------- serving */

function serve(port) {
  const server = createServer(async (req, res) => {
    const path = join(DIST, decodeURIComponent(req.url.split("?")[0]));
    try {
      const body = await readFile(path.endsWith("/") ? join(path, "index.html") : path);
      res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("no");
    }
  });
  return new Promise(done => server.listen(port, () => done(server)));
}

/* ------------------------------------------------------------------- chrome */

const wait = ms => new Promise(done => setTimeout(done, ms));

async function openChrome(port, profile) {
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank",
  ], { stdio: "ignore" });

  for (let tries = 0; tries < 50; tries++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); return chrome; }
    catch { await wait(200); }
  }
  throw new Error("Chrome never opened its debugging port");
}

/* A very small DevTools client: send a command, wait for the reply with the
   matching id. Enough for navigate, evaluate and screenshot. */
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let next = 0;
  socket.onmessage = e => {
    const message = JSON.parse(e.data);
    const settle = pending.get(message.id);
    if (!settle) return;
    pending.delete(message.id);
    message.error ? settle.reject(new Error(message.error.message)) : settle.resolve(message.result);
  };
  const ready = new Promise(done => { socket.onopen = done; });
  return {
    ready,
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    close: () => socket.close(),
  };
}

/* --------------------------------------------------------------- the bench */

const SWATCHES = [
  ["Elegoo", "PLA", "Red", "#FF0000"], ["Polyterra", "PLA", "Lava Red", "#C9293C"],
  ["Jupiter", "PLA", "Orange", "#FF6200"], ["Esun", "PETG", "Orange Transparent", "#DD7135"],
  ["Jupiter", "PLA", "Sulfur Yellow", "#FFFF62"], ["Jupiter", "PLA", "Yellow Green", "#9DCC4C"],
  ["Polyterra", "PLA", "Forest Green", "#44C27E"], ["Polyterra", "PETG", "Sapphire Blue", "#1F8BB4"],
  ["Elegoo", "PLA", "Blue", "#0013F5"], ["Polyterra", "PLA", "Lavender Purple", "#A695F5"],
  ["Polyterra", "PLA", "Electric Indigo", "#6600A3"], ["Polyterra", "PLA", "Sakura Pink", "#D8B5C5"],
  ["Polyterra", "PLA", "Wood Brown", "#C09F83"], ["Polyterra", "PLA", "Fossil Grey", "#899FAB"],
  ["Elegoo", "PLA", "Black", "#000000"], ["Elegoo", "PLA", "White", "#FFFFFF"],
];

/* Written into the page before it renders. Dates are relative to the day this
   runs, so the droplets and the "dry me" flags stay meaningful over time. */
const BENCH = `(() => {
  const day = n => { const d = new Date(Date.now() - n * 864e5);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
  const swatches = ${JSON.stringify(SWATCHES)}.map(([brand, material, colorName, hex], i) =>
    ({ id: "sw" + i, brand, material, colorName, hex, transparent: colorName.includes("Transparent") }));
  let n = 0;
  /* Some rolls are deliberately overdue: an app photographed with nothing to
     do says nothing about what it is for. The one in the AMS is three quarters
     through its twelve weeks, the one on the shelf is past its four. */
  const roll = (sw, driedAt, extra = {}) => ({ id: "sp" + (n++), swatchId: "sw" + sw,
    low: false, sealed: false, ordered: false, driedAt, since: driedAt, used: 0, ...extra });

  const spools = [
    roll(0, day(9)), roll(2, day(76)), roll(6, day(12)), roll(8, day(3)),          /* the AMS */
    roll(4, day(70)), roll(10, day(64)),                                            /* the dryer */
    roll(1, day(20)), roll(7, day(26), { low: true }), roll(11, day(18)),           /* box one */
    roll(5, day(31)), roll(9, day(15)), roll(12, day(48)),                          /* box two */
    roll(13, day(5)), roll(3, day(34)),                                             /* the shelf */
    roll(14, day(2)), roll(14, day(2)), roll(14, day(2)),                           /* three blacks */
    roll(15, day(6)),
    roll(2, null, { sealed: true }),
    roll(4, day(52)), roll(9, day(44), { ordered: true }),                         /* run out */
  ];
  const at = i => spools[i].id;

  state = Object.assign(emptyBench(), {
    swatches, spools,
    units: [
      { id: "p1", kind: "printer", name: "P1S", slots: [at(3)] },
      { id: "ams", kind: "ams", name: "AMS A", slots: [at(0), at(1), at(2), null] },
      { id: "dry", kind: "dryer", name: "Dryer", slots: [at(4), at(5), null, null] },
      { id: "b1", kind: "box", name: "Box 1", slots: [at(6), at(7), at(8), null] },
      { id: "b2", kind: "box", name: "Box 2", slots: [at(9), at(10), at(11), null] },
      { id: "sh", kind: "shelf", name: "Shelf", slots: [at(12), at(13), null, null, null, null] },
    ],
    spares: [at(14), at(15), at(16), at(17), at(18)],
    reorder: [at(19), at(20)],
  });
  state.spools.filter(s => ["dry"].some(u => unit(u).slots.includes(s.id))).forEach(s => s.dryPending = true);
  render();
})()`;

/* ---------------------------------------------------------------- the shots */

const SHOTS = [
  { file: "spools.png", note: "every roll where it actually is",
    setUp: `setTab("bench"); scrollTo(0, 0);` },
  /* One unit opened on purpose. Collapsed, a card shows colour chips and no
     tags, so the "dry me" flag — the whole point of this picture — is not in
     it. Opening the shelf shows the flag, and cropping to the rolls themselves
     keeps four empty slots from taking up half the picture. */
  { file: "drying.png", note: "a roll past its window, cropped to the rolls",
    setUp: `setTab("bench"); unit("sh").open = true; render();
            /* Nearer the top than centred: without captureBeyondViewport the
               crop has to lie inside the phone-sized viewport. */
            document.querySelector('[data-unit="sh"]').scrollIntoView({ block: "start" });`,
    clip: `(() => {
      /* The filled slots and nothing else: no header, and none of the four
         empty ones, which say nothing a caption cannot. Viewport-relative, so
         it lines up with a screenshot of the viewport. */
      const filled = [...document.querySelectorAll('[data-unit="sh"] .slot.taken')]
        .map(el => el.getBoundingClientRect());
      const pad = 12;
      const left = Math.min(...filled.map(r => r.left)), right = Math.max(...filled.map(r => r.right));
      const top = Math.min(...filled.map(r => r.top)), bottom = Math.max(...filled.map(r => r.bottom));
      return { x: left - pad, y: top - pad,
               width: right - left + pad * 2, height: bottom - top + pad * 2 };
    })()` },
  { file: "reorder.png", note: "rolls that have run out, one already ordered",
    setUp: `setTab("bench");
            document.getElementById("reorder-row").closest(".section")
              .scrollIntoView({ block: "center" });`,
    clip: `(() => {
      /* The reorder section alone — its heading, its count and the rolls in it.
         Unassigned above it is a different claim with its own picture. */
      const box = document.getElementById("reorder-row").closest(".section").getBoundingClientRect();
      const pad = 12;
      return { x: box.left - pad, y: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
    })()` },
  { file: "swatches.png", note: "every colour and material owned",
    setUp: `setTab("swatches"); scrollTo(0, 0);` },
];

/* --------------------------------------------------------------------- run */

const PORT = 8188, DEBUG_PORT = 9333;
const profile = join(tmpdir(), "filament-shots-" + process.pid);

const server = await serve(PORT);
const chrome = await openChrome(DEBUG_PORT, profile);
await mkdir(OUT, { recursive: true });

try {
  const target = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })
    .then(r => r.json());
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", PHONE);

  for (const shot of SHOTS) {
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html` });
    await wait(900);                                    /* the app boots and renders */
    await cdp.send("Runtime.evaluate", { expression: BENCH });
    await cdp.send("Runtime.evaluate", { expression: shot.setUp });
    await wait(400);                                    /* transitions settle */

    /* Chrome's own clip parameter is measured in something other than what the
       device emulation renders in — asking for 270 CSS pixels returned an image
       2430 across — so the crop is done afterwards instead, in device pixels,
       where the arithmetic is one multiplication and visibly right or wrong. */
    const shotOf = async () => {
      if (shot.clip) {
        /* Everything that floats has to be got out of the way first, or it
           paints across whatever is being cropped. The header comes out of
           sticky — it then sits at the top of the document, above any crop, and
           nothing reflows because a sticky element is already in flow. The tab
           bar and the add button are fixed, so they are simply hidden. */
        await cdp.send("Runtime.evaluate", { expression: `(() => {
          document.querySelector(".bar").style.position = "static";
          document.querySelector(".tabs").style.display = "none";
          document.getElementById("fab").style.display = "none";
        })()` });
      }
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      if (!shot.clip) return data;
      const { result } = await cdp.send("Runtime.evaluate",
        { expression: shot.clip, returnByValue: true });
      const box = result.value;
      const cropped = await cdp.send("Runtime.evaluate", { awaitPromise: true, returnByValue: true,
        expression: `(async () => {
          const dpr = ${PHONE.deviceScaleFactor};
          const img = new Image();
          img.src = "data:image/png;base64," + ${JSON.stringify(data)};
          await img.decode();
          const c = document.createElement("canvas");
          c.width = Math.round(${box.width} * dpr); c.height = Math.round(${box.height} * dpr);
          c.getContext("2d").drawImage(img, Math.round(${box.x} * dpr), Math.round(${box.y} * dpr),
            c.width, c.height, 0, 0, c.width, c.height);
          return c.toDataURL("image/png").split(",")[1];
        })()` });
      return cropped.result.value;
    };
    const data = await shotOf();

    await writeFile(join(OUT, shot.file), Buffer.from(data, "base64"));
    console.log(`  ${shot.file.padEnd(18)} ${shot.note}`);
  }

  cdp.close();
} finally {
  chrome.kill();
  server.close();
  /* Chrome keeps writing to its profile for a moment after the signal, so a
     removal straight away loses a race with it. The directory is disposable
     either way — failing to tidy it must not fail the run. */
  await wait(300);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}

console.log(`\nWrote ${SHOTS.length} screenshots to docs/screenshots/`);
