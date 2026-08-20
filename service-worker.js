/* Filament Manager — service worker.

   Two jobs, and deliberately no more:

   1. Keep the app shell cached so it opens without a connection.
   2. Wake up now and then and check whether any spool is overdue for drying.

   It knows nothing about drying windows, materials or dry boxes. The page
   works all that out and leaves a flat list at state.due — [{name, at}] — so
   the rules live in exactly one place and this file can't drift out of step
   with them. All the worker does is compare dates. */

const CACHE = "filament-manager-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  /* Modules index.html imports. Missing one means the app opens offline and
     then fails the moment that part of it is reached. */
  "./src/mesh.js", "./src/drying.js", "./src/polymaker.js", "./src/batch.js", "./src/color.js", "./src/alarms.js", "./src/intake.js",
  "./src/desiccant.js", "./src/reminders.js", "./src/setup.js", "./src/wheel.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first, cache as the safety net: you always get the newest build when
   you're online, and the app still opens in a workshop with no signal. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

/* ---------- shared state, read straight from the page's IndexedDB ---------- */

function readState() {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open("filament-manager", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
    rq.onerror = () => reject(rq.error);
    rq.onsuccess = () => {
      const db = rq.result;
      const get = db.transaction("kv", "readonly").objectStore("kv").get("state");
      get.onsuccess = () => resolve(get.result || null);
      get.onerror = () => reject(get.error);
    };
  });
}

function writeState(state) {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open("filament-manager", 1);
    rq.onerror = () => reject(rq.error);
    rq.onsuccess = () => {
      const db = rq.result;
      const put = db.transaction("kv", "readwrite").objectStore("kv").put(state, "state");
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    };
  });
}

/* Local, matching iso() in the page. The dates in state.due are local days, so
   comparing them against a UTC "today" would disagree with the page for the
   first hours of every morning east of Greenwich. */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function checkDrying() {
  const state = await readState();
  if (!state || !state.notify || state.dryTracking === false) return;

  const stamp = todayISO();
  if (state.notifiedOn === stamp) return;          /* one nudge a day is plenty */

  const due = (state.due || []).filter(d => d.at <= stamp);
  if (!due.length) return;

  state.notifiedOn = stamp;
  await writeState(state);

  const names = due.slice(0, 3).map(d => d.name).join(", ");
  await self.registration.showNotification(
    due.length === 1 ? "1 spool needs drying" : due.length + " spools need drying",
    {
      body: names + (due.length > 3 ? " and " + (due.length - 3) + " more" : ""),
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "filament-drying",
      data: { url: "./index.html" },
    }
  );
}

/* The desiccant is the same deal one step simpler: the page leaves the date of
   the next check at state.desiccantDue, and all this does is notice the day has
   come. Its own stamp, so a morning that owes both nudges sends both. */
async function checkDesiccant() {
  const state = await readState();
  if (!state || !state.desiccant || !state.desiccant.on || !state.desiccantDue) return;

  const stamp = todayISO();
  if (state.desiccant.notifiedOn === stamp || state.desiccantDue > stamp) return;

  state.desiccant.notifiedOn = stamp;
  await writeState(state);

  await self.registration.showNotification("Check the desiccant", {
    body: "Swap or dry the beads in your AMS.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "filament-desiccant",
    data: { url: "./index.html" },
  });
}

self.addEventListener("periodicsync", e => {
  if (e.tag === "dry-check") e.waitUntil(Promise.all([checkDrying(), checkDesiccant()]));
});

/* Manual trigger, so the page can ask for a check without waiting on Chrome. */
self.addEventListener("message", e => {
  if (e.data === "dry-check") e.waitUntil(Promise.all([checkDrying(), checkDesiccant()]));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
