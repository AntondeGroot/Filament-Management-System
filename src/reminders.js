/* The Reminders block on the Setup screen.
 *
 * Two things ask for your attention on a schedule — spools going stale and the
 * desiccant going flat — and they are the same conversation: a permission, a
 * switch, and a sentence saying what will actually arrive. So they are drawn
 * together here, out of the page, from state and a handful of facts the page
 * knows and this file cannot (whether it is running in the APK, what Android
 * said about permission, whether Chrome is checking in the background).
 *
 * Markup only. Every control it draws is handled by the delegated listeners in
 * index.html, which is why nothing here needs a callback. */

import * as Desiccant from "./desiccant.js";

const NOTE = `class="empty-note" style="max-width:62ch"`;
const checked = on => (on ? " checked" : "");
const disabled = off => (off ? " disabled" : "");

const usable = perm => perm !== "denied" && perm !== "unsupported";

const permLabel = (perm, on, native) =>
  perm === "unsupported" ? "not available here"
  : perm === "denied" ? (native ? "blocked in app settings" : "blocked in browser settings")
  : on && perm === "granted" ? "on"
  : "off";

/* The two paths promise genuinely different things, and which one you are on
   decides whether closing the app costs you the reminder. */
const howHTML = ({ native, notifyHour, bgText }) => native
  ? `<p ${NOTE} style="margin-top:4px" id="notify-how">Reminders are scheduled with Android, so they arrive whether or
       not the app is open, and they survive a reboot. One at ${notifyHour}:00 on any morning something is due.</p>`
  : `<p ${NOTE} style="margin-top:4px" id="notify-how">Reminders arrive while the page is open. Add this to your Android
       home screen and Chrome will also check in the background every so often —
       <span id="notify-bg">${bgText}</span>. Chrome decides how often; a couple of times a day is typical.</p>`;

const dryingHTML = (state, env) => `
  <p ${NOTE} id="notify-intro">A nudge when spools are past their drying window, at most once a day.
    ${env.native ? "Android has" : "Your browser has"} to grant permission first, and it will ask the moment
    you tick this.</p>
  <div class="srow" style="border-top:0">
    <span class="kname">Drying due</span>
    <label class="never"><input type="checkbox" id="notify-toggle"${checked(state.notify && env.perm === "granted")}${
      disabled(!usable(env.perm))}> notify me</label>
    <span class="held" id="notify-state" style="min-width:auto">${permLabel(env.perm, state.notify, env.native)}</span>
  </div>`;

const weekdayOptions = pick => Desiccant.WEEKDAYS
  .map((name, i) => `<option value="${i}"${i === pick ? " selected" : ""}>${name}</option>`).join("");

/* One switch and one question. The app does not know which AMS the beads are
   in and does not need to: what arrives is "check the desiccant", and you know
   where yours live better than a list of unit names would say. */
const desiccantHTML = (state, env) => {
  const s = state.desiccant;
  return `
  <div class="srow">
    <span class="kname">Desiccant</span>
    <label class="never"><input type="checkbox" id="desic-toggle"${checked(s.on && env.perm === "granted")}${
      disabled(!usable(env.perm))}> notify me</label>
    <span class="mini">every</span>
    <input type="number" min="1" max="52" value="${s.everyWeeks}" id="desic-weeks"
           aria-label="Weeks between desiccant checks">
    <span class="mini">weeks, on a</span>
    <select id="desic-day" aria-label="Day of the week">${weekdayOptions(s.weekday)}</select>
    <button class="btn ghost tiny" id="desic-done">Checked today</button>
    <span class="held" id="desic-state">${Desiccant.nextLabel(s, env.now)}</span>
  </div>
  <p ${NOTE} style="margin-top:4px">One nudge on the morning it comes round — the beads in an AMS are on a
     calendar, not a sensor, so this asks the question and leaves the answer to you. Swap or dry them, then tap
     <b>Checked today</b>: the next one is counted from that day, so checking early moves the whole schedule
     with you rather than leaving you a short fortnight.</p>`;
};

export const sectionHTML = (state, env) =>
  dryingHTML(state, env) + howHTML(env) + desiccantHTML(state, env);
