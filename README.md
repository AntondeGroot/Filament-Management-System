# Filament Manager

A single-page app for tracking filament: where every spool is, when it was last
dried, which colours you own, and what each project used.

## Files

| | |
|---|---|
| `index.html` | the whole app — markup, styles and logic |
| `sw.js` | service worker: offline shell + the background drying check |
| `manifest.webmanifest` | makes it installable to the Android home screen |
| `icon-*.png` | launcher icons, for the home screen and the APK alike |
| `capacitor.config.ts`, `android/` | the Android shell — see [Building the APK](#building-the-apk) |
| `scripts/` | build, icon generation, install-on-device |

The app itself still has no build step, no dependencies and no bundler: edit
`index.html`, reload, done. Everything above the line in that table is the whole
web app, and it is what a static host serves.

The npm project underneath it exists only to wrap that in an APK. It never
touches `index.html` — `npm run build` is a copy into `dist/`, because Capacitor
packages a directory and the repo root also holds `android/` and `node_modules/`.

## Hosting

It has to be served over **HTTPS from a real origin** — service workers and
notifications are both refused on `file://` and in sandboxed frames. Any static
host works: GitHub Pages, Cloudflare Pages, Netlify. Drop the four files in a
repo, point the host at it, done.

The app still runs perfectly well opened as a plain file; you just lose the
service worker, which means no offline cache and no background reminders.

## Building the APK

```
npm install
npm run android:install      # build, then install over USB
```

`scripts/install-android.sh` does the whole chain — collect `dist/`, `cap sync`,
Gradle, `adb install` — and stops with an explanation rather than a stack trace
when the phone is locked, unauthorised, or the default JDK is too new for
Gradle. It needs JDK 21 and the Android SDK's `platform-tools`; set
`ANDROID_SDK_ROOT` if the SDK isn't in the usual place.

```
npm run android:install -- --skip-build   # reinstall the APK that's already built
npm run assets                            # regenerate launcher icons from icon-512*.png
```

Reinstalling keeps app data, which matters here: the entire inventory lives in
the webview's IndexedDB and nowhere else. The script refuses to uninstall on
your behalf when signing keys don't match, and tells you what it would cost.

Because the APK bundles the app rather than pointing at a hosted URL, every
change to `index.html` needs a reinstall to reach the phone.

## Installing without the APK

The site is still a normal PWA:

1. Open it in Chrome.
2. Menu → **Add to Home screen** (or accept the install prompt).
3. Open it from the home screen at least once.
4. In the app: **Setup → Reminders → notify me**, and accept the browser prompt.

Step 2 matters. Chrome only grants Periodic Background Sync to *installed*
apps — a bookmarked tab won't get it.

## How reminders actually work

Which mechanism you get depends on how the app was installed, and the difference
is worth knowing because it decides whether closing the app costs you the nudge.

**From the APK — real alarms.** `@capacitor/local-notifications` hands Android a
queue of scheduled notifications, one per morning that has something overdue, at
09:00. They fire whether or not the app is running, they survive a reboot
(`RECEIVE_BOOT_COMPLETED`), and Android does not get a vote on the timing. The
queue is rebuilt from scratch after every save and whenever the app comes back
to the foreground, so it can't drift out of step with the inventory.

The webview has no Periodic Background Sync at all, so this isn't a nicety —
it's the only thing that works there. The service worker is skipped entirely in
the APK.

**From Chrome — best effort.** Two weaker layers:

- **While the page is open** — the app checks on load and once an hour. Works
  in every browser, on every platform, installed or not.
- **While it's closed** — Chrome wakes the service worker on a schedule and it
  checks then. Requires installation to the home screen.

**Chrome decides that frequency.** `minInterval` is a hint, not a contract; the
actual cadence depends on how often you use the app, and on battery and network
state. A couple of checks a day is typical for an app you open regularly, and
it can go quiet for a while if you don't. Not a good mechanism for anything
time-critical — and drying a spool isn't.

Either way you get at most one notification per day, and only for spools that
are genuinely past the window for wherever they're sitting.

**iOS still gets the browser path only** — Safari has no Periodic Background
Sync. Capacitor is already set up, though, so `npx cap add ios` would get the
same scheduled alarms there without touching `index.html`.

## Where the drying rules live

Only in `index.html`. The page computes a flat list — `state.due`, entries of
`{name, at}` — every time it saves. Everything downstream just reads that list:
the service worker compares the dates against today, and `alarms()` regroups
them into one scheduled notification per morning. So there's exactly one
implementation of the windows, the per-type intervals and the sealed/dryer
exemptions, and neither the worker nor the Android queue can drift out of step
with them.

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
