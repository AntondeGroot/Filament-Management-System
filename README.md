# Filament Manager

A single-page app for tracking filament: where every spool is, when it was last
dried, which colours you own, and what each project used.

## Files

| | |
|---|---|
| `index.html` | the whole app — markup, styles and logic |
| `sw.js` | service worker: offline shell + the background drying check |
| `manifest.webmanifest` | makes it installable to the Android home screen |
| `icon-*.png` | launcher icons |

No build step, no dependencies, no bundler. Edit `index.html` and reload.

## Hosting

It has to be served over **HTTPS from a real origin** — service workers and
notifications are both refused on `file://` and in sandboxed frames. Any static
host works: GitHub Pages, Cloudflare Pages, Netlify. Drop the four files in a
repo, point the host at it, done.

The app still runs perfectly well opened as a plain file; you just lose the
service worker, which means no offline cache and no background reminders.

## Installing on Android

1. Open the site in Chrome.
2. Menu → **Add to Home screen** (or accept the install prompt).
3. Open it from the home screen at least once.
4. In the app: **Setup → Reminders → notify me**, and accept the browser prompt.

Step 2 matters. Chrome only grants Periodic Background Sync to *installed*
apps — a bookmarked tab won't get it.

## How reminders actually work

Two layers, and it's worth knowing which one is doing the work:

- **While the page is open** — the app checks on load and once an hour. Works
  in every browser, on every platform, installed or not.
- **While it's closed** — Chrome on Android wakes the service worker on a
  schedule and it checks then. Requires installation.

**Chrome decides the frequency.** `minInterval` is a hint, not a contract; the
actual cadence depends on how often you use the app, and on battery and network
state. A couple of checks a day is typical for an app you open regularly, and
it can go quiet for a while if you don't. This is not a good mechanism for
anything time-critical, and drying a spool isn't.

Either way you get at most one notification per day, and only for spools that
are genuinely past the window for wherever they're sitting.

**iOS gets the first layer only.** Safari doesn't implement Periodic Background
Sync. If iPhone support matters later, wrapping this in Capacitor gets you real
scheduled local notifications on both platforms without touching the code.

## Where the drying rules live

Only in `index.html`. The page computes a flat list — `state.due`, entries of
`{name, at}` — every time it saves, and the service worker does nothing but
compare those dates against today. So there's exactly one implementation of the
windows, the per-type intervals and the sealed/dryer exemptions, and the worker
can't drift out of step with them.

## Storage

Everything lives in IndexedDB under database `filament-manager`, store `kv`,
key `state`. The service worker reads and writes the same record, which is why
IndexedDB rather than `localStorage` — workers can't see the latter.

Every record carries an `updatedAt` timestamp and deletions leave tombstones in
`state.deleted`. Nothing uses them yet; they're there so that syncing between
two devices later is a merge rather than a rewrite. Timestamps are stamped by
diffing against a snapshot on each save, so new features get them for free.

Collapsed/expanded state is deliberately excluded from that diff — which boxes
you folded shut belongs to the device in your hand, not to the data.

## Next, if you want it

- **Google Drive sync.** `drive.file` scope, which is non-sensitive and needs no
  OAuth verification review. The app creates and owns a folder in the user's own
  Drive; it can't read folders it didn't make. Split the state into
  `inventory.json` (mostly written from the phone) and `projects.json` (mostly
  written from the desktop) so the two devices rarely touch the same document.
- **A Google Picker import**, if you want to pull in files from folders the app
  didn't create.
