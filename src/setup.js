/* The Setup screen: the list of machines and storage, and the drying intervals
 * under it. Markup only — every control it draws is picked up by the delegated
 * listeners in index.html, so nothing here needs a callback.
 *
 * `esc` and the two kind predicates arrive as arguments rather than as imports.
 * index.html defines them and cannot import anything (its script is classic,
 * and the module bridge has not run when the first frame is drawn), so handing
 * the page's own versions in is the only way both sides are certain to agree on
 * what a shelf is and what an escaped name looks like. */

export const KIND_LABEL = { printer: "Printer", ams: "AMS / MMU", dryer: "Dryer", box: "Airtight box", shelf: "Open shelf" };
export const DEFAULT_SLOTS = { printer: 1, ams: 4, dryer: 4, box: 4, shelf: 6 };

const GROUPS = [
  { kind: "printer", title: "Printers",       add: "a printer" },
  { kind: "ams",     title: "AMS / MMU",      add: "an AMS" },
  { kind: "dryer",   title: "Dryers",         add: "a dryer" },
  { kind: "box",     title: "Airtight boxes", add: "an airtight box" },
  { kind: "shelf",   title: "Open shelves",   add: "an open shelf" },
];

const kindOptions = kind => Object.keys(KIND_LABEL)
  .map(k => `<option value="${k}"${k === kind ? " selected" : ""}>${KIND_LABEL[k]}</option>`).join("");

const dryNote = (state, kind) => kind === "dryer" ? "no countdown"
  : state.dryWeeks[kind] ? state.dryWeeks[kind] + "w dry" : "never dries out";

const unitRow = (u, state, { esc, piled, isMachine }) => {
  const held = u.slots.filter(Boolean).length;
  return `<div class="srow">
    ${isMachine(u) ? `<span class="led"></span>` : u.kind === "dryer" ? `<span class="led heat"></span>` : ""}
    <input type="text" value="${esc(u.name)}" data-uname="${u.id}" aria-label="Name">
    <select data-ukind="${u.id}" aria-label="Type">${kindOptions(u.kind)}</select>
    ${piled(u) ? "" : `<input type="number" min="1" max="12" value="${u.slots.length}" data-uslots="${u.id}" aria-label="Slots">
    <span class="mini">slots</span>`}
    <span class="mini" style="margin-left:4px">${dryNote(state, u.kind)}</span>
    <span class="held">${held ? held + " loaded" : "empty"}</span>
    <button class="btn ghost tiny" data-udel="${u.id}">Remove</button>
  </div>`;
};

/* Empty groups keep their bar, so adding your first dryer is one obvious tap. */
export const listHTML = (state, help) => GROUPS.map(g => {
  const us = state.units.filter(u => u.kind === g.kind);
  return `<div class="ugroup${us.length ? "" : " empty"}">
    <div class="ubar">
      <span>${help.esc(g.title)}</span>
      <span class="n">${us.length ? us.length : "none yet"}</span>
      <button class="add" data-addunit="${g.kind}">+ Add ${us.length ? "" : help.esc(g.add)}</button>
    </div>
    ${us.length ? `<div class="ubody">${us.map(u => unitRow(u, state, help)).join("")}</div>` : ""}
  </div>`;
}).join("");

export const intervalsHTML = (state, esc) => Object.keys(KIND_LABEL).map(k => {
  const track = state.dryTracking !== false;
  const n = state.units.filter(u => u.kind === k).length;
  return `<div class="srow">
    <span class="kname">${esc(KIND_LABEL[k])}</span>
    ${k === "dryer"
      ? `<span class="mini" style="margin-left:0">no countdown — nothing goes damp in here</span>`
      : `<input type="number" min="1" max="520" value="${state.dryWeeks[k] || ""}" data-kdry="${k}"
           ${state.dryWeeks[k] && track ? "" : "disabled"} aria-label="${esc(KIND_LABEL[k])} weeks dry">
         <span class="mini">weeks</span>
         <label class="never"><input type="checkbox" data-knever="${k}"${state.dryWeeks[k] ? "" : " checked"}${
           track ? "" : " disabled"}> never</label>`}
    <span class="held">${n ? n + (n === 1 ? " unit" : " units") : "none yet"}</span>
  </div>`;
}).join("");

export const metaText = (state, piled) =>
  state.units.length + " units · " + state.units.reduce((n, u) => n + (piled(u) ? 0 : u.slots.length), 0) + " slots";
